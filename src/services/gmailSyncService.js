const { google } = require("googleapis");
const pool = require("../config/db");
const { getAuthedClientForUser } = require("../utils/googleClient");
const {
  getHeader,
  extractCompany,
  extractRole,
  getPlainTextFromPayload,
} = require("../utils/gmailParser");

async function syncGmailForUser(userId) {
  let runId = null;
  let added = 0;
  let skipped = 0;
  const lockRes = await pool.query(
    `UPDATE users
     SET is_syncing = TRUE
     WHERE id = $1 AND is_syncing = FALSE
     RETURNING id`,
    [userId]
  );
  if (lockRes.rowCount === 0) {
    return { ok: false, error: "Sync already running for this user" };
  }
  try {
    const runRes = await pool.query(
      `INSERT INTO sync_runs (user_id, provider, started_at)
       VALUES ($1, 'gmail', NOW())
       RETURNING id`,
      [userId]
    );
    runId = runRes.rows[0].id;
    const userRes = await pool.query(
      `SELECT id, email, google_refresh_token
       FROM users
       WHERE id = $1`,
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) throw new Error("User not found");
    if (!user.google_refresh_token) throw new Error("Google not connected for this user");

    const authClient = await getAuthedClientForUser(user);
    const gmail = google.gmail({ version: "v1", auth: authClient });

    const q =
      'newer_than:7d ("thank you for applying" OR "application received" OR "we received your application")';

    const list = await gmail.users.messages.list({
      userId: "me",
      q,
      maxResults: 30,
    });

    const messages = list.data.messages || [];

    for (const m of messages) {
      const messageId = m.id;

      const msg = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });
      const payload = msg.data.payload || {};
      const headers = payload.headers || [];
      const subject = getHeader(headers, "Subject");
      const from = getHeader(headers, "From");
      const dateHeader = getHeader(headers, "Date");
      const plainText = getPlainTextFromPayload(payload);
      const company = extractCompany(subject, from);
      const role = extractRole(subject, plainText);
      const receivedAt = msg.data.internalDate
        ? new Date(Number(msg.data.internalDate))
        : dateHeader
        ? new Date(dateHeader)
        : new Date();
      const msgInsert = await pool.query(
        `INSERT INTO gmail_messages (user_id, gmail_message_id, thread_id, subject, from_email, received_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id, gmail_message_id) DO NOTHING
         RETURNING id`,
        [userId, messageId, msg.data.threadId || null, subject || null, from || null, receivedAt]
      );
      if (msgInsert.rowCount === 0) {
        skipped++;
        continue;
      }

      const isUnknownCompany = !company || company.toLowerCase().trim() === "unknown";
      const isUnknownRole = !role || role.toLowerCase().includes("unknown");
      if (isUnknownCompany && isUnknownRole) {
        skipped++;
        continue;
      }
      await pool.query(
        `INSERT INTO jobs (user_id, company, role, applied_date, status, gmail_message_id)
         VALUES ($1,$2,$3,$4,'Applied',$5)
         ON CONFLICT (user_id, company, role, applied_date) DO NOTHING`,
        [userId, company, role, receivedAt, messageId]
      );
      added++;
    }
    await pool.query(
      `UPDATE sync_runs
       SET finished_at = NOW(), added=$1, skipped=$2
       WHERE id=$3`,
      [added, skipped, runId]
    );
    await pool.query(
      `UPDATE users SET last_sync_at = NOW() WHERE id=$1`,
      [userId]
    );
    return { ok: true, added, skipped, runId };
  } catch (err) {
    if (runId) {
      await pool.query(
        `UPDATE sync_runs
         SET finished_at = NOW(), error=$1
         WHERE id=$2`,
        [err.message, runId]
      );
    }
    return { ok: false, error: err.message };
  } finally {
    await pool.query(
      `UPDATE users SET is_syncing = FALSE WHERE id=$1`,
      [userId]
    );
  }
}

module.exports = { syncGmailForUser };

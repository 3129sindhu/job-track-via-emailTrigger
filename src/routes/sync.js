const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const pool = require("../config/db");

const { verifyToken } = require("../middleware/auth");
const { getAuthedClientForUser } = require("../utils/googleClient");
const {
  getHeader,
  extractCompany,
  extractRole,
  getPlainTextFromPayload,
} = require("../utils/gmailParser");

router.post("/gmail", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  let runId = null;
  let added = 0;
  let skipped = 0;
  let totalEmails = 0;

  try {
    const runRes = await pool.query(
      `INSERT INTO sync_runs (user_id, provider, started_at)
       VALUES ($1, 'gmail', NOW())
       RETURNING id`,
      [userId]
    );
    runId = runRes.rows[0].id;
    const userRes = await pool.query(
      "SELECT id, email, google_refresh_token FROM users WHERE id=$1",
      [userId]
    );
    const user = userRes.rows[0];

    if (!user) {
      await pool.query(
        `UPDATE sync_runs
         SET finished_at = NOW(), added=$1, skipped=$2, error=$3
         WHERE id=$4`,
        [added, skipped, "User not found", runId]
      );
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    if (!user.google_refresh_token) {
      await pool.query(
        `UPDATE sync_runs
         SET finished_at = NOW(), added=$1, skipped=$2, error=$3
         WHERE id=$4`,
        [added, skipped, "Google not connected for this user", runId]
      );
      return res.status(400).json({
        ok: false,
        error: "Google not connected for this user. Connect Google first.",
      });
    }
    const authClient = await getAuthedClientForUser(user);
    const gmail = google.gmail({ version: "v1", auth: authClient });
    const q =
      'newer_than:7d ("thank you for applying" OR "application received" OR "we received your application")';

    const list = await gmail.users.messages.list({
      userId: "me",
      q,
      maxResults: 20,
    });

    const messages = list.data.messages || [];
    totalEmails = messages.length;

    if (messages.length === 0) {
      await pool.query(
        `UPDATE sync_runs
         SET finished_at = NOW(), added=$1, skipped=$2
         WHERE id=$3`,
        [added, skipped, runId]
      );

      return res.json({
        ok: true,
        added,
        skipped,
        totalEmails,
        message: "No emails found",
      });
    }
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
        [
          userId,
          messageId,
          msg.data.threadId || null,
          subject || null,
          from || null,
          receivedAt,
        ]
      );
      if (msgInsert.rowCount === 0) {
        skipped++;
        continue;
      }
      const isUnknownCompany =
        !company || company.toLowerCase().trim() === "unknown";
      const isUnknownRole =
        !role || role.toLowerCase().includes("unknown");

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

    return res.json({ ok: true, added, skipped, totalEmails });
  } catch (err) {
    console.error("SYNC ERROR:", err);

    if (runId) {
      await pool.query(
        `UPDATE sync_runs
         SET finished_at = NOW(), error=$1, added=$2, skipped=$3
         WHERE id=$4`,
        [err.message, added, skipped, runId]
      );
    }

    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

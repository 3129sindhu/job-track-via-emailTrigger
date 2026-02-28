const { google } = require("googleapis");
const pool = require("../config/db");
const { getAuthedClientForUser } = require("../utils/googleClient");
const {
  getHeader,
  extractCompany,
  extractRole,
  getPlainTextFromPayload,
} = require("../utils/gmailParser");
const { looksJobRelated } = require("../utils/looksJobRelated");
const { classifyEmailML } = require("./mlClient");
const { extractJobFieldsLLM } = require("./llmExtractor");

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
    if (!user.google_refresh_token)
      throw new Error("Google not connected for this user");

    const authClient = await getAuthedClientForUser(user);
    const gmail = google.gmail({ version: "v1", auth: authClient });
    const q =
      'newer_than:50d (interview OR "thank you for applying" OR "application received" OR assessment OR "coding test" OR offer OR rejected OR recruiter OR hiring OR careers OR "application status")';

    const list = await gmail.users.messages.list({
      userId: "me",
      q,
      maxResults: 1000,
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


      const heuristicPassed = looksJobRelated(subject, from, plainText || "");

      await pool.query(
        `UPDATE gmail_messages
         SET heuristic_passed = $1
         WHERE user_id=$2 AND gmail_message_id=$3`,
        [heuristicPassed, userId, messageId]
      );

      if (!heuristicPassed) {
        skipped++;
        continue;
      }

      
      let ml;
      try {
        ml = await classifyEmailML({
          subject,
          from,
          body: plainText || "",
        });
      } catch (e) {
        await pool.query(
          `UPDATE gmail_messages
           SET ml_reason=$1, ml_model_version=$2
           WHERE user_id=$3 AND gmail_message_id=$4`,
          [
            `ML_ERROR: ${e.message}`,
            process.env.ML_MODEL_VERSION || null,
            userId,
            messageId,
          ]
        );
        skipped++;
        continue;
      }

      await pool.query(
        `UPDATE gmail_messages
         SET ml_event_type=$1,
             ml_confidence=$2,
             ml_reason=$3,
             ml_model_version=$4
         WHERE user_id=$5 AND gmail_message_id=$6`,
        [
          ml.event_type || null,
          ml.confidence ?? null,
          ml.reason || null,
          ml.model_version || process.env.ML_MODEL_VERSION || null,
          userId,
          messageId,
        ]
      );

      if (!ml.is_job_related) {
        skipped++;
        continue;
      }

      let finalCompany = extractCompany(subject, from);
      let finalRole = extractRole(subject, plainText);
      const t = (ml.event_type || "").toLowerCase();
      let status = "Applied";
      if (t === "interview") status = "Interview";
      else if (t === "offer") status = "Offer";
      else if (t === "rejected") status = "Rejected";

      let extractionSource = "ml";

      const enableLLM = process.env.ENABLE_LLM === "true";
      const threshold = Number(process.env.LLM_CONFIDENCE_THRESHOLD || 0.75);

      const companyUnknown =
        !finalCompany || finalCompany.toLowerCase().trim() === "unknown";
      const roleUnknown =
        !finalRole || finalRole.toLowerCase().includes("unknown");

      const shouldUseLLM =
        enableLLM &&
        ml.is_job_related &&
        (Number(ml.confidence || 0) < threshold || companyUnknown || roleUnknown);

      if (shouldUseLLM) {
        try {
          const llmRes = await extractJobFieldsLLM({
            subject,
            from,
            body: (plainText || "").slice(0, 2500),
          });

          await pool.query(
            `UPDATE gmail_messages
             SET llm_used=TRUE,
                 llm_extracted=$1,
                 llm_model=$2,
                 llm_confidence=$3,
                 llm_error=NULL
             WHERE user_id=$4 AND gmail_message_id=$5`,
            [
              llmRes,
              process.env.OLLAMA_MODEL || "llama3.1:8b",
              llmRes.confidence ?? null,
              userId,
              messageId,
            ]
          );

          if (llmRes.is_job_related) {
            finalCompany = llmRes.company || finalCompany;
            finalRole = llmRes.role || finalRole;
            status = llmRes.status || status;
            extractionSource = "llm";
          }
        } catch (err) {
          await pool.query(
            `UPDATE gmail_messages
             SET llm_used=TRUE,
                 llm_error=$1
             WHERE user_id=$2 AND gmail_message_id=$3`,
            [String(err?.message || err), userId, messageId]
          );
        }
      }

      // Safety net: if both unknown after everything, skip
      const companyUnknownFinal =
        !finalCompany || finalCompany.toLowerCase().trim() === "unknown";
      const roleUnknownFinal =
        !finalRole || finalRole.toLowerCase().includes("unknown");
      if (companyUnknownFinal && roleUnknownFinal) {
        skipped++;
        continue;
      }
      await pool.query(
        `INSERT INTO jobs
          (user_id, company, role, applied_date, status, gmail_message_id, classification_confidence, extraction_source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (user_id, company, role, applied_date) DO NOTHING`,
        [
          userId,
          finalCompany,
          finalRole,
          receivedAt,
          status,
          messageId,
          ml.confidence ?? null,
          extractionSource,
        ]
      );

      added++;
    }

    await pool.query(
      `UPDATE sync_runs
       SET finished_at = NOW(), added=$1, skipped=$2
       WHERE id=$3`,
      [added, skipped, runId]
    );

    await pool.query(`UPDATE users SET last_sync_at = NOW() WHERE id=$1`, [
      userId,
    ]);

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
    await pool.query(`UPDATE users SET is_syncing = FALSE WHERE id=$1`, [userId]);
  }
}

module.exports = { syncGmailForUser };
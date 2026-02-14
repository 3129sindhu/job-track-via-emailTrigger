const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const pool = require("../config/db");
const { getAuthorizedGmailClient } = require("../services/gmailService");
const { parseJobFromEmail } = require("../utils/emailParser");

// Fetch recent emails and store jobs
router.post("/sync", auth, async (req, res) => {
  const userId = req.user.userId;
  const maxResults = req.body.maxResults || 10;

  try {
    const gmail = await getAuthorizedGmailClient(userId);

    // Search for application emails
    const query = "newer_than:30d (\"thank you for applying\" OR \"application received\" OR \"we received your application\")";

    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults,
    });

    const messages = listRes.data.messages || [];
    let inserted = 0;

    for (const m of messages) {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: m.id,
        format: "metadata",
        metadataHeaders: ["Subject"],
      });

      const headers = msg.data.payload.headers || [];
      const subjectHeader = headers.find(h => h.name === "Subject");
      const subject = subjectHeader?.value || "";
      const snippet = msg.data.snippet || "";

      const parsed = parseJobFromEmail({ subject, snippet });
      if (!parsed) continue;

      // insert job if not duplicate (simple de-dupe)
      // You can improve later using email messageId stored in db
      await pool.query(
        `INSERT INTO jobs (user_id, company, role, status)
         VALUES ($1, $2, $3, 'Applied')`,
        [userId, parsed.company, parsed.role]
      );

      inserted++;
    }

    res.json({ ok: true, inserted, checked: messages.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

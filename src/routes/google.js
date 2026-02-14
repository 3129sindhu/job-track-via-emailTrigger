const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const auth = require("../middleware/auth");
const oAuth2Client = require("../config/googleClient");

// 1) Generate URL
router.get("/connect", auth, async (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly"
  ];

  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",      // needed for refresh_token
    prompt: "consent",           // forces refresh_token first time
    scope: scopes,
    state: String(req.user.userId), // pass userId through callback
  });

  res.json({ ok: true, url });
});

// 2) OAuth callback
router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const userId = req.query.state; // we passed userId in state

  if (!code || !userId) {
    return res.status(400).send("Missing code or state");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);

    // Save tokens to DB
    await pool.query(
      `UPDATE users
       SET google_refresh_token = COALESCE($1, google_refresh_token),
           google_access_token = $2,
           google_token_expiry = to_timestamp($3 / 1000.0)
       WHERE id = $4`,
      [
        tokens.refresh_token || null,
        tokens.access_token || null,
        tokens.expiry_date || null,
        userId
      ]
    );

    res.send("✅ Gmail connected successfully. You can close this tab.");
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth failed: " + err.message);
  }
});

module.exports = router;

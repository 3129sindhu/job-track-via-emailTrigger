const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {verifyToken} = require("../middleware/auth");
const oAuth2Client = require("../config/googleClient");


router.get("/connect", verifyToken, async (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly"
  ];

  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",      
    prompt: "consent",           
    scope: scopes,
    state: String(req.user.userId), 
  });

  res.json({ ok: true, url });
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const userId = req.query.state; 

  if (!code || !userId) {
    return res.status(400).send("Missing code or state");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log("refresh_token:", tokens.refresh_token);
console.log("access_token:", !!tokens.access_token);

    // Save tokens to DB
    await pool.query(
  `UPDATE users
   SET google_refresh_token = $1,
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

    res.send("Gmail connected successfully. You can close this tab.");
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth failed: " + err.message);
  }
});

module.exports = router;

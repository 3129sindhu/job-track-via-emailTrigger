const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const pool = require("../config/db");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ ok: false, error: "idToken is required" });
  }

  try {
   
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const emailVerified = payload?.email_verified;

    if (!email || !emailVerified) {
      return res.status(401).json({ ok: false, error: "Google email not verified" });
    }
    const result = await pool.query(
      `INSERT INTO users (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email`,
      [email]
    );

    const user = result.rows[0];

    //  Issue your app JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({ ok: true, token, user });
  } catch (err) {
    console.error("Google login failed:", err);
    return res.status(401).json({ ok: false, error: "Invalid Google token" });
  }
});

module.exports = router;
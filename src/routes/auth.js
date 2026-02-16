const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const pool = require("../config/db");

router.post("/login", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ ok: false, error: "email is required" });

  try {
    const result = await pool.query(
      `INSERT INTO users (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email`,
      [email]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
    res.json({ ok: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

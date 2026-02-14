const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Create user (simple: just email)
router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ ok: false, error: "email is required" });

  try {
    // upsert style: insert or return existing
    const result = await pool.query(
      `INSERT INTO users (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email, created_at`,
      [email]
    );

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get user by email
router.get("/", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ ok: false, error: "email query param required" });

  try {
    const result = await pool.query("SELECT id, email, created_at FROM users WHERE email=$1", [email]);
    if (result.rowCount === 0) return res.status(404).json({ ok: false, error: "user not found" });

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

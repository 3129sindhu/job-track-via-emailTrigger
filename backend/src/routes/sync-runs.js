const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {verifyToken} = require("../middleware/auth");

router.get("/", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT * FROM sync_runs
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({ ok: true, runs: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const auth = require("../middleware/auth");

// Create a job (auth required)
router.post("/", auth, async (req, res) => {
  const { company, role, appliedDate, status } = req.body;
  const userId = req.user.userId;

  if (!company || !role) {
    return res.status(400).json({ ok: false, error: "company and role are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO jobs (user_id, company, role, applied_date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, company, role, appliedDate || null, status || "Applied"]
    );

    res.json({ ok: true, job: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// List jobs for current user (auth required)
router.get("/", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT * FROM jobs
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ ok: true, jobs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Update job status (auth required)
router.patch("/:id/status", auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;

  if (!status) return res.status(400).json({ ok: false, error: "status is required" });

  try {
    // ensure user can only update their own job
    const result = await pool.query(
      `UPDATE jobs
       SET status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "job not found for this user" });
    }

    res.json({ ok: true, job: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

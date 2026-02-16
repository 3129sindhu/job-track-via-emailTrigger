const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth");

router.post("/", verifyToken, async (req, res) => {
  const { company, role, appliedDate, status } = req.body;
  const userId = req.user.userId;

  if (!company || !role) {
    return res
      .status(400)
      .json({ ok: false, error: "company and role are required" });
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
router.get("/", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  const { status, company, role, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const values = [userId];
  let where = `WHERE user_id = $1`;
  let idx = 2;

  if (status) {
    where += ` AND status = $${idx++}`;
    values.push(status);
  }
  if (company) {
    where += ` AND company ILIKE $${idx++}`;
    values.push(`%${company}%`);
  }
  if (role) {
    where += ` AND role ILIKE $${idx++}`;
    values.push(`%${role}%`);
  }

  try {
    const data = await pool.query(
      `SELECT * FROM jobs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, Number(limit), offset]
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM jobs ${where}`,
      values
    );

    res.json({
      ok: true,
      total: Number(count.rows[0].count),
      page: Number(page),
      limit: Number(limit),
      jobs: data.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch("/:id/status", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;

  if (!status)
    return res.status(400).json({ ok: false, error: "status is required" });

  try {
    const result = await pool.query(
      `UPDATE jobs
       SET status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "job not found" });
    }

    res.json({ ok: true, job: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
router.patch("/:id", verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { company, role, appliedDate, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE jobs
       SET company = COALESCE($1, company),
           role = COALESCE($2, role),
           applied_date = COALESCE($3, applied_date),
           status = COALESCE($4, status)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [company || null, role || null, appliedDate || null, status || null, id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "job not found" });
    }

    res.json({ ok: true, job: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

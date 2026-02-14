require("dotenv").config();
const express = require("express");
const cors = require("cors");

const healthRoute = require("./routes/health");
const usersRoute = require("./routes/users");
const jobsRoute = require("./routes/jobs");
const authRoute = require("./routes/auth");
const pool = require("./config/db");
const googleRoute = require("./routes/google");
const gmailRoute = require("./routes/gmail");

const app = express();


// Middleware (must come before routes)
app.use(cors());
app.use(express.json());

// Routes
app.use("/gmail", gmailRoute);

app.use("/google", googleRoute);
app.use("/auth", authRoute);
app.use("/health", healthRoute);
app.use("/users", usersRoute);
app.use("/jobs", jobsRoute);

// DB test route (keep this)
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, now: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("Job Tracker Backend is running");
});

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

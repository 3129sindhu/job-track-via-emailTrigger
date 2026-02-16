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
const syncRoute = require("./routes/sync");
const syncRunsRoute = require("./routes/sync-runs");
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());


// Routes
app.use("/sync-runs", syncRunsRoute);
app.use("/gmail", gmailRoute);
app.use("/sync", syncRoute);
app.use("/google", googleRoute);
app.use("/auth", authRoute);
app.use("/health", healthRoute);
app.use("/users", usersRoute);
app.use("/jobs", jobsRoute);

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, now: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Job Tracker Backend is running");
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

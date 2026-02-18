const pool = require("../config/db");
const { syncGmailForUser } = require("./gmailSyncService");

async function runAutoSync() {
  const users = await pool.query(
    `SELECT id FROM users WHERE google_refresh_token IS NOT NULL`
  );

  for (const u of users.rows) {
    console.log("Auto syncing user:", u.id);
    const result = await syncGmailForUser(u.id);
    console.log("Result:", result);
  }
}

module.exports = { runAutoSync };

const { google } = require("googleapis");
const pool = require("../config/db");
const oAuth2Client = require("../config/googleClient");

async function getAuthorizedGmailClient(userId) {
  const result = await pool.query(
    `SELECT google_refresh_token, google_access_token, google_token_expiry
     FROM users WHERE id=$1`,
    [userId]
  );

  if (result.rowCount === 0) throw new Error("User not found");
  const user = result.rows[0];

  if (!user.google_refresh_token) {
    throw new Error("User has not connected Gmail yet");
  }

  oAuth2Client.setCredentials({
    refresh_token: user.google_refresh_token,
    access_token: user.google_access_token || undefined,
  });

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  return gmail;
}

module.exports = { getAuthorizedGmailClient };

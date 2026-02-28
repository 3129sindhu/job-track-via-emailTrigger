const { google } = require("googleapis");

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getAuthedClientForUser(userRow) {
  const oAuth2Client = getOAuthClient();
  oAuth2Client.setCredentials({
    refresh_token: userRow.google_refresh_token,
  });

  const { token } = await oAuth2Client.getAccessToken();
  if (token) {    oAuth2Client.setCredentials({ access_token: token });
  }

  return oAuth2Client;
}

module.exports = { getAuthedClientForUser };

const axios = require("axios");

async function classifyEmailML({ subject, from, body }) {
  const base = process.env.ML_SERVICE_URL || "http://localhost:8000";
  const resp = await axios.post(`${base}/classify`, {
    subject: subject || "",
    from: from || "",
    body: (body || "").slice(0, 2000),
  });
  return resp.data;
}

module.exports = { classifyEmailML };
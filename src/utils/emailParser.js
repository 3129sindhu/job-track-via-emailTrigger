function parseJobFromEmail(email) {
  const subject = email.subject?.toLowerCase() || "";
  const snippet = email.snippet?.toLowerCase() || "";

  const text = `${subject} ${snippet}`;
  const keywords = ["thank you for applying", "application received", "we received your application"];
  const matched = keywords.some(k => text.includes(k));
  if (!matched) return null;
  let company = null;
  const toMatch = ["applying to ", "at "];
  for (const key of toMatch) {
    const idx = subject.indexOf(key);
    if (idx !== -1) {
      company = subject.substring(idx + key.length).trim();
      break;
    }
  }
  if (!company) company = "Unknown";
  const role = "Unknown Role";

  return { company, role };
}

module.exports = { parseJobFromEmail };

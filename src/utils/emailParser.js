function parseJobFromEmail(email) {
  const subject = email.subject?.toLowerCase() || "";
  const snippet = email.snippet?.toLowerCase() || "";

  const text = `${subject} ${snippet}`;

  // Only trigger for apply emails
  const keywords = ["thank you for applying", "application received", "we received your application"];
  const matched = keywords.some(k => text.includes(k));
  if (!matched) return null;

  // Simple company extraction heuristic
  // Example subject: "Thank you for applying to Amazon"
  let company = null;
  const toMatch = ["applying to ", "at "];
  for (const key of toMatch) {
    const idx = subject.indexOf(key);
    if (idx !== -1) {
      company = subject.substring(idx + key.length).trim();
      break;
    }
  }

  // Fallback if company not found
  if (!company) company = "Unknown";

  // Role: hard in MVP, so optional
  const role = "Unknown Role";

  return { company, role };
}

module.exports = { parseJobFromEmail };

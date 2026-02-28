function decodeBase64Url(str) {
  if (!str) return "";
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4;
  if (pad) str += "=".repeat(4 - pad);
  return Buffer.from(str, "base64").toString("utf8");
}

function getHeader(headers, name) {
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : "";
}

function extractCompany(subject = "", from = "", body = "") {
  const text = `${subject}\n${body}`;
  let m = subject.match(/^(.+?)\s*[-–—]\s+/);
  if (m?.[1] && m[1].length <= 40) return cleanCompany(m[1]);
  m = subject.match(/^(.+?)\s*\|\s+/);
  if (m?.[1] && m[1].length <= 40) return cleanCompany(m[1]);
  m = text.match(/thank you for applying to\s+(.+?)(?:[.\n,]|$)/i);
  if (m?.[1]) return cleanCompany(m[1]);
  m = text.match(/thank you for your interest in\s+(.+?)(?:[.\n,]|$)/i);
  if (m?.[1]) return cleanCompany(m[1]);
  m = text.match(/interest in joining\s+(.+?)(?:[.\n,]|$)/i);
  if (m?.[1]) return cleanCompany(m[1]);
  m = text.match(/\b(?:at|with)\s+([A-Z][A-Za-z0-9&.\s-]{2,50})(?:\b|[.\n,])/);
  if (m?.[1]) return cleanCompany(m[1]);
  m = text.match(/\n\s*([A-Z][A-Za-z0-9&.\s-]{2,50})\s+(?:talent|recruiting|hiring)\s+team\b/i);
  if (m?.[1]) return cleanCompany(m[1]);
  const atsDomains = new Set([
    "greenhouse.io",
    "myworkday.com",
    "workday.com",
    "lever.co",
    "ashbyhq.com",
    "smartrecruiters.com",
    "icims.com",
    "successfactors.com",
    "adp.com",
    "oraclecloud.com",
  ]);

  const domainMatch = String(from).match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  if (domainMatch?.[1]) {
    const fullDomain = domainMatch[1].toLowerCase();
    if (atsDomains.has(fullDomain)) {
      return "Unknown";
    }
    const base = fullDomain.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return "Unknown";
}
function extractRole(subject = "", body = "") {
  const text = `${subject}\n${body}`;
  let m = text.match(/\breq\s*#?\s*\d+\s*[-:–]\s*([A-Za-z0-9()&/.,\s-]{3,80})/i);
  if (m?.[1]) return cleanRole(m[1]);
  m = text.match(/position of\s+([A-Za-z0-9()&/.,\s-]{3,80})(?:[.\n,]|$)/i);
  if (m?.[1]) return cleanRole(m[1]);
  m = text.match(/application (?:for|to)\s+(?:the\s+)?([A-Za-z0-9()&/.,\s-]{3,80})(?:\s+(?:role|position|internship)|[.\n,]|$)/i);
  if (m?.[1]) return cleanRole(m[1]);
  m = text.match(/applying for\s+(?:the\s+)?([A-Za-z0-9()&/.,\s-]{3,80})(?:\s+(?:role|position|internship)|[.\n,]|$)/i);
  if (m?.[1]) return cleanRole(m[1]);
  m = text.match(/for\s+the\s+([A-Za-z0-9()&/.,\s-]{3,80})\s+role\s+at/i);
  if (m?.[1]) return cleanRole(m[1]);
  m = text.match(/([A-Za-z\s\/&-]+?)\s*(?:,|\s)\s*(?:Summer|Fall|Spring|Winter).*?position/i);
  if (m?.[1]) return cleanRole(m[1]);
  m = text.match(/in the\s+(.+?)\s+(?:role|position)/i);
  if (m?.[1]) return cleanRole(m[1]);
  m = text.match(/apply to our\s+(.+?)\s+role/i);
  if (m?.[1]) return cleanRole(m[1]);
  return "Unknown Role";
}

function cleanRole(text) {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/[<>()"\[\]]/g, "")
    .trim();
  if (cleaned.length > 80) return cleaned.slice(0, 80).trim();
  return cleaned;
}

function cleanCompany(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/[<>()"\[\]]/g, "")
    .trim();
}

function getPlainTextFromPayload(payload) {
  const parts = [];
  function walk(p) {
    if (!p) return;
    if (p.mimeType === "text/plain" && p.body && p.body.data) {
      parts.push(decodeBase64Url(p.body.data));
    }
    if (p.parts && Array.isArray(p.parts)) {
      p.parts.forEach(walk);
    }
  }
  walk(payload);
  return parts.join("\n").trim();
}

module.exports = {
  getHeader,
  extractCompany,
  extractRole,
  getPlainTextFromPayload,
};



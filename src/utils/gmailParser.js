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
  const text = `${subject} ${body}`;

  let m = text.match(/thank you for applying to\s+(.+?)(\.|\n|,|$)/i);
  if (m?.[1]) return cleanCompany(m[1]);

  m = text.match(/at\s+([A-Z][A-Za-z0-9&\s]+)/);
  if (m?.[1]) return cleanCompany(m[1]);

  m = text.match(/life at\s+([A-Z][A-Za-z0-9&\s]+)/i);
  if (m?.[1]) return cleanCompany(m[1]);

  const domainMatch = from.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  if (domainMatch?.[1]) {
    const domain = domainMatch[1].split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  return "Unknown";
}


function extractRole(subject = "", body = "") {
  const text = `${subject} ${body}`;

  let m = text.match(/([A-Za-z\s\/&-]+?)\s*(?:,|\s)\s*(?:Summer|Fall|Spring|Winter).*?position/i);
  if (m?.[1]) return cleanRole(m[1]);

  m = text.match(/in the\s+(.+?)\s+(?:role|position)/i);
  if (m?.[1]) return cleanRole(m[1]);
  m = text.match(/apply to our\s+(.+?)\s+role/i);
  if (m?.[1]) return cleanRole(m[1]);

  return "Unknown Role";
}


function cleanRole(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/[<>()"\[\]]/g, "")
    .trim();
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

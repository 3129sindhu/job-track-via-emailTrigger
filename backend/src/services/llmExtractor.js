const axios = require("axios");

function safeJsonParse(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  const jsonText = raw.slice(start, end + 1);
  try { return JSON.parse(jsonText); } catch { return null; }
}

function parseFrom(from = "") {
  const m = String(from).match(/^(.*)<([^>]+)>/);
  const fromName = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  const fromEmail = m ? m[2].trim() : String(from).trim();
  const domain = fromEmail.includes("@") ? fromEmail.split("@").pop().toLowerCase() : "";
  return { fromName, fromEmail, domain };
}

function normalizeText(s = "") {
  return String(s).replace(/\r/g, "").trim();
}

function pickRelevantSnippet(body = "") {
  const text = normalizeText(body);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const head = lines.slice(0, 40).join("\n");

  const keywords = ["thank you for applying","application","applied","interview","assessment","offer","rejected","position","role","job title","opening"];
  let hits = [];
  for (let i = 0; i < lines.length; i++) {
    const low = lines[i].toLowerCase();
    if (keywords.some(k => low.includes(k))) {
      hits.push(lines.slice(Math.max(0,i-2), Math.min(lines.length,i+3)).join("\n"));
      if (hits.join("\n\n").length > 1500) break;
    }
  }
  return [head, hits.join("\n\n")].filter(Boolean).join("\n\n---\n\n").slice(0, 2500);
}

const BAD_COMPANY = ["application status","notification","notifications","careers","recruiting","recruitment","hr","no-reply","noreply","talent","candidate"];
const ATS_WORDS = ["workday","greenhouse","lever","ashby","icims","smartrecruiters"];

function cleanRole(role) {
  if (!role) return null;
  let r = String(role).trim();
  r = r.replace(/^(hi|hello|dear)\b[^,\n]{0,40}[,\s]*/i, "");
  r = r.replace(/[,\s]+$/g, "");
  if (r.length > 80) return null;
  if (/[.!?]/.test(r)) return null;
  return r || null;
}

function cleanCompany(company, domain) {
  if (!company) return null;
  let c = String(company).trim();
  const low = c.toLowerCase();

  if (BAD_COMPANY.some(x => low.includes(x))) return null;
  if (ATS_WORDS.some(x => low.includes(x)) && ATS_WORDS.some(x => (domain || "").includes(x))) return null;

  c = c.replace(/\s+from\s+.+$/i, "").trim();
  if (c.length < 2) return null;

  return c || null;
}

async function callOllama({ prompt }) {
  const url = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b";
  const resp = await axios.post(`${url}/api/generate`, {
    model,
    prompt,
    stream: false,
    options: { temperature: 0 },
  });
  return (resp.data?.response || "").trim();
}

async function extractJobFieldsLLM({ subject, from, body }) {
  const { fromName, fromEmail, domain } = parseFrom(from);
  const snippet = pickRelevantSnippet(body);

  const basePrompt = `
You extract job application info from emails.

Return ONLY valid JSON matching exactly this schema:
{
  "is_job_related": boolean,
  "company": string|null,
  "role": string|null,
  "status": "Applied"|"Interview"|"Offer"|"Rejected"|null,
  "confidence": number
}

Hard rules:
- Output JSON ONLY. No markdown, no extra keys, no commentary.
- "company" must be the real employer name. Do NOT output labels like "Application Status", "Notifications", "Careers", "Recruiting Team", "HR".
- If SenderDomain looks like an ATS (workday/greenhouse/lever/ashby/icims/smartrecruiters), do NOT use FromName as company.
- "role" must be a job title only. Remove greetings/names/sentences/commas.

If unsure, set fields to null and lower confidence.

Subject: ${subject}
FromName: ${fromName}
FromEmail: ${fromEmail}
SenderDomain: ${domain}

BodySnippet:
${snippet}
`.trim();

  // 1st try
  const raw1 = await callOllama({ prompt: basePrompt });
  const parsed1 = safeJsonParse(raw1);

  let out = parsed1
    ? {
        is_job_related: !!parsed1.is_job_related,
        company: cleanCompany(parsed1.company, domain),
        role: cleanRole(parsed1.role),
        status: parsed1.status ?? null,
        confidence: typeof parsed1.confidence === "number" ? parsed1.confidence : 0,
      }
    : null;

  // Retry if junk/null fields
  if (!out || (!out.company && !out.role)) {
    const retryPrompt = basePrompt + `\n\nBe conservative: if company or role cannot be confidently extracted, set them to null.`;
    const raw2 = await callOllama({ prompt: retryPrompt });
    const parsed2 = safeJsonParse(raw2);
    if (parsed2) {
      out = {
        is_job_related: !!parsed2.is_job_related,
        company: cleanCompany(parsed2.company, domain),
        role: cleanRole(parsed2.role),
        status: parsed2.status ?? null,
        confidence: typeof parsed2.confidence === "number" ? parsed2.confidence : 0,
      };
    }
  }

  if (!out) {
    return { is_job_related: false, company: null, role: null, status: null, confidence: 0, _raw: raw1?.slice?.(0, 400) };
  }
  return out;
}

module.exports = { extractJobFieldsLLM };
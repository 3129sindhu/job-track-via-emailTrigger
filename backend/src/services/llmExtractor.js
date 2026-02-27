const axios = require("axios");

function safeJsonParse(raw) {
  // Extract JSON even if model adds extra text
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  const jsonText = raw.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

async function extractJobFieldsLLM({ subject, from, body }) {
  const url = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

  const prompt = `
You extract structured job application info from emails.
Return ONLY valid JSON with this schema:
{
  "is_job_related": boolean,
  "company": string|null,
  "role": string|null,
  "status": "Applied"|"Interview"|"Offer"|"Rejected"|null,
  "confidence": number
}

Rules:
- Output JSON ONLY (no markdown, no explanations)
- If unsure, set fields to null and lower confidence (0 to 1).
- Company should be the organization name (not LinkedIn/Workday/Greenhouse unless it truly is the sender company).
- Role should be the job title if present.

Email:
Subject: ${subject}
From: ${from}
Body:
${body}
`.trim();

  const resp = await axios.post(`${url}/api/generate`, {
    model,
    prompt,
    stream: false,
    options: { temperature: 0 },
  });

  const raw = (resp.data?.response || "").trim();
  const parsed = safeJsonParse(raw);

  if (!parsed) {
    return {
      is_job_related: false,
      company: null,
      role: null,
      status: null,
      confidence: 0,
      _raw: raw.slice(0, 400),
    };
  }

  // normalize
  return {
    is_job_related: !!parsed.is_job_related,
    company: parsed.company ?? null,
    role: parsed.role ?? null,
    status: parsed.status ?? null,
    confidence:
      typeof parsed.confidence === "number" ? parsed.confidence : 0,
  };
}

module.exports = { extractJobFieldsLLM };
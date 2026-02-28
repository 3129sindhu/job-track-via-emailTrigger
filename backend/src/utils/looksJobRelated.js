function looksJobRelated(subject = "", from = "", body = "") {
  const s = String(subject || "").toLowerCase();
  const f = String(from || "").toLowerCase();
  const b = String(body || "").toLowerCase();
  const text = `${s} ${f} ${b.slice(0, 4000)}`;
  const atsDomains = [
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
  ];

  const fromHasATS = atsDomains.some((d) => f.includes(d));
  const strongPhrases = [
    "thank you for applying",
    "application received",
    "we have received your application",
    "we received your application",
    "your application has been received",
    "application confirmation",
    "application submitted",
    "submission received",
    "candidate portal",
    "check application status",
    "talent acquisition",
    "recruiting team",
    "hiring team",
    "employment update",
    "next stage",
    "next steps",
    "shortlisted",
    "interview invitation",
    "interview scheduling",
    "select a time",
    "assessment invitation",
    "coding assessment",
    "online assessment",
    "offer letter",
    "we are pleased to offer",
    "regret to inform",
    "not moving forward",
  ];

  const mediumPhrases = [
    "position of",
    "role at",
    "job posting",
    "career site",
    "careers site",
    "job application",
    "application status",
    "application update",
    "requisition",
    "req #",
    "candidate id",
  ];
  const hardNegatives = [
    "order confirmation",
    "your order",
    "delivery",
    "shipped",
    "invoice",
    "payment receipt",
    "your receipt",
    "subscription renewed",
    "limited time sale",
    "promotion",
    "newsletter",
    "unsubscribe",
  ];

  const strongHit = strongPhrases.some((k) => text.includes(k));
  const mediumHits = mediumPhrases.reduce(
    (acc, k) => acc + (text.includes(k) ? 1 : 0),
    0
  );
  const negHit = hardNegatives.some((k) => text.includes(k));

  let score = 0;
  if (fromHasATS) score += 3;
  if (strongHit) score += 3;
  score += mediumHits; 
  if (negHit && score < 3) return false;
  return score >= 3;
}

module.exports = { looksJobRelated };
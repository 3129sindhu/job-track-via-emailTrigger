
import csv, random, argparse, re
from datetime import datetime, timedelta
def norm(s: str) -> str:
    return (
        s.lower()
        .replace("&", "and")
        .replace(".", "")
        .replace(",", "")
        .replace(" ", "")
        .replace("-", "")
    )

def rand_ts(days=180):
    now = datetime.now()
    t = now - timedelta(seconds=random.randint(0, days * 24 * 3600))
    return t.isoformat(timespec="seconds")

def maybe_html(body: str) -> str:
    if random.random() < 0.50:
        safe = body.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        safe = safe.replace("\n", "<br/>")
        wrappers = [
            f"<html><body><div>{safe}</div></body></html>",
            f"<html><body><p>{safe}</p></body></html>",
            f"<html><body><table><tr><td>{safe}</td></tr></table></body></html>",
            f"<!doctype html><html><body><span style='font-family:Arial'>{safe}</span></body></html>",
        ]
        return random.choice(wrappers)
    return body

def maybe_noise_whitespace(s: str) -> str:
    if random.random() < 0.25:
        s = re.sub(r"\s+", lambda m: "  " if random.random() < 0.08 else m.group(0), s)
    return s

def maybe_typo(s: str) -> str:
    if random.random() < 0.18 and len(s) > 25:
        i = random.randint(5, len(s) - 5)
        s = s[:i] + s[i + 1 :]
    return maybe_noise_whitespace(s)

def maybe_unicode(s: str) -> str:
    if random.random() < 0.15:
        s += random.choice([" — thanks!", " ✅", " •", " ✨", " 🙌"])
    return s

def maybe_forward_reply(subject: str) -> str:
    r = random.random()
    if r < 0.10:
        return "Fwd: " + subject
    if r < 0.20:
        return "Re: " + subject
    return subject

def maybe_empty_or_short_body(body: str) -> str:
    r = random.random()
    if r < 0.05:
        return ""
    if r < 0.12:
        return "Please see the update in the portal."
    return body

def maybe_long_footer(body: str, label: str) -> str:
    footer = []
    if random.random() < 0.65:
        footer += [
            "",
            "—",
            "This email was sent automatically. Please do not reply.",
        ]
    if random.random() < 0.55:
        footer += [
            "Privacy Policy: https://example.com/privacy",
            "Terms: https://example.com/terms",
        ]
    if label == "not_job" and random.random() < 0.75:
        footer += [f"Unsubscribe: https://prefs.example.com/u/{random.randint(10000,99999)}"]
    elif label != "not_job" and random.random() < 0.10:
        footer += [f"Unsubscribe: https://prefs.example.com/u/{random.randint(10000,99999)}"]
    if footer:
        return body + "\n" + "\n".join(footer)
    return body

SHARED_SUBJECTS = [
    "Application update",
    "Status update",
    "Next steps",
    "Decision update",
    "Regarding your submission",
    "Update regarding your application",
    "Employment update",
    "Follow up",
    "Update",
    "Important update",
]

NOT_JOB_SUBJECTS = [
    "New jobs recommended for you",
    "Your job alerts update",
    "Top roles this week",
    "Complete your profile",
    "Recruiter tips and insights",
    "Trending companies hiring now",
    "Jobs matching your search",
    "New opportunities near you",
]

JOB_SUBJECT_CUES = [
    "Thank you for applying",
    "We received your application",
    "Interview scheduling",
    "Invitation to interview",
    "Online assessment",
    "Coding test",
    "Offer details",
    "Feedback on your application",
]

SNIPPETS = {
    "applied": [
        "We received your application and our team will review it.",
        "Your application has been submitted successfully.",
        "No action is needed at this time.",
    ],
    "interview": [
        "Please share your availability for an interview.",
        "Choose a time slot using the scheduling link.",
        "A recruiter will coordinate next steps.",
    ],
    "rejected": [
        "We have decided to move forward with other candidates.",
        "Thank you for your time and interest in the role.",
        "We encourage you to apply for future openings.",
    ],
    "offer": [
        "We are excited to extend an offer for the position.",
        "Please review the offer letter and respond by the deadline.",
        "A document outlining next steps is available in the portal.",
    ],
    "other": [
        "Your application is still under review.",
        "We will share updates as soon as possible.",
        "Thanks for your patience during this process.",
    ],
    "not_job": [
        "Here are roles recommended for you based on your profile.",
        "Update your preferences to improve recommendations.",
        "Explore new opportunities tailored to you.",
    ],
}

SHARED_LINES = [
    "Thank you for your interest.",
    "This message may be automated.",
    "For details, sign in to the portal.",
    "We will reach out with updates.",
    "No reply is required for this message.",
]

def portal_lines(company: str):
    return [
        f"Reference ID: {random.randint(100000,999999)}",
        f"Portal: https://{norm(company)}.careers.example.com/candidate/{random.randint(10000,99999)}",
        f"View message: https://trk.example.com/c/{random.randint(10**7,10**8-1)}",
    ]

NOT_JOB_LINES = [
    "Manage alerts: https://alerts.example.com/a/{id}",
    "Update your job preferences: https://prefs.example.com/p/{id}",
    "View more roles: https://jobs.example.com/r/{id}",
]

CONFUSION_PHRASES = [
    "assessment",
    "interview",
    "application",
    "portal",
    "candidate",
    "role",
    "submission",
    "offer",
    "unfortunately",
]

def mix_body(true_label: str, company: str, strength: float):
    labels = ["applied", "interview", "rejected", "offer", "other", "not_job"]
    others = [l for l in labels if l != true_label]

    lines = []

    lines += random.sample(SHARED_LINES, k=3)
    lines += random.sample(SNIPPETS[true_label], k=2 if random.random() < 0.8 else 3)
    if random.random() < strength:
        distract = random.choice(others)
        lines += random.sample(SNIPPETS[distract], k=1)
    if random.random() < (strength * 0.35):
        distract2 = random.choice(others)
        if distract2 != true_label:
            lines += random.sample(SNIPPETS[distract2], k=1)
    if true_label != "not_job":
        if random.random() < 0.65:
            lines += [random.choice(portal_lines(company))]
        if random.random() < 0.35:
            lines += [random.choice(portal_lines(company))]
    else:
        if random.random() < 0.70:
            lines += [random.choice(NOT_JOB_LINES).format(id=random.randint(10000,99999))]

        
        if random.random() < 0.10:
            lines += [random.choice(portal_lines(company))]  
        if random.random() < 0.12:
            lines += [f"Your {random.choice(CONFUSION_PHRASES)} is updated in your account."]

    random.shuffle(lines)
    return "\n".join(lines)


ATS_SENDERS = [
    ("greenhouse.io", "no-reply@greenhouse.io"),
    ("myworkday.com", "noreply@myworkday.com"),
    ("lever.co", "recruiting@lever.co"),
    ("ashbyhq.com", "jobs@ashbyhq.com"),
    ("icims.com", "no-reply@icims.com"),
    ("smartrecruiters.com", "no-reply@smartrecruiters.com"),
]

JOB_BOARD_SENDERS = [
    ("linkedin.com", "jobs-noreply@linkedin.com"),
    ("indeed.com", "alert@indeed.com"),
    ("glassdoor.com", "jobs@glassdoor.com"),
]

def make_sender(company: str, label: str):
    """
    Mix sender types across labels to avoid leakage:
    - job emails can come from company domain OR ATS
    - not_job can come from job boards OR sometimes ATS or company domain newsletters
    """
    c = norm(company)

    r = random.random()
    if label == "not_job":
        if r < 0.55:
            d, s = random.choice(JOB_BOARD_SENDERS)
            return s, "job_board"
        if r < 0.80:
            d, s = random.choice(ATS_SENDERS)
            return s, "ats"
        return f"updates@{c}.com", "company_domain"

    if r < 0.65:
        return f"careers@{c}.com", "company_domain"
    else:
        d, s = random.choice(ATS_SENDERS)
        return s, "ats"

def generate(n=8000, seed=42, out="dataset_generated.csv"):
    print(f"Generating dataset with {n} rows, seed={seed}, out={out}")
    random.seed(seed)

    companies = [
        "Google","Amazon","Microsoft","Meta","Netflix","Stripe","Uber","Disney",
        "Airbnb","LinkedIn","Databricks","Samsung","Apple","Nvidia","Salesforce",
        "Adobe","IBM","Oracle","Atlassian","Intel","Qualcomm","Tesla","VMware",
        "Cisco","Shopify","Spotify","Snap","Palantir","Bloomberg","Goldman Sachs",
        "JPMorgan","Morgan Stanley","ByteDance","TikTok","Reddit"
    ]

    roles = [
        "Software Engineer","Software Engineer Intern","Backend Engineer","Data Engineer",
        "ML Engineer","SDET Intern","Security Engineer","Full Stack Engineer"
    ]
    dist = {
        "not_job": 0.35,
        "applied": 0.20,
        "interview": 0.16,
        "rejected": 0.16,
        "offer": 0.07,
        "other": 0.06,
    }

    labels = list(dist.keys())
    probs = [dist[k] for k in labels]

    rows = []
    for _ in range(n):
        label = random.choices(labels, probs, k=1)[0]
        company = random.choice(companies)
        role = random.choice(roles)

        sender, sender_type = make_sender(company, label)

        # Subject: mix vague + cue-based + not-job subjects
        if label == "not_job" and random.random() < 0.70:
            subject = random.choice(NOT_JOB_SUBJECTS)
        else:
            if random.random() < 0.65:
                subject = random.choice(SHARED_SUBJECTS)
            else:
                subject = random.choice(JOB_SUBJECT_CUES)

        if random.random() < 0.55:
            subject = f"{subject} - {company}"
        if random.random() < 0.35:
            subject = f"{subject} ({role})"

        subject = maybe_forward_reply(subject)
        subject = maybe_unicode(maybe_typo(subject))
        strength = 0.55
        if label == "not_job":
            strength = 0.30
        elif label in ("offer", "rejected"):
            strength = 0.45

        body = mix_body(label, company, strength=strength)
        if random.random() < 0.18:
            body += "\n\n" + "\n".join([
                "----- Original Message -----",
                f"From: {sender}",
                f"Subject: {random.choice(SHARED_SUBJECTS)}",
            ])

        if random.random() < 0.15:
            body += "\n\nAttachment: offer_letter.pdf"
        if random.random() < 0.10:
            body += "\n\nSent from my iPhone"

        body = maybe_unicode(maybe_typo(body))
        body = maybe_empty_or_short_body(body)
        body = maybe_long_footer(body, label)
        body = maybe_html(body)

        rows.append({
            "label": label,
            "subject": subject,
            "from": sender,
            "body": body,
            "group_company": norm(company),   
            "sender_type": sender_type,
            "ts_iso": rand_ts(180),
        })

    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, quoting=csv.QUOTE_ALL)
        w.writerow(["label","subject","from","body","group_company","sender_type","ts_iso"])
        for r in rows:
            w.writerow([r["label"], r["subject"], r["from"], r["body"], r["group_company"], r["sender_type"], r["ts_iso"]])

    print(f"Generated {out} with {n} rows @ {datetime.now().isoformat(timespec='seconds')}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=8000)
    ap.add_argument("--out", type=str, default="dataset_generated.csv")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    generate(args.n, args.seed, args.out)

if __name__ == "__main__":
    main()
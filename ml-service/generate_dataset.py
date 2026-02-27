#!/usr/bin/env python3
import csv, random, argparse, re
from datetime import datetime, timedelta

def norm(s):
    return s.lower().replace("&","and").replace(".","").replace(",","").replace(" ","").replace("-","")

def rand_ts(days=180):
    now = datetime.now()
    t = now - timedelta(seconds=random.randint(0, days*24*3600))
    return t.isoformat(timespec="seconds")

def maybe_html(body):
    if random.random() < 0.45:
        safe = body.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\n","<br/>")
        return f"<html><body><div>{safe}</div></body></html>"
    return body

def typo(s):
    if random.random() < 0.15 and len(s) > 20:
        i = random.randint(5, len(s)-5)
        s = s[:i] + s[i+1:]
    if random.random() < 0.20:
        s = re.sub(r"\s+", lambda m: "  " if random.random()<0.06 else m.group(0), s)
    return s

# Shared language to REMOVE easy cues
SHARED_SUBJECTS = [
    "Application update",
    "Status update",
    "Next steps",
    "Decision update",
    "Regarding your submission",
    "Update regarding your application",
    "Employment update",
    "Follow up",
]

# Cross-label snippets to inject confusion
SNIPPETS = {
    "applied": [
        "We received your submission and our team will review it.",
        "You can monitor progress in the portal.",
        "No action is needed at this time.",
    ],
    "interview": [
        "If you'd like to proceed, please share availability.",
        "We may invite you to complete an assessment.",
        "A coordinator will follow up with scheduling options.",
    ],
    "rejected": [
        "We have decided to proceed with other candidates.",
        "Thank you for your time and interest.",
        "We encourage you to apply for future openings.",
    ],
    "offer": [
        "We are excited to share an update regarding your candidacy.",
        "A document outlining next steps is available in the portal.",
        "Please respond within a few business days.",
    ],
    "other": [
        "Your application is still being reviewed.",
        "We will share updates as soon as possible.",
        "Thanks for your patience during this process.",
    ],
    "not_job": [
        "Here are roles recommended for you based on your profile.",
        "This is an automated notification. No reply needed.",
        "Update your preferences to improve recommendations.",
    ],
}

def mix_snippets(true_label, strength=0.55):
    """
    Build a body with shared lines + true label lines + distractor label lines.
    strength: higher -> more confusing
    """
    labels = ["applied","interview","rejected","offer","other","not_job"]
    others = [l for l in labels if l != true_label]

    lines = []
    # Add shared lines (appear everywhere)
    lines += random.sample([
        "Thank you for your interest.",
        "This message is automated.",
        "Please do not reply to this email.",
        "For details, sign in to the portal.",
        "We will reach out with updates.",
    ], k=3)

    # True label content (weak)
    lines += random.sample(SNIPPETS[true_label], k=2)

    # Distractor content from other labels (to confuse)
    k = 2 if random.random() < strength else 1
    distract = random.choice(others)
    lines += random.sample(SNIPPETS[distract], k=k)

    # Sometimes add second distractor
    if random.random() < (strength - 0.15):
        distract2 = random.choice([l for l in others if l != distract])
        lines += random.sample(SNIPPETS[distract2], k=1)

    random.shuffle(lines)
    return "\n".join(lines)

def make_sender(company):
    c = norm(company)
    # Use company domain mostly (harder than greenhouse/workday)
    if random.random() < 0.75:
        return f"careers@{c}.com", "company_domain"
    # Sometimes ATS
    ats = [
        ("greenhouse","no-reply@greenhouse.io"),
        ("workday","noreply@myworkday.com"),
        ("lever","recruiting@lever.co"),
        ("ashby","jobs@ashbyhq.com"),
        ("icims","no-reply@icims.com"),
    ]
    return random.choice(ats)[1], "ats"

def generate(n=5000, seed=42, out="dataset_hard.csv"):
    print(f"Generating dataset with {n} rows, seed={seed}, out={out}");
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

    # More realistic class balance
    dist = {
        "not_job": 0.45,
        "applied": 0.18,
        "interview": 0.14,
        "rejected": 0.14,
        "offer": 0.05,
        "other": 0.04,
    }
    labels = list(dist.keys())
    probs = [dist[k] for k in labels]

    rows = []
    for _ in range(n):
        label = random.choices(labels, probs, k=1)[0]
        company = random.choice(companies)
        role = random.choice(roles)

        sender, sender_type = make_sender(company)

        # Subjects are intentionally vague across ALL labels
        subject = random.choice(SHARED_SUBJECTS)
        if random.random() < 0.55:
            subject = f"{subject} - {company}"
        if random.random() < 0.35:
            subject = f"{subject} ({role})"

        body = mix_snippets(label, strength=0.60)

        # Add portal/tracking/ids without being label-specific
        if random.random() < 0.65:
            body += f"\n\nReference ID: {random.randint(100000,999999)}"
        if random.random() < 0.60:
            body += f"\nPortal: https://{norm(company)}.careers.example.com/candidate/{random.randint(10000,99999)}"
        if random.random() < 0.45:
            body += f"\nView message: https://trk.example.com/c/{random.randint(10**7,10**8-1)}"

        # HTML + typos
        if random.random() < 0.35:
            subject = typo(subject)
        if random.random() < 0.40:
            body = typo(body)
        body = maybe_html(body)

        rows.append({
            "label": label,
            "subject": subject,
            "from": sender,
            "body": body,
            "group_company": norm(company),     # for group split
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
    ap.add_argument("--out", type=str, default="dataset_hard.csv")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    generate(args.n, args.seed, args.out)

if __name__ == "__main__":
    main()
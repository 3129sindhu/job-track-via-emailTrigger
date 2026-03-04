# app.py
from fastapi import FastAPI, HTTPException
import traceback
import joblib
import numpy as np
import os
from typing import Dict, Any

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model = joblib.load(os.path.join(BASE_DIR, "model.joblib"))
vectorizer = joblib.load(os.path.join(BASE_DIR, "vectorizer.joblib"))

MAX_BODY_CHARS = 4000
JOB_RELATED_THRESHOLD = 0.40
ATS_HINTS = ["greenhouse", "myworkday", "workday", "lever", "ashbyhq", "icims", "smartrecruiters"]


def infer_domain(sender: str) -> str:
    sender = (sender or "").strip()
    if "@" in sender:
        return sender.split("@")[-1].strip().lower()
    return ""


def infer_sender_type(domain: str) -> str:
    d = (domain or "").lower()
    return "ats" if any(h in d for h in ATS_HINTS) else "company_domain"


def build_text(subject: str, sender: str, body: str) -> str:
    """
    MUST match the training format in train.py.
    """
    domain = infer_domain(sender)
    sender_type = infer_sender_type(domain)
    return (
        f"SUBJECT: {subject}\n"
        f"FROM: {sender}\n"
        f"DOMAIN: {domain}\n"
        f"SENDER_TYPE: {sender_type}\n"
        f"BODY: {body[:MAX_BODY_CHARS]}"
    )


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/classify")
def classify(payload: Dict[str, Any]):
    try:
        subject = (payload.get("subject") or "").strip()
        sender = (payload.get("from") or payload.get("from_") or "").strip()
        body = payload.get("body") or ""
        text = build_text(subject, sender, body)
        X = vectorizer.transform([text])
        probs = model.predict_proba(X)[0]
        classes = [str(c) for c in model.classes_]
        dist = {c: float(p) for c, p in zip(classes, probs)}
        event_type = max(dist, key=dist.get)
        confidence = float(dist[event_type])
        top2 = sorted(dist.values())[-2:] if len(dist) >= 2 else [confidence, 0.0]
        prob_margin = float(top2[1] - top2[0])
        is_job_related = (event_type != "not_job") and (confidence >= JOB_RELATED_THRESHOLD)

        return {
            "is_job_related": bool(is_job_related),
            "event_type": event_type,
            "confidence": confidence,
            "prob_margin": prob_margin,
            "distribution": dist,
            "reason": "tfidf + LinearSVC (calibrated probabilities), inference text matches training",
            "model_version": "ml-v2-calibrated",
        }

    except Exception as e:
        tb = traceback.format_exc()
        print("CLASSIFY ERROR:", tb)
        raise HTTPException(status_code=500, detail=str(e))
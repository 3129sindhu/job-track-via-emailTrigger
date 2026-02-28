from fastapi import FastAPI
import joblib

app = FastAPI()

model = joblib.load("model.joblib")
vectorizer = joblib.load("vectorizer.joblib")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/classify")
def classify(payload: dict):
    subject = payload.get("subject","")
    sender = payload.get("from","")
    body = payload.get("body","")

    text = f"SUBJECT: {subject}\nFROM: {sender}\nBODY: {body[:2000]}"
    X = vectorizer.transform([text])

    proba = model.predict_proba(X)[0]
    idx = int(proba.argmax())
    conf = float(proba[idx])
    label = str(model.classes_[idx])

    is_job = label != "not_job"

    # simple reason string (fine for demo)
    reason = "tfidf+logreg classification"

    return {
        "is_job_related": bool(is_job),
        "event_type": label,           # applied/interview/rejected/offer/other/not_job
        "confidence": conf,
        "reason": reason,
        "model_version": "logreg-v1"
    }
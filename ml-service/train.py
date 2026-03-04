#!/usr/bin/env python3
# train.py
import csv
import joblib
from collections import Counter

from sklearn.model_selection import GroupShuffleSplit
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV

DATASET = "dataset_12000.csv"


def build_text(row):
    subject = row.get("subject", "") or ""
    sender = row.get("from", "") or row.get("from_", "") or ""
    body = row.get("body", "") or ""
    domain = (sender.split("@")[-1] if "@" in sender else "").lower()
    sender_type = row.get("sender_type", "") or ""
    return (
        f"SUBJECT: {subject}\n"
        f"FROM: {sender}\n"
        f"DOMAIN: {domain}\n"
        f"SENDER_TYPE: {sender_type}\n"
        f"BODY: {body[:3000]}"
    )


def main():
    texts, labels, groups = [], [], []

    with open(DATASET, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            texts.append(build_text(row))
            labels.append((row.get("label") or "").strip())
            groups.append((row.get("group_company") or "unknown").strip().lower())

    gss = GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=42)
    train_idx, test_idx = next(gss.split(texts, labels, groups=groups))

    X_train = [texts[i] for i in train_idx]
    X_test = [texts[i] for i in test_idx]
    y_train = [labels[i] for i in train_idx]
    y_test = [labels[i] for i in test_idx]

    print("Train label dist:", Counter(y_train))
    print("Test label dist: ", Counter(y_test))

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=4,
        max_features=60000,
        stop_words=None,
        sublinear_tf=True,
    )

    Xtr = vectorizer.fit_transform(X_train)
    Xte = vectorizer.transform(X_test)
    base = LinearSVC(class_weight="balanced", C=0.3)
    model = CalibratedClassifierCV(base, method="sigmoid", cv=3)
    model.fit(Xtr, y_train)
    y_pred = model.predict(Xte)
    print("\nConfusion Matrix (TEST):")
    print(confusion_matrix(y_test, y_pred))
    print("\n=== TRAIN PERFORMANCE ===")
    print("Train accuracy:", model.score(Xtr, y_train))
    print(classification_report(y_train, model.predict(Xtr)))
    print("\n=== TEST PERFORMANCE ===")
    print("Test accuracy:", model.score(Xte, y_test))
    print(classification_report(y_test, y_pred))
    joblib.dump(model, "model.joblib")
    joblib.dump(vectorizer, "vectorizer.joblib")
    print("\nSaved model.joblib + vectorizer.joblib")
if __name__ == "__main__":
    main()
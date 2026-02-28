#!/usr/bin/env python3
import csv, joblib
from collections import Counter
from sklearn.model_selection import GroupShuffleSplit
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix

DATASET = "dataset_8000_realistic.csv"

texts, labels, groups = [], [], []

def build_text(row):
    subject = row.get("subject","")
    sender = row.get("from","")
    body = row.get("body","")
    domain = (sender.split("@")[-1] if "@" in sender else "").lower()
    sender_type = row.get("sender_type","")
    return f"SUBJECT: {subject}\nFROM: {sender}\nDOMAIN: {domain}\nSENDER_TYPE: {sender_type}\nBODY: {body[:3000]}"

with open(DATASET, newline="", encoding="utf-8") as f:
    r = csv.DictReader(f)
    for row in r:
        texts.append(build_text(row))
        labels.append(row["label"].strip())
        groups.append(row.get("group_company","unknown").strip().lower())

gss = GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=42)
train_idx, test_idx = next(gss.split(texts, labels, groups=groups))

X_train = [texts[i] for i in train_idx]
X_test  = [texts[i] for i in test_idx]
y_train = [labels[i] for i in train_idx]
y_test  = [labels[i] for i in test_idx]

print("Train label dist:", Counter(y_train))
print("Test label dist: ", Counter(y_test))

vectorizer = TfidfVectorizer(
    ngram_range=(1,2),      
    min_df=4,               
    max_features=60000,     
    stop_words=None,
    sublinear_tf=True
)
Xtr = vectorizer.fit_transform(X_train)
Xte = vectorizer.transform(X_test)

from sklearn.svm import LinearSVC
model = LinearSVC(class_weight="balanced", C=0.3)
model.fit(Xtr, y_train)

y_pred = model.predict(Xte)
print(confusion_matrix(y_test, y_pred))

print("\n=== TRAIN PERFORMANCE ===")
print("Train accuracy:", model.score(Xtr, y_train))
print(classification_report(y_train, model.predict(Xtr)))

print("\n=== TEST PERFORMANCE ===")
print("Test accuracy:", model.score(Xte, y_test))
print(classification_report(y_test, y_pred))
joblib.dump(model, "model.joblib")
joblib.dump(vectorizer, "vectorizer.joblib")
print("Saved model.joblib + vectorizer.joblib")
# Gmail Job Tracker (OAuth + JWT + LLM)

A full-stack system that syncs job-related emails from Gmail, classifies them into application stages, extracts structured fields (company, role, status), and displays everything in a React dashboard.

## What this project does

- **Google OAuth 2.0** for identity + Gmail permission
- **Backend Gmail sync** (cron/manual) using Gmail API
- **Heuristic filter** to reduce noise and avoid unnecessary model calls
- **ML classifier** to label emails as: `applied`, `interview`, `offer`, `rejected`, `other`, `not_job`
- **LLM fallback (Ollama)** for structured extraction when ML confidence is low or fields are unknown
- **PostgreSQL** stores messages, jobs, runs, and model outputs for traceability
- **React dashboard** to view jobs, filter by status, and trigger sync

---

## Tech Stack

**Frontend**
- React
- Fetch/Axios (API calls)

**Backend**
- Node.js + Express (REST APIs)
- Google APIs (Gmail)
- JWT auth middleware
- Cron (scheduled sync)

**ML Service**
- FastAPI (Python)
- scikit-learn (TF-IDF + LinearSVC + calibration)
- joblib (model persistence)

**LLM Extraction**
- Ollama (local LLM inference, e.g. `llama3.1:8b`)

**Database**
- PostgreSQL

---

## Architecture (high-level)

1. **Auth & Security**
   - User signs in with Google (OAuth)
   - Backend stores Gmail **refresh token** (server-only)
   - Backend issues **JWT** for protected APIs

2. **Gmail Ingestion**
   - Cron runs every *15 minutes* and/or user clicks **Sync**
   - Gmail API search pulls recent likely job-related emails
   - Metadata is fetched first to sort oldest → newest
   - Full message is fetched, parsed, and stored in `gmail_messages` (audit trail)

3. **Classification & Extraction Pipeline**
   - **Heuristic filter** (`looksJobRelated`) screens out obvious non-job emails
   - **ML service** predicts event type + confidence
   - **Rule-based extraction** attempts company + role
   - **LLM fallback** runs only if confidence is low or company/role is unknown
   - Jobs are upserted into `jobs` with normalized keys to avoid duplicates



## Repo Structure
- backend: Node.js API + Gmail sync + DB
- frontend: React dashboard
- ml-service: FastAPI classifier (model.joblib + vectorizer.joblib)
- scripts: dataset generation + training scripts



---

## Prerequisites

- Node.js (v18+ recommended)
- Python 3.10+
- PostgreSQL
- Google Cloud Project (OAuth credentials)
- Ollama installed (optional but recommended for LLM fallback)



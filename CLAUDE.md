# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this repository.

## What this project is

**TTB Insurance Verification & Policy Booking** — a Thai insurance demo with two parts:

| Part | Stack | Location | Purpose |
|------|-------|----------|---------|
| Frontend | React 19 + TypeScript + Vite | repo root (`App.tsx`, `components/`) | 4-step wizard: eligibility check → result → upload claim docs → confirmation |
| Backend | FastAPI + OAuth2 (JWT) | `backend/` | OAuth2-protected service that **books policy numbers** (`quoteId` + `subclass` + `agentCode` → policy + receipt) |

The two parts are currently independent (the frontend simulates its flow client-side and does not yet call the backend).

## Repository layout

```
.
├── App.tsx, index.tsx, index.html      # Frontend entry
├── components/                          # React components (EntitlementForm, ConsentModal, …)
├── types.ts, utils.ts                   # Shared FE types + Thai-ID/captcha helpers
├── package.json, vite.config.ts         # FE tooling
├── spec.md                              # Full project specification
└── backend/                             # FastAPI policy-booking service
    ├── app/
    │   ├── main.py                      # App + router wiring + /health
    │   ├── config.py                    # Settings (env-driven, cached)
    │   ├── schemas.py                   # Pydantic models + validators
    │   ├── security.py                  # OAuth2 password flow + JWT + scopes
    │   ├── routers/{auth,policy}.py     # Endpoints
    │   └── services/policy_service.py   # Policy-number generation (thread-safe, idempotent)
    └── tests/test_policy.py
```

## Commands

### Frontend (repo root)
```bash
npm install
npm run dev       # Vite dev server
npm run build     # production build
npm run lint      # tsc --noEmit (type check)
```
Requires `GEMINI_API_KEY` in `.env.local` (see README).

### Backend (`backend/`)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload      # http://127.0.0.1:8000/docs
pytest                             # run the test suite
```

## Backend conventions (important)

- **API contract** is the source of truth. Booking request: `quoteId`, `subclass`,
  `agentCode`. Response: policy fields + nested `receipt`.
- **JSON uses camelCase**; Python uses snake_case. Bridge with Pydantic
  `Field(alias=...)` + `model_config = {"populate_by_name": True}`. Keep this on
  every request/response model.
- **`subclass`** = exactly 3 uppercase English letters (`^[A-Z]{3}$`). It is
  normalized (trim + upper) by a `mode="before"` validator so lowercase input is
  accepted, then the pattern is enforced. **It does NOT appear in the policy number.**
- **Policy number format**: `<prefix>-<productCode><YY>-<running>`, e.g.
  `001-PYAY26-000001`. Driven by `POLICY_PREFIX` (default `001`) and
  `POLICY_PRODUCT_CODE` (default `PYAY`) from settings — never hard-code these.
- **Idempotency**: booking is keyed on `quoteId`. Same quote → same policy.
  Same quote with a different `subclass` → `409 Conflict`.
- **Auth**: every policy endpoint depends on `require_scope("policy:book")`.
  Demo users `agent01` / `branch01`, password `secret`.
- **State** lives in an in-memory dict in `policy_service.py` (a module-level
  singleton). It is for demo only — replace with a DB + sequence for production.
  Tests reset it via the `_reset_store` autouse fixture.

## Working agreements

- After any backend change, run `pytest` in `backend/` and keep it green.
- When you change the API contract, update **all** of: `schemas.py`, the relevant
  router, `tests/test_policy.py`, `backend/README.md`, and `spec.md`.
- Add a test for every new behaviour or bug fix.
- Don't commit secrets, `.env`, `__pycache__`, `node_modules`, or `.venv`
  (already covered by `.gitignore`).
- `bcrypt` is pinned to `4.0.1` in `requirements.txt` because passlib 1.7.4 is
  incompatible with bcrypt 4.1+. Don't bump it without testing auth.

## Git

- Active branch: `claude/fastapi-oauth2-booking-service-us96am` (PR #1).
- Commit with clear messages; pushing to this branch updates the existing PR.
- Do not open a new PR.

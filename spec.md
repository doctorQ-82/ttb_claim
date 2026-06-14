# Project Specification — TTB Policy Booking Service

This document specifies the system precisely enough to (re)build it from scratch.
It covers the backend **policy-booking API** in full and summarizes the existing
frontend.

---

## 1. Overview

A Thai insurance platform with two components:

1. **Policy Booking API** (backend) — an OAuth2-protected FastAPI service. A
   client authenticates, then submits a quote and receives a reserved **policy
   number** plus a **receipt**.
2. **Verification & Claims wizard** (frontend) — a React app guiding a customer
   through eligibility check, consent, document upload, and confirmation.

### Goals
- Reserve a unique, well-formatted policy number for an approved quote.
- Protect the operation behind OAuth2 with scope-based authorization.
- Be idempotent so a retry never allocates a duplicate policy number.

### Non-goals (current version)
- Persistent storage (in-memory only), payments, premium calculation, and
  frontend↔backend integration.

---

## 2. Backend specification

### 2.1 Tech stack
- Python 3.11+, FastAPI, Pydantic v2, Uvicorn.
- Auth: OAuth2 password flow → JWT (`python-jose`), password hashing
  (`passlib[bcrypt]`, with `bcrypt==4.0.1`).
- Tests: pytest + FastAPI `TestClient`.

### 2.2 Configuration (env-driven, with defaults)

| Setting | Env var | Default | Meaning |
|---------|---------|---------|---------|
| Secret key | `SECRET_KEY` | dev placeholder | JWT signing key (**set in prod**) |
| Algorithm | `ALGORITHM` | `HS256` | JWT algorithm |
| Token TTL | `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | access-token lifetime (minutes) |
| Policy prefix | `POLICY_PREFIX` | `001` | first segment of policy number |
| Product code | `POLICY_PRODUCT_CODE` | `PYAY` | product segment of policy number |

### 2.3 Data model

**BookPolicyRequest**
| Field (JSON) | Type | Rules |
|--------------|------|-------|
| `quoteId` | string | required, non-empty |
| `subclass` | string | required, **exactly 3 uppercase A–Z letters** (`^[A-Z]{3}$`); trimmed + upper-cased before validation |
| `agentCode` | string | required, 1–20 chars; trimmed + upper-cased |

**Receipt**
| Field (JSON) | Type |
|--------------|------|
| `receiptNo` | string (`RCP-<YY>-<running>`) |
| `policyNo` | string |
| `quoteId` | string |
| `issuedAt` | datetime (UTC, ISO-8601) |

**PolicyResponse**
| Field (JSON) | Type |
|--------------|------|
| `policyNo` | string |
| `quoteId` | string |
| `subclass` | string |
| `agentCode` | string |
| `status` | string (`BOOKED`) |
| `bookedAt` | datetime (UTC) |
| `bookedBy` | string (authenticated username) |
| `receipt` | Receipt |

> JSON is camelCase; internal Python is snake_case (Pydantic aliases).

### 2.4 Policy number format

```
<POLICY_PREFIX>-<POLICY_PRODUCT_CODE><YY>-<running:6>
example:  001-PYAY26-000001
```
- `<YY>` = booking year, 2 digits (UTC).
- `<running>` = zero-padded global sequence, 6 digits.
- **The policy number is independent of `subclass`** — `subclass` is stored on
  the booking only and never appears in the number.

### 2.5 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/token` | none | OAuth2 password grant → JWT (`access_token`, `token_type`, `expires_in`) |
| `POST` | `/policies/book` | scope `policy:book` | Book/reserve a policy; returns `PolicyResponse` (201) |
| `GET`  | `/policies/{quoteId}` | scope `policy:book` | Fetch a previously booked policy |
| `GET`  | `/health` | none | Liveness probe |

### 2.6 Behaviour & error handling

- **Idempotency**: keyed on `quoteId`. Re-booking the same quote returns the
  existing policy (and the same number).
- **Conflict**: same `quoteId` booked with a different `subclass` → `409`.
- **Validation**: malformed/missing fields (e.g. `subclass` not 3 A–Z letters,
  missing `agentCode`) → `422`.
- **Auth**: missing/invalid/expired token → `401`; valid token lacking
  `policy:book` scope → `403`.
- **Not found**: `GET /policies/{quoteId}` for an unbooked quote → `404`.
- Sequence allocation is thread-safe (lock-guarded).

### 2.7 Authentication

- OAuth2 password flow; `tokenUrl = auth/token`.
- JWT payload: `sub` (username), `scopes` (list), `exp`.
- Demo identity store (replace in prod): `agent01`, `branch01`, password
  `secret`, scope `policy:book`.

### 2.8 Acceptance tests (must pass)

1. `/health` returns `{"status":"ok"}`.
2. Valid login returns a bearer token; invalid credentials → 401.
3. `POST /policies/book` without a token → 401.
4. Successful booking returns 201 with `policyNo == 001-PYAY<YY>-000001`,
   `status == BOOKED`, `bookedBy == agent01`, and a populated `receipt`.
5. `subclass`/`agentCode` are normalized (e.g. `" pya "` → `PYA`).
6. Invalid `subclass` (`PY`, `PYAY`, `PY1`, `P1A`, non-Latin) → 422.
7. Booking the same quote twice returns the same `policyNo`.
8. Same quote + different `subclass` → 409.
9. Policy number is independent of `subclass` across different quotes.
10. `GET /policies/{quoteId}` returns the booking; unknown quote → 404.

### 2.9 Project structure
```
backend/
├── app/{main,config,schemas,security}.py
├── app/routers/{auth,policy}.py
├── app/services/policy_service.py
└── tests/test_policy.py
```

---

## 3. Frontend specification (existing)

- **Stack**: React 19, TypeScript, Vite, Tailwind (utility classes),
  `lucide-react` icons.
- **Flow** (4-step wizard in `App.tsx`):
  1. **Eligibility** — `EntitlementForm` collects name, Thai National ID
     (checksum-validated via `utils.validateThaiId`), account type.
  2. **Consent** — `ConsentModal` (PDPA-style) → simulated eligibility result.
  3. **Result** — `ResultView` shows eligible / not eligible.
  4. **Upload & Confirm** — `UploadSection` for claim documents, then
     `ConfirmationView` with a generated reference number (`TTB-XXXXXXXX`).
- **Types** in `types.ts` (`UserData`, `UploadedFile`, `VerificationResult`,
  `AccountType`, `ClaimType`). Helpers in `utils.ts` (Thai-ID validation,
  captcha, file-size formatting).

### Future integration (suggested)
- Replace the client-side eligibility simulation and the local reference-number
  generation by calling the backend; obtain a token from `/auth/token` and call
  `/policies/book` to display the real `policyNo` + `receipt`.

---

## 4. Build order (for recreating the project)

1. Scaffold `backend/` package + `requirements.txt` (pin `bcrypt==4.0.1`).
2. `config.py` (Settings) → `schemas.py` (models + validators) → `security.py`
   (auth) → `services/policy_service.py` → `routers/` → `main.py`.
3. Write `tests/test_policy.py` covering §2.8; run `pytest` until green.
4. (Optional) wire the frontend wizard to the API per §3.

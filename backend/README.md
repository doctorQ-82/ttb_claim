# TTB Policy Booking Service (FastAPI)

OAuth2-protected FastAPI service that **books (reserves) policy numbers**.
A caller authenticates, then sends a `quoteId` + `subclass` + `agentCode`,
and the service returns the booked **policy** (`policyNo`, status,
timestamp, etc.).

## Architecture

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + router wiring + /health
│   ├── config.py                # Settings (env-driven)
│   ├── schemas.py               # Pydantic request/response models + Channel enum
│   ├── security.py              # OAuth2 password flow + JWT, scope enforcement
│   ├── routers/
│   │   ├── auth.py              # POST /auth/token
│   │   └── policy.py            # POST /policies/book, GET /policies/{quoteId}
│   └── services/
│       └── policy_service.py    # Policy-number generation (thread-safe, idempotent)
└── tests/
    └── test_policy.py
```

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Interactive docs: http://127.0.0.1:8000/docs

## Authentication (OAuth2 password flow → JWT)

Demo users (password `secret`): `agent01`, `branch01`.

```bash
# 1) Get a token
curl -X POST http://127.0.0.1:8000/auth/token \
  -d "username=agent01&password=secret"
# => {"access_token":"<JWT>","token_type":"bearer","expires_in":1800}
```

## Book a policy number

Send `quoteId`, `subclass` and `agentCode`; receive the booked policy.

```bash
curl -X POST http://127.0.0.1:8000/policies/book \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"quoteId":"Q-2026-000123","subclass":"PYA","agentCode":"AG12345"}'
```

Response:

```json
{
  "policyNo": "001-PYA26-000001",
  "quoteId": "Q-2026-000123",
  "subclass": "PYA",
  "agentCode": "AG12345",
  "status": "BOOKED",
  "bookedAt": "2026-06-13T06:30:00Z",
  "bookedBy": "agent01",
  "receipt": {
    "receiptNo": "RCP-26-000001",
    "policyNo": "001-PYA26-000001",
    "quoteId": "Q-2026-000123",
    "issuedAt": "2026-06-13T06:30:00Z"
  }
}
```

`subclass` must be **exactly 3 uppercase English letters** (e.g. `PYA`);
input is trimmed and upper-cased first, so `pya` is accepted. `agentCode`
is likewise trimmed and upper-cased.

**Policy number format:** `<prefix>-<SUBCLASS><YY>-<running>` — e.g.
`001-PYA26-000001` (prefix `001`, subclass `PYA`, year `26`, running `000001`).
The prefix is configurable via `POLICY_PREFIX`.

### Behaviour
- **Idempotent per `quoteId`** — re-booking the same quote returns the same policy.
- Booking the same quote under a **different subclass** → `409 Conflict`.
- Missing required field → `422 Unprocessable Entity`.
- Missing/invalid token → `401`; valid token without `policy:book` scope → `403`.

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest
```

## Production notes
- Replace the in-memory store in `policy_service.py` with a database + sequence.
- Replace `FAKE_USERS_DB` in `security.py` with a real identity provider.
- Set a strong `SECRET_KEY` via environment (`.env.example` provided).

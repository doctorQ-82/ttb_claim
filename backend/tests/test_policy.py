"""End-to-end tests for auth + policy booking."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.policy_service import policy_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_store():
    """Reset the in-memory booking store between tests."""
    policy_service._bookings.clear()
    policy_service._running_no = 0
    yield


def _get_token(username: str = "agent01", password: str = "secret") -> str:
    resp = client.post("/auth/token", data={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth_header() -> dict[str, str]:
    return {"Authorization": f"Bearer {_get_token()}"}


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_login_success():
    resp = client.post("/auth/token", data={"username": "agent01", "password": "secret"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_invalid_credentials():
    resp = client.post("/auth/token", data={"username": "agent01", "password": "wrong"})
    assert resp.status_code == 401


def test_book_requires_auth():
    resp = client.post("/policies/book", json={"quoteId": "Q-1", "channel": "ONLINE"})
    assert resp.status_code == 401


def test_book_policy_success():
    resp = client.post(
        "/policies/book",
        json={"quoteId": "Q-2026-000123", "channel": "BANCASSURANCE"},
        headers=_auth_header(),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["quoteId"] == "Q-2026-000123"
    assert body["channel"] == "BANCASSURANCE"
    assert body["status"] == "BOOKED"
    assert body["policyNo"].startswith("TTB-BANC-")
    assert body["bookedBy"] == "agent01"


def test_book_is_idempotent_per_quote():
    payload = {"quoteId": "Q-SAME", "channel": "ONLINE"}
    first = client.post("/policies/book", json=payload, headers=_auth_header())
    second = client.post("/policies/book", json=payload, headers=_auth_header())
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["policyNo"] == second.json()["policyNo"]


def test_book_same_quote_different_channel_conflict():
    client.post("/policies/book", json={"quoteId": "Q-X", "channel": "ONLINE"}, headers=_auth_header())
    resp = client.post(
        "/policies/book",
        json={"quoteId": "Q-X", "channel": "AGENT"},
        headers=_auth_header(),
    )
    assert resp.status_code == 409


def test_invalid_channel_rejected():
    resp = client.post(
        "/policies/book",
        json={"quoteId": "Q-1", "channel": "CARRIER_PIGEON"},
        headers=_auth_header(),
    )
    assert resp.status_code == 422


def test_get_policy():
    client.post(
        "/policies/book",
        json={"quoteId": "Q-GET", "channel": "TELESALES"},
        headers=_auth_header(),
    )
    resp = client.get("/policies/Q-GET", headers=_auth_header())
    assert resp.status_code == 200
    assert resp.json()["quoteId"] == "Q-GET"


def test_get_policy_not_found():
    resp = client.get("/policies/UNKNOWN", headers=_auth_header())
    assert resp.status_code == 404

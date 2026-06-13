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


def _payload(quote_id="Q-2026-000123", subclass="LIFE01", agent_code="AG12345") -> dict:
    return {"quoteId": quote_id, "subclass": subclass, "agentCode": agent_code}


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
    resp = client.post("/policies/book", json=_payload())
    assert resp.status_code == 401


def test_book_policy_success():
    resp = client.post("/policies/book", json=_payload(), headers=_auth_header())
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["quoteId"] == "Q-2026-000123"
    assert body["subclass"] == "LIFE01"
    assert body["agentCode"] == "AG12345"
    assert body["status"] == "BOOKED"
    assert body["policyNo"].startswith("TTB-LIFE01-")
    assert body["bookedBy"] == "agent01"


def test_subclass_and_agent_code_normalized():
    resp = client.post(
        "/policies/book",
        json=_payload(subclass=" life01 ", agent_code=" ag99 "),
        headers=_auth_header(),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["subclass"] == "LIFE01"
    assert body["agentCode"] == "AG99"


def test_book_is_idempotent_per_quote():
    payload = _payload(quote_id="Q-SAME")
    first = client.post("/policies/book", json=payload, headers=_auth_header())
    second = client.post("/policies/book", json=payload, headers=_auth_header())
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["policyNo"] == second.json()["policyNo"]


def test_book_same_quote_different_subclass_conflict():
    client.post(
        "/policies/book",
        json=_payload(quote_id="Q-X", subclass="LIFE01"),
        headers=_auth_header(),
    )
    resp = client.post(
        "/policies/book",
        json=_payload(quote_id="Q-X", subclass="HEALTH02"),
        headers=_auth_header(),
    )
    assert resp.status_code == 409


def test_missing_required_field_rejected():
    resp = client.post(
        "/policies/book",
        json={"quoteId": "Q-1", "subclass": "LIFE01"},  # agentCode missing
        headers=_auth_header(),
    )
    assert resp.status_code == 422


def test_get_policy():
    client.post(
        "/policies/book",
        json=_payload(quote_id="Q-GET", subclass="TELE01"),
        headers=_auth_header(),
    )
    resp = client.get("/policies/Q-GET", headers=_auth_header())
    assert resp.status_code == 200
    assert resp.json()["quoteId"] == "Q-GET"


def test_get_policy_not_found():
    resp = client.get("/policies/UNKNOWN", headers=_auth_header())
    assert resp.status_code == 404

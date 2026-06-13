"""Pydantic request/response models for the API."""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class Token(BaseModel):
    """OAuth2 access token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Token lifetime in seconds")


class TokenData(BaseModel):
    """Decoded JWT payload."""

    username: str | None = None
    scopes: list[str] = []


class BookPolicyRequest(BaseModel):
    """Request to book (reserve) a policy number for a given quote."""

    quote_id: str = Field(..., alias="quoteId", min_length=1, examples=["Q-2026-000123"])
    subclass: str = Field(
        ..., min_length=1, max_length=20, examples=["LIFE01"],
        description="Product subclass code the policy is booked under.",
    )
    agent_code: str = Field(
        ..., alias="agentCode", min_length=1, max_length=20, examples=["AG12345"],
        description="Code of the agent who books the policy.",
    )

    model_config = {"populate_by_name": True}

    @field_validator("subclass", "agent_code")
    @classmethod
    def _strip_and_upper(cls, value: str) -> str:
        return value.strip().upper()


class Receipt(BaseModel):
    """Booking receipt issued together with the policy."""

    receipt_no: str = Field(..., alias="receiptNo", examples=["RCP-20260613-000123"])
    policy_no: str = Field(..., alias="policyNo")
    quote_id: str = Field(..., alias="quoteId")
    issued_at: datetime = Field(..., alias="issuedAt")

    model_config = {"populate_by_name": True}


class PolicyResponse(BaseModel):
    """Booked policy returned to the caller."""

    policy_no: str = Field(..., alias="policyNo", examples=["TTB-LIFE01-20260613-000123"])
    quote_id: str = Field(..., alias="quoteId")
    subclass: str
    agent_code: str = Field(..., alias="agentCode")
    status: str = Field(default="BOOKED")
    booked_at: datetime = Field(..., alias="bookedAt")
    booked_by: str = Field(..., alias="bookedBy")
    receipt: Receipt

    model_config = {"populate_by_name": True}

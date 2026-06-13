"""Pydantic request/response models for the API."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class Channel(str, Enum):
    """Sales / distribution channel that requests the policy number."""

    BRANCH = "BRANCH"
    AGENT = "AGENT"
    ONLINE = "ONLINE"
    TELESALES = "TELESALES"
    BANCASSURANCE = "BANCASSURANCE"


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
    channel: Channel = Field(..., examples=[Channel.BANCASSURANCE])

    model_config = {"populate_by_name": True}


class PolicyResponse(BaseModel):
    """Booked policy returned to the caller."""

    policy_no: str = Field(..., alias="policyNo", examples=["TTB-BANC-20260613-000123"])
    quote_id: str = Field(..., alias="quoteId")
    channel: Channel
    status: str = Field(default="BOOKED")
    booked_at: datetime = Field(..., alias="bookedAt")
    booked_by: str = Field(..., alias="bookedBy")

    model_config = {"populate_by_name": True}

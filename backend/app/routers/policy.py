"""Policy number booking endpoints (protected by OAuth2)."""
from fastapi import APIRouter, Depends, HTTPException, status

from ..schemas import BookPolicyRequest, PolicyResponse, TokenData
from ..security import require_scope
from ..services.policy_service import policy_service

router = APIRouter(prefix="/policies", tags=["policies"])


@router.post("/book", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def book_policy(
    request: BookPolicyRequest,
    current_user: TokenData = Depends(require_scope("policy:book")),
) -> PolicyResponse:
    """Book (reserve) a policy number for a quote on a given channel.

    Send `quoteId` and `channel`; the service returns the booked policy.
    Idempotent per `quoteId`.
    """
    return policy_service.book_policy(request, booked_by=current_user.username or "unknown")


@router.get("/{quote_id}", response_model=PolicyResponse)
async def get_policy(
    quote_id: str,
    current_user: TokenData = Depends(require_scope("policy:book")),
) -> PolicyResponse:
    """Retrieve a previously booked policy by its quote id."""
    policy = policy_service.get_policy(quote_id)
    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No policy booked for quote {quote_id}",
        )
    return policy

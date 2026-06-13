"""Business logic for booking (reserving) policy numbers."""
import threading
from datetime import datetime, timezone

from fastapi import HTTPException, status

from ..config import get_settings
from ..schemas import BookPolicyRequest, PolicyResponse, Receipt


class PolicyService:
    """Generates and tracks booked policy numbers.

    The store is in-memory and thread-safe for demo purposes. Replace
    `_bookings` / `_running_no` with a database + sequence in production.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._running_no = 0
        # quote_id -> PolicyResponse, so re-booking the same quote is idempotent.
        self._bookings: dict[str, PolicyResponse] = {}

    def book_policy(self, request: BookPolicyRequest, booked_by: str) -> PolicyResponse:
        """Reserve a policy number for the given quote, subclass and agent.

        Booking the same quote twice returns the existing policy (idempotent)
        rather than allocating a new number.
        """
        settings = get_settings()
        with self._lock:
            existing = self._bookings.get(request.quote_id)
            if existing is not None:
                if existing.subclass != request.subclass:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Quote {request.quote_id} already booked under subclass "
                            f"{existing.subclass}"
                        ),
                    )
                return existing

            self._running_no += 1
            now = datetime.now(timezone.utc)
            running = f"{self._running_no:06d}"
            # Format: <prefix>-<SUBCLASS><YY>-<running>, e.g. 001-PYAY26-000001
            policy_no = f"{settings.policy_prefix}-{request.subclass}{now:%y}-{running}"
            receipt = Receipt(
                receipt_no=f"RCP-{now:%y}-{running}",
                policy_no=policy_no,
                quote_id=request.quote_id,
                issued_at=now,
            )
            policy = PolicyResponse(
                policy_no=policy_no,
                quote_id=request.quote_id,
                subclass=request.subclass,
                agent_code=request.agent_code,
                status="BOOKED",
                booked_at=now,
                booked_by=booked_by,
                receipt=receipt,
            )
            self._bookings[request.quote_id] = policy
            return policy

    def get_policy(self, quote_id: str) -> PolicyResponse | None:
        """Return a previously booked policy by quote id, if any."""
        return self._bookings.get(quote_id)


# Module-level singleton used by the router.
policy_service = PolicyService()

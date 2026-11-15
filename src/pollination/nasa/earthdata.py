"""Shared Earthdata login and token requests for the live NASA adapters."""

import os
import time
from functools import cache
from pathlib import Path
from typing import Any

import earthaccess
import httpx
from dotenv import load_dotenv

from pollination.nasa.failure import TRANSIENT_STATUSES, within

_REPO_ROOT = Path(__file__).resolve().parents[3]
ATTEMPTS = 5
BACKOFF_S = 2.0
_CLIENT = httpx.Client(  # shared: reuses connections instead of opening one per read
    limits=httpx.Limits(max_connections=8, max_keepalive_connections=8),
)


# earthaccess talks to Earthdata through ``requests`` without a timeout, so on a
# hanging network its calls never return (seen live); they run under this deadline.
EARTHACCESS_DEADLINE_S = 60.0


@cache
def _login() -> None:
    load_dotenv(_REPO_ROOT / ".env")
    earthaccess.login(strategy="environment")


def login() -> None:
    """Log in to Earthdata once, from ``.env`` / environment variables.

    Raises:
        TimeoutError: Earthdata did not answer within ``EARTHACCESS_DEADLINE_S``.
    """
    within(EARTHACCESS_DEADLINE_S, _login)


def search(**query: Any) -> list[Any]:  # earthaccess ships no types
    """``earthaccess.search_data`` under the deadline.

    Args:
        **query: ``earthaccess.search_data`` arguments.

    Returns:
        The granules found.

    Raises:
        TimeoutError: CMR did not answer within ``EARTHACCESS_DEADLINE_S``.
    """
    return within(EARTHACCESS_DEADLINE_S, lambda: earthaccess.search_data(**query))


def get(
    url: str,
    *,
    purpose: str,
    timeout: float,
    headers: dict[str, str] | None = None,
    **kwargs: Any,  # passed through to httpx.Client.get
) -> httpx.Response:
    """GET with the Earthdata bearer token, retrying transient failures.

    Transport errors and 429/5xx answers are retried with exponential backoff.

    Args:
        url: Address to request.
        purpose: What the request is for, used in error messages.
        timeout: Request timeout in seconds.
        headers: Extra request headers.
        **kwargs: Further ``httpx.Client.get`` arguments.

    Returns:
        The first answer whose status is not worth retrying.

    Raises:
        RuntimeError: No token is configured, or every attempt was retryable.
        httpx.TransportError: The last attempt failed in transport.
    """
    token = os.environ.get("EARTHDATA_TOKEN")
    if not token:
        raise RuntimeError(f"EARTHDATA_TOKEN is required in .env for {purpose}")
    auth = {"Authorization": f"Bearer {token}", **(headers or {})}
    for attempt in range(ATTEMPTS):
        try:
            response = _CLIENT.get(url, headers=auth, timeout=timeout, **kwargs)
        except httpx.TransportError:
            if attempt == ATTEMPTS - 1:
                raise
        else:
            if response.status_code not in TRANSIENT_STATUSES:
                return response
        time.sleep(BACKOFF_S * 2**attempt)
    raise RuntimeError(f"No answer for {purpose} after {ATTEMPTS} attempts: {url}")

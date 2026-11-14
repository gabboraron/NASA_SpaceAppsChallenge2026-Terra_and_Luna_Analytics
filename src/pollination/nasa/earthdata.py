"""Shared Earthdata login and token requests for the live NASA adapters."""

import os
import time
from functools import cache
from pathlib import Path
from typing import Any

import earthaccess
import httpx
from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[3]
ATTEMPTS = 5
BACKOFF_S = 2.0
RETRY_STATUSES = (429, 500, 502, 503, 504)
_CLIENT = httpx.Client(  # shared: reuses connections instead of opening one per read
    limits=httpx.Limits(max_connections=8, max_keepalive_connections=8),
)


@cache
def login() -> None:
    """Log in to Earthdata once, from ``.env`` / environment variables."""
    load_dotenv(_REPO_ROOT / ".env")
    earthaccess.login(strategy="environment")


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
            if response.status_code not in RETRY_STATUSES:
                return response
        time.sleep(BACKOFF_S * 2**attempt)
    raise RuntimeError(f"No answer for {purpose} after {ATTEMPTS} attempts: {url}")

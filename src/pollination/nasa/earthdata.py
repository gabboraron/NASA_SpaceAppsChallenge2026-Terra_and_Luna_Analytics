"""Shared Earthdata login for the live NASA adapters."""

from functools import cache
from pathlib import Path

import earthaccess
from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[3]


@cache
def login() -> None:
    """Log in to Earthdata once, from ``.env`` / environment variables."""
    load_dotenv(_REPO_ROOT / ".env")
    earthaccess.login(strategy="environment")

"""Shared test setup."""

import pytest


@pytest.fixture(autouse=True)
def no_earthdata_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """A developer's ``.env`` token must not send the tests to NASA."""
    monkeypatch.setenv("EARTHDATA_TOKEN", "")

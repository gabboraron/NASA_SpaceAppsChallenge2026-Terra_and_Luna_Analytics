"""Shared test setup."""

import pytest


@pytest.fixture(autouse=True)
def no_earthdata_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """No usable Earthdata token, whatever the developer's ``.env`` says.

    A test that needs one sets it itself.
    """
    monkeypatch.setenv("EARTHDATA_TOKEN", "")

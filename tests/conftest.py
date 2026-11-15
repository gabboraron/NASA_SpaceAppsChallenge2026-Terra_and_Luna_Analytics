"""Shared test setup."""

from collections.abc import Callable

import pytest

from pollination import worker


@pytest.fixture(autouse=True)
def no_earthdata_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """No usable Earthdata token, whatever the developer's ``.env`` says.

    A test that needs one sets it itself.
    """
    monkeypatch.setenv("EARTHDATA_TOKEN", "")


@pytest.fixture(autouse=True)
def in_process_worker(monkeypatch: pytest.MonkeyPatch) -> None:
    """Run "worker process" calls in-process, so monkeypatched fakes apply.

    ``tests/test_worker.py`` checks the real worker processes.
    """

    def call[T](fn: Callable[..., T], *args: object, **kwargs: object) -> T:
        return fn(*args, **kwargs)

    monkeypatch.setattr(worker, "run", call)

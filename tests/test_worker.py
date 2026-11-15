"""Slow NASA reads run in a worker process, not in the web server's process."""

import os

import pytest

from pollination import worker


@pytest.fixture
def real_worker(monkeypatch: pytest.MonkeyPatch) -> None:
    """Undo the conftest stub that keeps other tests in-process."""
    monkeypatch.setattr(worker, "run", worker.run_in_process)


@pytest.mark.usefixtures("real_worker")
def test_runs_the_call_in_another_process() -> None:
    try:
        assert worker.run(os.getpid) != os.getpid()
    finally:
        worker.shutdown()


@pytest.mark.usefixtures("real_worker")
def test_raises_the_worker_error_and_keeps_working() -> None:
    try:
        with pytest.raises(ValueError, match="invalid literal"):
            worker.run(int, "not a number")
        assert worker.run(int, "7") == 7
    finally:
        worker.shutdown()

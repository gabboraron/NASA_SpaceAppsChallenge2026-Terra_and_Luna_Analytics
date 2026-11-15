"""Run slow NASA reads in worker processes, so they cannot stall the web server.

HLS reads open remote COGs through GDAL; rasterio documents the GIL as released
only during raster I/O, so blocking HTTP while opening a dataset can freeze every
request thread of the server (seen live: a minute without a single response).
A separate process has its own GIL. Results also land in the on-disk NASA cache.
"""

from collections.abc import Callable
from concurrent.futures import ProcessPoolExecutor
from concurrent.futures.process import BrokenProcessPool
from multiprocessing import get_context
from threading import Lock

# One for the background season fetch, one so a drawn field is not queued behind it.
_WORKERS = 2

_pool: ProcessPoolExecutor | None = None
_pool_lock = Lock()


def _executor() -> ProcessPoolExecutor:
    global _pool  # noqa: PLW0603 - one lazily started pool per server process
    with _pool_lock:
        if _pool is None:
            # spawn: forking a process with running threads can deadlock.
            _pool = ProcessPoolExecutor(_WORKERS, mp_context=get_context("spawn"))
        return _pool


def run_in_process[T](fn: Callable[..., T], *args: object, **kwargs: object) -> T:
    """Call ``fn(*args, **kwargs)`` in a worker process and wait for the result.

    ``fn`` and its arguments must be picklable (module-level functions, plain data).

    Args:
        fn: Function to call.
        *args: Positional arguments for ``fn``.
        **kwargs: Keyword arguments for ``fn``.

    Returns:
        What ``fn`` returned.

    Raises:
        BrokenProcessPool: The worker died (for example out of memory); the next
            call starts a fresh pool.
    """
    pool = _executor()
    try:
        return pool.submit(fn, *args, **kwargs).result()
    except BrokenProcessPool:
        shutdown()
        raise


# Tests replace this with an in-process call (see tests/conftest.py).
run = run_in_process


def shutdown() -> None:
    """Stop the worker processes without waiting for running reads."""
    global _pool
    with _pool_lock:
        pool, _pool = _pool, None
    if pool is not None:
        pool.shutdown(wait=False, cancel_futures=True)

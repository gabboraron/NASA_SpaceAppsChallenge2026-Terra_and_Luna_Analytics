"""Plain-English reasons for failed NASA requests, for ``Missing`` notes.

A note like "request failed (ProxyError)" tells a viewer nothing. These reasons say
what happened (no answer in time, no network, login refused, service down) so the
person in front of the map knows whether retrying can help.

Some NASA libraries wait forever on a network that hangs (earthaccess logs in with
``requests`` and no timeout), so whole reads also run under a deadline.
"""

from collections.abc import Callable
from threading import Thread

import httpx

MAX_DETAIL = 120  # characters of an unknown error's message kept in the note
# Answers worth retrying: rate limited or the service is down for now.
TRANSIENT_STATUSES = (429, 500, 502, 503, 504)


def reason(service: str, exc: BaseException) -> str:
    """Say why a request to a NASA service failed.

    Args:
        service: Service name after "NASA", e.g. ``"POWER"`` or ``"HLS"``.
        exc: The exception the request raised.

    Returns:
        One sentence for a ``Missing`` provenance note. It never includes request
        headers, so no token can leak into it.
    """
    # Class names cover ``requests`` errors (inside earthaccess) without importing it.
    names = {cls.__name__ for cls in type(exc).__mro__}
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        if code in (401, 403):
            return f"NASA {service} refused the Earthdata login (HTTP {code})"
        if code in TRANSIENT_STATUSES:
            return f"NASA {service} is unavailable right now (HTTP {code})"
        return f"NASA {service} answered HTTP {code}"
    if isinstance(exc, TimeoutError) or any("Timeout" in n for n in names):
        return f"NASA {service} did not answer in time"
    if isinstance(exc, httpx.TransportError) or "ConnectionError" in names:
        return f"Could not reach NASA {service} (no network?)"
    detail = (str(exc).strip().splitlines() or [""])[0][:MAX_DETAIL]
    return f"NASA {service} request failed: {detail or type(exc).__name__}"


def no_token(service: str) -> str:
    """Say that a NASA service was skipped because no Earthdata token is set.

    Args:
        service: Service name, e.g. ``"HLS"`` or ``"SMAP"``.

    Returns:
        One sentence for a ``Missing`` provenance note.
    """
    return f"No Earthdata token configured; {service} not queried"


def within[T](seconds: float, read: Callable[[], T]) -> T:
    """Run a NASA read, giving up after ``seconds``.

    The read runs in a daemon thread. When the deadline passes, the caller gets
    ``TimeoutError`` and the read carries on, so whatever it caches is there for
    the next attempt.

    Args:
        seconds: Deadline.
        read: The read to run.

    Returns:
        What ``read`` returned.

    Raises:
        TimeoutError: The read did not finish in time.
        Exception: Whatever ``read`` raised.
    """
    done: list[T] = []
    failed: list[BaseException] = []

    def run() -> None:
        try:
            done.append(read())
        except BaseException as exc:  # handed to the caller below
            failed.append(exc)

    worker = Thread(target=run, daemon=True, name="nasa-read")
    worker.start()
    worker.join(seconds)
    if failed:
        raise failed[0]
    if not done:
        raise TimeoutError(f"No answer in {seconds:g} s")
    return done[0]

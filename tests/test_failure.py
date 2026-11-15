"""Readable reasons for failed NASA requests (WP23)."""

from threading import Event

import httpx
import pytest

from pollination.nasa.failure import MAX_DETAIL, reason, within

URL = "https://example.test/data"


def status(code: int) -> httpx.HTTPStatusError:
    """An HTTP error answer, sent with a bearer token."""
    request = httpx.Request("GET", URL, headers={"Authorization": "Bearer s3cret"})
    response = httpx.Response(code, request=request)
    return httpx.HTTPStatusError(f"{code} error", request=request, response=response)


class ProxyError(ConnectionError):
    """Shaped like ``requests.exceptions.ProxyError`` (earthaccess login)."""


class ReadTimeoutError(OSError):
    """Like the ``requests`` ReadTimeout: an ``OSError``, not a ``TimeoutError``."""


@pytest.mark.parametrize(
    ("exc", "expected"),
    [
        (status(401), "NASA HLS refused the Earthdata login (HTTP 401)"),
        (status(403), "NASA HLS refused the Earthdata login (HTTP 403)"),
        (status(429), "NASA HLS is unavailable right now (HTTP 429)"),
        (status(503), "NASA HLS is unavailable right now (HTTP 503)"),
        (status(404), "NASA HLS answered HTTP 404"),
        (httpx.ReadTimeout("slow"), "NASA HLS did not answer in time"),
        (httpx.ConnectTimeout("slow"), "NASA HLS did not answer in time"),
        (TimeoutError(), "NASA HLS did not answer in time"),
        (ReadTimeoutError("read timed out"), "NASA HLS did not answer in time"),
        (httpx.ConnectError("dns"), "Could not reach NASA HLS (no network?)"),
        (httpx.ProxyError("proxy"), "Could not reach NASA HLS (no network?)"),
        (ProxyError("proxy"), "Could not reach NASA HLS (no network?)"),
        (
            RuntimeError("Token does not exist"),
            "NASA HLS request failed: Token does not exist",
        ),
        (RuntimeError(""), "NASA HLS request failed: RuntimeError"),
    ],
)
def test_reason_says_what_happened(exc: BaseException, expected: str) -> None:
    assert reason("HLS", exc) == expected


def test_reason_keeps_the_first_line_of_a_long_message() -> None:
    long = RuntimeError("x" * 500 + "\nsecond line")
    note = reason("SMAP", long)
    assert note == "NASA SMAP request failed: " + "x" * MAX_DETAIL


def test_reason_never_carries_the_token() -> None:
    for code in (401, 404, 503):
        assert "s3cret" not in reason("POWER", status(code))


def test_within_returns_what_the_read_returned() -> None:
    assert within(1.0, lambda: 42) == 42


def test_within_raises_what_the_read_raised() -> None:
    def broken() -> int:
        raise ValueError("bad body")

    with pytest.raises(ValueError, match="bad body"):
        within(1.0, broken)


def test_within_gives_up_on_a_hanging_read_which_carries_on() -> None:
    """A network that hangs (no timeout in the library) still gets an answer."""
    release, finished = Event(), Event()

    def hangs() -> None:
        release.wait()
        finished.set()  # e.g. writes the cache for the next attempt

    with pytest.raises(TimeoutError) as caught:
        within(0.05, hangs)
    assert reason("HLS", caught.value) == "NASA HLS did not answer in time"
    release.set()
    assert finished.wait(1.0)

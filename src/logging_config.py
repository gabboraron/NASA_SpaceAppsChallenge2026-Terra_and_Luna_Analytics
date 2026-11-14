"""Central logging configuration."""

import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    """Configure root logging once, with a consistent format on stderr.

    Call this once at application start (entry point), never from library code.

    Args:
        level: Minimum severity to emit, e.g. ``logging.DEBUG``.
    """
    logging.basicConfig(
        level=level,
        stream=sys.stderr,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        force=True,
    )

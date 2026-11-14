"""Tests for logging configuration."""

import logging

from logging_config import configure_logging


def test_configure_logging_sets_level() -> None:
    """The root logger adopts the requested level."""
    configure_logging(logging.DEBUG)
    assert logging.getLogger().level == logging.DEBUG

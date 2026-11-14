"""Live checks against the real downloads and the running API.

Skipped unless ``VERIFY_LIVE=1``; they need network access and, for the last
test, the API (``docker compose up -d --wait`` or uvicorn on port 8000).
"""

import os

import httpx
import pytest

from pollination.config import Settings
from verification.__main__ import build_context
from verification.framework import Context, Status, load_thresholds, run_all
from verification.references import HIVE_FILES, hive_gains
from verification.scenarios import SCENARIOS, crop_reference

pytestmark = pytest.mark.skipif(
    os.environ.get("VERIFY_LIVE") != "1", reason="set VERIFY_LIVE=1 to run"
)
CACHE = Settings().cache_dir
API = os.environ.get("VERIFY_API", "http://127.0.0.1:8000")


def test_hive_reference_reproduces_known_flows() -> None:
    """The pinned files still show the locust peaks of the plan (wk 21 vs 18)."""
    t = load_thresholds()
    ctx = Context(thresholds=t)
    for hf in HIVE_FILES:
        ctx.hives[hf.hive] = hive_gains(hf, t.signal, CACHE)
    weeks = {
        key: flow.peak.isocalendar().week
        for key, flow in crop_reference(ctx, "black_locust").main.items()
    }
    assert weeks[("hive12", 2022)] == weeks[("hive18", 2022)] == 21
    assert weeks[("hive12", 2024)] == weeks[("hive18", 2024)] == 18


def test_full_run_gives_every_scenario_a_status() -> None:
    """End to end against the running API; skipped if it is not up."""
    try:
        httpx.get(f"{API}/health", timeout=5).raise_for_status()
    except httpx.HTTPError:
        pytest.skip(f"API not reachable at {API}")
    ctx = build_context(API, [2022, 2024], CACHE, None)
    results = run_all(ctx, SCENARIOS)
    assert len(results) == len(SCENARIOS)
    assert all(isinstance(r.status, Status) for r in results)
    assert not [n for n in ctx.notes if "unavailable" in n]

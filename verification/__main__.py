"""Command line: ``uv run python -m verification``; see verification/README.md."""

from __future__ import annotations

import argparse
import logging
import sys
from collections.abc import Sequence
from pathlib import Path

import httpx

from pollination.config import Settings
from verification.framework import (
    Context,
    Status,
    load_thresholds,
    render_csv,
    render_markdown,
    run_all,
)
from verification.model import fetch_model, fetch_weather
from verification.references import HIVE_FILES, hive_gains, inat_histogram, read_pep725
from verification.scenarios import SCENARIOS

log = logging.getLogger("verification")


def build_context(
    api: str, years: Sequence[int], cache: Path, pep725: Path | None
) -> Context:
    """Load the model output and every reference; failures become report notes.

    Args:
        api: Base URL of the running pollination API.
        years: Model years to fetch from ``/timeline``.
        cache: The app's cache root; POWER and iNaturalist responses share it and
            hive files go to ``verification/hives`` inside it.
        pep725: Optional normalised PEP725 CSV.

    Returns:
        The run context; missing parts leave scenarios INSUFFICIENT.
    """
    t = load_thresholds()
    ctx = Context(thresholds=t)
    try:
        ctx.model = fetch_model(api, years)
    except httpx.HTTPError as err:
        ctx.notes.append(f"Model API {api} unavailable: {err!r}")
    for hf in HIVE_FILES:
        try:
            ctx.hives[hf.hive] = hive_gains(hf, t.signal, cache)
        except (httpx.HTTPError, ValueError, OSError) as err:
            ctx.notes.append(f"Hive file {hf.name} unavailable: {err!r}")
    try:
        ctx.weather = fetch_weather(t.reference_location, t.reference_years, cache)
    except httpx.HTTPError as err:
        ctx.notes.append(f"NASA POWER unavailable: {err!r}")
    for year in sorted(set(t.reference_years) | set(years)):
        try:
            ctx.inat[year] = inat_histogram(year, t, cache)
        except httpx.HTTPError as err:
            ctx.notes.append(f"iNaturalist {year} unavailable: {err!r}")
    if pep725 is not None:
        ctx.pep725 = read_pep725(pep725, t)
    return ctx


def main(argv: Sequence[str] | None = None) -> int:
    """Run the scenarios, print the report and save it under the cache folder.

    Returns:
        1 if a gated scenario failed or any scenario crashed, else 0.
    """
    parser = argparse.ArgumentParser(prog="python -m verification")
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--years", type=int, nargs="+", default=[2022, 2024])
    parser.add_argument("--only", help="comma-separated scenario ids, e.g. S1,S3")
    parser.add_argument("--pep725", type=Path, help="normalised PEP725 CSV")
    parser.add_argument("--cache", type=Path, default=Settings().cache_dir)
    parser.add_argument("--out", type=Path, help="report folder [cache/verification]")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    out: Path = args.out or args.cache / "verification"
    ctx = build_context(args.api, args.years, args.cache, args.pep725)
    only = set(args.only.split(",")) if args.only else None
    results = run_all(ctx, SCENARIOS, only)
    report = render_markdown(results, ctx.notes)
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.md").write_text(report, "utf-8")
    (out / "report.csv").write_text(render_csv(results), "utf-8")
    sys.stdout.write(report + "\n")
    log.info("Report saved to %s", out / "report.md")
    return 1 if any(r.status in {Status.FAIL, Status.ERROR} for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())

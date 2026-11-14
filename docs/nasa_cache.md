# NASA cache: warm it once, share it with the team

Every NASA response is cached on disk under `.cache/` (gitignored, plan D2). A cold
run takes tens of minutes, so one person warms it and the others import a zip.

## Warm it (one person, needs `EARTHDATA_TOKEN` in `.env`)

```sh
uv run python scripts/warm_cache.py            # 2022 and 2024, POWER + HLS + SMAP
uv run python scripts/warm_cache.py --years 2024 --only smap   # one piece
```

It runs the same code as the API, so the cache keys match. It is idempotent: an
interrupted run continues where it stopped and a second run is near-instant. It
exits non-zero and lists what is missing if a source could not be fetched.

Reads are limited on purpose: HLS reads the clearest passes of each 7-day block
until two usable observations are found, and a pass seen through two overlapping
tiles is read once (`DEFAULT_PER_WEEK` in `pollination/nasa/hls.py`).

## Share it

```sh
uv run python -m pollination.nasa.cache_share export nasa-cache.zip   # about 1 MB
```

Put the zip where the team can reach it (a GitHub release asset or a shared drive).
Never commit it: `nasa-cache*.zip` is gitignored.

## Use a shared zip (everyone else, no Earthdata token needed for these entries)

```sh
uv run python -m pollination.nasa.cache_share import nasa-cache.zip
```

Import only accepts `hls/`, `power/` and `smap/` entries named `<sha256>.json`,
checks that each is a cache entry before writing, and never overwrites a file you
already have. With Docker, copy the entries into the `nasa-cache` volume
(mounted at `/app/.cache`) or run the import inside the container.

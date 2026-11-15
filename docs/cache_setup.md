# NASA cache setup

Every NASA response is cached on disk under `.cache/` (gitignored). Fetching it cold
takes about 17 minutes, so the repository ships a warmed copy as
`data/nasa-cache.zip` (about 500 KB, 1,018 entries). Import it once and the app
and the demo run without waiting on NASA, even offline.

## Set up (every teammate, about one minute)

```sh
uv sync
uv run python -m pollination.nasa.cache_share import data/nasa-cache.zip
```

Then put **any non-empty value** in `.env` so the app reads HLS from the cache:

```sh
EARTHDATA_TOKEN=anything-while-the-cache-covers-it
```

The API only reads HLS when a token is configured. A real token (a user token from
<https://urs.earthdata.nasa.gov>) is only needed for cache misses: other years,
other parcels, or polygons drawn on the map. For the season data, `fetch_inputs`
turns a failed NASA request into a `Missing` value with a reason; drawn polygons
were not tested with a fake token.

Import is safe to repeat: it never overwrites a file you already have, and it only
accepts `hls/`, `power/` and `smap/` entries named `<sha256>.json`.

## Check it worked

```sh
uv run python scripts/warm_cache.py
```

With a complete cache this finishes in about 15 seconds and reports
`new entries {'power': 0, 'hls': 0, 'smap': 0}`. It was tested with an empty cache
folder, the zip imported, a dummy token and the network cut. If it starts fetching
(a log line with minutes, not seconds), something is not covered, see below.

## What the cache covers

| Source | Scope |
|---|---|
| POWER | daily weather at the grid nodes under the parcels, 2022 and 2024, plus the previous October to December where a crop model needs winter chilling (black locust) |
| HLS | NDVI and NDYI of the 5 sunflower parcels, March to August 2022 and 2024, plus the scene lists |
| SMAP | root-zone moisture of the 36 cells over the region, 2022 and 2024, with the 2015 to 2024 baseline |

HLS reads the clearest passes of each 7-day block until it has two usable
observations, and reads a pass seen through two overlapping tiles once.

## When the zip goes stale (maintainers)

HLS entries are keyed by parcel geometry, so a changed `data/parcels.geojson`,
other demo years or a different region need a new warm-up. It needs a real
`EARTHDATA_TOKEN` in `.env`:

```sh
uv run python scripts/warm_cache.py                        # fetches only what is missing
uv run python -m pollination.nasa.cache_share export data/nasa-cache.zip
git add data/nasa-cache.zip
```

Measured cold run on the 2022 and 2024 seasons: about 17 minutes (2022 POWER and
HLS 16 minutes, SMAP 6 minutes in parallel, 2024 mostly cached). Each new zip adds
its size to the git history, so refresh it only when the contents really change.
`scripts/warm_cache.py --years 2024 --only smap` warms one piece.

## Docker

The image already contains `data/`, so the zip is at `/app/data/nasa-cache.zip`. To
fill the `nasa-cache` volume:

```sh
docker compose run --rm api python -m pollination.nasa.cache_share import /app/data/nasa-cache.zip
```

This command is untested; the local import above is the verified path.

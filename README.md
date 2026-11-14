<div align="center">

# Terra & Luna Analytics: Nyírség Pollination Marketplace

**Our NASA Space Apps Challenge 2026 entry, built in Budapest**

*NASA Earth observations tell beekeepers and growers when and where crops bloom, and whether moving hives there pays off.*

[![NASA Space Apps 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-0B3D91?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/2026/)
[![Local event](https://img.shields.io/badge/Local%20event-Budapest-E4572E?style=for-the-badge)](https://www.spaceappschallenge.org/2026/local-events/budapest/)

[![License](https://img.shields.io/badge/license-MPL--2.0-blue?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![NASA Open Data](https://img.shields.io/badge/data-NASA%20open%20data-0B3D91?style=flat-square)](#data-and-citations)
[![AI use disclosed](https://img.shields.io/badge/AI%20use-disclosed-8A2BE2?style=flat-square)](AI_USAGE.md)

[About](#about) · [Run it](#run-it) · [Repo layout](#repository-layout) · [Data](#data-and-citations) · [Ideas we considered](#ideas-we-considered) · [Team](#team)

</div>

## About

Migratory beekeepers and fruit, sunflower and black-locust growers in the Nyírség (north-east Hungary) need to
meet at the right place in the right week. Our map shows, week by week from March to August:

- **Bloom state per parcel.** For sunflower this comes from NASA HLS satellite imagery (NDYI). For apple, sour cherry
  and black locust it comes from a heat-unit (GDD) model on NASA POWER weather, next to the grower's declared window.
- **Drought stress.** NASA SMAP root-zone soil moisture flags "High Bloom / Low Nectar" weeks, for example the 2022 drought.
- **Protected areas.** Natura 2000 sites block or warn about placements.
- **Explainable matches** between a beekeeper and parcels, with reasons, missing items and confidence.
- **A move calculator.** It shows the contribution after incremental costs and the benefit compared with staying put, so a beekeeper sees when *not* to move.

Every number carries its provenance: Observed, Estimated, Reported or Missing, plus a date. Actors are synthetic and
parcels are illustrative; NASA data is fetched live.

The build follows the [48-hour MVP plan (v3)](docs/implementation_plans/nasa_space_apps_48_hour_hackathon_mvp_planv3.md).
Work is tracked as one GitHub issue per work package (WP0–WP25).

## Run it

### With Docker (any machine)

```bash
git clone https://github.com/gabboraron/NASA_SpaceAppsChallange2026-Terra_and_Luna_Analytics.git
cd NASA_SpaceAppsChallange2026-Terra_and_Luna_Analytics
docker compose up --build        # then open http://localhost:8080
```

| Service | URL | What |
|---|---|---|
| `web` | http://localhost:8080 | Map client (nginx), proxies `/api/*` to the API |
| `api` | http://127.0.0.1:8000/docs | FastAPI + OpenAPI docs (bound to localhost) |

NASA responses are cached in the `nasa-cache` volume, so they survive rebuilds. Run `docker compose down -v` to clear it.

Optional settings go in a `.env` file next to `compose.yaml`. It is gitignored, so never commit it.

| Variable | Purpose |
|---|---|
| `EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD` or `EARTHDATA_TOKEN` | [NASA Earthdata login](https://urs.earthdata.nasa.gov), needed for HLS and SMAP. POWER needs no login |
| `WEB_PORT` / `API_PORT` | Host ports (default 8080 / 8000) |
| `VITE_USE_MOCKS` | `true` builds the map client against built-in mock data instead of the API |

### Local development

Needs [uv](https://docs.astral.sh/uv/) and Node 22. Full setup, including git hooks: [`SETUP.md`](SETUP.md).

```bash
uv sync
uv run uvicorn pollination.api:app --reload      # API on :8000
cd frontend && npm ci && npm run dev             # map on :5173, /api proxied to :8000
```

Checks (same as CI): `uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest`.

## Repository layout

```text
.
├── src/pollination/     FastAPI app, models (API contract), engine/ (calculator, …), nasa/ (POWER, cache, …)
├── tests/               pytest
├── frontend/            React + Vite + MapLibre map client
├── data/                parcels, Natura 2000, phenology, synthetic actors, ranking weights
├── scripts/             one-off data builders and the Earthdata access probe
├── docs/                implementation plan, engineering guide
├── compose.yaml         Docker stack (api + web); Dockerfile, frontend/Dockerfile
├── DECISIONS.md         decision log
└── AI_USAGE.md          AI use disclosure required by Space Apps
```

## Data and citations

| Source | Used for | Access / licence |
|---|---|---|
| [NASA HLS](https://lpdaac.usgs.gov/products/hlss30v002/) (HLSS30 / HLSL30 v2.0, LP DAAC) | NDVI, NDYI (sunflower bloom) | Earthdata login; NASA open data |
| [NASA SMAP L4](https://nsidc.org/data/spl4smgp) (SPL4SMGP, NSIDC) | Root-zone soil moisture, drought percentile | Earthdata login; NASA open data |
| [NASA POWER](https://power.larc.nasa.gov/) daily point API (MERRA-2 based) | Temperature (GDD), precipitation, wind | No login; NASA open data |
| [EEA Natura 2000](https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/Natura2000Sites/MapServer) (EEA map service) | Protected-area boundaries | EEA reuse policy |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) via Overpass | Illustrative parcel geometry | ODbL |
| [OpenFreeMap](https://openfreemap.org/) | Basemap tiles | OSM data, ODbL |

Beekeepers and growers in `data/actors.json` are **synthetic**. Parcels are **illustrative**, not real holdings.

## Ideas we considered

We picked the pollination marketplace after a research phase on several ideas. The research files were removed from
the working tree to keep the repo focused, and they remain in the git history.

| Idea | Proposed by | Outcome |
|---|---|---|
| Pollen & Bee EO Monitor → **Nyírség Pollination Marketplace** | Team | **Chosen** |
| Lunar Shield API (space-weather safe-mode and restart windows for lunar assets) | Sándor Burian | Not pursued |
| Slip Day (lunar landing site × day go/no-go) | Team | Not pursued |
| Trailbreaker (Mars traverse hazard verdicts) | Team | Not pursued |
| Earth's Twin Finder (Earth analogs for Moon/Mars sites) | Team | Not pursued |
| Earth Science Research Navigator (trend detection) | Team | Not pursued |

## Team

| Member | Focus |
|---|---|
| Patrik P. Süli | Research, software architecture |
| Bence Majer | AI engineering, data science |
| Benedek Máté | Geophysics, pitching, technical writing |
| Yhair Sifuentes | Business intelligence, analytics, business model |
| Sándor Burian | Team member |

## AI use

Space Apps allows AI assistants. We use Claude Code and GitHub Copilot for research and code; the team came up with
the solution idea. [`AI_USAGE.md`](AI_USAGE.md) lists the tools and how AI output is labelled.

## License

Code: [Mozilla Public License 2.0](LICENSE). Third-party data keeps its own licence (see [Data and citations](#data-and-citations)).

<div align="center"><sub>Made in Budapest for NASA Space Apps 2026 · not affiliated with or endorsed by NASA</sub></div>

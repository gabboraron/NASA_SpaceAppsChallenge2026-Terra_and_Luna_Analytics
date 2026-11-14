# NASA Space Apps 2026: 48-Hour MVP Implementation Plan (v3)

**Supersedes:** `nasa_space_apps_48_hour_hackathon_mvp_planv2.md` (concept, region and feature list unchanged; architecture, data pipeline and scope revised after design review).
**Scope:** IT implementation only. Pitch video, slides and business plan are owned by a separate team.
**Business reference:** `docs/business_plan/Pollination_Marketplace_Product_and_Business_Brief.md` (the "brief").
**Purpose of this doc:** source for splitting work into developer subtasks. Each work package (WP) below has an owner track, dependencies and acceptance criteria.

---

## 1. Decisions log (from design review)

| # | Decision |
|---|---|
| D1 | Frontend: **React + Vite + TypeScript + CSS Modules + MapLibre GL JS**, owned full-time by one developer. `CLAUDE.md` gets amended: "Python backend + TypeScript frontend". |
| D2 | **One live NASA code path.** HLS, SMAP and POWER are always fetched from NASA. A disk cache stores responses; a warm-up script calls the *same* live functions for the seed parcels before recording. No hand-made or committed EO data. Cache is gitignored and rebuildable. |
| D3 | NASA POWER is called live on demand (fast, no auth). HLS/SMAP are live but slow: the UI shows a "fetching…" state on cold cache. |
| D4 | Every Estimated value shows its **latest usable observation date**. Interpolated weeks are visually distinct and never presented as observations. |
| D5 | **SMAP is a cell-level (≈9 km) stress flag**, not a per-parcel measurement. All flowering parcels in a stressed cell are downgraded. |
| D6 | **Bloom detection is crop-specific:** sunflower = HLS NDYI (`Estimated (satellite)`); apple, sour cherry, black locust (white flowers) = GDD heat-unit window from POWER (`Estimated (heat-unit model)`) plus grower-declared window (`Reported`). |
| D7 | Geometry: **real Natura 2000 boundaries** (EEA, clipped). **Parcels hand-traced** over visible orchards/sunflower/locust in imagery, labeled "illustrative parcel, not a real holding". |
| D8 | **No booking workflow.** At most a disabled "Request quote" button on match cards. |
| D9 | Calculator uses the brief's terminology ("contribution after incremental costs", "benefit relative to the alternative"; never "net profit") and **must reproduce the brief's worked example and sensitivity table in tests**. |
| D10 | Repo layout: Python package under `src/pollination/`, frontend under `frontend/` (see §3). |
| D11 | Dropped: GEDI, GPM IMERG, Sentinel-2 as a separate pipeline (HLS already harmonizes it). Precipitation comes from POWER `PRECTOTCORR`. GEDI/IMERG are roadmap-only. |
| D12 | Time slider: **weekly steps, March–August (~26 weeks)**, 2022/2024 toggle swaps datasets, no fetching while dragging. |
| D13 | Nectar downgrade rule: flowering **and** SMAP root-zone moisture < **20th percentile of that cell's same-week history** → "High Bloom / Low Nectar". Applies to sunflower + black locust only (orchards assumed irrigated). Labeled as heuristic. |
| D14 | Matching = pure function, hard filters + explainable weighted ranking; no "score/100" shown. |
| D15 | Natura 2000: parcel **inside** → hard block (red card); parcel's **3 km buffer overlaps** → amber warning, not a block. |
| D16 | "Simulate Grower Field Photo" = in-memory server state, resets on restart. No database. |
| D17 | Earthdata access is the **first task (hours 0–4)**. Fallback if HLS access fails: Sentinel-2 L2A from Microsoft Planetary Computer STAC, labeled as such. |
| D18 | API contract frozen at hour 4; TS types generated from FastAPI OpenAPI via `openapi-typescript`; frontend develops against mocks until then. |
| D19 | Polygon drawing: **Terra Draw** (native MapLibre adapter). |
| D20 | Per-crop phenology parameters in `data/phenology.json`, each value with a cited source. |
| D21 | POWER cache: stdlib disk cache, one JSON file per request, key = hash(centroid snapped to POWER 0.5° grid + date range + parameters), under gitignored `.cache/`. No `cachetools`. |
| D22 | Travel distance = haversine × 1.3 detour factor, labeled `Estimated`, user-editable. No routing API. |
| D23 | **Synthetic actors file** (`data/actors.json`) for now, every record flagged `synthetic: true` and labeled in the UI. NASA data stays live. |
| D24 | Basemap: OpenFreeMap vector tiles (no key) + optional Esri World Imagery raster toggle. **Localhost only**, no cloud deploy. |

---

## 2. Team tracks

| Track | Owner | Responsibility |
|---|---|---|
| **DATA** | Dev A | Earthdata access, `nasa/` clients (HLS, SMAP, POWER), cache, warm-up script, geometry files, phenology config. |
| **ENGINE** | Dev B | Domain models, calculator, phenology/bloom state, nectar rule, matching, FastAPI endpoints, Python tests, OpenAPI contract. |
| **FRONT** | Dev C | React app, map, all four feature panels, design tokens, TS types, mocks, frontend lint/build in CI. |

Integration points: **H4** (API contract frozen + Earthdata login proven), **H16** (first real HLS/SMAP numbers flow through API), **H24** (frontend on real API), **H38** (feature freeze), **H44** (cache fully warm, demo dry-run handed to pitch team).

---

## 3. Repository layout

```text
.
├── pyproject.toml                # add deps (uv add), exclude frontend/ from ruff/pyright
├── src/pollination/
│   ├── __init__.py
│   ├── config.py                 # pydantic-settings: env vars, paths, cache dir, bbox
│   ├── models.py                 # shared pydantic models (Parcel, Provenance, MatchCard, …)
│   ├── api.py                    # FastAPI app + routes
│   ├── state.py                  # in-memory verification state (D16)
│   ├── geo.py                    # haversine, buffers, Natura intersection (shapely + pyproj)
│   ├── nasa/
│   │   ├── cache.py              # disk JSON cache (D21)
│   │   ├── power.py              # NASA POWER daily point client
│   │   ├── hls.py                # HLS STAC search + COG windowed reads → NDVI/NDYI per parcel
│   │   └── smap.py               # SMAP L4 root-zone moisture per 9 km cell + percentile baseline
│   └── engine/
│       ├── phenology.py          # GDD accumulation + bloom windows per crop
│       ├── timeline.py           # weekly bloom/nectar state per parcel per year
│       ├── matching.py           # hard filters + ranking (D14, D15)
│       └── calculator.py         # move economics (D9)
├── scripts/
│   └── warm_cache.py             # calls live nasa/* for seed parcels, both years (D2)
├── data/
│   ├── parcels.geojson           # ~18 traced illustrative parcels (D7)
│   ├── natura2000.geojson        # EEA boundaries clipped to bbox (D7)
│   ├── phenology.json            # per-crop GDD params with citations (D20)
│   ├── actors.json               # synthetic beekeepers + growers (D23)
│   └── ranking.json              # matching weights (config, not code)
├── tests/                        # pytest, mirrors src/pollination/
├── .cache/                       # gitignored, NASA responses
└── frontend/
    ├── package.json
    ├── vite.config.ts            # dev proxy /api → localhost:8000
    └── src/
        ├── api/                  # generated types (openapi-typescript) + fetch client + mocks
        ├── styles/tokens.css
        ├── components/
        │   ├── MapCanvas/
        │   ├── TimeSlider/
        │   ├── MatchPanel/
        │   ├── MoveCalculator/
        │   ├── ParcelDetail/
        │   ├── ProvenanceBadge/
        │   └── BeekeeperPicker/
        └── App.tsx
```

---

## 4. Data contracts

### 4.1 Provenance (used on every displayed data field)

```text
Provenance = { kind: "Reported" | "Observed" | "Estimated" | "Missing",
               source: str,            # e.g. "NASA HLS S30", "NASA SMAP L4", "NASA POWER", "Grower declaration"
               observed_at: date|None, # latest usable observation date (D4)
               interpolated: bool,     # true for gap-filled weeks
               note: str|None }        # e.g. "heuristic", "±7 days"
```

### 4.2 Parcel (feature properties in `parcels.geojson`)

`id`, `name`, `crop` (`apple` | `sour_cherry` | `black_locust` | `sunflower` | `grassland`), `area_ha`, `grower_id`, `service_type` (`pollination` | `forage`), `requested_colonies`, `fee_eur_per_colony` (pollination only), `declared_bloom_start`, `declared_bloom_end` (Reported), `irrigated` (bool), `illustrative: true`. The Natura flag/buffer overlap is computed at load time, not stored.

### 4.3 Actors (`actors.json`, all `synthetic: true`)

- **Beekeepers:** `id`, `name`, `home` [lon, lat], `colonies`, `available_from`, `available_to`, `max_distance_km`, `goal` (`pollination` | `forage` | `both`), `vehicle_l_per_100km`, `alternative_contribution_eur`.
  - **B1**: 50 colonies, about 15 km from the orchards. Profitable orchard match.
  - **B2**: 40 colonies, about 180 km away (e.g. Szeged area). "Do Not Move".
  - **B3**: 20 colonies, forage goal. Forage-only match, no commission.
- **Growers:** 3–4, linked to orchard and sunflower parcels.

### 4.4 API (frozen at H4; FastAPI generates OpenAPI at `/openapi.json`)

| Method & path | Request | Response |
|---|---|---|
| `GET /parcels` | none | GeoJSON FeatureCollection: parcel props + `natura_status` (`inside` \| `buffer_overlap` \| `clear`) |
| `GET /natura2000` | none | GeoJSON FeatureCollection |
| `GET /actors` | none | `{beekeepers: [...], growers: [...]}` |
| `GET /timeline?year=2022\|2024` | none | `{year, weeks: [{week_start, parcels: {id: {bloom_state, ndyi?, ndvi?, gdd, smap_percentile?, nectar_state, provenance{...}}}}], smap_cells: GeoJSON}` |
| `GET /matches?beekeeper_id&year&week` | none | `[MatchCard]`, ranked, including blocked ones (with `blocked: true`) |
| `POST /calculate` | `CalculatorInput` | `CalculatorResult` (low/base/high + verdict) |
| `POST /parcels/{id}/verify` | none | updated parcel (bloom provenance → Observed, `observed_at = today`) |
| `POST /polygon/power` | GeoJSON Polygon + year | GDD series, precipitation total/anomaly, bee-flight-weather days, provenance |
| `POST /polygon/hls` | GeoJSON Polygon | latest usable HLS scene within 30 days: NDVI, NDYI, cloud-free %, `observed_at`; or `Missing` |

Enums: `bloom_state` = `none | pre_bloom | blooming | post_bloom`; `nectar_state` = `normal | low_nectar | unknown`.

**MatchCard:** `parcel_id`, `rank`, `blocked`, `block_reason?`, `warnings[]` (e.g. Natura buffer overlap), `reasons[]` (e.g. "Bloom window overlaps availability by 12 days", "Distance 14.8 km ≤ 50 km max"), `missing[]` (e.g. "Pesticide spray calendar unconfirmed"), `distance_km` (+ provenance Estimated), `bloom_overlap_days`, `confidence` (`high | medium | low`, derived from provenance mix), `service_type`.

---

## 5. Work packages

Format: **WP-id · title · track · depends on**, then tasks and **Done when** criteria.

### Hour 0–4: foundations (all tracks in parallel)

**WP0 · Repo & tooling setup · ENGINE · none**
- Branch `feat/mvp-skeleton`. `uv add fastapi uvicorn pydantic pydantic-settings httpx shapely pyproj numpy`; dev: `pytest-httpx` (or `respx`).
- Create `src/pollination/` skeleton, `config.py` (env: `EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD` or `EARTHDATA_TOKEN`, `CACHE_DIR`, `DATA_DIR`).
- `pyproject.toml`: exclude `frontend/` from ruff/pyright; add `.cache/` to `.gitignore`.
- Amend `CLAUDE.md` (D1).
- **Done when:** `uv run uvicorn pollination.api:app` serves `/health`; full CI command passes.

**WP1 · Earthdata access proof · DATA · none** *(highest risk, D17)*
- Register Earthdata account, approve LP DAAC + NSIDC apps, store creds in local `.env` (never committed).
- `uv add earthaccess rasterio xarray h5netcdf` (h5py if needed).
- Throwaway notebook/script: log in, search one HLS S30 granule over the bbox in June 2024, read the B03 band window; open one SPL4SMGP granule and read `sm_rootzone` for one cell.
- **Done when:** both reads succeed and print values. **If HLS fails by H6:** switch `hls.py` to Planetary Computer `sentinel-2-l2a` (no login), update provenance source text.

**WP2 · API contract + OpenAPI · ENGINE · WP0**
- Write all pydantic models in `models.py` (§4) and stub routes returning hard-coded *example* responses (shape only, for contract; replaced by real logic later).
- **Done when:** `/openapi.json` contains every route in §4.4; FRONT has generated types from it.

**WP3 · Frontend scaffold · FRONT · none (types from WP2 at H4)**
- `npm create vite` (React + TS), MapLibre GL JS, Terra Draw + MapLibre adapter, ESLint, Prettier.
- `tokens.css`: palette (bloom yellows, orchard pinks, drought reds, Natura greens), type scale, spacing. No Tailwind.
- `vite.config.ts` proxy `/api` → `localhost:8000`; `VITE_USE_MOCKS=true` flag switching the API client to typed mock fixtures.
- Add a `frontend` job to `.github/workflows/ci.yml`: `npm ci`, `tsc --noEmit`, `eslint`, `vite build`.
- **Done when:** map renders OpenFreeMap basemap centered on the pilot region; CI frontend job green.

**WP4 · Geometry & config files · DATA · none**
- Bbox around the Újfehértó–Nyírbátor–Mátészalka triangle (≈ lon 21.6–22.4, lat 47.7–48.05; refine).
- Download EEA Natura 2000 (GeoPackage), clip to bbox in QGIS (or a one-off script with geopandas in a dev-only group; not a runtime dependency), export `natura2000.geojson` (EPSG:4326).
- Trace ~18 parcels over Esri imagery in QGIS/geojson.io: ~6 apple/sour cherry orchards, ~5 sunflower, ~4 black locust, ~2–3 parcels **inside** Natura (grassland), at least one parcel whose 3 km buffer overlaps Natura. Fill §4.2 properties.
- `phenology.json`: per crop `base_temp_c`, `gdd_bloom_start`, `gdd_bloom_end`, `uncertainty_days`, `source` (citation URL/DOI). **Look values up; do not invent.**
- `actors.json` per §4.3. `ranking.json` weights.
- **Done when:** files load in a test that validates them against the pydantic models.

### Hour 4–16: data clients and engine core

**WP5 · Disk cache · DATA · WP0**
- `nasa/cache.py`: `get_or_fetch(key_parts, fetch_fn) -> dict`; key = sha256 of canonical JSON; file `CACHE_DIR/<namespace>/<hash>.json`; stores fetch timestamp.
- **Done when:** unit test: second call doesn't invoke `fetch_fn`; corrupted file is refetched.

**WP6 · NASA POWER client · DATA · WP5**
- `nasa/power.py`: `daily_point(lat, lon, start, end, params) -> PowerDaily`. Endpoint `https://power.larc.nasa.gov/api/temporal/daily/point`, `community=AG`, params `T2M_MAX,T2M_MIN,PRECTOTCORR,WS2M`. Snap to 0.5° grid for the cache key (D21). Handle `-999` fill values as missing.
- **Done when:** test with mocked HTTP (`pytest-httpx`) passes; one real call for the bbox centroid, 2022 and 2024, verified manually.

**WP7 · HLS client · DATA · WP1, WP5**
- `nasa/hls.py`: `parcel_indices(parcels, start, end) -> dict[parcel_id, list[Obs]]`.
  - CMR STAC search (LPCLOUD) for `HLSS30_2.0` + `HLSL30_2.0` intersecting the bbox, March–August.
  - Per scene: read **one window covering the whole bbox** for Blue (B02), Green (B03), Red (B04), NIR (S30: B8A, L30: B05) and `Fmask`; apply scale 0.0001; mask cloud/shadow/snow/water via Fmask bits.
  - Per parcel: mean NDVI = (NIR−Red)/(NIR+Red), NDYI = (Green−Blue)/(Green+Blue), valid-pixel fraction; drop obs with < 50% valid pixels.
  - Cache per scene (not per parcel) so drawn polygons inside the bbox reuse scenes.
- `latest_for_polygon(polygon, days=30)` for `/polygon/hls`.
- **Done when:** real run produces a 2024 sunflower NDYI series with a visible July peak; per-scene cache hit on rerun.

**WP8 · SMAP client · DATA · WP1, WP5**
- `nasa/smap.py`: SPL4SMGP (L4 Global 3-hourly 9 km), variable `sm_rootzone`, EASE-Grid 2.0 cells covering the bbox (expect about 3×3 to 6×4 cells).
- Weekly value = one granule per week (e.g. Wednesday 12:00 UTC), read via `earthaccess.open` + partial HDF5 reads of the cell window only. **Do not download full granules.**
- Percentile baseline (D13): same week, all available years in a configurable range (default 2015–2024). **Budget risk:** ~260 remote reads. If too slow by H16, cut the baseline to 2016–2024 even years or use Harmony subsetting; record the actual range in provenance `note`.
- Output: `cells` GeoJSON (cell polygons) + `{cell_id: {week: (value, percentile)}}`.
- **Done when:** 2022 summer weeks show clearly lower percentiles than 2024 for the bbox cells.

**WP9 · Calculator · ENGINE · WP2** *(TDD)*
- Implement the brief §7 formulas exactly: service revenue, commission (8%, pollination only; 0 for forage), fuel = legs × km × L/100km ÷ 100 × price, vehicle allowance per km, driving + loading labor, extra feed, other placement costs, optional honey margin (default 0), alternative contribution.
- Bands: **base** = inputs; **low** = price × (1 − `price_uncertainty`) + `extra_trips_low` extra round trips; **high** = price × (1 + `price_uncertainty`). Defaults (20%, 1 trip) are user-editable inputs, labeled as assumptions.
- Verdict: base benefit vs alternative < 0 → `do_not_move` with message "Staying at base apiary yields €X more."
- Every auto-filled input carries a provenance (distance = Estimated, D22).
- **Tests (must pass):** worked example → contribution **1,568.48**, benefit **1,168.48**; sensitivity €30/€60/€80 → 464.48/1,568.48/2,304.48 and 64.48/1,168.48/1,904.48; break-even ≈ **€28.25**/colony.
- **Done when:** tests above green; `POST /calculate` wired.

**WP10 · Geo helpers · ENGINE · WP4**
- `geo.py`: haversine km, ×1.3 detour; 3 km buffer in a metric CRS (EPSG:3035 via pyproj) then intersect with Natura; `natura_status` per parcel; centroid; point-in-cell for SMAP.
- **Done when:** tests on the real geometry files: the known "inside" parcels → `inside`, buffer parcel → `buffer_overlap`.

### Hour 16–24: engine logic, real data through the API

**WP11 · Phenology & timeline · ENGINE · WP6, WP7, WP8, WP4**
- `engine/phenology.py`: GDD = Σ max(0, (Tmax+Tmin)/2 − base) from 1 Jan using POWER at parcel centroid; bloom window = dates where cumulative GDD crosses start/end thresholds; ± `uncertainty_days`.
- `engine/timeline.py`: for each week × parcel:
  - Sunflower: `bloom_state` from NDYI (threshold in `phenology.json`), weekly value = nearest valid obs; gap weeks linearly interpolated with `interpolated: true` (D4).
  - Orchard/locust: `bloom_state` from GDD window (Estimated) alongside declared window (Reported).
  - Nectar (D13): sunflower/locust blooming + cell percentile < 20 → `low_nectar`; irrigated or orchard → `normal`; no SMAP → `unknown`.
  - Apply verification overrides from `state.py`.
- **Done when:** `/timeline?year=2022` shows at least one sunflower parcel `blooming` + `low_nectar` in July; 2024 the same parcel `normal`. Tests cover the rule with synthetic inputs.

**WP12 · Matching engine · ENGINE · WP10, WP11**
- `engine/matching.py`: `match(beekeeper, parcels, timeline_week) -> list[MatchCard]`.
  - Hard filters (blocked, reason shown): Natura `inside`; service type incompatible with goal; no bloom/availability overlap; distance > max; colonies > requested.
  - Warnings: Natura `buffer_overlap`; bloom provenance only Reported; SMAP `low_nectar`.
  - Ranking: weighted sum (weights from `ranking.json`) of normalized overlap days, inverse distance, provenance confidence (Observed > Estimated > Reported > Missing). Expose reasons/missing, not the number.
- **Done when:** tests: B1 top match is an orchard; B2 gets matches only if max_distance permits and the calculator says do-not-move; B3 gets forage parcels only; a Natura-inside parcel is always blocked.

**WP13 · Real endpoints + verification state · ENGINE · WP9–WP12**
- Replace stubs with real logic; `state.py` in-memory dict; `POST /parcels/{id}/verify`; `/polygon/power` (GDD, precip, flight-weather days = Tmax ≥ 15 °C and wind < configurable threshold, with threshold in config); `/polygon/hls`.
- CORS for `localhost:5173`.
- **Done when:** all §4.4 endpoints return real data on warm cache; contract unchanged (or FRONT notified + types regenerated).

**WP14 · Cache warm-up script · DATA · WP6–WP8**
- `scripts/warm_cache.py`: for 2022 and 2024, runs the live `nasa/*` functions for all seed parcels + bbox SMAP cells + baseline; logs progress and timing; idempotent.
- **Done when:** a cold run completes (record duration in README); a second run is near-instant.

### Hour 4–38: frontend features (FRONT, against mocks until H24)

**WP15 · MapCanvas · FRONT · WP3**
- Layers: parcels (fill by `bloom_state`, outline by crop), Natura 2000 (hatched green), SMAP cells (red tint by percentile, toggle), 1/2/3 km foraging buffers around the selected beekeeper's home and selected parcel (`@turf/circle`, frontend-only), beekeeper home pins.
- Layer toggles panel; Esri imagery toggle (D24).
- **Done when:** all layers render from `/parcels`, `/natura2000`, `/timeline`; toggles work.

**WP16 · TimeSlider + year toggle · FRONT · WP15**
- 26 weekly steps, play/pause, 2022/2024 toggle; recolors parcels from the already-loaded timeline (no fetch per step, D12). Interpolated weeks shown with a dashed/striped style + legend note.
- **Done when:** dragging is smooth (< 50 ms recolor), and the 2022 July sunflower parcel shows a "High Bloom / Low Nectar" style.

**WP17 · ParcelDetail + ProvenanceBadge · FRONT · WP15**
- Click parcel → side panel: crop, area, grower (synthetic tag), declared vs estimated bloom window, NDVI/NDYI/SMAP/GDD values each with `ProvenanceBadge` (kind, source, `observed_at`, interpolated, note); "illustrative parcel" label.
- Natura `inside` → red ecological block card; `buffer_overlap` → amber card.
- "Simulate Grower Field Photo" button → `POST /verify` → badge flips to Observed, match list refetches.
- **Done when:** every number in the panel has a badge; verification visibly changes match confidence.

**WP18 · BeekeeperPicker + MatchPanel · FRONT · WP17**
- Pick B1/B2/B3 (synthetic tag shown); map draws home pin + radius.
- Match cards: rank, reasons, missing items, warnings, blocked cards greyed with reason, confidence label, distance with Estimated badge, disabled "Request quote" button (D8), "Calculate this move" button → opens calculator prefilled.
- **Done when:** switching beekeeper/week/year updates cards from `/matches`.

**WP19 · MoveCalculator · FRONT · WP18**
- Sliders/inputs for all `CalculatorInput` fields (colonies 20–100, distance, fee, alternative contribution, uncertainty, etc.), prefilled from match, each with source badge, all editable.
- Output: revenue, commission, transport, other costs, contribution, benefit vs alternative for low/base/high (three bars or columns); red "Do Not Move" card when base benefit < 0. Wording per D9. Debounced `POST /calculate`.
- **Done when:** B1 → green benefit, B2 → red do-not-move; manual entry of the brief's worked example shows 1,168.48.

**WP20 · Live polygon draw · FRONT · WP15, WP13**
- Terra Draw polygon mode; on finish → parallel `POST /polygon/power` and `POST /polygon/hls`; POWER result card appears in seconds, HLS shows "fetching from NASA…" then result or `Missing` with reason.
- **Done when:** drawing a polygon outside the seed parcels returns live GDD/precip and an HLS result with `observed_at`.

### Hour 24–48: integration, hardening, handover

**WP21 · Integration · ALL · WP13, WP15–WP20** (H24–H30)
- Flip `VITE_USE_MOCKS=false`; fix contract mismatches by regenerating types; end-to-end click-through of the demo flow (§6).

**WP22 · Honesty & labeling pass · ENGINE + FRONT** (H30–H36)
- Checklist from the brief: no "live" label on old imagery; every Estimated value dated; synthetic actors and illustrative parcels labeled; no "net profit", no "score/100", no yield claims; SMAP shown as cell-level; heuristic notes on nectar rule and GDD.

**WP23 · Error states · ALL** (H30–H38)
- NASA timeouts → `Missing` provenance with reason, never a crash or fabricated value; cold cache → "fetching" spinner; backend down → banner.

**WP24 · Feature freeze, warm cache, dry run · ALL** (H38–H44)
- Run `warm_cache.py`; full demo dry run twice; fix visual glitches only.

**WP25 · README + handover · DATA** (H44–H48)
- README: setup (`uv sync`, `.env` vars, `uv run uvicorn …`, `cd frontend && npm ci && npm run dev`), warm-up duration, data sources + citations, what is synthetic vs live. Hand the demo click-path to the pitch team.

---

## 6. Demo click-path the build must support (for the pitch team)

1. Open map → 2024, July → sunflower bloom (NDYI) visible; toggle **2022** → SMAP cells turn red, sunflower parcels flip to "High Bloom / Low Nectar".
2. Pick **B1** → click a Natura-inside parcel (red block card) → top orchard match with reasons/missing + provenance badges.
3. "Calculate this move" → B1 positive benefit vs alternative; pick **B2** → red "Do Not Move".
4. "Simulate Grower Field Photo" → Observed badge, confidence rises → draw a new polygon → live POWER + HLS results.

---

## 7. Risks and fallbacks

| Risk | Signal | Fallback |
|---|---|---|
| Earthdata / HLS access fails | WP1 not done by H6 | Planetary Computer Sentinel-2 L2A (D17), relabel source |
| SMAP baseline too slow | WP8 > 2 h of reads | Fewer baseline years or Harmony subsetting; state range in provenance |
| Cloudy 2022/2024 summers over bbox | Few valid HLS obs in July | Widen valid-pixel threshold to 30%; interpolate (flagged); show `Missing` honestly |
| NDYI doesn't separate sunflower bloom | No July peak | Use declared window (Reported) + GDD; keep NDYI as context only |
| `rasterio`/`earthaccess` untyped under pyright strict | pyright errors | Typed wrapper functions in `nasa/`, narrow `# type: ignore[...]` with reason comments, per CLAUDE.md |
| Phenology thresholds not found in literature | WP4 lacks citations | Use declared windows only for that crop, show GDD as context |
| Contract drift between ENGINE and FRONT | type errors after regenerate | Contract changes only via PR touching `models.py` + regenerated types together |

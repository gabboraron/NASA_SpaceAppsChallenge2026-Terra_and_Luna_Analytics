# Trailbreaker: feasibility check for Space Apps 2026 challenge 4.10, "Interplanetary Survival Guide: Martian Map"

Checked Sat 2026-11-14. Deadline: Sun 2026-11-15 16:00 CET. I tested every endpoint marked **[verified]** from this machine today with curl, and each one returned real data.

## 0. Summary

- **Use Gale crater (Mount Sharp, the boxwork region), not Jezero.** Five reasons, all verified today:
  1. The challenge text names boxwork at Mount Sharp as its example.
  2. Curiosity is there now. The latest waypoint is sol 5073, at 137.3889E, 4.8260S.
  3. Trek serves the 1 m HiRISE DEM of Gale as raw float32 heights through an ArcGIS ImageServer. You can cut out any window with one HTTP request, with no 2 to 4 GB download.
  4. The REMS weather feed covers 4,745 sols and runs to 2026-08-25.
  5. Curiosity's own pitch, roll and tilt are published for every drive, so the slope model can be checked against what the rover actually felt.
- **The full Trailbreaker pitch is only partly feasible, and two of its claims hurt it.** "Small LMs Kev/Jev" adds nothing a judge can check. "Help the rover learn to decide for itself" overlaps with ENav/MLNav, which are already on Perseverance and published. That framing invites a Validity hit from a space software engineer.
- **Recommended:** build the layered Marswalk planner. Add the "thousand explorers" idea as a Monte Carlo over route uncertainty and scenarios: dust storm, low power, suit limits. This keeps the memorable hook, and it can be defended scientifically.

---

## 1. Data access: what you can actually get in about 20 h

### 1a. Gale / Mount Sharp (recommended region)

| Layer | Endpoint | Size / format | Status |
|---|---|---|---|
| HiRISE DEM, Gale, 1 m. Raw heights, any window | `https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer/exportImage?bbox=137.38,-4.70,137.40,-4.68&bboxSR=104905&size=512,512&format=tiff&pixelType=F32&f=image` | GeoTIFF float32. A 512² window is 1 MB. Max request is 15000×4100 px. Extent is 137.12–137.73E, 4.93–4.25S | **[verified]** Returned elevations of −4298 to −4278 m |
| Same DEM, full file (USGS) | `https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif` | 3.87 GB | **[verified]** Listed in the bucket. Fallback only |
| HiRISE ortho, Gale, 25 cm (full) | `https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif` | 24 GB. Too big; use WMTS | **[verified]** Listed in the bucket |
| HiRISE mosaic tiles (base map) | `https://trek.nasa.gov/tiles/Mars/EQ/curiosity_hirise_mosaic/1.0.0/WMTSCapabilities.xml` → `…/1.0.0/{Style}/{TileMatrixSet}/{z}/{row}/{col}.png` | PNG tiles | **[verified]** |
| CTX mosaic tiles, Gale | `https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml` | PNG tiles (file is 1.8 GB) | **[verified]** |
| THEMIS Night IR, 100 m (proxy for thermal inertia: sand vs rock) | `https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/THEMIS_controlled_mosaics/Aeolis_NightIR_31Jan2014/THEMIS_NightIR_ControlledMosaic_Aeolis_30S135E_100mpp.tif` | 474 MB. Uncompressed and striped, so GDAL `/vsicurl/` windowed reads work | **[verified]** |
| THEMIS Night IR, global tiles | `https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml` | PNG tiles | **[verified]** |
| Quantitative THEMIS thermal inertia, 100 m, 30° tiles | USGS product pages, e.g. https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_quantitative_30s060e_100mpp | ISIS .cub, about 2.5 GB per tile | Page returned 403 to the bot. Night IR is the practical proxy |
| TES thermal inertia, TES dust, MOLA roughness (coarse global context) | Trek layers `TES_Thermal_Inertia`, `TES_Dust`, `mola_roughness` via `https://trek.nasa.gov/tiles/Mars/EQ/<layer>/1.0.0/WMTSCapabilities.xml` | 13–17 MB | **[verified]** Present in the Trek catalogue |
| Curiosity traverse, plus per-drive pitch, roll, tilt and sol | `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json` (1.36 MB) and `…/MSL_waypoints_current.json` | GeoJSON | **[verified]** Latest sol 5073, tilt 12.45°, 38.6 km total |
| Curiosity raw images (point-of-view photos) | `https://mars.nasa.gov/rss/api/?feed=raw_images&category=msl&feedtype=json&num=25&page=0&order=sol+desc` | JSON with JPG URLs | **[verified]** sol 5073 |
| REMS weather, Curiosity | `https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json` | JSON, 4,745 sols. Fields: min/max air and ground temperature, pressure, UV index, sunrise and sunset, opacity | **[verified]** Latest sol 4995 (2026-08-25) |
| Space weather (CME, SEP) | `https://api.nasa.gov/DONKI/CME?startDate=…&endDate=…&api_key=KEY` (also `/DONKI/SEP`) | JSON | **[verified]** Endpoint is live. DEMO_KEY was rate-limited, so register a free key at api.nasa.gov |
| Geologic map (a listed challenge resource) | https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars | ArcGIS | Listed in the challenge; I did not test it |
| Curiosity proposed path up Mount Sharp (a listed resource) | https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/ | Image/animation | Listed in the challenge |

### 1b. Jezero (alternative)

| Layer | Endpoint | Size | Status |
|---|---|---|---|
| CTX DTM 20 m, controlled | `https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif` | 9.7 MB | **[verified]** |
| CTX ortho 6 m | `…/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif` | 36 MB | **[verified]** |
| HiRISE DTM 1 m, full mosaic | `…/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif` | 1.84 GB, striped float32 | **[verified]** |
| HiRISE DTM 1 m, per-sector files (C, DL, E, N, W, CR_NORTH, CR_SOUTH) | `…/mars2020_trn/HiRISE/DTM_MOLAtopography_DeltaGeoid_Jezero_<X>_Edited_affine_1m_Eqc_latTs0_lon0.tif` | 72–132 MB each | **[verified]** |
| Perseverance traverse and waypoints | `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json`, `…/M20_waypoints.json` | 1.7 MB / 0.6 MB | **[verified]** |
| Perseverance raw images | `https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=25&page=0&order=sol+desc` | JSON | **[verified]** sol 2031 |
| MEDA weather feed | `https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json` | JSON | Responds, but the sols I sampled were from 2024 and many fields are "--". Full data: https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html (verified 200). **Weak for "current conditions".** |

Trek does **not** serve the Jezero DEMs through ImageServer. I verified this: the service returned "not found".

### 1c. Ready-made labels and classifiers

- **AI4Mars** (rover-view semantic segmentation into soil, bedrock, sand and big-rock classes; MSL, M2020, MER; about 17.8 GB merged v0.6): https://zenodo.org/records/15995036 (verified 200). Catalogue entry: https://data.nasa.gov/dataset/ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars. There is a Curiosity-only parquet mirror at https://huggingface.co/datasets/hassanjbara/AI4MARS. Paper: https://openaccess.thecvf.com/content/CVPR2021W/AI4Space/papers/Swan_AI4MARS_A_Dataset_for_Terrain-Aware_Autonomous_Driving_on_Mars_CVPRW_2021_paper.pdf. **Limitation:** the labels are for navcam images, not orbital tiles. They cannot directly train an orbital per-tile hazard classifier. At most they can drive a "what the ground looks like here" panel next to the raw images.
- **SPOC / SPOC-HiRISE** (JPL; 17 terrain classes at 25 cm; used in MSL ground operations and for Mars 2020 landing-site traversability): https://nasa-jpl.github.io/SPOC, poster https://www.jpl.nasa.gov/site/research/media/posters/2020/R18014p.pdf. I found **no public ready-to-run model or public SPOC map product**, so do not plan on it.
- **MSL/M2020 traversability maps (MTTT, Ono et al.)**: described in the paper https://www-robotics.jpl.nasa.gov/media/documents/Data-driven%20surface%20traversability%20analysis%20for%20Mars%202020%20landing%20site%20selection.pdf, but I found no public raster. Cite the method and rebuild a simplified version: slope + roughness + thermal-inertia proxy → cost.
- **Murray Lab global CTX mosaic** (5 m/px, 4°×4° zipped tiles): https://murray-lab.caltech.edu/CTX/, tiles at `/CTX/V01/tiles/`. Redundant for Gale or Jezero because Trek has local CTX mosaics.

---

## 2. Tables

### T1 Feasibility

| Idea | Challenge | Core NASA data (verified URL) | Data access effort | Build effort (person-hours) | Feasible by Sun 16:00? | Biggest technical risk |
|---|---|---|---|---|---|---|
| **Full Trailbreaker** (tiles → features → calibrated per-tile verdicts with a small LM or GBM → swarm sim of 1000s of rover and astronaut walks → routes, failure rates) | 4.10 Martian Map | Trek ImageServer `Gale_DEM_SMG_1m` (raw 1 m DEM); `curiosity_hirise_mosaic` WMTS; THEMIS Night IR Aeolis tile (USGS S3); MSL traverse GeoJSON | Med | 80–95 (data 12, features 14, decision model plus calibration 18, swarm 14, UI 16, pitch/video 10, integration 10). The team has about 70 | **Partly.** The swarm and features are doable. A *calibrated* learned verdict model is not: there are no orbital ground-truth hazard labels, and calibration needs labels | Training labels for "safe for rover or astronaut" do not exist at orbital scale. The model would learn your own rules, and the probabilities would be pseudo-calibrated. A space software engineer will catch this |
| **Simple layered Marswalk planner** (map with HiRISE, CTX and THEMIS layers, slope and hazard layers, cost-based route A→B for an astronaut with suit and EVA constraints, REMS weather, DONKI space weather, POV raw images along the route) | 4.10 Martian Map | Same DEM and WMTS sources, plus REMS feed `mars.nasa.gov/rss/api/?feed=weather&category=msl`, raw images feed, DONKI | Low | 40–50 | **Yes** | Projection mismatch: Trek EQ tiles use EPSG 104905 lon/lat, and Leaflet/OpenLayers assumes web-mercator. Use a custom CRS (L.CRS.EPSG4326-style) or pre-render. Allow about 2 h |
| *(Recommended hybrid: planner + Monte Carlo "1000 explorers")* | 4.10 | As above | Low–Med | 55–65 | Yes, if the swarm stays at numpy level | Monte Carlo over a large grid is slow in pure Python. Run at a coarsened 4–8 m grid and precompute |

### T2 Judging score estimate (1–5)

| Idea | Impact | Creativity | Validity | Relevance | Presentation | Total /25 | One-line rationale |
|---|---|---|---|---|---|---|---|
| Full Trailbreaker | 4 | 4 | 2 | 3 | 3 | **16** | Strong hook, but the LM and "rover learns" claims cannot be defended against ENav/MLNav, and half the build risks being unfinished. Its focus drifts from the astronaut Marswalk the challenge asks for |
| Simple layered Marswalk planner | 3 | 2–3 | 4 | 5 | 4 | **18–19** | Answers every bullet of the challenge (≥3 data types, safety, route, conditions, POV imagery), but many teams will build the same Trek-style map |
| Hybrid (recommended) | 4 | 4 | 4 | 5 | 4 | **21** | It keeps the "1000 virtual explorers" hook as honest Monte Carlo risk (P(route failure \| dust storm, suit O₂ budget)), and validates slope against Curiosity's measured tilt |

### T3 Resource mapping

| Idea | Listed challenge resource used | Other NASA/partner data | Open-source tools | Sponsor resources (Azure/GoDaddy/Copilot/other) |
|---|---|---|---|---|
| Full Trailbreaker | Mars Trek (WMTS and ImageServer); Curiosity proposed-path resource for scenery and science targets; USGS geologic map | USGS S3 HiRISE/MSL DEM, THEMIS Night IR; MSL traverse with tilt; AI4Mars (Zenodo) for a POV terrain panel; REMS; DONKI | Python, rasterio/GDAL, numpy, scikit-image, scikit-learn/LightGBM (+ CalibratedClassifierCV), networkx or scikit-image `graph.MCP` for least-cost paths, FastAPI, Leaflet/deck.gl | Azure: a VM or Container Apps to precompute the swarm (a D4s VM costs roughly cents to about $0.20/h, well inside $200). Azure OpenAI only if you keep an LM narrator (optional). GoDaddy domain pointing to a static site; Copilot for boilerplate |
| Simple layered planner | Mars Trek; Perseverance or Curiosity raw images gallery (POV); geologic map; proposed-path animation | REMS weather; DONKI space weather; THEMIS Night IR; MSL traverse | Same, minus the ML parts. Leaflet with a custom CRS, or Cesium (it has a Mars ellipsoid) for 3D | GoDaddy for hosting a static build (prerendered tiles plus JSON); Azure Static Web Apps (free tier) or Blob storage for tiles; Copilot |
| Hybrid | All of the above | All of the above | Planner plus numpy Monte Carlo | Azure for batch precompute, GoDaddy domain |

### T4 MVP scope

| Idea | Must-have (by Sun 12:00) | Nice-to-have | Cut | Demo moment for 30 s video |
|---|---|---|---|---|
| Full Trailbreaker | Feature rasters (slope, roughness, Night IR proxy), rule-based per-tile verdict, swarm of N≥1000 walkers on a coarse grid, heatmap of visits and failures, best route | GBM verdict with "calibration" against Curiosity tilt; scenario switcher | Kev/Jev small LMs; "rover learns to decide" claim; Jezero | A heatmap fills in as walkers spread out, and the safest corridor emerges |
| Simple layered planner | Gale/boxwork AOI; layer toggles (HiRISE, CTX, slope, Night IR, hazards); click A→B gives the least-cost astronaut route with distance, time, max slope and an O₂/time budget; REMS "conditions today" panel; DONKI radiation alert banner; 3–5 Curiosity raw images pinned along the route | 3D terrain flyover (Cesium); HUD/tablet mode; astronaut pair or rover-assist mode | Swarm; ML | Tap a boxwork target, a route draws around a steep scarp, and a POV photo pops up at a waypoint |
| Hybrid | Everything in the simple planner, plus a Monte Carlo of 1000 perturbed routes (DEM noise, suit speed, a dust-storm opacity scenario that cuts rover-assist power and visibility). Output: a route-corridor heatmap, P(returning to the habitat within the EVA budget), and a validation plot of DEM slope vs Curiosity measured tilt | Scenario slider (nominal / dust storm / low power); rover-vs-astronaut comparison | LM components | "1,000 virtual explorers walk to the boxwork" (heatmap), then a dust-storm slider: the safe corridor narrows and the route reroutes, with "92% → 71% return-on-time" on screen |

---

## 3. Build plan (hybrid; adapt if you choose the full version)

**Stack:** Python (rasterio, numpy, scikit-image `graph.MCP_Geometric` for least-cost paths, which is much faster than hand-rolled A*), prerendered PNG overlays plus GeoJSON. Frontend: Leaflet with a lon/lat CRS reading Trek WMTS, or a static Vite page. Host as static files on GoDaddy or Azure Static Web Apps. No backend is needed if everything is precomputed for a few start/target pairs. Add an optional FastAPI on Azure for live A→B.

**AOI:** a box of about 3×3 km around Curiosity's current position (137.389E, 4.826S) in the boxwork unit. Pull it as roughly 6 ImageServer exportImage calls at 1 m, then coarsen to 2–4 m for routing.

| Who | Sat 10–22 | Sun 08–12 | Sun 12–16 |
|---|---|---|---|
| **Patrik** (architect) | Data pull scripts (ImageServer, S3 Night IR window, traverse, REMS), raster stack, AOI, repo skeleton | Integration, deploy | Buffer and bug-fix |
| **Bence** (AI/DS) | Features (slope, roughness = std of detrended DEM, Night IR normalised), cost model, MCP routing, Monte Carlo engine | Scenario runs on Azure, validation plot (DEM slope at Curiosity waypoints vs measured tilt) | Numbers for the slides |
| **Benedek** (geophysics, pitch) | Science story: boxwork, why thermal inertia means loose sand vs bedrock, astronaut EVA constraints with sources, choose 3 science stops; write the pitch | Record the 30 s video and slides | Final submission |
| **Yhair** (BI) | Frontend map and panels (layer toggles, route stats card, REMS/DONKI panel, POV image strip) | UI polish, HUD mode | Screenshots and video assets |

**Gates:** Sat 14:00, a DEM window loaded with a slope map rendered. Sat 20:00, a route between 2 points on the map. Sat 23:00, Monte Carlo heatmap. Sun 12:00, freeze features. Sun 14:00, video done.

---

## 4. Prior art and competition (relevant to Creativity)

- **Onboard autonomy already exists.** Perseverance ENav uses the ACE clearance check. JPL's ML heuristic papers: Abcouwer et al., "Machine Learning Based Path Planning for Improved Rover Navigation" (https://arxiv.org/abs/2011.06022), and MLNav (https://arxiv.org/pdf/2203.04563.pdf), which reports about 10× fewer collision checks on real Perseverance terrain. Do **not** pitch "teach the rover to decide for itself" as new. Pitch it as planning for human EVA, plus quantified risk under scenarios.
- **Orbital traversability for site selection:** JPL MTTT/SPOC (Ono et al.) combines terrain class, rock abundance and slope to predict rover speed and plan routes: https://www-robotics.jpl.nasa.gov/media/documents/Data-driven%20surface%20traversability%20analysis%20for%20Mars%202020%20landing%20site%20selection.pdf, https://nasa-jpl.github.io/SPOC. Present Trailbreaker as "MTTT-style cost model, retargeted to a suited astronaut, with Monte Carlo uncertainty". That reads as Validity, not copying.
- **Mars Trek** already offers layers, bookmarks and the rover traverses. **MMGIS** (https://github.com/NASA-AMMOS/MMGIS, the JPL ops map tool) is the source of the traverse JSONs. Many teams will submit "Trek with extra layers", so the differentiators are the astronaut-specific route and EVA budget, scenario Monte Carlo, the ground-truth validation, and POV images per waypoint.
- **Space Apps history:** in searches I found no 2023–2025 Global Winner on Mars route mapping. Earlier related entries include 2018 "Make Sense Out of Mars" and a 2018 lunar "Mission Planner" route/battery simulator (https://2018.spaceappschallenge.org/challenges/can-you-build/make-sense-out-mars/teams/space-marvin). The 2025 winners list is at https://www.spaceappschallenge.org/2025/meet-the-2025-global-winners/; I could not retrieve it fully because of a TLS error. Also note: a hobby web tool, "AstroMind" (https://dev.to/walsal201/astromind-4ji4), already combines MOLA, HiRISE and AI hazard maps, and a 2025 Frontiers paper covers a micro-rover team planner in Jezero (https://www.frontiersin.org/articles/10.3389/frobt.2025.1565173/full). The generic idea has been done; your execution and validation are what count.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| No orbital ground truth for "safe", so a learned and "calibrated" model is unjustifiable | Use a transparent, physics/rule cost model with cited thresholds. Validate only what can be validated: DEM slope vs Curiosity measured tilt from the traverse JSON. Say "uncertainty via Monte Carlo", not "calibrated probability" |
| Astronaut constraint numbers (slope limit, walking speed, EVA duration) are guessed | Benedek sources them (Apollo EVA traverse data, NASA xEVA/xEMU requirements) and shows them on one slide as adjustable parameters. Mark anything unsourced as "assumption" |
| 1 m DEM noise or seams create fake cliffs | Coarsen to 2–4 m, apply a median filter, and mask the DEM no-data value |
| Trek or ImageServer outage during judging | Pre-download the AOI rasters and tiles. Ship a static build with no live calls; live REMS/DONKI fetch with a cached JSON fallback |
| CRS/projection bugs in the web map | Pre-render overlays as PNG with known lon/lat bounds (`L.imageOverlay`). Use Trek WMTS only for the base map, or a static HiRISE quicklook |
| "Current conditions" are stale (REMS ends 2026-08-25; the MEDA feed is mostly empty) | Present it as "latest available sol" plus a scenario slider. DONKI gives truly current space weather |
| Scope creep (LMs, Jezero and Gale both, 3D) | One AOI, one science goal (boxwork), freeze at Sun 12:00 |
| Rate limit (DONKI DEMO_KEY was already rate-limited today) | Register a free api.nasa.gov key now |

## 6. Recommendation

Build the **hybrid**: a layered Marswalk planner for the Mount Sharp boxwork region, with a "1,000 virtual explorers" Monte Carlo on top.

1. **Drop from the pitch:** the Kev/Jev small LMs and the "rover learns to decide for itself" claim.
2. **Keep:** the swarm, recast as Monte Carlo risk for astronaut and rover-assist EVAs under dust-storm and low-power scenarios.
3. **Data layers:** at least 3 layer types, all verified reachable:
   - topographic: HiRISE 1 m DEM via Trek ImageServer
   - optical: HiRISE and CTX via Trek WMTS
   - thermal: THEMIS Night IR as a thermal-inertia proxy
   - atmospheric: REMS
   - space weather: DONKI
   - point-of-view: Curiosity raw images
4. **Validation slide:** use Curiosity's own measured tilt along the actual traverse. It gives the jury (a space software engineer and the Puli Space CEO) a quantitative credibility point that most teams will lack.

Expected score is about 21/25, against about 16 for the full Trailbreaker and 18–19 for the plain planner.

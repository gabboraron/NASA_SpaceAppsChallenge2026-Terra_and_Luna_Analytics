# NASA Space Apps Challenge 2026 — Team Workspace

Context file for Claude Code. Keep it current as decisions are made.
Status: initial version (2026-11-14) built from the team's idea docs; hackathon rules/resources
and Lunar Shield research sections are filled in from web research (see bottom).

## Project phase
Shared git repo for the team (GitHub, private). Phase 1 = research ideas → Phase 2 = pick one idea
(log it in `DECISIONS.md`) → Phase 3 = implement in `src/`. Until the decision is logged, do research, not code.

- **GitHub repo (team):** https://github.com/gabboraron/NASA_SpaceAppsChallange2026-Terra_and_Luna_Analytics
  (team name: Terra and Luna Analytics). Connected as `origin` (main). Commit freely; push only when the user asks.
- **Miro board (team):** https://miro.com/app/board/uXjVEO-aRlU=/ (Miro MCP server added at user scope; needs `/mcp` login).

## Folder layout
- `README.md` — repo overview & collaboration rules. `DECISIONS.md` — decisions log.
- `research/dashboard/index.html` — local interactive decision board (data in `data.js`, `data-hackathon.js`).
- `research/prototypes/slip-day/` — Slip Day prototype scripts (need spiceypy + LOLA DEM + NAIF kernels; data not in git).
- `research/` — Markdown research reports: `00-methodology.md` (how findings were made, how to verify), `01-hackathon-map.md`, `02-lunar-shield-science.md`,
  `03-past-winners.md` (patterns in 2021–2025 global winners), feasibility reports per idea (`04-*`).
- `hackathon/` — official/hackathon material (e.g. global winners 2021–2025 CSV).
- spacestatsonline.com was checked: launch statistics only, no API/licence. Not useful.
- `ideas/NASA Space Apps Challange 2026.docx` — kick-off notes, all 14 challenges, per-challenge pros/cons,
  team member profiles, "Slip Day" and "Trailbreaker" graphical abstracts.
- `ideas/Project Proposal_ Lunar Shield API.docx` — Lunar Shield proposal (lead idea).
- `ideas/Pollen & Bee EO Monitor.docx` — hyperlocal pollen/flowering EO idea.
- `ideas/Screenshot 2026-11-14 at 9.39.59.png` — "NISAR_Ideas" board (EO vs non-EO sticky notes + votes).
- Docs are .docx: read with `textutil -convert txt -stdout "<file>"` (macOS).

## Hackathon (full notes: `research/01-hackathon-map.md`; visual map: `research/space-apps-2026-map.html`,
published at https://claude.ai/artifact/X69PjJBvJTF7BbeF7ssx6z)
- Site: https://www.spaceappschallenge.org/2026/ · Challenges: https://www.spaceappschallenge.org/2026/challenges/
- **Hackathon weekend = 14–15 Nov 2026. Submission deadline: Sun 15 Nov 23:59 Budapest time** ("Submit for Judging").
  Global Nominees 3 Dec · Finalists 17 Dec · Winners 26 Jan 2027.
- Local event: Budapest (Civitta Space Terminal), Sigma Technology / RiverPark Offices, Közraktár u. 30–32, K32.
  Jury: Hanga Katreiner (space software eng., analog astronaut), Dr. Tibor Pacher (Puli Space), Miki Bata (Sigma), István Molnár (Lexunit).
- **Hard rules:** demo = video ≤ 30 s OR ≤ 7 slides (else not eligible globally) · ≥ 1 NASA dataset/resource, integral ·
  English · public final link, no login · team ≤ 6 · cite all sources · OSI license (default Apache-2.0) ·
  no promotion of commercial products/services (pitch a "B2B API" as a capability) · no PII · no NASA logos in generated media.
- **AI ("SI") policy:** allowed for building; the guide says SI should not be used to come up with the solution idea.
  Disclose SI use in the form. Watermark AI images and video; acknowledge AI code (incl. Copilot), data and audio in text and metadata.
- **Judging criteria (1–5 each):** Impact, Creativity, Validity, Relevance, Presentation.
- **10 Global Awards:** Best Use of Science / Data / Technology, Galactic Impact, Best Mission Concept, Most Inspirational,
  Best Storytelling, Global Connection, Art & Technology, Local Impact.

### The 14 challenges (2026)
| # | Challenge | Slug |
|---|---|---|
| 1 | Abandoned but not Forgotten (NASA discarded equipment storytelling) | nasas-discarded-equipment-storytelling |
| 2 | Be An Earth System Trend Detective! | earth-system-trend-detective |
| 3 | Build a Junior Astronaut Mission Trainer | junior-astronaut-mission-trainer |
| 4 | Health Monitoring Software for Astronauts | health-monitoring-software |
| 5 | Dancing with the SARs (NISAR) | dancing-with-the-sars |
| 6 | Field Shift: Adapting Farms with NASA Data | adapting-farms-with-nasa-data |
| 7 | Flame in Freefall (microgravity combustion, SI dashboard) | flame-in-freefall |
| 8 | Harmonization of MODIS and VIIRS Hot Spots | modis-and-viirs-hot-spots |
| 9 | Earth analogs for Moon base / Mars sites | permanent-moon-base-locations-and-mars |
| 10 | Interplanetary Survival Guide: Martian Map | interplanetary-survival-guide-martian-map |
| 11 | Lunar Landing Site Navigator | lunar-landing-site-navigator |
| 12 | Planet X and SPHEREx | planet-x-and-spherex |
| 13 | Space Mission Design Game | space-mission-design-game |
| 14 | The Earth Information Jukebox | the-earth-information-jukebox |

Team fit (from kick-off doc): great fit → 2, 5, 6, 8, 9, 10, 11; moderate → 1, 3, 12; off → 4, 7, 13, 14.

## Team
- Patrik P. Süli — researcher, software architect.
- Bence Majer — Óbuda Univ. Computer Eng. BSc (AI); ex data scientist (OTP Bank), AI engineer.
- Benedek (Máté Benedek Tibor) — geophysics BSc (GPR, seismic, EM field methods), CS BSc (Big Data/BI, ongoing),
  ÓE New Space Economy & Entrepreneurship Academy; pitching, narratives, technical docs.
- Yhair Sifuentes — BI consultant (YSB Analytics), Power BI/SQL/Python; business model & finance angle.
- Sándor Burian — team member (role/background not yet recorded; ask and fill in).
- Strengths: software/AI/data, GIS, geophysics/radar, BI/business. Weak: medicine, combustion, astrophysics.
- Lesson from the spring Cassini hackathon: the jury favored flashy pitches over sensor depth, so the pitch must be
  both striking and technically credible.

## Our ideas → challenge mapping
| Idea | Primary challenge | Secondary |
|---|---|---|
| **Lunar Shield API** (space-weather → per-asset safe-mode & restart, M2M) | 11 Lunar Landing Site Navigator (proposal's target) | 3 Junior Astronaut (radiation shielding trade-off), 10 Martian Map (space-weather layer) |
| **Slip Day** (site × day go/no-go, LOLA + Horizons, Kev/Jev decision model) | 11 Lunar Landing Site Navigator | 9 |
| **Trailbreaker** (Mars tile hazard verdicts + swarm simulation) | 10 Martian Map | — |
| Lunar Hardware Resource Recovery / "lunar wreckage extractor" | 1 Discarded Equipment | 9 |
| Pollen & Bee EO Monitor | 5 Dancing with the SARs | 6 Field Shift, 2 Trend Detective |
| Earth science research navigator ("Is southern Peru getting drier?") | 2 Trend Detective | 6 |
| Global cross-planetary similarity search / analogy breakdown | 9 Earth analogs | — |
| Railways / buildings with SAR (board notes) | 5 Dancing with the SARs | — |
| Educational EO LLM / AI EO dashboard via prompting (board notes) | 2 Trend Detective | 14 |

**Fit caveat for Lunar Shield:** challenge 11 is about Sun/Earth position, illumination, power and DTE comms
at south-pole sites, not space weather. Lunar Shield fits only if it is presented as a site/date planning layer
(e.g. radiation/space-weather risk + horizon shielding as one more factor next to light and comms), or merged with Slip Day.
**Team position (14 Nov):** the team considers the fit acceptable, and operators set their own per-robot thresholds
(Lunar Shield sends the event signal and restart window, not a part-failure model). See `DECISIONS.md`.

**Finding:** challenge 3 (Junior Astronaut) explicitly lists DONKI (space weather) and RadLab (OSDR radiation
dosimetry) as resources, so it is the only brief that names space-weather data. Challenge 11 does not mention radiation at all.
Final feasibility scores (/25, research estimates; details in `research/04-feasibility-*.md` and the dashboard):
Earth's Twin Finder (ch. 9) 23 · Research Navigator + LLM (ch. 2) 23 · Trailbreaker hybrid at Gale (ch. 10) 21 ·
Moon Salvage or Museum (ch. 1) 21 · Slip Day (ch. 11) 20, with a validated prototype · Budapest Ground Motion (ch. 5) 20 ·
Slip Day + Shield 17 · Lunar Shield solo 17 · Shield game (ch. 3) 17 · Pollen 17.
Added from the Miro board (14 Nov): Slip Day + Moon Power layer (ch. 11) 21–22, Build (`04-feasibility-lunar-solar-farm.md`;
engine matches NASA Glenn's 3–4 day darkness at a 10 m mast, fine-scale r = 0.60 vs Mazarico so NASA's map stays the base) ·
Moon Power Map standalone 18, Merge · Heat & Light of the Cloud (ch. 2, AI data-center heat/NDVI/night-light trends) 20, or 21–22
as Research Navigator's headline case (`04-feasibility-ai-datacenter-heat.md`) · "GPU smuggling from space" sticky 9, Drop (no
challenge fit, not observable, conduct-rule risk). "Cross-planetary vector search" sticky = Earth's Twin Finder.
Lunar Shield v2 (14 Nov, ): 17–18, Consider. Real-event backtest (6 events, GOES via ISWA HAPI):
restart at <10 pfu → 21 premature restarts; 1 h hold → 6; hysteresis 6 h <5 pfu → 2 (+27 % downtime). Moon and Earth decouple:
May 2024 G5 on Earth but S2 at the Moon; Jan 2012 Kp 5 but 6,310 pfu. DONKI new host: 60-day query limit. Prototype UX +
physics scene: ; architecture: .
Note: the published artifact still says "Slip Day + Shield layer = strongest". That is outdated: terrain open-sky fraction is
0.92–0.98 at landing sites (only 2–8 % shielding), and live SEP status means nothing for a future landing date.
Slip Day prototype facts: Horizons `coord@301` and spiceypy agree to 0.001°; LOLA LDEM_80S_80M horizon takes 0.25 s per site;
validated vs the Mazarico illumination map (r = 0.977, MAE 0.02). IM-2 landed on Mons Mouton (84.79°S, 29.20°E) carrying
Puli Space's instrument. Artemis III is now an Earth-orbit test, so say "Artemis crewed-landing candidate regions".

## Lunar Shield: research findings (full report: `research/02-lunar-shield-science.md`)
- Main hardware threat = **SEP protons** (SEU/SEL + dose). GCR background is small (Chang'e-4: 13.2 µGy/h in Si).
  X-ray flares only matter as SEP precursors. **Surface/deep-dielectric charging** is a separate risk channel.
- The Moon in Earth's magnetotail (~4–6 d/month) is **not** shielded from SEPs (Liuzzo et al. GRL 2023), so don't discount risk there.
- **Terrain shielding is already published:** Phipps, Stubbs et al. (NESF 2021 → LPSC 2024) used LOLA horizon solid angle
  + Geant4 → ≥40 % reduction inside craters, ≥10 % outside rims. A possible novel angle (only a hypothesis) is that early
  anisotropic SEP beams arrive near the horizon at polar sites.
- **Lead time is short:** particles arrive in < 1 h, and the peak comes 1.7–103 h after onset. REleASE warns ~30–90 min ahead, UMASEP ~2–3 h.
- **Existing chain:** NASA SRAG, Moon to Mars Space Weather Analysis Office, NOAA SWPC, CCMC SEP Scoreboard (ISEP),
  CLEAR (Michigan) on Artemis II. SRAG 2026 validation: 23 models; best real-time HSS ≈ 0.70 (REleASE); peak-flux
  errors up to 2 orders of magnitude, not yet operational-grade.
- Flare ML is modest (TSS ~0.5–0.8) and flares ≠ SEPs, so **drop the SDO CNN** (stretch goal at most).
- **No public evidence that any lunar lander mode-switches on space-weather forecasts, and no lunar
  space-weather-as-a-service API found.** Closest: Mission Space (NASA LEEMR, 2026), LunaNet "Space Weather Alerting Services".
- **The differentiator is still valid:** restart / all-clear window with hysteresis + second-CME watch, per-asset translation
  (shielding depth, part sensitivity, mission phase), M2M alert schema, aimed at robotic CLPS-class operators.
  Literature backs it: SRAG lists all-clear at 6/24/48 h as a need; SWPC says the end of an event takes hours to confirm;
  anomaly rates peak 4–5 days after onset.
- Pitch line: "We don't out-forecast NASA. We turn community forecasts into auditable asset actions and restart windows."
- Validation: backtest on SEPVAL / CLEAR benchmark with SPHINX metrics (HSS, FAR, FAER, warning time) + a restart-window error.

### Lunar Shield verified data stack (checked live 2026-11-14; full inventory: `research/02b-lunar-shield-data.md`)
- **DONKI moved:** use `https://ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR,CME,SEP,IPS,GST,notifications,...}?startDate=&endDate=`
  (no key). The api.nasa.gov DONKI endpoints returned 404/400, and DEMO_KEY hit its rate limit after ~6 calls.
- **NOAA SWPC JSON** (`services.swpc.noaa.gov/json/...`): GOES protons/X-rays/electrons, `alerts.json`, `noaa-scales.json`,
  `solar_probabilities.json`, `enlil_time_series.json`. Read `json/goes/instrument-sources.json` at runtime
  (GOES-18 protons/X-ray, GOES-19 electrons). Real-time solar wind now comes from **SOLAR-1** (`json/rtsw/rtsw_wind_1m.json`;
  filter on `active==true`). The old `/products/solar-wind/*.json` paths return 404.
- **ISWA HAPI** `https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/` (no key): `CRaTER` LRO lunar dose 2009→2026,
  `SWMF2023_RT_MOON` (magnetotail flag), `goesp_part_flux_P5M` (GOES proton history). Use `hapiclient`.
- **SEP Scoreboard** live forecast JSON via `iswa.ccmc.gsfc.nasa.gov/api/redirect?...dataID=1215`; validate with `ktindiana/sphinxval`.
- **Labels:** NOAA proton-event list (1976→), GSEP (doi:10.7910/DVN/DZYLHK), `ktindiana/fetchsep`.
- **Terrain/geometry:** PGDA 5 m south-pole site DEMs (per-site tiles; the 87°S mosaic is 3.47 GB), PGDA illumination maps,
  Moon Trek WMTS, JPL Horizons topocentric lunar sites or spiceypy + de440s / moon_pa_de440 kernels.
- Skip within 48 h: ESA SWE (login), OLTARIS/SPENVIS/CREME (registration), Geant4, Surya training, Chang'e-4 data.

## Lunar Shield API — working concept (original proposal)
- Pitch as **probabilistic risk guidance + recommended action**, NOT "predicting solar flares".
- Layers: nowcast (minutes, live GOES/DSCOVR/DONKI) → short-term forecast (hours, ML SEP probability with uncertainty)
  → operator layer (green/yellow/red per asset, continue / safe mode / shutdown, **restart window with hysteresis**).
- Restart / all-clear logic is the main differentiator.
- Demo options: physical micro-controller mini-rover that stops drilling + red LED (ROS 2 / Foxglove);
  or interactive Moon map with assets that each have their own parameters + live solar-activity dashboard.
- Future work: CME prediction, per-geocoordinate surface prediction, digital twin, embodied-AI from teleoperation.
- Seed resources: api.nasa.gov (DONKI: FLR/CME/SEP), services.swpc.noaa.gov/products (GOES X-ray, DSCOVR solar wind),
  Helioviewer API v2 (SDO images), Moon Trek APIs (LRO DEM, shadow maps), SunPy, Foxglove.

## Sponsor resources available to us (per NASA email to the team)
- **Microsoft Azure**: **USD 200 credit, valid 30 days** (assumed from activation, so check the email).
  Activate only when the build phase starts, so the 30 days cover the hackathon and the demo/judging period.
  Budget: small always-on resources (App Service B1 or Container Apps, Functions on the consumption plan, Blob Storage)
  cost a few to tens of USD a month. Avoid GPU VMs: train ML models locally or on Colab/Kaggle and
  deploy only inference. Set an Azure budget alert at USD 50/100/150. After 30 days the demo must survive
  on GoDaddy hosting or a free tier.
- **GitHub Copilot (GHCP)** → coding assistance; team repo lives on GitHub.
- **GoDaddy** hosting + a domain → public demo URL / landing page for the pitch.
- Exact credit amounts, claim steps and deadlines are in the email, not yet copied here — add them when known.
- Architecture implication (any idea): prefer an Azure-friendly stack, e.g. Python FastAPI on Azure App Service or
  Container Apps, scheduled ingestion via Azure Functions, Azure Blob Storage for cached data,
  Azure ML / Azure OpenAI only if the idea needs it; frontend on the GoDaddy domain (or Azure Static Web Apps
  with the GoDaddy domain pointed at it via DNS). Mention the sponsor tools in the project write-up.

## Repo maintenance (this repo IS the submission)
- The final project link points at this repo, so it must look professional and stay public-safe.
- Keep `README.md` current: status table, chosen idea, live app + ≤30 s demo links, data & citations list, team.
- Log every decision in `DECISIONS.md` and every AI use in `AI_USAGE.md` (date, tool, what, reviewer).
- **No PII in the public repo** (Space Apps rule): `ideas/*.docx` contain LinkedIn profiles, work history and
  meeting names, so remove or redact them before the repo goes public.
- Code goes in `src/`; one README section per component; pin dependencies (`requirements.txt` / `pyproject.toml`).
- Commit style: Conventional Commits (`feat:`, `fix:`, `docs:`, `data:`, `chore:`). Small commits; never commit secrets
  (Azure keys, Earthdata tokens → `.env`, which is gitignored).
- Large data never goes into git: cache under `data/` (gitignored) and document how to re-download it.
- License: Mozilla Public License 2.0 (`LICENSE`, chosen by the repo owner; OSI-approved, so it satisfies the Space Apps rule). Third-party data keeps its own licence; list it in the README.

## Working conventions
- **Explainability (team request, 14 Nov):** every finding Claude gives the team must carry its source URL and a label:
  tested (fetched today), paper/official page, computed (reproducible from repo code), estimate (AI judgement), or unverified.
  Never present an estimate as a fact. Method and labels: `research/00-methodology.md`. Keep the per-idea `sources`
  in `research/dashboard/data.js` and the Miro idea cards in sync when findings change.
- Miro "Idea review" section (right of NISAR_Ideas): ranking table, idea cards with sources + dot vote,
  "How to check our findings", "Open questions".
- Cite a source URL for every dataset/claim used in the pitch.
- Prefer verified NASA/NOAA endpoints; mark unverified ones.
- Keep scratch work out of `ideas/`.

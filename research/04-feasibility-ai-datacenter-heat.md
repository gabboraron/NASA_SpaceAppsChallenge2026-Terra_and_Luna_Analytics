# Feasibility: "Detect Chinese GPU smuggling from space" and a neutral reframe

Date: Sat 2026-11-14, ~11:00 CET. Labels follow `research/00-methodology.md`: [tested] fetched today and worked, [paper] publication or official page, [computed] our own calculation (method shown), [estimate] agent judgement, [unverified] not confirmed (includes news-only claims).

**Bottom line.** Drop the original framing. It fits none of the 14 challenges, it names a nationality as the target, and public EO cannot see GPUs. What EO *can* see (data-center construction, roof and land-cover change, local land-surface warming, power infrastructure) maps cleanly onto **Challenge 2, "Be An Earth System Trend Detective!"**, so the reframe "AI data-center footprint trend detective" is feasible by Sunday. It is best built as one showcase case inside the team's existing ch. 2 "Research Navigator" idea, not as a separate project.

---

## 1. Rules and fit

### Does any challenge accept the original idea?
No. I checked all 14 challenge summaries in `research/01-hackathon-map.md` §4. None covers trade enforcement, export controls, semiconductors or geopolitical monitoring [paper] (https://www.spaceappschallenge.org/2026/challenges/). The nearest are ch. 2 (trend detection on Earth-science variables), ch. 5 (NISAR surface change, which includes "Show how human drivers (agriculture, industry, etc.) are impacting Earth's natural resources") and ch. 8 (MODIS/VIIRS hot spots, which is about fire). They take the *observable* part (land change, heat) but not the "smuggling" goal.

### Rules the original framing puts at risk (quoted from `01-hackathon-map.md` §2, source https://www.spaceappschallenge.org/legal/ [paper])

| Rule (quoted) | Risk for "Detect Chinese GPU smuggling" |
|---|---|
| "**Submissions must directly address one or more official Challenges.**" Minimum eligibility: "respond to an official challenge". | High. No challenge asks for this, so it can fail eligibility before scoring. |
| "**Forbidden content:** … personal attacks; **discriminatory language/hate speech** …" | Medium to high. Putting a nationality ("Chinese") in the title as the target of suspicion can be read as discriminatory, whatever the intent. |
| "**China restriction:** cannot participate in connection with an affiliation with China or a Chinese-owned entity … Teams undergo review for prohibited bilateral activity before Global Judging." | Low for eligibility (it concerns *affiliation*, not topic, and the team has none). The optics are bad, though: a project about China lands in a review step that is already China-sensitive. [estimate] |
| "**no ITAR/EAR export-controlled info**" (third-party materials) | Low to medium. Public EO and public court cases are not export-controlled, but a project *about* EAR enforcement invites the question, and naming chip models or routes adds nothing to the science. [estimate] |
| "**Relevance** — fully addresses the chosen challenge; NASA data integral" | High. No challenge is addressed, and NASA data cannot measure the claimed target (see §2). |
| "**Validity** — scientifically grounded, technically feasible" | High. The core claim is not observable (see §2). |
| "no PII"; "**personal attacks**" | Medium. Smuggling cases name private individuals and small firms [unverified, news] (e.g. https://www.outlookindia.com/international/ai-chip-diversion-china-nvidia-singapore-malaysia-india), so using them in a demo would target people. |

---

## 2. Technical reality: can GPU smuggling be seen from orbit?

### What the smuggling actually looks like
Reported cases involve paperwork fraud and transshipment: servers are declared for Singapore or Malaysia and then re-exported. One example is a US case over ~USD 300 M of servers; another is a Singapore fraud case over servers declared for Singapore and moved to Malaysia [unverified, news] (https://technologymagazine.com/news/arrests-made-as-millions-of-nvidia-chips-smuggled-into-china, https://www.outlookindia.com/international/ai-chip-diversion-china-nvidia-singapore-malaysia-india). None of this happens at a scale or in a form that a satellite records: a container, a pallet of servers or a suitcase of GPUs looks like any other cargo. **No public EO sensor can detect chip movement.** [estimate, consistent with FAS below]

### What the expert literature says EO can and cannot do
- FAS, *Tracking Hyperscale AI Data Center Growth with Satellite Imagery* (Krawec, 12 May 2026) [paper] https://fas.org/publication/tracking-hyperscale/
  - **Cannot:** EO imagery "cannot directly observe GPUs or other indoor hardware". It cannot give chip count or chip type, or measure operational energy use directly. Cooling-based numbers are "approximations of capacity rather than exact measurements".
  - **Can:** footprint, construction progress, substations, gas turbines and generators, and cooling towers and chillers (giving rough power estimates). Example accuracy: xAI Colossus estimated at 142 MW against 150 MW reported.
  - **Resolution need:** features generally need ≤ 50 cm; air-cooled chiller fans need finer than 30 cm. That is **commercial** imagery (Airbus, Planet, Vantor at ~USD 15 to several hundred per km²). Free Sentinel-2 (10 m) and Landsat (30 m) show footprint and construction only. Thermal IR is listed as *future research*.
  - It cites Heim and Pilz (late 2024): imagery is "limited in its usefulness to track the proliferation of computing power". I could not find the original, so treat it as [unverified] via FAS.
- Epoch AI *Frontier Data Centers Hub* (launched 4 Nov 2025; 13 US sites at launch, ~15 % of global H100e) [paper] https://epoch.ai/blog/introducing-the-frontier-data-centers-hub/. It infers power from chillers and cooling towers in high-resolution imagery, then corroborates with permits; compute comes from chip-type assumptions. **No error bars are published.** The site explorer for Google Omaha gives "~199k H100e" with no range [tested] (https://epoch.ai/data/data-centers/satellite-explorer/GoogleOmahaNebraska). Data is CC BY. Today the CSV download held **96 named sites** across the US, Malaysia, China, Norway, Finland, Sweden, Portugal, the UK, Iceland and others, with addresses and dated construction timelines [tested] (https://epoch.ai/data/data_centers/data_centers.csv, https://epoch.ai/data/data_centers/data_center_timelines.csv).
- Wasil et al., *Verification methods for international AI agreements* (arXiv 2408.16074, 2024) [paper] https://arxiv.org/abs/2408.16074. It lists remote sensing among "national technical means" for finding *undeclared data centers*, not chips. The abstract does not quantify accuracy.
- **Thermal "data heat island":** Marinoni et al., arXiv 2603.20897 (v3, Apr 2026, preprint) [paper] https://arxiv.org/html/2603.20897v3. Reconstructed **NASA MODIS LST** on a 500 m grid, ~6,733 data-center locations from DataCenterMap, 2004–2024 pre/post comparison. Reported mean LST rise **+2.07 °C** after operations start (range 0.3–9.1 °C), detectable to ~4.5 km at +1 °C and up to 10 km. **Limitations:** causation is assumed, there is no control-site group, and land-cover change from construction (roofs, bare soil) is not separated from waste heat. Treat these as upper-bound associations.
- **Single-site Landsat case:** Pando, Uruguay data center, ~+2.1 °C vs surroundings, with nearby industrial buildings as controls [unverified, journalism] (https://pulitzercenter.org/stories/data-centers-heat-behind-cloud).
- **Night lights:** I found no study using VIIRS Black Marble to detect data centers. A 2026 Nature study links Black Marble change to industrial and construction booms in general [unverified, secondary] (https://www.earthdata.nasa.gov/data/projects/black-marble). Data halls are mostly dark, so the signal comes from site lighting and construction [estimate].

### Our own quick test [computed]
Script: `/private/tmp/claude-501/-Users-spatr-Documents-NASA/29e57abf-a334-40a0-9816-6142459d9c5c/scratchpad/scripts/lst_test.py`.
**Method.** Landsat 8/9 Collection 2 L2 from Microsoft Planetary Computer STAC, June–August, cloud cover < 10 %, 8 scenes per year, QA cloud/shadow mask. ST_B10 converted to °C (×0.00341802 + 149 − 273.15). Each year is a median composite on a fixed 30 m UTM grid. The "site" is located automatically as the largest smoothed NDVI loss from 2022 to 2026 within ~6 km of Spinks Rd, Abilene, TX, the listed address of OpenAI Stargate Abilene in Epoch's CSV. Site = r < 400 m; ring = 3–5 km.

| Summer | Site LST | Ring LST | Site − ring | Site NDVI |
|---|---|---|---|---|
| 2022 | 51.7 °C | 55.8 °C | −4.1 °C | 0.18 |
| 2023 | 50.1 °C | 52.7 °C | −2.5 °C | 0.14 |
| 2025 | 45.4 °C | 46.6 °C | −1.2 °C | 0.00 |
| 2026 | 50.8 °C | 51.7 °C | −0.9 °C | 0.00 |

- The site warmed ~**+3.2 °C relative to its surroundings** from 2022 to 2026, while vegetation disappeared (NDVI 0.18 → 0.00). The whole run took ~35 s [tested].
- **Caveats:**
  - The detected centre (32.554 N, 99.817 W) is ~6.7 km north of the Spinks Rd segment. It is **not confirmed** to be the campus [unverified]; Epoch gives addresses, not coordinates.
  - Roofs and bare soil alone raise daytime LST, so this does **not** isolate waste heat.
  - No significance test was run (n = 4 composites).
- **Lesson:** the pipeline is fast and works, but attribution needs (i) verified footprints and (ii) control sites plus **nighttime** LST (ECOSTRESS or MODIS night), where solar heating of roofs is absent.

### Verified NASA/partner data access today [tested]
| Data | Resolution (official) | Access check today |
|---|---|---|
| Landsat 8/9 C2 L2 (incl. TIRS ST_B10) | 30 m product (TIRS native 100 m) | MPC STAC `landsat-c2-l2` HTTP 200, 0.23 s; scenes read OK (https://planetarycomputer.microsoft.com/api/stac/v1/collections/landsat-c2-l2) |
| HLS L30/S30 (Harmonized Landsat-Sentinel) | 30 m | CMR: HLSL30 v2.0 C2021957657-LPCLOUD, HLSS30 C2021957295-LPCLOUD (https://cmr.earthdata.nasa.gov/search/collections.json?short_name=HLSL30) |
| ECOSTRESS L2T LSTE | 70 m, varying time of day incl. night | CMR: ECO_L2T_LSTE v002 C2076090826, v003 C3998139651 (LPCLOUD) |
| VIIRS Black Marble VNP46A2 (daily) / A3 (monthly) | 15 arc-sec (~500 m) [paper] https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/science-domain/nighttime-lights/ | CMR: C3365931269-LAADS, C3860061042-LAADS |
| Sentinel-2 L2A (ESA, partner) | 10 m | MPC STAC HTTP 200 |
| Giovanni, AppEEARS (**ch. 2 listed resources**) | — | Both HTTP 200 (https://giovanni.gsfc.nasa.gov/giovanni/, https://appeears.earthdatacloud.nasa.gov/api/product) |
| Epoch AI data-center CSVs (CC BY) | site list + timelines | Downloaded OK |

Earthdata Login is needed to download ECOSTRESS, HLS and Black Marble granules (free, a few minutes per person) [paper] https://urs.earthdata.nasa.gov/.

---

## 3. Neutral reframe

**"Heat & Light of the Cloud: an Earth System Trend Detective for AI data centers."**
Users pick a data-center site, from Epoch's open list or by drawing a polygon. The tool pulls NASA variables around it: Landsat/ECOSTRESS **land-surface temperature** (day and night), **NDVI/impervious change** (HLS), **night lights** (Black Marble) and optionally MODIS LST for a 20-year baseline. It plots site-vs-control time series, removes seasonality, and runs **Mann-Kendall + Sen's slope** (and a before/after-opening test). It then says in plain language *what changed, where, by how much, and whether it is significant*. That sentence is almost verbatim the ch. 2 objective: "determine what is changing, where it is changing, how much it is changing, and if these changes are what scientists call 'significant'", with "t-test, the Mann-Kendall test, or confidence intervals" [paper] (https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/).

### Why it fits ch. 2
- **Listed resources are used:** AppEEARS (area time series of MODIS LST, VIIRS, ECOSTRESS, HLS) and Giovanni. The ch. 2 brief also invites SI help to pick variables [paper].
- **Audience match:** students and the public "becoming data detectives" on a topic in the news. [estimate]
- **Relevant, neutral cases** (no nationality targeting; the set can be global and balanced):
  - **Hungary / local impact:** the planned **Paks AI campus** (ParTec + 3D Lézertechnika LoI, 96 MW, next to the nuclear plant; status was a letter of intent per 2025 reports) [unverified, news] (https://444.hu/2025/07/15/3-milliard-euros-nemet-oriasberuhazas-jonne-paksra-az-orszag-legnagyobb-napelemparkjaval-hoznanak-letre-hatalmas-energiaigenyu-mi-adatkozpontot). The tool can set a **pre-construction baseline** (land, LST, lights) now. That is a strong "Local Impact" story. Hungary's installed data-center capacity is small (~31 MW, 2025) [unverified, market report] (https://www.researchandmarkets.com/reports/6260034/hungary-data-center-market-share-analysis).
  - **EU:** Ireland, where data centres used **22 % of metered electricity in 2024** (6,969 GWh, up from 5 % in 2015) [paper] (https://www.cso.ie/en/releasesandpublications/ep/p-dcmec/datacentresmeteredelectricityconsumption2024/keyfindings). Also Epoch's EU sites: Nebius Mäntsälä (FI), EcoDataCenter 2 Borlänge (SE), Start Campus Sines (PT) [tested].
  - **Global:** Stargate Abilene, with a dated build timeline in Epoch (land clearing May 2024, Building 1 operational ~Sep 2025) that gives a clean before/after test [tested].

### Assessment of the reframe
- **Strengths:**
  - Direct objective match.
  - NASA data is integral, not decorative.
  - A topical "AI's physical footprint" hook for the Budapest jury and Impact.
  - The team has Earth-science and BI strengths (Benedek, Yhair) [estimate].
- **Weaknesses:**
  - Prior art exists (Marinoni preprint, FAS, Epoch), so Creativity sits around 3, not 5.
  - Attribution of LST to waste heat is weak at 30–100 m, especially by day.
  - Water use is **not** observable with Landsat at site scale: Epoch's "Water use (MGD)" column is mostly empty, and GRACE is far too coarse [tested/estimate]. Do not claim water.
- **Overlap:** this is the same challenge as the already-scored "Research Navigator + LLM (ch. 2) 23/25". Recommend merging: the Navigator is the tool, and data centers are its headline case.

---

## T1 Feasibility

| Idea | Challenge | Core NASA data (verified URL) | Data access effort | Build effort (person-hours) | Feasible by Sun 16:00? | Biggest technical risk |
|---|---|---|---|---|---|---|
| (a) Detect Chinese GPU smuggling from space | None (nearest: ch. 2 or ch. 5, both off-target) | None measures the target. Landsat C2 L2 only shows buildings (MPC STAC, [tested]) | Low for imagery; impossible for the actual signal | Unbounded: the core detection cannot be built [estimate] | **No** | GPUs, shipments and transshipment are unobservable from orbit (FAS: "cannot directly observe GPUs") [paper] |
| (b) AI data-center footprint Trend Detective | **Ch. 2 Be An Earth System Trend Detective** | Landsat C2 L2 ST/NDVI (MPC, [tested]); ECOSTRESS ECO_L2T_LSTE (CMR C2076090826, [tested]); VIIRS VNP46A3 (CMR C3860061042, [tested]); HLS L30/S30 ([tested]); AppEEARS/Giovanni ([tested] 200) | Low to Med (MPC needs no login; ECOSTRESS and Black Marble need Earthdata Login) | ~40–50 ph core + ~10 ph pitch/video [estimate] | **Yes** (MVM of 4–6 sites) | Attribution: construction-driven LST rise is confused with waste heat. Mitigate with nighttime LST, control sites, and wording ("surface warming associated with", not "caused by") |

## T2 Judging score estimate [estimate]

| Idea | Impact | Creativity | Validity | Relevance | Presentation | Total /25 | One-line rationale |
|---|---|---|---|---|---|---|---|
| (a) original | 2 | 3 | 1 | 1 | 2 | **9** | Catchy, but no challenge fit, infeasible core claim and a nationality-targeting framing that judges may read as discriminatory |
| (b) reframe | 4 | 3 | 4 | 5 | 4 | **20** | Direct ch. 2 objective match with a topical hook and real statistics. Creativity is capped by Marinoni, FAS and Epoch prior art (21–22 if merged with the Navigator's SI variable picker) |

## T3 Resource mapping

| Idea | Listed challenge resource used | Other NASA/partner data | Open-source tools | Sponsor resources |
|---|---|---|---|---|
| (a) original | none applicable | Landsat/Sentinel-2 imagery (buildings only) | — | — |
| (b) reframe | **AppEEARS** (area time series: MODIS LST MOD11/MOD21, VIIRS, ECOSTRESS, HLS); **Giovanni** (regional context); KNMI Climate Explorer and Mann-Kendall guides from the ch. 2 tab [paper] | Landsat C2 L2 (NASA/USGS); ECOSTRESS; VIIRS Black Marble VNP46A2/A3; HLS; ESA Sentinel-2 (partner); context sources: Epoch AI sites/timelines (CC BY), CSO Ireland | pystac-client, planetary-computer, rasterio/stackstac, xarray, pymannkendall, Streamlit or FastAPI + MapLibre/Leaflet | **Microsoft Planetary Computer** (STAC data, [tested]); Azure App Service/Container Apps for the API (USD 200); GitHub Copilot; GoDaddy domain for the public link; Google Cloud USD 300 optional (Earth Engine only as a fallback) |

## T4 MVP scope

| Idea | Must-have (by Sun 12:00) | Nice-to-have | Cut | Demo moment for 30 s video |
|---|---|---|---|---|
| (a) original | — (not recommended) | — | Everything that names a country or people, or claims chip detection | — |
| (b) reframe | (1) 4–6 sites: Stargate Abilene, Colossus 1, one EU site, the Paks pre-build baseline, plus 2 control sites. (2) Landsat summer day LST + NDVI annual series 2015–2026, site vs ring. (3) Mann-Kendall + Sen's slope with plain-language verdict ("+0.4 °C/yr, significant, p<0.05"). (4) Map + chart web page at a public URL. (5) Data/citation panel and SI disclosure | ECOSTRESS **night** LST; Black Marble monthly radiance trend; before/after-opening test using Epoch timeline dates; SI "variable picker" (ch. 2 consideration); user-drawn polygon | Water use (unobservable); chip/compute estimates; commercial imagery; any ML model; any smuggling or national framing | Split screen: a 2016 → 2026 Landsat slider shows a field turning into a server campus, while the LST chart beside it climbs and a stamp reads "Trend: +X °C, significant (Mann-Kendall p<0.05)". Then a cut to Paks: "Baseline recorded. We'll know." |

---

## Pros and cons

**(a) Original framing**
- Pros:
  1. Topical and attention-grabbing.
  2. Links to a real policy debate (compute governance).
  3. Reuses the same EO pipeline as (b).
- Cons:
  1. Fits no challenge, so eligibility fails ("must directly address one or more official Challenges").
  2. The target signal is physically unobservable with public EO (FAS).
  3. Nationality targeting and named individuals risk the "discriminatory language / personal attacks / PII" rules and the China-review optics.

**(b) Neutral reframe**
- Pros:
  1. Near-verbatim match to the ch. 2 objectives and uses two listed ch. 2 resources.
  2. Data access was tested today (MPC, CMR), and a working LST pipeline exists in scratch (~35 s per site).
  3. Strong local (Paks, Hungary) and EU (Ireland 22 %) storytelling.
- Cons:
  1. Prior art (Marinoni 2026, FAS 2026, Epoch) limits novelty.
  2. Attribution of heat versus land-cover change is scientifically weak, especially by day at 30–100 m.
  3. It duplicates the team's existing ch. 2 Navigator idea unless merged.

## Prior art
- Marinoni et al. 2026, *The data heat island effect* (MODIS LST, ~6.7k sites, +2.07 °C mean): https://arxiv.org/html/2603.20897v3 [paper, preprint]
- FAS / Krawec 2026, *Tracking Hyperscale AI Data Center Growth with Satellite Imagery*: https://fas.org/publication/tracking-hyperscale/ [paper]
- Epoch AI Frontier Data Centers Hub (imagery + permits; 96 sites in CSV): https://epoch.ai/data/frontier-data-centers [tested]
- Wasil et al. 2024, *Verification methods for international AI agreements*: https://arxiv.org/abs/2408.16074 [paper]
- SatVu thermal mapping of crypto-miner heat in Texas (commercial 3.5 m thermal): https://datacentrenews.uk/story/satvu-maps-crypto-miners-heat-from-space-in-texas [unverified, news]
- Pando, Uruguay Landsat case: https://pulitzercenter.org/stories/data-centers-heat-behind-cloud [unverified, journalism]

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Daytime LST rise is from roofs and soil, not servers | Add ECOSTRESS night LST and control industrial sites (warehouses) built in the same years; word results as "associated with" |
| Site coordinates unverified (Epoch gives addresses only; our auto-locator may hit the wrong blob) | Hand-digitise footprints for 4–6 sites from Sentinel-2/Landsat true colour in 30 min; store them as GeoJSON in the repo |
| Cloud gaps and too few points for significance | Use annual/summer composites over 2013–2026 (n ≈ 12–14) and report Sen's slope with CI; say "not yet significant" honestly (the ch. 2 brief explicitly values this) |
| Earthdata Login or AppEEARS queue delays | Primary path = MPC Landsat (no login, [tested]); request AppEEARS area jobs Saturday afternoon; cache results in `data/` |
| Political drift back to the "smuggling" angle in the pitch | Pitch line: "AI has a physical footprint on Earth. We let anyone measure it with NASA data." No country, company blame or chip claims |
| Overlap with the Navigator idea | Merge: Navigator UI + this as the featured case |

## Roles (≈68 person-hours) [estimate]
- **Patrik (architect):** pipeline (MPC STAC → composites → stats API), repo/README, Azure deploy. ~18 ph.
- **Bence (AI/DS):** Mann-Kendall/Sen's slope and before/after test, control-site logic, ECOSTRESS night LST, optional SI variable picker. ~18 ph.
- **Benedek (geophysics, pitch):** site footprints and controls, physical interpretation (urban-heat physics, confounders), 30 s video and storyline. ~16 ph.
- **Yhair (BI):** front-end map/charts (or Power BI-style dashboard in web), Ireland/Hungary energy context, citations and SI disclosure. ~16 ph.

Timeline: Sat 12–18 data + footprints → Sat 18–24 stats + API → Sun 00–10 UI + deploy → Sun 10–12 freeze → Sun 12–16 video, README, submission.

## Recommendation
**Do not pursue (a).** It is ineligible (no challenge), infeasible (chips are invisible from orbit), and its framing risks the conduct rules. **If the team wants this theme, build (b) under ch. 2, ideally as the headline case of the existing "Research Navigator" ch. 2 idea.** That keeps the strong 23/25 ch. 2 baseline and adds a topical, Hungary-relevant (Paks baseline) demo with NASA LST/NDVI/night-light trends and real significance tests. Standalone, (b) scores ~20/25 [estimate], on par with Slip Day and below the merged option.

## Top sources
1. [paper] FAS (2026), Tracking Hyperscale AI Data Center Growth with Satellite Imagery: https://fas.org/publication/tracking-hyperscale/
2. [paper] Marinoni et al. (2026), The data heat island effect (MODIS LST): https://arxiv.org/html/2603.20897v3
3. [tested] Epoch AI data-center CSV + timelines (CC BY): https://epoch.ai/data/data_centers/data_centers.csv
4. [paper] Ch. 2 challenge page (objectives, Mann-Kendall, AppEEARS/Giovanni): https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/
5. [tested] Landsat C2 L2 on Microsoft Planetary Computer: https://planetarycomputer.microsoft.com/api/stac/v1/collections/landsat-c2-l2
6. [paper] CSO Ireland, data centres 22 % of metered electricity 2024: https://www.cso.ie/en/releasesandpublications/ep/p-dcmec/datacentresmeteredelectricityconsumption2024/keyfindings

# Feasibility: SAR ideas for Space Apps 2026 Budapest (written Sat 2026-11-14, 10:00 CET)

Deadline: Sun 2026-11-15 16:00 CET. Assumed capacity: 4 people x ~17 h = **~70 person-hours**, with a feature freeze on Sun 12:00.

## 0. Verified facts that drive the decision

**NISAR data is real, public and covers Budapest.** I queried NASA CMR live on 2026-11-14 with the bbox 18.9–19.35 E, 47.35–47.65 N:

| Collection (CMR short name) | Granules over Budapest | Months | Typical size |
|---|---|---|---|
| `NISAR_L2_GUNW_PROVISIONAL_V1` (unwrapped interferogram, 12-day pairs) | 66 | Jan–May 2026: 1–3 per month. **Jun–Sep 2026: 11–15 per month.** Oct: 3 | **~2.3 GB** each |
| `NISAR_L2_GCOV_PROVISIONAL_V1` (polarimetric backscatter, HH+HV "DHDH") | 73 | Same pattern: dense from Jun to Oct 2026 | **~1.9–2.0 GB** |
| `NISAR_L2_GCOV_V1` (VALIDATED) | 7 | 2026-10-22 to 2026-11-03 | ~1.9–2.0 GB |
| `NISAR_L2_GUNW_V1` (VALIDATED) | 0 so far | – | – |
| `NISAR_L2_GSLC_PROVISIONAL_V1` | 72 | – | **~12 GB** (too big for us) |
| `NISAR_L2_GCOV_BETA_V1` | 16 | Oct 2025 – Jan 2026 | ~2 GB |

- **Tracks:** 6 track/frame combinations (both ascending and descending) cover Budapest. Examples: `158_A_025/026`, `057_A_026`, `051_D_064/065`, `152_D_064`. Over Hungary the radar runs in 20+5 MHz mode (`2005` in the file names).
- **Release history** ([ASF availability](https://hyp3-docs.asf.alaska.edu/nisar-docs/availability-overview/), [Earthdata news](https://www.earthdata.nasa.gov/news/nisar-l-band-data-released-expanding-record-surface-changes)):
  - BETA: released 2026-02-27, acquisitions Oct 2025 – Jan 2026.
  - PROVISIONAL: released 2026-07-20, acquisitions from 2026-06-17.
  - VALIDATED L0–L2: released **2026-11-06**, acquisitions from 2026-10-21.
  - Reprocessing of the older data is planned for 2027.
  - A permanent data gap runs from 2026-07-27 to 2026-08-10.
- **GUNW grids:** unwrapped phase and coherence are posted at **80 m**; wrapped phase at 20 m ([Fringe 2026 poster](https://fringe2026.esa.int/iframe-agenda/files/ID_282.pdf)). GUNW is good for regional ground motion but **cannot resolve a single rail track or building**.
- **Access:** ASF Vertex ([search.asf.alaska.edu](https://search.asf.alaska.edu/)), `asf_search`, Earthdata Search and CMR. Downloads need a free Earthdata Login. The files are chunked HDF5, so `h5py` with `fsspec` byte-range reads over HTTPS can subset them without downloading whole files.
- **ASF HyP3 does not process NISAR on demand yet** ([forum](https://forum.earthdata.nasa.gov/viewtopic.php?p=25372)). It still does Sentinel-1 InSAR.
- **OPERA DISP-S1 covers North America only** ([Earthdata](https://www.earthdata.nasa.gov/data/projects/nsite/solutions/opera-north-america-disp-product-suite)). It is useful only as a "same method, other continent" reference.

**EGMS is the shortcut for Hungary.**
- The European Ground Motion Service gives ready-made Sentinel-1 PS/DS velocities and time series. Products: Basic, Calibrated, and Ortho (vertical + east-west, 100 m grid). Hungary is included, with the densest points on built structures, which means rails and buildings ([FAQ](https://land.copernicus.eu/en/faq/products/european-ground-motion-service)).
- The 2020–2024 release came out on 2026-04-29, together with a new machine-to-machine API. The 2019–2023 release also stays online ([news](https://land.copernicus.eu/en/news/egms-annual-update-brings-new-data-improvements-to-egms-explorer)). Portal: [egms.land.copernicus.eu](https://egms.land.copernicus.eu/).
- Login: unverified. The CLMS APIs use EU Login tokens ([CLMS guide](https://clms-prod.eea.europa.eu/en/how-to-guides/how-to-download-spatial-data/how-to-create-api-tokens)). **Register today at 10:30.**

**Pollen calibration data exists for past seasons.** I called the Open-Meteo CAMS pollen API live for Budapest ([docs](https://open-meteo.com/en/docs/air-quality-api)):
- Ragweed on 2026-08-25 peaked at **583 grains/m³** (07:00 UTC).
- Birch on 2025-04-10 was 30–83 grains/m³.
- Today (Nov 14) every species is 0.
- So a pollen demo has to be a **replay of a past season**, not live data.
- Coverage is Europe only, on a ~0.1° (~11 km) CAMS grid. Species: alder, birch, grass, mugwort, olive, ragweed.

**Does SAR detect flowering? Only for some crops.**
- **Rapeseed:** yes. Sentinel-1 VH/VV minima and VV/VH maxima match peak flowering in 718 German parcels ([Han et al. 2021, Remote Sens. 13(1):105, doi:10.3390/rs13010105](https://api.crossref.org/works/10.3390%2FRS13010105)). The VH:VV ratio and polarimetric entropy also track rapeseed stages ([Mercier et al. 2020](https://sidalc.net/search/Record/dig-cirad-fr-595639)).
- **Wind-pollinated trees and ragweed:** I found no established SAR flowering signal. Ragweed remote sensing is hard because the plants are small and mixed with other herbs ([Müller-Schärer et al. 2019](https://www.unifr.ch/bio/en/assets/public/Research/Heinz-Mueller-Schaerer/elsevier-2019_topdown-approach.pdf)).
- **What SAR can do for ragweed:** map its **habitat**, meaning cereal stubble left unploughed after the summer harvest. Hungary's FÖMI has mapped ragweed-infested arable land from satellites since 2005 for the national Ragweed Information System (PIR). Remote sensing pins down about 80% of the 500–700 kha infested ([Csornai et al. 2011, EARSeL](https://eproceedings.uni-oldenburg.de/website/vol10_2/10_2_laszlo1.html), [kormany.hu report](https://elelmiszerlanc.kormany.hu/download/9/e0/f0000/Magyarorsz%C3%A1g%20Parlagf%C5%B1%20Elleni%20R%C3%B6vid%20%C3%A9s%20K%C3%B6z%C3%A9pt%C3%A1v%C3%BA%20V%C3%A9dekez%C3%A9si%20Akci%C3%B3terv%C3%A9r%C3%B5l%20sz%C3%B3l%C3%B3%202014%20%C3%A9vi%20jelent%C3%A9s.pdf)).
- **Why ragweed matters in Hungary:** the Carpathian Basin is Europe's most ragweed-infested region, ragweed allergy affects about 25% of Hungarians, and the season peaks in Aug–Sep ([AAEM 2018](https://www.aaem.pl/Impacts-of-long-term-ragweed-pollen-load-and-other-potential-risk-factors-on-ragweed,82624,0,2.html)).
- **This matches the dense NISAR coverage (Jun–Sep 2026).** Spring tree and grass flowering (Mar–May) has only about 1–2 NISAR scenes per month.

## T1 Feasibility

| Idea | Challenge | Core NASA data (verified URL) | Data access effort | Build effort (person-h) | Feasible by Sun 16:00? | Biggest technical risk |
|---|---|---|---|---|---|---|
| 1 Pollen & Bee EO Monitor | 4.5 Dancing with the SARs (fit is fair; 4.6 Field Shift is about crop rotation, so the fit there is weak) | NISAR L2 GCOV, CMR `NISAR_L2_GCOV_PROVISIONAL_V1` (C2854338529-ASF) via [ASF Vertex](https://search.asf.alaska.edu/); MODIS/VIIRS NDVI via [AppEEARS](https://appeears.earthdatacloud.nasa.gov/) | Med. Each GCOV is ~2 GB. Land-cover layers come from CLMS (EU Login). CAMS via Open-Meteo is trivial | 60–75 (a full source × activity × wind dispersion chain plus calibration) | **Partly.** Only a replay of the Aug–Sep 2026 ragweed season or a prerecorded spring scenario. No live pollen in November | **Validity.** No peer-reviewed SAR flowering signal for trees or ragweed. A home-made dispersion model checked only against the 11 km CAMS grid is weak validation |
| 2 Railway deformation with SAR | 4.5 Dancing with the SARs (strong fit: "land surfaces are deforming…", infrastructure) | NISAR L2 GUNW, CMR `NISAR_L2_GUNW_PROVISIONAL_V1` (C2854335566-ASF), 66 pairs over Budapest; [NISAR user guide](https://nisar-docs.asf.alaska.edu/). Supporting data: EGMS (Copernicus, not NASA) | **Low–Med.** EGMS API or CSV export, OSM rail lines via Overpass, plus ~10–20 GUNW at 2.3 GB each (one track Jun–Oct is ~20–25 GB, fine on an Azure VM) | 45–60 | **Yes** | NISAR GUNW at 80 m with only ~4 months of data cannot measure mm/yr track settlement, so the multi-year signal has to come from EGMS. A sloppy NISAR stack (reference point, troposphere, unwrapping errors) can look like fake deformation |
| 3 Building/urban surface analysis with NISAR | 4.5 Dancing with the SARs | NISAR L2 GCOV (change and backscatter) plus GUNW coherence, same collections as above | Med. Same NISAR files as idea 2, and EGMS points cluster on buildings | 50–65 | **Partly.** A Budapest urban-subsidence map works. **Building damage does not:** there is no damage event in Hungary, and the only public NISAR urban case is [Mexico City subsidence](https://www.jpl.nasa.gov/images/pia26709-us-indian-spacecraft-captures-mexico-city-subsidence/) | 80 m GUNW is coarser than a building. Building-level results need PS processing on 12 GB GSLCs, which is out of scope. Without an event, "damage" is only a story |

## T2 Judging score estimate (1–5 each)

| Idea | Impact | Creativity | Validity | Relevance | Presentation | Total /25 | One-line rationale |
|---|---|---|---|---|---|---|---|
| 1 Pollen & Bee | 4 | 4 | 2 | 3 | 4 | **17** | Wide public appeal, and the beekeeper angle is new. But the SAR-to-flowering link is unproven for allergenic species and the demo is not live. Pivoting to "ragweed habitat from NISAR stubble detection" could lift Validity and Relevance to 3–4 |
| 2 Rail with SAR | 4 | 3 | **4** | 4 | 4 | **19** | Validated EGMS velocities, a geophysicist on the team, and a clear user (MÁV, the Hungarian rail operator). Commercial prior art lowers Creativity. NISAR has to be the visible core to keep Relevance at 4 |
| 3 Buildings | 3 | 3 | 3 | 4 | 4 | **17** | Uses NISAR well, but no event, a resolution mismatch, and it overlaps idea 2 |
| 2+3 merged: "Budapest Ground-Motion Explorer: rails and buildings" | 4 | 4 | 4 | 4 | 4–5 | **20–21** | One pipeline, two asset classes. Adds the "first L-band look over Hungary" novelty |

## T3 Resource mapping

| Idea | Listed challenge resource used | Other NASA/partner data | Open-source tools | Sponsor resources |
|---|---|---|---|---|
| 1 Pollen & Bee | ASF Vertex, NISAR Data User Guide, Earthdata Search, NISAR StoryMaps (for framing) | NISAR GCOV; MODIS/VIIRS NDVI (AppEEARS); SMAP; GPM IMERG; NASA POWER (temperature for growing degree days); CAMS pollen via Open-Meteo; CLMS Dominant Leaf Type / Tree Cover Density; ESA WorldCover | asf_search, earthaccess, h5py/xarray, rasterio, a simple Gaussian-plume or advection kernel in numpy, Leaflet/MapLibre, Streamlit | Meteomatics for wind and rain (1000 queries/day is enough for a grid at a few times); Azure VM for downloads; GoDaddy domain for the landing page; Copilot |
| 2 Rail | ASF Vertex, NISAR Data User Guide, Intro to SAR (to explain LOS/InSAR in the pitch), NISAR StoryMaps (land subsidence), NISAR Applications White Papers (infrastructure) | NISAR GUNW (core); EGMS Ortho/Calibrated 2020–2024; OSM `railway=rail` via Overpass; Sentinel-1 RTC on Planetary Computer as optional context (needs an approved PC account); SMAP soil moisture and GPM rain to explain seasonal heave; Meteomatics precipitation | asf_search, earthaccess, h5py+fsspec, MintPy (check that its NISAR GUNW reader works first, otherwise do a simple chained-pair sum in numpy), geopandas (buffer along the track, segment per km), DuckDB/Parquet, deck.gl/MapLibre or Streamlit+pydeck; Power BI for an asset-manager dashboard (Yhair) | Azure VM (D4s, ~$0.2/h) plus Blob storage for ~25 GB of GUNW; Azure Static Web Apps or GoDaddy hosting for the front end; Copilot; Google Cloud as a backup |
| 3 Buildings | Same as 2, plus UAVSAR Postcards for visual style | NISAR GCOV/GUNW coherence; EGMS points on buildings; OSM building footprints; Budapest Kőbánya uplift and Buda Thermal Karst literature ([EGU2020-18126](https://meetingorganizer.copernicus.org/EGU2020/EGU2020-18126.html), [FÖMI poster](https://eoscience.esa.int/landtraining2017/files/posters/FARKAS.pdf)) | Same as 2, plus osmnx for footprints | Same as 2 |

## T4 MVP scope

| Idea | Must-have (by Sun 12:00) | Nice-to-have | Cut | Demo moment for 30 s video |
|---|---|---|---|---|
| 1 Pollen & Bee | Budapest + Pest county. Land-cover source map (DLT/TCD/WorldCover). NISAR GCOV HV/HH time series Jun–Sep 2026 on cereal and stubble parcels as a "ragweed habitat" flag. Wind-advected plume for 2026-08-25 calibrated to CAMS (583 grains/m³). Map slider | Beekeeper rapeseed-flowering layer (Sentinel-1/NISAR VH dip, per Han et al.). Personal exposure along a route | Species classifier, ML, trap-data calibration (NNK, the national public health centre, is not public), live alerts, nationwide scale | Time slider over 25 Aug 2026: stubble fields light up in the NISAR layer, wind blows a plume over Budapest, and the counter shows 583 grains/m³ from CAMS |
| 2 Rail | (a) EGMS Ortho vertical velocity sampled in a 100 m buffer along OSM rail lines for Budapest + Line 1 (Budapest–Tatabánya–Győr); top-10 hotspot km segments. (b) NISAR GUNW stack for one track (e.g. `158_A_025/026`), Jun–Oct 2026: cumulative LOS displacement and coherence along the same lines. (c) Web map with click-a-segment showing the EGMS time series and the NISAR series. (d) One slide on physics: Benedek's interpretation (karst water, mining, clay swelling vs rain) | Ascending + descending decomposition of NISAR. Correlation with SMAP soil moisture / precipitation. Power BI asset-manager view (risk score = velocity × traffic × proximity to bridges) | Own PS-InSAR from GSLC, ML, nationwide scale, real-time alerts | Zoom from Europe to Budapest; the rail network turns red/green by sinking rate; click a red segment and EGMS 5-year plus NISAR 2026 curves agree; caption "first L-band look at Hungary's railways" |
| 3 Buildings | EGMS points on Budapest buildings classified into stable / sinking / rising. NISAR GUNW and GCOV coherence map Jun–Oct 2026 for one district (Kőbánya or Buda thermal-karst zone) | Building "risk card" per address. Comparison with the Mexico City NISAR result for scale | Damage detection, 3D twin, own PS processing | Click your own house: shows mm/yr from EGMS and the 2026 NISAR trend |

## Build plan (recommended option: 2+3 merged, "Budapest Ground-Motion Explorer")

**Stack**
- **Data:** Python, asf_search/earthaccess, h5py+fsspec, geopandas, Parquet/DuckDB.
- **Back end:** the pipeline runs on an Azure VM. Precompute everything to GeoJSON, PMTiles or COG.
- **Front end:** a static MapLibre/deck.gl page on Azure Static Web Apps (free tier) with a GoDaddy domain. Streamlit is the fallback.
- **Dashboard:** Yhair's Power BI for the asset-manager view.
- **Code:** GitHub with Copilot.

**Who does what**

| Person | Sat 10–14 | Sat 14–22 | Sun 08–12 | Sun 12–16 |
|---|---|---|---|---|
| **Patrik** (architect) | Repo, Azure VM, Earthdata + EU Login accounts, data contract (segment table schema) | Integration of tiles and the time-series API, web map | Polish, deploy, domain | Video capture, submission |
| **Bence** (AI/DS) | asf_search script that pulls one track of GUNW (Jun–Oct 2026, ~10 pairs). Subset to the AOI via h5py | Chained-pair cumulative displacement, coherence mask, reference point. Optionally MintPy | Ascending/descending check, sanity vs EGMS | Numbers for the pitch |
| **Benedek** (geophysics, pitch) | Pick AOI and hotspots in EGMS Explorer (Kőbánya, Buda karst, Tatabánya mining zone on Line 1). Write the physical hypotheses | QA the NISAR results: tropospheric artefacts? seasonal clay swelling? Validity slide | Script and storyboard | Narration and Q&A prep |
| **Yhair** (BI) | EGMS download/API plus OSM Overpass rail lines, buffer join, per-km segment stats | Hotspot ranking, Power BI risk dashboard | Charts for slides | Slides (≤7) |

**Checkpoints**

| When | Gate |
|---|---|
| Sat 14:00 | Data gate: if no GUNW subset loads, fall back to GCOV coherence and backscatter change |
| Sat 22:00 | First end-to-end map |
| Sun 12:00 | Feature freeze |
| Sun 15:00 | Video and slides uploaded |

**Stretch goals**
1. Correlate SMAP soil moisture and Meteomatics rain with NISAR seasonal motion (shrink-swell of clay embankments).
2. GCOV HV backscatter change to show vegetation encroachment on tracks.
3. Second city or line (e.g. Line 100 Budapest–Szolnok, across the Great Plain, where groundwater subsidence is possible).

## Prior art and competition

**Rail InSAR**
- **Commercial:** a mature market. TRE Altamira was SNCF Réseau's provider in ESA EO4Infrastructure, with e-GEOS and GAF ([ESA LPS22](https://earth.esa.int/living-planet-symposium-2022-presentations/27.05.Friday/Addis_Abeba/1040-1220/06.Peyrard.pdf)). SkyGeo appears in ESA RailSAT ([RailSAT](https://business.esa.int/projects/railsat)). Detektia sells InSAR monitoring in Spain; I could not confirm a rail product online.
- **Academic:** TU Delft's Betuweroute track-geometry study with TerraSAR-X reached mm precision ([Chang et al.](https://repository.tudelft.nl/record/uuid:42fae8e4-cb2c-4803-a992-29768d0efe05)). Recent EGMS-for-transport screening exists in Sweden ([egusphere-2026-3758](https://egusphere.copernicus.org/preprints/2026/egusphere-2026-3758/)) and Ireland ([EGU26-23130](https://meetingorganizer.copernicus.org/EGU26/EGU26-23130.html)). The Swedish study notes that **EGMS points are sparse along some rail lines**, so rural lines need checking.
- **Our differentiation:** open source, Hungarian network, and **the first public NISAR L-band look** next to C-band EGMS. L-band coherence holds better on vegetated embankments, which is a defensible scientific hook.

**Hungarian ground-motion literature**
- Greater Budapest PSI ([FÖMI/ESA poster](https://eoscience.esa.int/landtraining2017/files/posters/FARKAS.pdf)): Kőbánya uplift of ~1 cm/yr over ~36 km².
- Buda Thermal Karst PS-InSAR ([EGU2020-18126](https://meetingorganizer.copernicus.org/EGU2020/EGU2020-18126.html)).
- National ground-motion map: anomalies are mostly man-made (water pumping, mining).
- I found **no published Budapest rail-specific InSAR study**. That is an open niche, but it also means we cannot validate against one. Use EGMS as the reference.

**Pollen**
- I could not find a "2025 Pollen Alert Map" Space Apps project online. The closest are the 2017 "Pollen alert: the allergen compass" ([2017 project](https://2017.spaceappschallenge.org/challenges/ideate-and-create/bring-your-own-solution/teams/lemon-py)) and the 2025 **BloomWatch** challenge teams (Bloomee, BloomWatch, BeeAware), all optical NDVI-based ([BloomWatch](https://bloomwatch-nu.vercel.app/challenge), [BeeAware](https://beeawarebloomwatch.github.io/about.html)). Ask the team for the link.
- Commercial: Google Pollen API, ESA-backed Airmine ([airmine.ai](https://airmine.ai/)), and CAMS itself.
- So a pollen map is crowded. A SAR-based **ragweed habitat** layer would be new, but it is not proven.

## Risks

| Risk | Likelihood / impact | Mitigation |
|---|---|---|
| NISAR GUNW quirks: PROVISIONAL calibration, earlier wrapped-layer georeferencing bug ([known issues](https://hyp3-docs.asf.alaska.edu/nisar-docs/availability-overview/)), no VALIDATED GUNW over Budapest yet | Med / High | Use only unwrapped 80 m layers. Show a coherence mask. Present as "provisional first look". Sanity-check the sign and magnitude against EGMS |
| Download volume and time (2.3 GB × N) | Med / Med | Azure VM in West Europe, parallel downloads. Subset via h5py byte-range. Cap at ~10 pairs on one track |
| EGMS needs EU Login or the API is slow | Med / Med | Register immediately. Manual Explorer export for the AOI as a fallback |
| EGMS gaps on rural lines | Med / Low | Pick urban/suburban segments for the demo |
| Over-claiming (mm/yr track settlement from 4 months of 80 m NISAR) | High if unchecked / High on Validity | Benedek owns a "what we can and cannot claim" slide |
| Relevance: judges see EGMS (ESA) as the real engine | Med / Med | Make NISAR the hero visual. EGMS is the long-term reference. NASA SMAP/GPM for drivers |
| Pollen-specific: no live season, the SAR link to tree flowering is unproven, NNK trap data is not open | High / High | Replay Aug 2026. Frame as "habitat and activity proxy" |
| Planetary Computer `sentinel-1-rtc` needs an approved account ([STAC](https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-1-rtc)) | Med / Low | Don't depend on it. Use `sentinel-1-grd` or skip |
| Scope creep and fatigue | High / High | Gates at Sat 14:00 and 22:00, and freeze Sun 12:00 |

## Recommendation

**Build idea 2 merged with idea 3: a "Budapest Ground-Motion Explorer" for railways and buildings, under 4.5 Dancing with the SARs.**

- **Highest Validity:** EGMS is validated, and Benedek's GPR/seismic background gives credible physical interpretation.
- **Lowest data risk:** I verified 66 NISAR GUNW pairs over Budapest, dense from Jun to Oct 2026.
- **Clear Hungarian impact:** MÁV, the Budapest municipality, and homeowners.
- **Good 30-second story:** a red/green rail network, then click a segment and the NISAR and EGMS curves agree.
- **Fits the team:** Yhair's BI skills suit segment risk ranking. Bence handles the InSAR time series. Patrik handles the web stack.

**Keep pollen as a fallback or stretch only if the team is emotionally committed.** In that case, pivot to **"ragweed season replay, Aug 2026"**:
- NISAR GCOV for stubble and fallow fields as ragweed habitat, plus wind advection, calibrated against CAMS via Open-Meteo (verified: 583 grains/m³ on 2026-08-25).
- Drop the tree and spring-flowering claims.
- This is the only pollen version where NISAR coverage and season line up.
- Field Shift (4.6) is a poor fit for any of the three ideas, because it is about crop-rotation decision support with SMAP, ECOSTRESS and other US-centric resources.

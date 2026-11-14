# Lunar Shield API: Data Sources, APIs and Open-Source Tools (verified 2026-11-14)

Legend: **[V]** = fetched live on 2026-11-14 and the response looked right (HTTP 200 with real data). **[V-page]** = the landing or doc page loaded, but the data endpoint was not exercised. **[U]** = not verified. It comes from docs, search results or memory, so treat it as a lead only. **[X]** = tested and failed.

---

## 0. Key surprises found during verification (read first)

1. **The DONKI API on api.nasa.gov is partly broken. Use CCMC's host directly, which needs no key.** On 2026-11-14, `api.nasa.gov/DONKI/FLR` returned **404** and `/DONKI/CME` returned **400**. `CMEAnalysis`, `GST`, `IPS` and `notifications` worked. `DEMO_KEY` hit `OVER_RATE_LIMIT` (429) after about 6 calls. CCMC moved DONKI on 2026-09-30, and `kauai.ccmc.gsfc.nasa.gov` timed out. **Working base, no key: `https://ccmc.gsfc.nasa.gov/DONKI-API/get/<TYPE>?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`** **[V]** for FLR, CME, SEP, IPS, GST, RBE, HSS, MPC, WSAEnlilSimulations and notifications. The legacy path `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?...` also works **[V]**.
2. **The real-time solar wind source is now SOLAR-1 (formerly SWFO-L1), not DSCOVR.** In `json/rtsw/rtsw_wind_1m.json`, the record marked `active: true` has `source: "SOLAR1"`. ACE and IMAP records are also in the feed but inactive. Always filter on `active==true`.
3. **GOES primary or secondary assignment differs per instrument.** `json/goes/instrument-sources.json` **[V]** reports protons primary = GOES-18, X-rays primary = GOES-18, electrons primary = GOES-19, and SUVI/EUVS/magnetometers primary = GOES-19. Read this file at runtime and do not hard-code a satellite.
4. **The ISWA HAPI server carries LRO/CRaTER dose rates corrected to the lunar surface.** These are hourly, 2009-06-26 to 2026-10-07 (dataset `CRaTER`), with fields such as `alt` = "Altitude correction to lunar surface" and `h2o` for the silicon-to-water correction. It also has `SWMF2023_RT_MOON`, real-time SWMF magnetosphere model output at the Moon's position, which can be used to detect magnetotail crossings. Both are ideal ground truth for this project. **[V]**
5. **The ESA SWE HAPI endpoint needs authentication.** `https://swe.ssa.esa.int/hapi/catalog` returned 401.
6. **Lunar Trailblazer is dead.** Contact was lost 2025-02-27 and NASA ended the mission 2025-07-31. It never carried a radiation instrument and produced no data.
7. **The Foxglove Studio open-source repo is archived** (`foxglove/studio`, archived 2024). Use the hosted app (free tier), the community fork `AD-EYE/foxglove-opensource` (MPL-2.0, ★162, pushed 2026-10-01), or `foxglove-sdk` 0.31.0 to stream data into it.

---

## 1. Real-time space weather

### 1.1 NOAA SWPC JSON/text services (owner: NOAA SWPC). Base URL: https://services.swpc.noaa.gov
- **Auth:** none. **Format:** JSON arrays of records (`time_tag`, ...) or plain text. **Latency:** about 1–5 minutes. **History:** a rolling window only (6 h, 1 d, 3 d or 7 d), so archive it yourself or use NCEI for history.
- **Directory listings are browsable [V]:** `/json/`, `/json/goes/primary/`, `/json/goes/secondary/`, `/json/rtsw/`, `/json/ace/{epam,mag,sis,swepam}/`, `/json/stereo/`, `/products/`, `/text/`.

| Product | Endpoint (all under services.swpc.noaa.gov) | Content and cadence | Lunar Shield use |
|---|---|---|---|
| GOES integral protons **[V]** | `/json/goes/primary/integral-protons-{6-hour,1-day,3-day,7-day}.json` | 5-minute; energies ≥1, 5, 10, 30, 50, 60, 100, 500 MeV; fields `time_tag, satellite, flux, energy` (pfu) | **Core driver.** ≥10 MeV for S-scale, ≥100 MeV for deep-shielding and SEE risk. The proton spectrum near GEO approximates the lunar environment outside the magnetotail. |
| Plot-ready protons **[V]** | `/json/goes/primary/integral-protons-plot-{6-hour,1-day,3-day,7-day}.json` | same data, pre-pivoted for plotting | dashboard |
| Differential protons **[V]** | `/json/goes/primary/differential-protons-{...}.json` | channels P1 (1.02–1.86 MeV) to P10 (276–404 MeV) | build a spectrum, then fold through a shielding or dose response (§5) |
| Proton fluence **[V]** | `/json/goes/primary/integral-proton-fluence-7-day.json` | daily fluence | cumulative dose budget per asset |
| Electrons **[V]** | `/json/goes/primary/integral-electrons-*.json`, `differential-electrons-*.json`, `integral-electron-fluence-7-day.json` | 5-minute ≥2 MeV | charging risk (lower priority on the lunar surface) |
| Alphas **[V]** | `/json/goes/primary/differential-alphas-*.json` | heavy-ion proxy | SEE context |
| X-rays (XRS) **[V]** | `/json/goes/primary/xrays-{6-hour,1-day,3-day,7-day}.json` | 1-minute; 0.05–0.4 nm and 0.1–0.8 nm; has `electron_contaminaton` flag (spelled that way) | flare onset trigger and ML features |
| Flare summaries **[V]** | `/json/goes/primary/xray-flares-latest.json`, `xray-flares-7-day.json`, `xray-background-7-day.json` | `current_class, begin_time, max_class, max_time` | "flare in progress" warning that leads SEP arrival by tens of minutes |
| SUVI flare locations **[V]** | `/json/goes/primary/suvi-flares-latest.json`, `suvi-flares-7-day.json` | flare heliographic location | **Western-hemisphere flares are magnetically well connected, which raises SEP risk.** Use location as a feature. |
| Satellite assignment **[V]** | `/json/goes/instrument-sources.json` | primary or secondary per instrument | pick the right satellite |
| RTSW solar wind **[V]** | `/json/rtsw/rtsw_wind_1m.json`, `rtsw_mag_1m.json`, `rtsw_ephemerides_1h.json` | 1-minute, about 24 h; `source` ∈ {SOLAR1, ACE, IMAP}, `active` flag | CME shock arrival (IPS) and context; solar wind dynamic pressure for magnetotail geometry |
| Solar wind summary **[V]** | `/products/summary/solar-wind-speed.json`, `solar-wind-mag-field.json`, `10cm-flux.json` | latest value | dashboard tiles |
| ACE SIS **[V]** | `/json/ace/sis/ace_sis_5m.json`, `ace_sis_32s.json` | >10 and >30 MeV protons at L1 | second, off-GEO proton view (aging spacecraft) |
| STEREO-A **[V-page]** | `/json/stereo/stereo_a_1m.json` | 1-minute | — |
| Alerts **[V]** | `/products/alerts.json` | `product_id, issue_datetime, message`; codes such as ALTPX1 (proton), WARPX1, ALTEF3, XM5 | **Trigger safe-mode recommendations directly from proton warnings and alerts.** |
| NOAA scales **[V]** | `/products/noaa-scales.json` | current and forecast R, S, G with probabilities | headline risk level |
| Solar probabilities **[V]** | `/json/solar_probabilities.json` | per day: `c/m/x_class_{1,2,3}_day`, `10mev_protons_{1,2,3}_day`, polar cap absorption | **Baseline 1–3 day flare and proton probability for comparison with your ML model** |
| 3-day forecast **[V]** | `/text/3-day-forecast.txt` (also `3-day-solar-geomag-predictions.txt`, `discussion.txt`, `27-day-outlook.txt`, `45-day-forecast.txt`, `/json/45-day-forecast.json`) | text issued 00:30 UTC daily; section B gives the S1+ probability | parse the S1+ percentages |
| Solar regions **[V]** | `/json/solar_regions.json`, `/json/sunspot_report.json`, `/text/srs.txt` | active-region list with location, class and magnetic type | ML features and connectivity |
| Edited events **[V]** | `/json/edited_events.json` | XRA, flare and other event reports | event labels |
| WSA-Enlil **[V]** | `/json/enlil_time_series.json` | predicted solar wind at Earth (`v_r`, density, B) about 4–5 days ahead | CME arrival at Earth–Moon (the Moon is within about 0.0026 AU, so treat Earth values as lunar) |
| Kp **[V]** | `/products/noaa-planetary-k-index.json`, `noaa-planetary-k-index-forecast.json`, `/json/planetary_k_index_1m.json` | 3-hour and 1-minute | context only (geomagnetic indices matter little on the Moon) |
| SEP event list **[X]** | `/text/sep-event-list.txt` does not exist (404). See §3.2 for the NOAA SPE list. | | |
| `/products/solar-wind/*.json` **[X]** | `plasma-7-day.json` and `mag-7-day.json` returned 404 (the old paths). Use `/json/rtsw/`. | | |

Sample record (protons):
```json
{"time_tag":"2026-11-13T08:50:00Z","satellite":18,"flux":0.212,"energy":">=10 MeV"}
```

### 1.2 NASA/CCMC DONKI (Database Of Notifications, Knowledge, Information)
- **Owner:** NASA GSFC CCMC (Moon to Mars Space Weather Analysis Office). **Docs:** https://ccmc.gsfc.nasa.gov/tools/DONKI/ and https://ccmc.gsfc.nasa.gov/DONKI/api/
- **Use this base:** `https://ccmc.gsfc.nasa.gov/DONKI-API/get/{TYPE}?startDate=2026-10-01&endDate=2026-11-13`. **No key needed.** **[V] for every type below.**
- Alternative: `https://api.nasa.gov/DONKI/{TYPE}?...&api_key=KEY` needs a free key from api.nasa.gov (DEMO_KEY allows roughly 30 requests per hour). On 2026-11-14 FLR returned 404 and CME returned 400 there **[X]**.
- **Types:** `FLR`, `CME`, `CMEAnalysis` (params `mostAccurateOnly`, `speed`, `halfAngle`, `catalog`, `keyword`), `SEP` (empty for Oct–Nov 2026, so no SEP events then), `IPS` (param `location=Earth`), `GST`, `RBE`, `HSS`, `MPC`, `WSAEnlilSimulations`, `notifications` (param `type=all|FLR|SEP|CME|...`).
- **Latency:** minutes to hours (analysts plus automated M2M). **History:** 2010 to present.
- **Format:** JSON with `linkedEvents` that join FLR→CME→SEP→IPS. That linkage gives **ready-made labels for "this flare/CME produced an SEP event"**.
- **Use:** event context in API responses, ML training labels (FLR with linked SEP), and CME arrival predictions (WSAEnlilSimulations `impactList`, which includes Moon or lunar-mission targets in some runs **[U]**). Instruments in recent records include "SOLAR-1: SWiPS" and "IMAP: SWAPI".

### 1.3 CCMC SEP Scoreboard
- **Owner:** NASA CCMC with NASA JSC SRAG (ISEP project). **Pages:** https://ccmc.gsfc.nasa.gov/scoreboards/sep/ **[V-page]**; web apps https://sep.ccmc.gsfc.nasa.gov/probability/, `/intensity/`, `/allclear` **[V-page]**.
- **Machine access:**
  - **ISWA redirect API [V]:** `https://iswa.ccmc.gsfc.nasa.gov/api/redirect?timestamp=2026-11-14T00:00:00Z&search=lessThanOrEqualTo&dataID=1215` returns the latest scoreboard JSON (`sep_forecast_submission`) for one model. The tested dataID 1215 is HESPERIA REleASE SOHO 30-min. Other dataIDs are on the scoreboard page.
  - **Raw file tree [V]:** `https://iswa.ccmc.gsfc.nasa.gov/iswa_data_tree/model/heliosphere/sep_scoreboard/` has model folders GSU_All_Clear, MagPy, NCAR_MLSO_KCOR, RELEASE, RELEASE_PLUS, SAWS_ASPECS, SEPForecast, SEPNET, SEPSTER, SEPSTER2D, SPRINTS-SEP, STEREO_RELEASE(_PLUS), UMASEP, iPATH, mag4_2019.
  - Schema: https://ccmc.gsfc.nasa.gov/static/files/SEPSB/sep_scoreboard_example_json_file.json **[V]**
- **Auth:** none. **Latency:** model-dependent, from minutes (UMASEP, RELEASE) to hours. **History:** about 2017 to present in the tree.
- **Use:** (a) an **ensemble of operational SEP probability and all-clear forecasts** to blend with your own model; (b) emit your forecasts in **the same JSON schema**, which judges will recognize as credible, and validate with `sphinxval` (§6).

### 1.4 CCMC ISWA HAPI server
- **Base:** https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/ (catalog **[V]**, 327 datasets). **Auth:** none. **Format:** HAPI CSV, JSON or binary.
- Example **[V]**: `.../hapi/data?id=CRaTER&time.min=2024-05-10T00:00:00Z&time.max=2024-05-12T00:00:00Z&parameters=d1_2_dose_rate` returns `2024-05-10T00:30:00Z,0.04578` (cGy/day).
- **Relevant datasets:**
  - `CRaTER`: LRO CRaTER dose rates (GCR+SEP), PT1H, 2009-06-26 to 2026-10-07; `d1_2_dose_rate` ... `d5_6_dose_rate` cGy/day plus `alt` and `h2o` factors **[V]**
  - `CRaTER_micro`: micro-dosimeter dose rate and 30-day sum, PT1H, 2009 to 2026-10 **[V]**
  - `SWMF2023_RT_MOON`: real-time SWMF output at the Moon (X, Y, Z, N, V, B, P, J), 2026-01-21 to now **[V]**. **Use it as a magnetotail and magnetosheath flag.**
  - `goesp_part_flux_P5M` / `goess_part_flux_P5M`: GOES primary and secondary protons P1–P500, 2010-04-14 to now **[V]**. **This is a single API for both history and real time.**
  - `goesp_xray_flux_P1M`, `ace_sis_P5M`, `ace_epam_P5M`, `swpc_rtsw_plasma_P1M`, `swpc_rtsw_mag_P1M`, `SWPC_SOLAR1_ephemeris_P1H`, `imap_hit`, `stereo_a_impact_P1M`, `NMDB_p1m_*` (neutron monitors, which detect GLEs), `msl_rad_dosimetry` (Mars, for analogy), `ALTEA_P5M`, `SOHO_COSTEP_SEP_ACTUAL`, `ENLIL_KP_P7M`
- **Use:** one uniform client (`hapiclient`) for backfill and real-time GOES data plus **CRaTER lunar dose for validating a flux→dose model.**

### 1.5 ESA Space Weather Service Network (SWE portal)
- https://swe.ssa.esa.int/ **[V-page]**. HAPI at `https://swe.ssa.esa.int/hapi/` (the page loads) but `/hapi/catalog` returned **401**, so a free account is required.
- Provides the SEPEM, ESA SEP products and federated expert-service-center data (e.g. UTU SEP catalogue R.130).
- **Hackathon verdict:** skip unless someone already has an account.

---

## 2. Near-Moon in-situ data

| Source | Owner | Access | Coverage | Notes and use |
|---|---|---|---|---|
| **ARTEMIS P1/P2 (THEMIS-B/C) in lunar orbit** | NASA/UCB | CDAWeb HAPI `https://cdaweb.gsfc.nasa.gov/hapi/` **[V]**: `THB_L2_SST@0..5` and `THC_...` (SST ions and electrons to several hundred keV), `THB_L2_ESA@*` (plasma), `THB_L2_FGM@*` (B field), `THB_L2_MOM@*`, `THB_OR_SSC` (orbit; GSE in R_E) | SST and ESA 2007 to **2026-11-06**; orbit to 2027-01-01 | Example **[V]**: `hapi/data?id=THB_OR_SSC&parameters=XYZ_GSE&time.min=2026-11-01T00:00:00Z&time.max=2026-11-01T00:10:00Z` gives `-11.68,-56.82,2.55` R_E (lunar distance). **Use:** detect when the Moon is in the magnetotail, magnetosheath or solar wind, and measure low-energy particles at the Moon. There is roughly a 1-week latency, so these are historical and validation data. They do not measure SEP >10 MeV. Python: `pyspedas.projects.themis` or `hapiclient`. |
| **LRO CRaTER** | NASA / UNH / BU | (1) ISWA HAPI `CRaTER`, `CRaTER_micro` **[V]** (easiest); (2) PDS PPI LRO: https://pds-ppi.igpp.ucla.edu/mission/Lunar_Reconnaissance_Orbiter **[V-page]**; the CRaTER team site `crater.sr.unh.edu` timed out | 2009 to 2026-10 (hourly via HAPI) | **Best lunar ground truth.** Regress GOES >10/>100 MeV flux to CRaTER dose, then scale to the surface (×0.5 for 2π shielding by the Moon; the `alt` factor is supplied). The legacy PDS Geosciences CRaTER page returned 404. |
| **Chang'e-4 LND** (Kiel/NSSC) | CNSA / Univ. Kiel | Released through the CNSA GRAS lunar data portal (requires registration) **[U]**. A first batch of Level 2A, the first 12 days, was released in April 2021. | 2019 onward (partial public release) | Use **published numbers** instead: surface absorbed dose rate about 13.2 µGy/h (in silicon) and dose equivalent about 1369 µSv/day, from Zhang et al. 2020, *Science Advances* (quoted from memory, so check before citing). Good for calibrating the GCR baseline. Do not plan to download it in 48 h. |
| **Artemis I MARE / Orion HERA / ESA EAD** | NASA, DLR, ESA | Results published (DLR Nature paper on MARE and AstroRad). **Raw public dataset not confirmed [U].** | Nov–Dec 2022 | Use the published dose-rate numbers as scenario constants only. |
| **Artemis II** (flew 2026-04-01 to 04-10) | NASA, DLR, Mirion | Crew Active Dosimeters, 6 HERA units and 4 DLR detectors. Data go to NASA's Life Sciences Data Archive (LSDA); **no public dataset found [U]** | 2026 | Use for the presentation narrative only. |
| **LRO LEND, Chandrayaan-2, Chang'e-6 and others** | — | not investigated in depth | — | low value for 48 h |
| **Lunar Trailblazer** | NASA/Caltech | **None.** Mission lost (contact 2025-02-27, ended 2025-07-31) and it had no radiation payload. | — | Do not use. |
| **CLPS radiation payloads** | NASA | Blue Ghost M1 (2025) carried **RadPC** (MSU) with dosimeters. CLPS PDS archive: https://pds-geosciences.wustl.edu/missions/clps/index.htm **[V-page]**; the Blue Ghost M1 LISTER release was Jan 2026, and **no RadPC data release was found [U]**. IM-3 manifest includes **LVRAD** (Lunar Vehicle Radiation Dosimeter, KASA). Astrobotic award (2026-06) includes **LETS** (LET spectrometer). | — | Use as "future data feeds", with a pluggable ingest adapter. |

---

## 3. Historical archives for training and backtesting

### 3.1 GOES particle and X-ray archives (NCEI)
- **GOES-R (16–19) L2 [V]:** `https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/goes18/l2/data/` with subdirectories `sgps-l2-avg5m/` and `sgps-l2-avg1m/` (SGPS protons, the main training input), `mpsh-l2-avg5m/`, `xrsf-l2-avg1m(_science)/`, `xrsf-l2-flx1s/`, `xrsf-l2-flsum(_science)/` (flare summary), `xrsf-l2-fldet/`, `xrsf-l2-flloc/`, `magn-l2-*`, `suvi-l2-flloc/`, `euvs-*`, `ephe-l2-orb1m/`. Format is daily NetCDF. Auth: none.
  - Single-file GOES-16 flare list 2017-02-09 to 2025-04-07 **[V]**: `.../goes16/l2/data/xrsf-l2-flsum_science/sci_xrsf-l2-flsum_g16_s20170209_e20250407_v2-2-2.nc`
- **Legacy GOES 8–15 [V]:** `https://www.ncei.noaa.gov/data/goes-space-environment-monitor/access/` with `avg/` (5-minute EPS/EPEAD/HEPAD, XRS), `full/`, `science/`. Coverage is about 1986 to 2020.
- **Shortcut:** the ISWA HAPI `goesp_part_flux_P5M` dataset covers 2010 to now in one call (§1.4).
- **Product overview:** https://www.ncei.noaa.gov/products/goes-r-space-environment-in-situ **[V-page]**

### 3.2 SEP event catalogs
| Catalog | URL | Status | Notes |
|---|---|---|---|
| NOAA SWPC "Solar Proton Events Affecting the Earth Environment" (1976 to present) | https://umbra.nascom.nasa.gov/SEP/ **[V]** (HTML table; the page points to legacy `ftp://ftp.swpc.noaa.gov/pub/indices/SPE.txt` **[U]**). NCEI copy: https://www.ngdc.noaa.gov/stp/space-weather/interplanetary-data/solar-proton-events/ **[V-page]** | latest rows include 1490 pfu and 844 pfu events | **The canonical label set: >10 MeV ≥10 pfu (S1+) with start, max, associated flare and CME.** Scrape the HTML. |
| **GSEP** (Rotti et al. 2022, ApJS) | Harvard Dataverse **doi:10.7910/DVN/DZYLHK** **[V]** ("GSEP Dataset", v5, 4 files) | 1986–2017; 341 events (later versions 433) plus GOES proton and X-ray time-series slices | **Ready-made ML dataset for SEP prediction** |
| **SWAN-SF** (Angryk et al. 2020, Sci. Data, doi:10.1038/s41597-020-0548-x) | Harvard Dataverse **doi:10.7910/DVN/EBCFKM** **[V]** ("SWAN-SF", v1, 7 files) | May 2010 to Aug 2018; SHARP-parameter multivariate time series in 5 partitions; classes X, M, C, B, N | **Standard flare-prediction benchmark.** Cleaned version: github.com/samresume/Cleaned-SWANSF-Dataset (MIT, ★8). |
| CCMC CLEAR SEP benchmark dataset | https://ccmc.gsfc.nasa.gov/swxcoe/clear/benchmark.php **[V-page]** | — | benchmark events for SEP model validation |
| CCMC SEP validation event list (SHINE/ISWAT 2020) | https://ccmc.gsfc.nasa.gov/assessment/topics/SEP/campaign2020/sep_events.php **[U]** | — | uses SEPEM RSDv2.0 |
| Zenodo SEP catalogue >30 MeV, 1956–2023 | https://zenodo.org/records/15083732 **[V-page]** | — | multi-spacecraft |
| SEPEM reference dataset and event list (ESA) | sepem.eu timed out **[X]**; available via the ESA SWE portal (login) | — | skip |
| Papaioannou et al. 2016 catalogue / SEPVAL | not located **[U]** | — | Papaioannou 2016 (J. Space Weather Space Clim.) has an online table **[U]** |
| UTU SEP catalogue R.130 | ESA SWE / SEPServer (registration) **[U]** | — | skip |

### 3.3 Flare catalogs and solar imagery
- **GOES XRS flare list:** NCEI `xrsf-l2-flsum` (above) **[V]**; DONKI `FLR` **[V]**; SWPC `edited_events.json` (recent) **[V]**.
- **HEK (Heliophysics Event Knowledgebase, LMSAL) [V]:** `https://www.lmsal.com/hek/her?cosec=2&cmd=search&type=column&event_type=fl&event_starttime=2024-05-14T00:00:00&event_endtime=2024-05-15T00:00:00&event_coordsys=helioprojective&x1=-1200&x2=1200&y1=-1200&y2=1200&return=fl_goescls,event_starttime,frm_name` returns JSON with flare class, location and NOAA AR. Python: `sunpy.net.hek`. API doc: https://www.lmsal.com/hek/api.html **[V-page]**
- **SDO/HMI SHARP parameters (JSOC, Stanford) [V]:** `http://jsoc.stanford.edu/cgi-bin/ajax/jsoc_info?ds=hmi.sharp_720s[][2024.05.10_00:00:00_TAI]&op=rs_list&key=T_REC,HARPNUM,USFLUX,TOTUSJH,R_VALUE` returns JSON keyword values. NRT series: `hmi.sharp_cea_720s_nrt` (the test returned nothing for 2026-11-13, so verify NRT availability **[U]**). No auth is needed for keyword queries. Image export needs a registered email (`drms` Python package). Coverage 2010 to present, 12-minute cadence. Doc: http://jsoc.stanford.edu/doc/data/hmi/sharp/sharp.htm
- **Helioviewer API [V]:** `https://api.helioviewer.org/v2/getClosestImage/?date=2026-11-13T00:00:00Z&sourceId=14` returns JSON. Sources list: `/v2/getDataSources/` **[V]**. Use `takeScreenshot`/`getJP2Image` for dashboard images of the Sun. No key needed.
- **SDOML** (FDL/NASA, Galvez et al. 2019): https://sdoml.org/ **[V-page]**; repos `SDOML/SDOMLv2` (★15), `spaceml-org/helionb-sdoml` (notebooks, GPL-3.0). Hosted as Zarr on cloud storage, large. **SDOML-lite:** `oxai4science/sdoml-lite` (★4, 2025-08), a lightweight version.
- **Surya foundation model (NASA–IBM, Aug 2025) [V]:** weights at https://huggingface.co/nasa-ibm-ai4science/Surya-1.0 (Apache-2.0, `surya.366m.v1.pt`, not gated). Code: https://github.com/NASA-IMPACT/Surya (★180, pushed 2026-04-29). Fine-tuned heads: `nasa-ibm-ai4science/solar_flares_surya`, `solar_wind_surya`, `euv_spectra_surya`, `ar_segmentation_surya`. Benchmarks (HF datasets, 2025-12): `surya-bench-flare-forecasting`, `Surya-bench-solarwind`, `surya-bench-ar-segmentation`, `core-sdo`. **366M parameters, so it needs a GPU.** In 48 h, use `solar_flares_surya` inference only, or skip.
- **Bonus from the same org:** `NASA-IBM-Lunar-Foundation-Model` and Sombench lunar datasets (crater, ice) on HF, if you want an ML layer on the terrain side.
- **Kaggle:** various "solar flare" tabular sets exist (e.g. the UCI flare dataset) **[U]**, but they are low quality. Use SWAN-SF or GSEP instead.

---

## 4. Lunar terrain and geometry

| Source | URL | What | Format, size, auth | Use |
|---|---|---|---|---|
| **PGDA south pole site DEMs, 5 m/px** (Barker et al. 2021) | https://pgda.gsfc.nasa.gov/products/78 and /81 **[V]**; files under `https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/` (README **[V]**) | Sites: Connecting ridge (Site01), Shackleton rim (04), Nobile rim 1 (06), Peak near Shackleton (07), de Gerlache rim (11), Leibnitz β (20), Malapert massif (23), Haworth, Shoemaker, Nobile rim 2 (DM2). Files `*_surf.tif`, `*_slp.tif`, `*_toterr.tif`. 87°S mosaic: `.../LOLA_5mpp/87S/ldem_87s_5mpp.tif` | GeoTIFF, polar stereographic, MOON_ME DE421. **The 87S mosaic is 3.47 GB [V]**, so prefer the per-site tiles. No auth. | **Horizon and sky-view-factor shielding per asset** |
| South pole 20 m and 240 m (LOLA "A New View of the Lunar South Pole") | https://pgda.gsfc.nasa.gov/products/90 **[V]**; `.../data/LOLA_20mpp/LDEM_60S_240MPP_ADJ.TIF` (219 MB) **[V]** | 60°S–90°S | GeoTIFF | regional context |
| Lunar polar illumination (Mazarico) | https://pgda.gsfc.nasa.gov/products/69 **[V]**; `AVGVISIB_65S_240M_201608.TIF`, `AVGVISIB_75S_120M_201608.TIF` (COG variants listed) | average sun visibility | GeoTIFF | power and thermal context; PSR flag |
| SLDEM2015 (LOLA+Kaguya) | https://pgda.gsfc.nasa.gov/products/54 **[V-page]** | ±60° latitude, 512 ppd | — | mid-latitude CLPS sites |
| USGS LOLA global DEM 118 m | https://astrogeology.usgs.gov/search/map/moon_lro_lola_dem_118m **[V-page]**; file `https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif` (302 redirect) | global | GeoTIFF, about 8 GB **[U size]** | non-polar assets |
| LOLA PDS (GDR) | https://pds-geosciences.wustl.edu/missions/lro/lola.htm **[V-page]**; `https://imbrium.mit.edu/DATA/LOLA_GDR/` **[V]** | all LOLA products | IMG/LBL | — |
| **Moon Trek (NASA SSD/JPL)** | https://trek.nasa.gov/moon/ **[V]**; API doc `https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon` **[V]**; e.g. WMTS capabilities `https://trek.nasa.gov/tiles/Moon/EQ/LRO_LOLA_ClrShade_Global_128ppd_v04/1.0.0/WMTSCapabilities.xml` **[V]** | OGC WMTS tiles `.../1.0.0/{Style}/{TileMatrixSet}/{z}/{row}/{col}.png` | No auth | **Basemap tiles for the dashboard** (Leaflet, OpenLayers or Cesium). Polar layers use `/SP/` paths **[U]**. |
| LROC QuickMap (ASU) | https://quickmap.lroc.asu.edu/ **[V-page]** | interactive explorer with DEM, slope and illumination; WMS behind it **[U]** | — | site scouting and screenshots |
| **JPL Horizons API** | `https://ssd.jpl.nasa.gov/api/horizons.api` **[V]** | Ephemerides. **Topocentric Sun azimuth and elevation from a lunar surface site [V]:** `COMMAND='10'&CENTER='coord@301'&COORD_TYPE='GEODETIC'&SITE_COORD='0,-89.5,0'&EPHEM_TYPE='OBSERVER'&QUANTITIES='4'` | JSON or text, no auth | sun elevation per asset (combine with the DEM horizon to get illumination); Moon position vs. Earth (COMMAND='301', CENTER='500@399', VECTORS) for magnetotail timing |
| **NAIF SPICE kernels** | `https://naif.jpl.nasa.gov/pub/naif/generic_kernels/`: `spk/planets/de440s.bsp` (32.7 MB) **[V]**, `pck/moon_pa_de440_200625.bpc` **[V]**, `fk/satellites/moon_de440_250416.tf` **[V]**, plus `lsk/naif0012.tls` and `pck/pck00011.tpc` **[U]** | — | binary kernels, no auth | Offline geometry with `spiceypy`: Sun direction in MOON_ME/PA, Moon position in GSE. **Magnetotail rule of thumb:** the Moon is in the tail when its GSE longitude is within about ±20–30° of anti-sunward (about ±3 days of full Moon, roughly 4–6 days per orbit). Cross-check with ARTEMIS or `SWMF2023_RT_MOON`. Tail protection does **not** stop SEPs above about 10 MeV. |
| Artemis III candidate regions (NASA, Oct 28 2024) | https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ **[V via search]** | 9 regions: Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, Slater Plain | — | asset presets. Most overlap the PGDA 5 m sites. |
| CLPS mission and site list | https://www.nasa.gov/commercial-lunar-payload-services/ **[U]**; PDS CLPS https://pds-geosciences.wustl.edu/missions/clps/index.htm **[V-page]** | IM-1 Malapert A (2024), Blue Ghost M1 Mare Crisium (2025), IM-2 Mons Mouton (2025), ispace M2 (2025), upcoming IM-3 Reiner Gamma, Blue Ghost M2 far side, Griffin-1, etc. **[U, from memory]** | — | asset presets for demo |

---

## 5. Open-source software and radiation tools

| Tool | Version, repo, stars | Usable in 48 h? | Role |
|---|---|---|---|
| **hapiclient** (Python) | PyPI 0.3.3; github.com/hapi-server/client-python (★23, pushed 2026-08) | **Yes** | one client for ISWA (GOES, CRaTER, SWMF-Moon) and CDAWeb (ARTEMIS) |
| **SunPy** | 8.0.1; github.com/sunpy/sunpy (★1053, pushed 2026-11-12) | Yes | `Fido` search (GOES XRS, HEK), `sunpy.timeseries` for XRS NetCDF, coordinates |
| **pyspedas** | 2.2.2; github.com/spedas/pyspedas (★208, pushed 2026-11-13) | Yes | THEMIS/ARTEMIS loading (`pyspedas.projects.themis.sst/esa/state`) |
| HelioPy | github.com/heliopython/heliopy, **deprecated** (last push 2022) | No | use sunpy, pyspedas or hapiclient instead |
| **astropy** | github.com/astropy/astropy (★5420) | Yes | time and units |
| **spiceypy** | 8.4.0; github.com/AndrewAnnex/SpiceyPy (★495, pushed 2026-11-11) | **Yes** | Sun and Earth geometry per asset, tail flag |
| sunkit-image | github.com/sunpy/sunkit-image (★41) | Optional | image processing for ML |
| drms | PyPI **[U version]** | Yes | JSOC SHARP keyword pulls |
| rasterio / GDAL / richdem | — | **Yes** | DEM reading; horizon angle by ray marching in 36–72 azimuths |
| OpenSpace | github.com/OpenSpace/OpenSpace (★1304, pushed 2026-11-14) | Demo only (heavy C++ app) | cinematic visualization |
| **CesiumJS** | github.com/CesiumGS/cesium (★15950) | **Yes** | 3D Moon with a Moon ellipsoid and Trek WMTS imagery; Cesium ion has Moon terrain tilesets (needs an ion token **[U]**) |
| ROS 2 | github.com/ros2/ros2 (★6312) | Optional | publish `/lunar_shield/risk` for "rover integration" story |
| **Foxglove** | `foxglove-sdk` 0.31.0 (github.com/foxglove/foxglove-sdk ★323); MCAP (★1146); Studio OSS archived; fork AD-EYE/foxglove-opensource (★162) | Yes (WebSocket server from Python, no ROS needed) | live telemetry-style risk panels |
| **OLTARIS** (NASA LaRC) | https://oltaris.nasa.gov/ **[V-page]** | **Registration needs admin approval**, so apply on day 1 or use precomputed published dose-depth curves | HZETRN dose vs. Al or regolith thickness, lunar surface environments |
| **SPENVIS** (ESA/BIRA) | https://www.spenvis.oma.be/ **[V-page]** | Free registration (usually immediate) | SEP fluence models (ESP, SAPPHIRE), SHIELDOSE-2 dose-depth, SEU rates |
| **CREME96 / CREME-MC** (Vanderbilt) | https://creme.isde.vanderbilt.edu/ **[V-page]** | Login required | SEE rates from LET spectra, for precomputing a lookup table |
| Geant4 / PLANETOCOSMICS | geant4.web.cern.ch **[U]**; planetotools (★1) | **No** (too slow to set up) | cite only |
| HZETRN 2020 (NASA software catalog) | **[U]** | No | — |

**Practical shielding approach for 48 h:** precompute or approximate a dose-depth table D(x) per unit ≥10, ≥30 and ≥100 MeV fluence (from SPENVIS SHIELDOSE-2 or published OLTARIS curves). Multiply by:
- **0.5** for the half-sky blocked by the Moon itself, then
- the **DEM sky-view fraction** (horizon mask), and
- a material shielding term from asset metadata (g/cm² Al).

Asset tolerance (TID budget, SEE threshold) then maps to **Green / Yellow / Orange / Red** and to **safe-mode or restart** actions.

---

## 6. Forkable GitHub repos (stars and last push as of 2026-11-14)

| Repo | ★ | Last push | License | Why |
|---|---|---|---|---|
| github.com/ktindiana/sphinxval | 3 | 2026-11-10 | MIT | **CCMC SEP Scoreboard validation code**; score your forecasts the official way |
| github.com/ktindiana/fetchsep | 5 | 2026-10-26 | MIT | download GOES/SEPEM proton data, identify SEP events above background, compute operational quantities. **Strong label generator.** |
| github.com/ktindiana/operational-sep | 7 | 2023-07-06 | none | older SEP flux quantities |
| github.com/rickyegeland/fetchcasts | 1 | 2025-01-28 | none | fetches SEP Scoreboard forecasts |
| github.com/NASA-IMPACT/Surya | 180 | 2026-04-29 | Apache-2.0 | foundation model plus flare downstream task |
| github.com/subhamoysgit/MEMPSEP | 2 | 2025-08-06 | MIT | probabilistic SEP ensemble |
| github.com/samresume/Cleaned-SWANSF-Dataset | 8 | 2024-10-29 | MIT | preprocessed SWAN-SF |
| github.com/ZeyuSun/flare-prediction-smarp | 5 | 2024-02-23 | MIT | SHARP/SMARP flare prediction (LSTM/CNN) |
| github.com/machthreetwo/helios | 1 | 2026-09-26 | MIT | SHARP plus JSOC/HEK pipeline for flare prediction (small but recent) |
| github.com/USNavalResearchLaboratory/flare_duration_forecasting | 8 | 2021 | — | flare duration |
| github.com/inaf-oact-ai/solar-flare-forecaster | 3 | 2026-07-27 | — | transformer flare forecaster app |
| github.com/spaceml-org/helionb-sdoml | 11 | 2025-07-29 | GPL-3.0 | SDOML notebooks |
| github.com/577Industries/helios-spaceweather-connectors | 0 | 2026-09-20 | **[U]** | claims adapters for DONKI, SEP Scoreboard and SWPC. Check whether they use the new CCMC host. |
| github.com/DigitalCurrensy/dosepath | 2 | 2026-10-19 | **[U]** | lowest-dose traverse on a cost grid (lunar) |
| github.com/AD-EYE/foxglove-opensource | 162 | 2026-10-01 | MPL-2.0 | self-hostable Foxglove Studio |

No mature open-source "lunar surface radiation risk" service was found. The niche is open.

---

## 7. 48-hour minimal stack (recommended)

Wire up these 8 sources and tools, in priority order:

1. **SWPC GOES JSON**: `integral-protons-6-hour.json`, `differential-protons-6-hour.json`, `xrays-6-hour.json`, `xray-flares-latest.json`, plus `instrument-sources.json`. This is the real-time core: no key, 5-minute latency, and ≥10/≥100 MeV flux maps straight to NOAA S-scale and SEE risk. Poll every minute and cache.
2. **SWPC alerts and forecasts**: `products/alerts.json`, `products/noaa-scales.json`, `json/solar_probabilities.json`. These give an authoritative trigger for safe-mode and a forecast baseline to show your ML model beating or complementing.
3. **CCMC DONKI on the new host** (`ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR,CME,SEP,IPS,notifications}`). No key and no rate-limit pain. It provides event context and the FLR→SEP linkage for labels. **Avoid api.nasa.gov DEMO_KEY.**
4. **ISWA HAPI via `hapiclient`**: `goesp_part_flux_P5M` (2010 to now) for backfill and training, **`CRaTER`** for lunar dose validation ("our model predicts X cGy/day, CRaTER measured Y"), and `SWMF2023_RT_MOON` for a live magnetotail flag. This is one client for history, validation and real time.
5. **CCMC SEP Scoreboard** (ISWA redirect API or the `sep_scoreboard` tree). Ingest 2–3 operational models (UMASEP, RELEASE, MAG4) as ensemble members. Emit your own output in the Scoreboard JSON schema and score it with **sphinxval**.
6. **Training labels**: the **NOAA SPE list** (umbra HTML), **GSEP** (Dataverse DZYLHK) and DONKI FLR/SEP. Train a gradient-boosted model (LightGBM) on GOES X-ray, proton rise-rate, SUVI or flare-location and SWPC-probability features for P(S1+ in 24 h) and P(≥100 MeV). It trains in minutes, unlike SWAN-SF or Surya, which you can keep as "future work" (optionally show `solar_flares_surya` inference).
7. **PGDA 5 m south-pole site DEMs** (per-site `*_surf.tif`, not the 3.5 GB mosaic) plus **spiceypy** (de440s, moon_pa_de440, moon_de440 fk) or **Horizons**. Compute the horizon mask and sky-view factor per asset, the sun elevation, and the in-tail flag. Shielding multiplier = 0.5 × sky-view fraction × exp-like attenuation from a SPENVIS-derived dose-depth table for the asset's g/cm² shielding.
8. **Front end: CesiumJS plus Moon Trek WMTS** (LOLA shaded relief and polar layers) for the asset map, optionally **foxglove-sdk** for a live "operations console". The backend is FastAPI with endpoints `/assets/{id}/risk` and `/forecast`.

**Why this set:** every item is keyless (except optional Cesium ion), was verified live today, and covers four things: real time (1–3), forecasting (2, 5, 6), lunar-specific physics and validation (4, 7), and a polished demo (8).

**Avoid within 48 h:** ESA SWE (login), OLTARIS (admin approval; apply anyway on day 1), CREME (login), Geant4, full SDOML or Surya training, Chang'e-4 LND downloads, and the 3.5 GB/8 GB mosaics.

# Feasibility: Challenge 4.9 "Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"

Prepared Sat 2026-11-14 ~10:00 CET. Deadline Sun 2026-11-15 16:00 CET. Challenge text source: `/Users/spatr/Documents/NASA/research/01-hackathon-map.md` §4.9 (page: https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/).

## Bottom line

- **Build the combined product (search engine + breakdown dashboard).** The challenge text names nearly every part of it. It asks for a "similarity-ranking system, ML tool", "a method for systematically searching Earth for previously unrecognized analogs" and "look beyond well-known analog sites". It also asks teams to "identify what is similar, how similar it is, and what is different" and to say "where the analogy breaks down". Idea 1 covers the first group and Idea 2 covers the second. Each idea alone leaves part of the brief unanswered.
- **Feasible in about 20 working hours, provided the Earth grid stays coarse (0.05°, about 5.6 km).** NASA publishes MODIS products at 0.05° on the Climate Modeling Grid (CMG), one global file per month or day: LST day/night (MOD11C3), NDVI (MOD13C2) and albedo (MCD43C3). The planetary target maps are single global GeoTIFF or PNG files. The only heavy layer is the DEM (for slope and roughness); compute it server-side in Google Earth Engine.
- **Validity is where judges will push hardest: "you can't compare Earth °K with lunar °K".** The defence is a **three-tier comparability scheme** (below) plus a **validation run**: check whether the USGS catalogue of known analog sites ranks high in your own results.
- **The "similar topic won last year" claim is not verified.** None of the 2025 Global Winners is about analogs or landing sites (list below). The closest Moon/Mars Global Winner I found is 2024's QuakeHeroes (Moon/Mars seismic detection). Space Apps ran a "Comparing Earth landscapes with planets and moons" challenge in **2013**, and 2016 had projects such as "Linked Minds: Mars on Earth" and "Marsify Earth". If the team note refers to a Budapest *local* award, ask the organisers; I could not find Budapest 2025 local results online.
- **The local jury suits this challenge unusually well.** It includes Hanga Katreiner (Hungary's first analog astronaut) and Dr. Tibor Pacher (Puli Space, a lunar company) (map §2). Put "where the analogy breaks for a crew" up front; she will ask about it.

---

## T1 Feasibility

| Idea | Challenge | Core NASA data (verified URL) | Data access effort (Low/Med/High) | Build effort (person-hours) | Feasible by Sun 16:00? (Yes/Partly/No) | Biggest technical risk |
|---|---|---|---|---|---|---|
| 1. Global Cross-Planetary Similarity Search Engine | 4.9 | Earth: MOD11C3 LST day/night 0.05° https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod11c3-061 ; MOD13C2 NDVI https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061 ; MCD43C3 albedo https://www.earthdata.nasa.gov/data/catalog/lpcloud-mcd43c3-061 ; ASTER GED AG1km emissivity https://www.earthdata.nasa.gov/data/catalog/lpcloud-ag1km-003 . Moon: LOLA slope/Hurst maps https://pgda.gsfc.nasa.gov/products/70 . Mars: TES TI/albedo/dust/minerals https://www.mars.asu.edu/data/ , TES albedo GeoTIFF https://astrogeology.usgs.gov/search/map/mars_mgs_tes_global_bolometric_albedo_map_7410m | Med (Earth CMG products are about 12 files each; the DEM-derived slope needs GEE; planetary maps are single files, but some are colourised PNGs that must be inverted to values) | ~40–45 | Yes | Cross-planet normalisation: raw LST, ΔT and Fe values are not comparable, so a naive z-score produces confident nonsense. Also, polar Moon-base targets fall outside the ±70° coverage of several lunar maps. |
| 2. Analogy Breakdown Dashboard | 4.9 | Same target maps, plus site-level zoom data: EMIT L2B minerals 60 m (±52° lat, granules only) https://www.earthdata.nasa.gov/data/catalog/lpcloud-emitl2bmin-002 ; Diviner GCP / polar products https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/LRO/DIVINER/GCP.htm ; Clementine FeO 1 km (70S–70N) https://astrogeology.usgs.gov/search/map/Moon_Clementine_UVVIS_FeO_Color_Binned_1km | Low–Med if limited to 5–10 hand-picked sites | ~25–30 | Yes | Without global search it becomes "another dashboard of famous sites", which the challenge explicitly discourages ("look beyond … Atacama, Iceland, Hawaii"). |
| Combined (1 feeds 2) | 4.9 | Union of the above, plus USGS Known Terrestrial Analog Sites (CC0) as ground truth https://www.usgs.gov/data/known-terrestrial-analog-sites-planetary-science (DOI 10.5066/P9J72921) | Med | ~60–70 (4 people × ~17 h ≈ 68 h available) | Yes, if tightly scoped: 2 target types (1 Moon, 1 Mars) and about 6 features. Partly if you try all 9 Artemis regions plus CRISM. | Integration time: the pipeline output must be frozen by about Sun 08:00 so the dashboard and video are not chasing changing numbers. |

## T2 Judging score estimate (1–5 each)

| Idea | Impact | Creativity | Validity | Relevance | Presentation | Total /25 | One-line rationale |
|---|---|---|---|---|---|---|---|
| 1. Similarity search engine | 4 | 4 | 3 | 5 | 4 | 20 | A global heatmap with "unexpected" hits is a strong visual and matches the brief, but a single opaque score is easy to attack on Validity. |
| 2. Breakdown dashboard | 3 | 3 | 4 | 4 | 4 | 18 | Answers the "where the analogy breaks" question directly, but hand-picked famous sites lack the discovery the brief asks for. |
| Combined | 4 | 5 | 4 | 5 | 5 | 23 | Discovery plus explanation, checked against the USGS analog catalogue; the 30 s video gets both a "wow" global map and a "why" radar chart. |

(These are my estimates. Validity reaches 4 only with the tiered comparability scheme and the USGS validation; without them, score it 3.)

## T3 Resource mapping

| Idea | Listed challenge resource used | Other NASA/partner data | Open-source tools | Sponsor resources (Azure/GoDaddy/Copilot/other) |
|---|---|---|---|---|
| 1 | NASA Earthdata Search (MODIS CMG, ASTER GED); PDS / LRO (LOLA); Worldview for screenshots of hits | Copernicus DEM GLO-30/90 (ESA partner; PC id `cop-dem-glo-90` verified at https://planetarycomputer.microsoft.com/api/stac/v1/collections/cop-dem-glo-90 ); Global Aridity Index v3.1, 30″, CC BY 4.0 https://figshare.com/articles/dataset/Global_Aridity_Index_and_Potential_Evapotranspiration_ET0_Climate_Database_v2/7504448 ; MGS TES/MOLA (ASU, USGS) | earthengine-api/geemap, earthaccess, rasterio/rioxarray/xarray, GDAL, numpy, scikit-learn (StandardScaler, NearestNeighbors), optional FAISS | Planetary Computer STAC (`modis-11A2-061` 1 km LST day/night and `modis-13A1-061` NDVI verified); Google Cloud $300 / Earth Engine for the global DEM reduction; Copilot for boilerplate |
| 2 | LRO Diviner (listed), PDS; Worldview imagery for side-by-side views | EMIT L2B mineral granules for zoomed Earth sites; Clementine FeO (USGS); TES mineral maps (hematite, olivine, plagioclase… 4 ppd) https://www.mars.asu.edu/data/ ; Copernicus Data Space Sentinel-2 RGB (ESA partner resource) for photo panels | Streamlit or Leaflet + Plotly (radar charts), folium | GoDaddy domain pointing at the static site; Azure Static Web Apps (free tier) or App Service from the $200 credit; Power BI optional, for an internal view only (public embedding is awkward) |
| Combined | All of the above (Earthdata Search, PDS, LRO, Diviner, Worldview) plus one CSA/ESA/JAXA item for partner credit (simplest: Copernicus DEM / Sentinel-2 from ESA) | USGS Known Terrestrial Analog Sites as the validation set; Artemis III 9 candidate regions (NASA, Oct 2024) as Moon targets https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ ; Mars targets: Jezero, Gale (well characterised) | Same; precompute everything into Parquet/COG → static GeoJSON + PNG tiles | Earth features on GEE or Planetary Computer; Azure for hosting; GoDaddy domain for a clean URL in the video; Copilot |

## T4 MVP scope

| Idea | Must-have (by Sun 12:00) | Nice-to-have | Cut | Demo moment for 30 s video |
|---|---|---|---|---|
| 1 | Global 0.05° Earth feature stack (slope, roughness, albedo, NDVI mask, diurnal ΔT / apparent thermal inertia, aridity, TIR silica index from ASTER); 2 target vectors (Moon: Artemis-region rim; Mars: Jezero); weighted similarity → ranked heatmap; top-20 table | A third target (Gale or a lunar mare site); FAISS; user-adjustable weights | Deep-learning image embeddings, CRISM, 30 m resolution, caves/lava tubes | Click "Jezero" → Earth lights up → zoom to an unexpected top-5 hit that is not on any known analog list |
| 2 | Radar chart per candidate (geomorphology / thermal / spectral / environment), with a "match / breaks" text per axis; split view Earth vs target | EMIT mineral zoom for one hit; Sentinel-2 vs HiRISE/LROC image pair | Generic site encyclopedia, 3D globe | Radar chart overlay: "an excellent terrain and thermal-inertia analog, but it breaks on gravity, vacuum and radiation" |
| Combined | 1's must-haves, plus: a dashboard that opens the radar breakdown for any top-N hit; validation numbers (how many USGS-catalogued analogs land in the top X %); fixed "Earth can't reproduce" row (gravity, vacuum, radiation, atmosphere) on every card | Weight sliders; a "Hungary's best Mars analog" easter egg for the local jury; downloadable CSV/GeoTIFF | Live server-side compute (precompute everything); polar-stereographic lunar south-pole products beyond one target | 0–8 s: spinning Moon/Mars → "find Earth's twin". 8–18 s: global heatmap, zoom to a surprise hit. 18–27 s: radar chart with green match axes and red "breaks" axes. 27–30 s: "validated: X % of known analogs in our top 5 %", plus the URL |

---

## Data: what is realistic in hours (verified)

### Earth (target grid 0.05°, i.e. 7200×3600 cells, ~2.6 M land cells after masking)
| Feature | Product (verified) | Access | Notes |
|---|---|---|---|
| Diurnal ΔT (day − night LST) | MOD11C3 v061 monthly 0.05°, `LST_Day_CMG` / `LST_Night_CMG` https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod11c3-061 | earthaccess, 12 HDF files (~70 MB each) | Terra overpass ~10:30/22:30, so this is not true max−min. Higher-resolution alternative: PC `modis-11A2-061` (1 km, 8-day) |
| Vegetation mask | MOD13C2 v061 monthly 0.05° NDVI https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061 ; PC `modis-13A1-061` (500 m) | earthaccess / PC STAC | Mask on max-annual NDVI > ~0.2 |
| Albedo | MCD43C3 v061 daily 0.05°, `Albedo_WSA_shortwave` https://www.earthdata.nasa.gov/data/catalog/lpcloud-mcd43c3-061 ; GEE `MODIS/061/MCD43A3` (500 m) | earthaccess (pick ~12 dates) / GEE | Dimensionless, so directly comparable across planets |
| Apparent thermal inertia | Derived: ATI = (1 − albedo) / ΔT | computed | Physically related to Mars TES TI; label it a *proxy* |
| Slope, roughness | Copernicus DEM GLO-90 (PC `cop-dem-glo-90`, verified) or GLO-30 on GEE; reduce to 0.05° (mean slope, std of elevation / TRI, median absolute slope) | GEE export ~30–60 min | Doing this locally means downloading global 90 m tiles; avoid that and use GEE |
| TIR emissivity → silica/mafic index | ASTER GED AG1km v003 (1 km, global, bands 10–14) https://www.earthdata.nasa.gov/data/catalog/lpcloud-ag1km-003 ; GEE `NASA/ASTER_GED/AG100_003` (100 m, ~59°S–80°N) | GEE / LP DAAC | **Same measurement physics as Mars TES (TIR emissivity)**; a strong creative and validity point |
| Ferric iron proxy | MODIS red/blue reflectance ratio (MCD43C4 / PC `modis-43A4-061`, verified) | PC / GEE | Coarse but global; EMIT is better but not wall-to-wall |
| Minerals (zoom only) | EMIT L2B MIN v002, 60 m granules, ±52–54° lat, 2022–present, netCDF https://www.earthdata.nasa.gov/data/catalog/lpcloud-emitl2bmin-002 | earthaccess, per site | Ten validated minerals (calcite, chlorite, dolomite, goethite, gypsum, hematite, illite+muscovite, kaolinite, montmorillonite, vermiculite) per the user guide https://lpdaac.usgs.gov/documents/1660/EMITL2BMIN_User_Guide_V1.pdf . **Not a global mosaic**, so use it for Idea 2 only |
| Aridity | Global Aridity Index v3.1, 30″ GeoTIFF, CC BY 4.0 (v3.1 notes a dry bias) https://figshare.com/articles/dataset/Global_Aridity_Index_and_Potential_Evapotranspiration_ET0_Climate_Database_v2/7504448 ; also on the GEE community catalog https://gee-community-catalog.org/projects/ai0/ | single download | Earth-only "environment" axis |

Notes: PC STAC id `modis-43A3-061` and an `emit` collection returned 404 on PC; use GEE or LP DAAC for those.

### Moon
| Feature | Product | URL |
|---|---|---|
| Slope (57/225/560 m baselines) and Hurst exponent | Rosenburg et al. 2011, 16 ppd / 8 ppd | https://pgda.gsfc.nasa.gov/products/70 → http://imbrium.mit.edu/EXTRAS/FRACTAL/ ; ODE GDR slope/roughness https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/LRO/LOLA/GDR/Intro.htm |
| Elevation | LOLA 118 m global DEM (~8 GB; downsample with gdal_translate -outsize) | https://astrogeology.usgs.gov/search/map/moon_lro_lola_dem_118m |
| Temperatures | Diviner Global Cumulative Product (2 ppd × 0.25 h local time) and polar resource products; Williams et al. 2017 | https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/LRO/DIVINER/GCP.htm ; https://pds-geosciences.wustl.edu/missions/lro/diviner.htm |
| Rock abundance | Diviner GDR L3 / GHRM (128 ppd, 70°S–70°N) | https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/LRO/DIVINER/GDR_L3.htm |
| Iron (FeO wt%) | Clementine UVVIS FeO 1 km, 70S–70N (does **not** cover the south pole) | https://astrogeology.usgs.gov/search/map/Moon_Clementine_UVVIS_FeO_Color_Binned_1km |
| Moon-base targets | Artemis III 9 regions (Oct 2024): Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, Slater Plain | https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ (names cross-checked with https://www.astronomy.com/space-exploration/here-are-the-nine-sites-where-artemis-3-might-land-on-the-moon/) |

Practical shortcut for the deadline: if you cannot extract polar Diviner values from PDS in time, build the lunar south-pole target vector from **published values** (e.g. Paige et al. 2010 Science 330:479 for cold traps; Williams 2017) and cite them. That is legitimate and much faster than processing PDS data.

### Mars
| Feature | Product | URL |
|---|---|---|
| Elevation | MOLA 463 m global DEM (USGS) / MEGDR (PDS) | https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m (USGS returned 403 to my fetcher; the page is known to exist), https://pds-geosciences.wustl.edu/missions/mgs/megdr.html |
| Roughness | MOLA vertical roughness 0.6/2.4/9.2 km (8 ppd, RGB composite); Kreslavsky & Head 2000 | https://www.mars.asu.edu/data/ |
| Thermal inertia | TES TI 8 ppd (numeric VICAR via WMS) and Putzig & Mellon 2007 20 ppd | https://www.mars.asu.edu/data/tes_ti/ |
| Albedo | TES bolometric albedo 7410 m GeoTIFF | https://astrogeology.usgs.gov/search/map/mars_mgs_tes_global_bolometric_albedo_map_7410m (file https://planetarymaps.usgs.gov/mosaic/Mars_MGS_TES_Albedo_mosaic_global_7410m.tif) |
| Dust | TES Dust Cover Index 16 ppd (Ruff & Christensen 2002) | https://www.mars.asu.edu/data/tes_dust ; https://www.mars.asu.edu/~ruff/DCI/dci.html |
| Mineralogy | TES mineral maps 4 ppd (hematite, olivine, plagioclase, high/low-Ca pyroxene, sheet silicates, quartz…) | https://www.mars.asu.edu/data/ |
| Night/day IR | THEMIS global mosaics 100 m | https://www.mars.asu.edu/data/ |
| CRISM | Only partial coverage and heavy processing. **Cut.** | — |

Caveat: several ASU products are colourised PNGs. Prefer the numeric layers (TES TI has a numeric VICAR WMS endpoint). For the rest, sample values at the target site from the paper or from JMARS rather than inverting colour ramps.

### Making features comparable across planets (the Validity defence)
Use three explicit tiers, show them in the UI, and say "we only compare like with like":
1. **Tier A, physically identical quantities (compare raw values):** slope at a matched baseline (Copernicus 90 m vs LOLA 57–225 m vs MOLA ~460 m; state the baseline), Hurst exponent / roughness scaling, broadband albedo (dimensionless), thermal inertia (Mars TES TI vs Earth ATI proxy; flag "proxy").
2. **Tier B, same process but different magnitude (compare within-planet percentiles):** diurnal ΔT (Earth ~20–50 K, Mars ~80–100 K, Moon equator ~250+ K), aridity / volatile scarcity, dust cover. Matching means "a top-5 % extreme on Earth ↔ a top-5 % extreme on the target body", not equal Kelvin. Say so in one sentence on a slide.
3. **Tier C, categorical or spectral class (compare classes):** lithology (basaltic / mafic, ferric-oxide-rich, sulfate/evaporite, phyllosilicate). Map ASTER TIR emissivity and EMIT minerals on Earth, TES minerals on Mars and FeO on the Moon to a shared small class set, and score class agreement.
4. **Always non-analogous, shown on every card:** gravity (1 vs 0.165 vs 0.38 g), atmosphere/vacuum, radiation, permanent darkness (no Earth surface is permanently shadowed). The brief explicitly rewards stating these limits.
5. **Validation:** score the USGS known analog sites (Hunter 2020, CC0) and report their percentile rank and recall@top-k against random land cells. If known analogs do not rank high, re-weight and report it honestly.
6. **Resolution honesty:** Earth 5.6 km vs Moon 1.9 km (16 ppd) vs Mars 3–7.5 km. Analogs are "regional-scale", and the zoom step (EMIT, Sentinel-2) is site-scale.

## Prior art / competition

- **USGS Known Terrestrial Analog Sites for Planetary Science** (M. Hunter, 2020; point layer of craters, dunes, volcanoes; CC0): https://www.usgs.gov/data/known-terrestrial-analog-sites-planetary-science , DOI https://doi.org/10.5066/P9J72921 (ScienceBase returned 403 to my fetcher, so file format and site count are unverified). Use it as the validation set and as the "known" layer to show what is new.
- **ESA "Catalogue of Planetary Analogues"** (Preston et al. 2012): https://freight.cargo.site/m/D1821053255089660420449933921929/The-Catalogue-of-Planetary-Analogues.pdf ; ESA article https://www.esa.int/Our_Activities/Preparing_for_the_Future/Discovery_and_Preparation/Cataloguing_otherworldly_landscapes_on_Earth
- **Europlanet Planetary Field Analogues** (Transnational Access sites) https://europlanet-society.org/?p=8693 , https://auditore.cab.inta-csic.es/europlanet/ ; **PTAL** spectral library (Raman/LIBS/NIR/XRD) https://meetingorganizer.copernicus.org/EPSC2021/EPSC2021-627.html
- **CAFE** (Open University analogue field-site resource) https://oro.open.ac.uk/33373 ; **IMEWG Mars analog database** effort https://imewg.org/joint-initiatives/mars-on-earth-analogues
- **Review of 33 analogue sites, which calls for a global open analogue database:** Preston & Dartnell 2014, IJAsB https://ui.adsabs.harvard.edu/abs/2014IJAsB..13...81P . This is a gap your tool can explicitly address.
- **ML similarity work:** Meng et al. (arXiv 2501.08584, Dec 2024) train a CNN metric to find Mars landing-site analogs in the Qaidam Basin; image-based, single region, no quantitative results on the abstract page. https://arxiv.org/abs/2501.08584 . Sanganeria (NHSJS 2026) ranks 10 known Earth sites by grayscale texture similarity to Moon/Mars; texture only, no DEM, internally inconsistent. https://nhsjs.com/2026/finding-earths-best-testbeds-for-moon-and-mars-rovers-a-quantitative-terrain-comparison/ . **I found no published global, multi-physical-feature, Earth-wide similarity search with per-dimension breakdown.** That is your novelty claim; word it as "to our knowledge".
- **Space Apps history:** 2013 challenge "Comparing Earth landscapes with planets and moons" https://2013.spaceappschallenge.org/challenge/comparing-earth-landscapes-with-planets-and-moons ; 2016 projects "Linked Minds: Mars on Earth" https://2016.spaceappschallenge.org/challenges/tech/bring-your-own-solution/projects/linked-minds-mars-on-earth and "Marsify Earth" https://2016.spaceappschallenge.org/challenges/earth/geotagging-space-and-aviation/projects/marsify-earth . 2024 Global Winner (Best Use of Technology): QuakeHeroes (Brazil), Moon/Mars quake detection. **2025 Global Winners** (none on analogs): SpaceGenes+, Resonant Exoplanets, Twisters, Astro Sweepers, PureFlow (habitat layout), Photonics Odyssey, HerCode Space, Gaia+LEO, Zumorroda-X, QUEÑARIS https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/ . Because 4.9 is new in 2026, many teams will submit "Atacama/Iceland story" entries. A systematic global search with validation stands out.

## Build plan (about 18–20 working h)

**Stack:** Python 3.11; earthengine-api/geemap (Earth DEM + MODIS reductions → one global multi-band 0.05° GeoTIFF); earthaccess for CMG fallbacks; rasterio/rioxarray/xarray/GDAL; numpy/pandas/scikit-learn; Parquet. Front end: Streamlit (fastest) on Azure App Service, **or** a static Leaflet + Plotly site (precomputed GeoJSON/PNG heatmaps) on Azure Static Web Apps or GoDaddy hosting. Mapping the GoDaddy domain to it is trivial. GitHub + Copilot.

**Similarity:** per target, build the feature vector from the planetary maps (sample a ~20–50 km window). Per Earth cell, score each dimension with Tier A as a Gaussian kernel on the physical difference, Tier B as a percentile difference and Tier C as class match. Combine as a weighted mean (weights shown in the UI). Report the per-dimension sub-scores; those are Idea 2's radar axes. Optional cosine or Mahalanobis kNN on standardised vectors for comparison.

**Timeline**
- Sat 10:30–11:30: everyone. Freeze targets (1 Moon: e.g. Malapert Massif / Shackleton–de Gerlache rim; 1 Mars: Jezero), the feature list and the tier table. Register GEE and Earthdata accounts now.
- Sat 11:30–17:00: Bence on the Earth stack in GEE (slope/roughness from Copernicus DEM, LST day/night, NDVI, albedo, ASTER emissivity) → export 0.05° GeoTIFF. Patrik on Moon/Mars target vectors (LOLA FRACTAL slopes, TES TI/albedo/dust/minerals, published Diviner values) and the repo/pipeline skeleton. Benedek on feature science (justifying each axis, tier assignment, "where it breaks" text, lithology class mapping) and early storyboard. Yhair on the dashboard skeleton (map + radar + top-N table) with mock data.
- Sat 17:00–22:00: Bence + Patrik on the similarity engine, first global heatmaps and USGS validation. Benedek sanity-checks the hits (salt flats, ice sheets, cloud artefacts) and tunes the masks. Yhair wires real outputs into the UI.
- Sun 08:00: **freeze numbers.** 08:00–12:00: Yhair + Patrik deploy (Azure/GoDaddy). Bence runs the EMIT/Sentinel-2 zoom for the top 1–2 surprise hits. Benedek finalises the slides and video script.
- Sun 12:00–14:00: record the 30 s video. 14:00–16:00: submission form, cite every dataset and licence (required), buffer.

**Stretch:** user weight sliders; extra Artemis regions; a "Hungary's best analog" card; ATI from MOD11A2 1 km for top-region refinement; lava-tube/cave layer from literature points.

## Risks

1. **Normalisation attack (Validity).** Mitigate with the tiered comparability scheme, the USGS validation numbers and the "always non-analogous" row.
2. **Polar Moon-base targets.** Clementine FeO and Diviner GHRM stop at ±70°, and nothing on Earth is permanently shadowed. Use LOLA (which covers the poles) plus published Diviner polar values, and frame the Moon-base analog as "rim-of-crater, low-sun, extreme-cold, regolith-mechanics" analog. Say plainly that PSR darkness cannot be reproduced.
3. **Spurious "unexpected" hits** (ice sheets, salt flats, cloud-contaminated LST, coastlines/mixed pixels). Mitigate with masks (land/water, permanent ice optional, clear-sky count threshold) and a human sanity check of the top 50.
4. **Account and access latency** (GEE registration, Earthdata login, PDS/USGS endpoints throwing 403/slow). Register right away. Fallback is the CMG HDF files via earthaccess, plus GMTED/ETOPO for coarse slope.
5. **Colourised planetary PNGs** (ASU) instead of numeric values. Prefer numeric layers, or sample target values from papers and cite them.
6. **Resolution mismatch** (5.6 km Earth vs 1.9–7.5 km targets; slope baselines differ). State the baselines and scope claims to regional scale.
7. **Scope creep / integration time.** Freeze numbers by Sun 08:00 and precompute everything; no live compute in the demo.
8. **Licensing/citation.** Space Apps requires every source cited, and third-party data must be open. Copernicus DEM is free with attribution; Aridity v3.1 is CC BY 4.0; USGS is CC0/public domain.

## Recommendation

Go with the **combined product**, branded as one tool: "Earth's Twin Finder: search, then explain". Scope it to **2 targets (one Artemis-region Moon rim, Jezero), ~6–7 features on a 0.05° Earth grid, Tier A/B/C comparability, and USGS-catalogue validation**, with a per-candidate radar breakdown and a fixed "Earth can't do this" row. That is feasible with ~68 team-hours. It hits the brief's own phrases (similarity-ranking, systematic search, where the analogy breaks, look beyond known sites, use multiple datasets) and gives a 30 s video with a clear "map lights up → surprise site → why it matches and where it doesn't" arc. Expected score is about 22–23/25, versus about 20 (Idea 1 alone) or 18 (Idea 2 alone). Assign Benedek, the geophysicist, to own the physical-comparability argument in the pitch, since that is the point the analog-astronaut juror is most likely to probe.

### Unverified / open items
- "Similar topic won an award last year": not confirmed at Global level for 2024 or 2025. Check with the Budapest Local Lead.
- USGS analog-site dataset file format and site count (ScienceBase 403'd).
- The GEE IDs `COPERNICUS/DEM/GLO30` and `MODIS/061/MOD11A2` are from memory. `NASA/ASTER_GED/AG100_003` and `MODIS/061/MCD43A3` were verified on the GEE catalog.

# Feasibility: Lunar Landing Site Navigator ("Slip Day") vs Lunar Shield variants

*Prepared Sat 2026-11-14, ~10:00 to 11:30 CET, for the Budapest Space Apps 2026 team. Deadline: Sun 2026-11-15 16:00 CET.*

**Note:** we verified the core pipeline ourselves this morning with real NASA data and working code, so most claims below rest on runs, not reading. Prototype scripts are in the scratchpad: `horizon.py`, `azel.py`, `slip.py`, `val.py` in `/private/tmp/claude-501/-Users-spatr-Documents-NASA/29e57abf-a334-40a0-9816-6142459d9c5c/scratchpad/`.

## 0. Bottom line

- **Build Idea 1 (Slip Day).** The core engine already runs end to end. It takes the LOLA 80 m polar DEM, builds a 720-azimuth horizon mask in about 0.25 s per site, and gets SPICE Sun/Earth az/el that matches JPL Horizons to 0.001°.
  - It reproduces NASA's published Mazarico illumination map with **r = 0.977 and mean absolute error 0.02**, on 40 random south-polar points.
  - That leaves the remaining ~20 hours for UI, the scoring, the site list and the pitch, which is the right risk profile.
- **Use a transparent rule/score, not the "Kev/Jev" LLM decision model.** An LLM verdict lowers Validity in front of a space-software judge. At most, use an LLM to put already-computed facts into plain language for the "educator/public" mode.
- **Idea 2:** add only the *static* terrain open-sky fraction (a one-line formula on the same horizon mask). Drop live SEP and hysteresis from this challenge. A landing *date* weeks out cannot carry a live SEP status, so it hurts both Validity and Relevance.
  - Our runs also show that landing-grade sites (rims and peaks) have **open-sky fractions of 0.92–0.98**, so terrain shielding there is only 2–8%. That is a nice one-liner ("sunny = exposed"), not a product.
- **Idea 3 (game, challenge 3)** is feasible, but it fits the team and the Budapest jury less well. It is also a crowded beginner/youth challenge.

---

## T1. Feasibility

| Idea | Challenge | Core NASA data (verified URL) | Data access effort (Low/Med/High) | Build effort (person-hours) | Feasible by Sun 16:00? (Yes/Partly/No) | Biggest technical risk |
|---|---|---|---|---|---|---|
| 1. Slip Day | 11 Lunar Landing Site Navigator | LOLA polar DEM `LDEM_80S_80M.IMG` (115 MB, downloaded in 6 s) http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/ ; NAIF SPICE kernels https://naif.jpl.nasa.gov/pub/naif/generic_kernels/ ; JPL Horizons API https://ssd.jpl.nasa.gov/api/horizons.api (tested) ; Mazarico illumination maps (validation) http://imbrium.mit.edu/EXTRAS/ILLUMINATION/ | **Low** (all fetched and parsed today) | ~50–60 (engine already ~70% done) | **Yes** | Horizon accuracy at near-grazing Sun (el ≈ 0–2°): small DEM errors flip sunlit/dark. Mitigate with a landing-ellipse ensemble and the Barker 2021 error discussion |
| 2. Slip Day + Lunar Shield layer | 11 (radiation is outside the challenge text) | Idea 1 data, plus NOAA SWPC GOES protons https://services.swpc.noaa.gov/json/goes/primary/integral-protons-7-day.json (CORS `*`, tested), DONKI https://ccmc.gsfc.nasa.gov/tools/DONKI/ (timed out from our network; DEMO_KEY rate-limited), LOLA sky-visibility map `SKYV_65S_240M` (82 MB, imbrium) | **Med** (DONKI flaky; needs caching and a key) | ~75–90 | **Partly** (static open-sky column yes; live SEP plus hysteresis is a credible demo only if Idea 1 is done by Sat midnight) | Scientific coherence: a live SEP status means nothing for a future landing date, and judges will spot it. Plus extra API failure points |
| 3. Lunar Shield game | 3 Junior Astronaut Mission Trainer | DONKI (listed resource) https://ccmc.gsfc.nasa.gov/tools/DONKI/ ; RadLab https://visualization.osdr.nasa.gov/radlab/gui/data-api/ (API answers, needs params) ; api.nasa.gov key | **Low–Med** | ~55–70 (game design, art and UX dominate) | **Partly** (a playable prototype yes; kid-tested, polished balance unlikely) | Game feel and balancing for ages 7–12 with no designer or game developer on the team. Radiation numbers must stay true without overwhelming kids |

## T2. Judging score estimate (1–5 each)

| Idea | Impact | Creativity | Validity | Relevance | Presentation | Total /25 | One-line rationale |
|---|---|---|---|---|---|---|---|
| 1. Slip Day | 3 | 3 | **5** | **5** | 4 | **20** | Answers every objective in the challenge text (sites, dates, Sun/Earth vs horizon, power, DTE, "time to sunset/Earthset", schedule slips). It is validated against NASA's own illumination map, and the "launch slipped, re-rank now" story comes straight from the challenge background. Creativity is capped because many teams will plot Sun/Earth az/el |
| 2. Slip Day + Lunar Shield | 3 | 4 | 3 | 4 | 3 | 17 | More original, but live SEP status is not meaningful for a landing date weeks ahead. Terrain shielding is only 2–8% at real landing sites (our runs). It also splits a 30 s story in two |
| 3. Lunar Shield game | 3 | 3 | 3 | 4 | 4 | 17 | Uses listed resources (DONKI, RadLab), but this is an entry-level challenge where many teams build games. A technical Budapest jury (space software engineer, Puli Space CEO) is less likely to reward it. Validity depends on hidden balancing choices |

*Scores are our estimate, not judge feedback.*

## T3. Resource mapping

| Idea | Listed challenge resource used | Other NASA/partner data | Open-source tools | Sponsor resources (Azure/GoDaddy/Copilot/other) |
|---|---|---|---|---|
| 1. Slip Day | **Horizons** (custom-site on-demand query and independent cross-check; topocentric `coord@301` verified), **QuickMap** (digitize Artemis region centres, visual check), **Moon Trek** (deep-link per site for 3D context) | LOLA LDEM_80S_80M (far-field horizon); PGDA 5 m site DEMs + slope + uncertainty (Sites 01/04/07/11/20/23) https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/ ; Mazarico avg Sun/Earth visibility maps (validation) ; NAIF kernels (de440s, moon_pa_de440, moon_de440 FK) ; SVS 4930 south-pole illumination movies https://svs.gsfc.nasa.gov/4930/ (b-roll for video) ; CSA Moon Exploration page (partner resource, context slide) | spiceypy 8.4, numpy, rasterio/GDAL (optional), Plotly (polar sky plot + calendar heatmap), Streamlit or static Plotly.js page | **Azure**: App Service / Container Apps for the Streamlit app or a small Horizons proxy (Horizons sends no CORS header, tested), or Static Web Apps free tier for a static build. **GoDaddy/Porkbun** spaceapps.earth free domain (e.g. slipday.earth) + hosting for the static page. **Copilot Free** for UI scaffolding (disclose as SI use) |
| 2. + Lunar Shield | Same as 1 | + NOAA SWPC GOES integral protons JSON ; DONKI SEP/CME/IPS ; LOLA SKYV sky-visibility map (to validate our open-sky fraction) ; Phipps et al. LPSC 2024 (terrain shielding prior art) | + requests-cache | + Azure Functions timer to cache SWPC/DONKI every 15 min (avoids rate limits and outages during judging) |
| 3. Game | **DONKI**, **RadLab**, **NASA Open APIs**, **OSDR** (astronaut health findings), CSA STEM/food production toolkits | Could reuse the Idea 1 illumination engine for a real South-Pole "sunlight calendar" driving the power resource (a real differentiator) ; SWPC protons for the "today's real space weather" link | Phaser.js or plain JS/Canvas; Python for curating the embedded historic dataset | GoDaddy domain/hosting (browser-playable, no login, as the challenge asks) ; Copilot ; Azure barely needed |

## T4. MVP scope

| Idea | Must-have (by Sun 12:00) | Nice-to-have | Cut | Demo moment for 30 s video |
|---|---|---|---|---|
| 1. Slip Day | (a) ~12 curated sites + custom lat/lon. (b) Precomputed hourly table for each site over 2026-12 → 2028-12: Sun el/az, Earth el/az, sunlit flag, Earth-visible flag. (c) Per site×day metrics: sunlit % over a 14-day window, longest darkness (h), Earth-visible h, time to next sunset/Earthset, slope from DEM, simple solar-power estimate (vertical tracking panel ∝ visible-disc fraction). (d) GO / MARGINAL / NO-GO from **published thresholds** with a confidence = share of 9–25 points in the landing ellipse (±250 m, cf. IM-2 landing ~250 m off) that agree. (e) Site×date calendar heatmap; "slip launch by N days" control that re-ranks instantly. (f) Polar sky plot: horizon silhouette + Sun/Earth tracks for the chosen day. (g) "Validated vs NASA Mazarico map, r=0.98" badge | 5 m PGDA near-field DEM for the 6 PGDA sites ; Sun-disc partial visibility ; plain-language explainer mode for educators (template or LLM over computed facts) ; side-by-side 2-site compare ; Earth libration explainer animation ; static open-sky fraction column | LLM decision model ("Kev/Jev") ; 3D globe ; on-the-fly ray-casting in the browser ; thermal model ; relay-satellite comms | "Launch slips 3 weeks". Drag the slider and the heatmap reshuffles: Mons Mouton drops from GO to MARGINAL, a Shackleton-rim site becomes the best GO. Cut to the sky plot: the Sun skims behind a ridge and the Earth sinks below the horizon (libration). Caption: "every number from NASA LOLA + JPL ephemerides" |
| 2. + Lunar Shield | Everything in 1, plus a static "terrain open-sky fraction" column and a one-panel "today's space weather" (SWPC >10 MeV / >100 MeV vs S1 thresholds) labelled as *operations-time*, not planning-time | Safe-mode/restart hysteresis rule per asset, backtested on one historic event (e.g. 2024-05 SEP) | Directional anisotropic-SEP shielding (hypothesis only) ; ML forecasting | Same slip demo, then "...and today: proton flux 0.23 pfu, all clear" (live). Risk: two messages in 30 s |
| 3. Game | 1 outpost, 3 resources (power, life support, shielding), ~10 turns. A real DONKI event list (historic, embedded, attributed) triggers storms ; one "shelter vs keep power" trade-off ; end-of-game "what really happened" card with source | "Today's real space weather" button (SWPC live) ; real South-Pole sunlight calendar from the Idea 1 engine ; RadLab ISS dose comparison | Mars mode, food system, multiplayer, accounts | A kid's choice: "Shield up!" Power drops; storm hits (real 2024-05-10 event card); crew safe; "this really happened" |

---

## 1. Data access reality (verified today)

### 1.1 DEMs: what exists and which to use

| Product | Coverage / res | Size / format | Verdict |
|---|---|---|---|
| **LOLA GDR polar `LDEM_80S_80M`** http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/ | 80–90°S, 80 m/px, 7600×7600 int16, height = DN×0.5 m over a 1737.4 km sphere, polar stereographic | **115 MB IMG; downloaded in 6 s** | **Use as the primary horizon source.** It is big enough for distant ridges (shadows come from >100 km away) and small enough to sit in RAM |
| `LDEM_85S_20M` / `LDEM_85S_10M` / `LDEM_80S_20M` | 85–90°S at 20/10 m ; 80–90°S at 20 m | 460 MB / 1.84 GB / 1.85 GB | Optional near-field refinement |
| **PGDA 5 m site DEMs** (Barker et al. 2021) https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/ | Site01 connecting ridge, Site04 Shackleton rim, Site07 peak near Shackleton, Site11 de Gerlache rim, Site20 Leibnitz β plateau, Site23 Malapert massif. Each has height, slope, Z-uncertainty, slope uncertainty and 100 Monte-Carlo clones | ~41 MB GeoTIFF per layer (Site04 surf = 40,980,806 B) | Nice-to-have for near field, slope and **uncertainty-based confidence** |
| PGDA 5 m mosaic 87–90°S https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ | 5 m | ldem 3.3 GB, slope 4.9 GB | Too heavy for this weekend |
| PGDA SfS-enhanced DEMs https://pgda.gsfc.nasa.gov/products/104 | selected regions | – | Mention only |

### 1.2 Precomputed illumination: can we skip ray-casting?

- **Precomputed maps exist, but only as long-term averages.** The PGDA "Lunar Polar Illumination" product (https://pgda.gsfc.nasa.gov/products/69) is from Mazarico et al. 2011, updated in 2016.
  - It gives average Sun visibility, average Earth visibility and permanent shadow (LPSR) at 85S/60 m, 75S/120 m and 65S/240 m, plus sky visibility (SKYV, 65S/240 m).
  - The averages run over the 18.6-year cycle at hourly steps. They are **not date-resolved**, so they cannot answer the challenge's "which date" question.
  - **Gotcha:** the PGDA `.../data/MoonIllumination/*.TIF` and COG links return an HTML "PGDA – Not Found" page today (3789 bytes). **Use the imbrium mirror instead**, e.g. `AVGVISIB_85S_060M_201608.IMG` (51 MB), `..._EARTH.IMG` and `SKYV_65S_240M.IMG` (82 MB).
- **No downloadable per-site horizon-mask product found.**
  - JPL's Charles Lee "surrounding horizon masks" exist as a DataCite record (doi:10.48577/jpl.wmyxya), but we could not open it (certificate error) or confirm the files.
  - The LROC WAC illumination maps (https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_POLE_ILL_PCT_SOUTH) are one-year percentages.
  - QuickMap's Sun/Sky Visibility layers and the TerrainShadows app are interactive only.
- **Conclusion:** compute the horizon ourselves. Our test shows it is trivial: a 720 azimuth × 250 km ray march at 80 m steps takes **0.25 s per site in numpy**. Then use the Mazarico maps purely as **independent validation**.
- **Validation result (ours, 2026-11-14):**
  - Setup: 40 random points at 86–89.8°S. We took our sunlit fraction for calendar 2026 at 6 h steps and compared it with the Mazarico 18.6-yr average.
  - Result: **Pearson r = 0.977, MAE = 0.020**.
  - Bugs this caught: the projection sign (line = 3799.5 − y/80) and a m-vs-km site-vector mix-up.

### 1.3 Sun/Earth az/el from a lunar surface point: working calls

**JPL Horizons API (tested, works; output matched SPICE to 0.001°):**
```bash
curl -s -G "https://ssd.jpl.nasa.gov/api/horizons.api" \
 --data-urlencode "format=text" --data-urlencode "COMMAND='10'" \   # 10=Sun, 399=Earth
 --data-urlencode "OBJ_DATA='NO'" --data-urlencode "MAKE_EPHEM='YES'" \
 --data-urlencode "EPHEM_TYPE='OBSERVER'" --data-urlencode "CENTER='coord@301'" \
 --data-urlencode "COORD_TYPE='GEODETIC'" --data-urlencode "SITE_COORD='-129.78,-89.45,0'" \  # E-lon, lat, alt km
 --data-urlencode "START_TIME='2027-01-01'" --data-urlencode "STOP_TIME='2027-01-02'" \
 --data-urlencode "STEP_SIZE='6 h'" --data-urlencode "QUANTITIES='4,20'"   # 4=az/el, 20=range
```
Output row: `2027-Jan-01 00:00 *  32.902166  1.475710 ...` (Sun az 32.90°, el 1.48°). For Earth the same row gives az 136.92°, el −6.65°, i.e. Earth is below the horizon at that time.

Caveats:
- Horizons elevation is relative to the **smooth reference body**. Terrain is not included, so we must compare it against our horizon mask.
- **Horizons returns no CORS header**, so a browser cannot call it directly. Use a backend proxy or precompute.

**spiceypy (tested, identical numbers; ~45 MB of kernels, all HTTP 200):**
```python
import spiceypy as sp, numpy as np
for k in ['naif0012.tls','pck00011.tpc','moon_pa_de440_200625.bpc','moon_de440_250416.tf','de440s.bsp']:
    sp.furnsh(k)   # from https://naif.jpl.nasa.gov/pub/naif/generic_kernels/{lsk,pck,pck,fk/satellites,spk/planets}/
def azel(target, lon_e, lat, utc, h_km=0.0):
    site = np.array(sp.latrec(1737.4+h_km, np.radians(lon_e), np.radians(lat)))   # KM!
    st,_ = sp.spkcpo(target, sp.str2et(utc), 'MOON_ME', 'OBSERVER', 'CN+S', site, 'MOON', 'MOON_ME')
    p = np.array(st[:3]); up = site/np.linalg.norm(site)
    east = np.cross([0,0,1], up); east /= np.linalg.norm(east); north = np.cross(up, east)
    return np.degrees(np.arctan2(p@east, p@north))%360, np.degrees(np.arcsin(p@up/np.linalg.norm(p)))
```
- Kernel sizes: de440s.bsp 32.7 MB; moon_pa_de440_200625.bpc 12.9 MB.
- The LOLA DEM is in MOON_ME/DE421. The DE440 vs DE421 frame offset is metre-level, which is negligible here.
- Libration (Earth el swinging about ±7° at the pole) comes out of SPICE automatically, which answers the challenge's "libration" consideration.

### 1.4 What our engine already shows (good pitch material)

These are 14-day windows from `slip.py`, at 1 h steps with a 2 m mast, using the 80 m DEM:

| Site (coords) | open-sky | Jan 4 | Mar 5 | Jun 3 |
|---|---|---|---|---|
| Mons Mouton, IM-2 actual (84.7906°S, 29.1957°E) | 0.977 | Sun 28%, Earth 86%, max dark 241 h | Sun 30%, Earth 100% | Sun 40%, Earth 70% |
| Shackleton rim point (89.68°S, 166°W) | 0.917 | Sun 61%, Earth 30%, max dark 131 h | Sun 58%, Earth 68% | Sun 50%, Earth 29% |

**The point:** the trade-off flips with the date. That is exactly the "slip" story.

Caveats:
- The 14-day windows were not aligned to local sunrise. The product should align them, because landing at local sunrise is the real planning rule.
- Our "Malapert" coordinate fell in a shadowed pixel (0% sun), so site coordinates need care.

### 1.5 Candidate sites (verified where marked)

| Site | Lat, Lon (E+) | Source / status |
|---|---|---|
| IM-2 Athena actual, Mons Mouton | −84.7906, 29.1957 | Wikipedia mirror citing LROC. LROC gives the target as −84.78, 29.13 (https://www.lroc.asu.edu/images/1401). **Note: IM-2 went to Mons Mouton, not Shackleton ridge** (the ridge was an earlier plan). Puli Space's PLWS flew on IM-2, a good hook for the Puli CEO |
| Chandrayaan-3 (Shiv Shakti) | −69.3741, 32.32 | LROC https://www.lroc.asu.edu/images/1314 |
| Chang'e-6 | −41.6385, 206.0148 (=153.985°W) | LROC / NSSDC, ±30 m |
| Blue Ghost M1, Mare Crisium (near Mons Latreille) | 18.562, 61.810 | NSSDC / LROC |
| Chang'e-4 | −45.4446, 177.5991 | widely published LROC value (not re-fetched today) |
| Apollo 11–17 | NSSDC list https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html | Non-polar contrast cases; need a global DEM (or flat-horizon approximation) |
| Artemis candidate regions (9, Oct 2024): Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, Slater Plain | **No official coordinates published.** Digitize centres from the NASA map in QuickMap and label them "approx." | https://www.space.com/space-exploration/artemis/nasa-announces-9-possible-moon-landing-sites-for-artemis-3-lunar-mission |
| PGDA/Mazarico sites 01, 04, 07, 11, 20, 23 | Use the centres of the 5 m DEM tiles (GeoTIFF bounds) | https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/ |

- **Schedule context (useful for "slip" framing):**
  - In February 2026 NASA made Artemis III a LEO docking test and moved the first crewed landing to Artemis IV, targeting 2028. Source: Discover / satnews, e.g. https://satnews.com/2026/05/18/nasa-outlines-preliminary-artemis-iii-low-earth-orbit-test-flight-profile/
  - Blue Moon MK1 and IM-3 slipped into 2027 (secondary trackers, not checked against NASA's CLPS page).
  - **Re-label "Artemis III regions" as "Artemis crewed-landing candidate regions".**
- Polar DEM coverage: LDEM_80S covers ≥80°S only. Chandrayaan-3 (69°S) and non-polar sites need `LDEM_75S_*` or `LDEM_65S`, or a global LOLA/SLDEM product. Accept that for the MVP: list them, but run the full terrain horizon only for ≥80°S sites.

## 2. Prior art and competition (Creativity)

- **NASA tools that already do pieces of this** (the challenge itself names them as hard to use): QuickMap (Sun/Sky visibility layers, TerrainShadows), Moon Trek, Horizons.
- **Visualizations:**
  - SVS "Illumination at the Moon's South Pole 2023–2030" (frames only, no per-site CSV): https://svs.gsfc.nasa.gov/4930/
  - SVS 5228, Earth and Sun seen from the south pole: https://svs.gsfc.nasa.gov/5228
- **Academic site-trade work:**
  - Mazarico 2011; Barker 2021
  - JPL GSSR-based illumination and communications statistics
  - Georgia Tech "Sun and Earth Access Trades for Lunar South Pole Landing Site Selection"
  - AIAA-2010-8780 (STK + MATLAB site selection)
- **So "compute Sun/Earth at a site" is not novel.** Novelty is in:
  - (i) the **site × date matrix with instant re-rank on slip**, which is the challenge's own unmet need
  - (ii) **confidence from landing dispersion and DEM uncertainty**
  - (iii) published validation
- **Past Space Apps:**
  - No Global Winner on landing-site illumination found for 2023–2025.
  - 2023's two lunar winners (LunarTech Ensemble = Best Use of Science; Spacebee = Best Use of Technology) were both for the "Make a Moonquake Map 2.0" challenge: visualizing Apollo seismic data. https://science.nasa.gov/directorates/smd/2023-nasa-international-space-apps-challenge-announces-10-global-winners
  - That suggests clean, data-faithful lunar visualization does win.
  - 2025 winners included a satellite-internet concept and a space-biology knowledge engine (https://www.spaceappschallenge.org/2025/awards/global-winners/). We did not open the full list.
- **This is a new 2026 challenge, so expect many entries worldwide doing Horizons plus az/el plots.** Differentiate with the slip interaction, validation and confidence.
- **Lunar Shield prior art** (from 02-lunar-shield-science.md): terrain-shielding dose maps already exist (Phipps et al. LPSC 2024, LOLA 128 ppd). Live SEP status is SWPC/DONKI/ISEP territory.
- **Game prior art (Idea 3):** the challenge is beginner/youth. Many teams build outpost games, and 2023's Most Inspirational winner was an educational kids' tool.

## 3. Build plan for Idea 1 (about 60 person-hours available after video and submission)

**Stack:**
- Python precompute (numpy + spiceypy) → Parquet/JSON per site (hourly 2026-12..2028-12, ~17.5k rows × ~15 sites, a few MB).
- **Streamlit + Plotly** UI: everyone on the team writes Python, it gives the fastest path to a heatmap, polar plot and slider, and it deploys to Azure App Service or Streamlit Community Cloud.
- Alternative: a static Plotly.js page on spaceapps.earth hosting.
- A tiny FastAPI/Azure Function, only for "custom lat/lon", running the same engine (0.25 s horizon + vectorized SPICE). Or degrade custom sites to "smooth-Moon horizon via Horizons" with a clear label.

| Who | Sat 11–19 | Sat 20–24 | Sun 08–12 | Sun 12–15:30 |
|---|---|---|---|---|
| **Patrik** (architect) | Harden the prototype engine into a package: horizon (80 m + optional 5 m near field), hourly Sun/Earth flags, metrics; data contract (Parquet schema) | Batch precompute all sites; deploy | Integration, bug fixes, freeze at 12:00 | Submission form, repo README, SI disclosure |
| **Bence** (AI/DS) | Validation notebook (Mazarico r/MAE map; Horizons cross-check; SKYV check if Idea-2 column kept); landing-ellipse ensemble for confidence | GO/MARGINAL/NO-GO rule plus sensitivity (thresholds shown in UI) | Optional plain-language explainer (template first, LLM only over computed facts) | Video screen capture |
| **Yhair** (BI) | Streamlit/Plotly UI: site×date heatmap, ranking table with "slip N days" slider, compare view (his Power BI dashboard instincts fit; Power BI itself is not ideal for a public, no-login demo) | Polar sky plot (horizon silhouette + Sun/Earth tracks), time-to-sunset/Earthset tiles | UX polish, mobile check | Slides (≤7) |
| **Benedek** (geophysics, pitch) | Curate the site list (verify coordinates; digitize Artemis region centres in QuickMap; Moon Trek deep links); write the science panels (libration, grazing Sun, why 100 m matters, DEM uncertainty per Barker 2021) | Storyboard the 30 s video around the slip moment; draft the pitch | Rehearse; sanity-check the numbers against known facts (e.g. Shackleton rim high illumination, Haworth PSR) | Record voice-over and video |

- **Scoring rule (transparent, editable thresholds):**
  - **NO-GO** if longest darkness > battery-survivable hours (default 50 h) or if slope > 8° in more than 50% of the landing ellipse.
  - **MARGINAL** if Earth-visible < 50% of the window, or if time from landing to sunset is < 4 days.
  - Otherwise **GO**.
  - **Confidence** = agreement across the ellipse points (plus an optional DEM-clone spread for PGDA sites).
  - All defaults are labelled "assumption, user-adjustable". **Do not present them as NASA requirements.**
- **Stretch:** 5 m near field for the PGDA sites; sunrise-aligned windows; open-sky column; Apollo/global sites; an educator mode that animates libration.

## 4. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Grazing-Sun sensitivity: el ≈ 0–2°, so metre-level DEM errors and a point-Sun assumption flip flags | Model the Sun disc (±0.27°); ellipse ensemble; show confidence; cite Barker 2021 on DEM-error impact; Mazarico validation badge |
| Coordinate/projection bugs (we already hit two) | Keep the Mazarico regression test (r>0.95) in CI; cross-check 3 timestamps against Horizons |
| Horizons has no CORS and can be slow | Precompute; server-side proxy only for custom sites |
| DONKI/api.nasa.gov failures (DEMO_KEY hit OVER_RATE_LIMIT; kauai DONKI endpoint timed out at 60 s from our network today) | Ideas 2/3: register a free api.nasa.gov key; cache to file; ship an embedded snapshot labelled "archived" (challenge 3 explicitly allows this) |
| PGDA TIF/COG links broken today | Use the imbrium.mit.edu mirror (verified) |
| Artemis region coordinates not official | Label as approximate and digitized; show the region polygon or ellipse, not a pin |
| "Tools already exist" objection | Lead with the challenge's own words: existing tools are hard to use for *rapid scenario comparison*. Show the 3-second re-rank |
| Scope creep (LLM, 3D globe, radiation) | Hard cut list; freeze features at Sun 12:00 |
| Non-polar sites are outside the 80S DEM | MVP polar only; other sites flagged "smooth-horizon approximation" |
| SI disclosure (Copilot, LLM) | Disclose in the submission per the Project Submission Guide |

## 5. Recommendation

1. **Go with Idea 1, Slip Day, on challenge 11.** It is the only option that is both highly relevant (it hits every objective bullet) and highly valid: our working engine reproduces NASA's illumination map at r = 0.98. It also suits the jury: a space software engineer will value validation and determinism, and the Puli Space CEO will recognise Mons Mouton, the IM-2/PLWS site.
2. **Replace the LLM "Kev/Jev" verdict with a transparent threshold rule plus a landing-ellipse confidence.** An LLM may only rephrase computed facts for the educator mode.
3. **From Lunar Shield keep at most a static "terrain open-sky fraction" column** (same horizon mask, validated against LOLA SKYV) with the honest note that landing-grade sites are 92–98% open sky. Save live SEP and hysteresis for a future product or a separate event.
4. **Idea 3** only if the team specifically wants the youth/education angle. It is feasible but scores no better and fits the team's strengths less well.

### Key sources
- Challenge 11: https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/ ; Challenge 3: https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/
- LOLA polar GDR: http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/ ; illumination mirror http://imbrium.mit.edu/EXTRAS/ILLUMINATION/ ; PGDA products 69, 78, 81, 104: https://pgda.gsfc.nasa.gov/products/69 , https://pgda.gsfc.nasa.gov/products/78 , https://pgda.gsfc.nasa.gov/products/81 , https://pgda.gsfc.nasa.gov/products/104
- Horizons API: https://ssd-api.jpl.nasa.gov/doc/horizons.html ; NAIF kernels: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/
- SVS: https://svs.gsfc.nasa.gov/4930/ , https://svs.gsfc.nasa.gov/5228
- LROC: IM-2 https://www.lroc.asu.edu/images/1401 ; Chandrayaan-3 https://www.lroc.asu.edu/images/1314 ; WAC illumination https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_POLE_ILL_PCT_SOUTH
- SWPC protons JSON: https://services.swpc.noaa.gov/json/goes/primary/integral-protons-7-day.json ; DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI/ ; RadLab: https://visualization.osdr.nasa.gov/radlab/gui/data-api/
- Artemis restructure: https://satnews.com/2026/05/18/nasa-outlines-preliminary-artemis-iii-low-earth-orbit-test-flight-profile/ ; Artemis regions: https://www.space.com/space-exploration/artemis/nasa-announces-9-possible-moon-landing-sites-for-artemis-3-lunar-mission
- Puli PLWS on IM-2: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Snooping_science_on_the_Moon
- 2023 winners: https://science.nasa.gov/directorates/smd/2023-nasa-international-space-apps-challenge-announces-10-global-winners

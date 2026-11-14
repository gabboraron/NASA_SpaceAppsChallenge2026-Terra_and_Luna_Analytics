# Feasibility: "Moon Power Map", a solar-farm heatmap for the lunar south pole

*Prepared Sat 2026-11-14, about 11:00 to 12:30 CET. Deadline: Sun 2026-11-15 16:00 CET. Labels follow `research/00-methodology.md`:
[tested] = fetched or run today and it worked · [paper] = publication or official page · [computed] = our own calculation (method shown) ·
[estimate] = judgement · [unverified] = not confirmed.*

Test script (new, today): `scratchpad/solarfarm/heat.py`. It reuses the Slip Day horizon engine (`research/prototypes/slip-day/horizon.py`)
with the same LOLA `LDEM_80S_80M` DEM, the NAIF kernels and the Mazarico `AVGVISIB_85S_060M` map, all already downloaded in the scratchpad.

## 0. Bottom line

- **Build it as variant (b): the power layer of Slip Day.** Do not build it as a separate product.
  - Challenge 11 asks for "power generation potential" and says "Solar elevation angle is a key metric for power generation" (https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/ [paper], quoted verbatim in `research/01-hackathon-map.md` §4.11).
  - The same brief is about **sites × dates + Sun and Earth vs horizon + DTE comms**. A standalone area heatmap covers only the power half and has no date or comms axis, so it scores lower on Relevance.
- **The physics is simple and already runs.**
  - At a polar site the Sun stays within about ±2° of the horizon (±2.04° at 89.45°S, ±6.75° at Mons Mouton, 2027, from SPICE) [computed].
  - That means panels must be **vertical and rotate in azimuth**. Power ≈ 1361 W/m² × efficiency × visible solar-disc fraction.
  - The useful outputs are **average W/m², kWh/m² per day or month, and longest night → battery size**.
- **The new finding today: mast height is the big lever.** At the best grid pixel on the Shackleton–de Gerlache ridge:
  - the **longest night falls from 184 h at 2 m to 86 h at 10 m and 48 h at 20 m**
  - mean disc visibility rises from 0.80 to 0.89 to 0.92 [computed]
  - The 10 m result (3.6 days) matches NASA Glenn's "3-4 days of maximum continuous darkness" at 10 m (Fincannon, https://ntrs.nasa.gov/api/citations/20205002224/downloads/Lunar%20Environment%20and%20Lunar%20Power%20Needs_2.pdf [tested]).
  - NASA's VSAT program targets a ≥10 m mast (https://www.pv-magazine.com/2021/07/22/nasa-developing-10-kw-movable-pv-array-for-moon-mission [paper]).
  - So a "mast height slider" is both a real engineering lever and a striking demo control.
- **Caveat found today:** at fine scale our 80 m engine agrees only moderately with NASA's 60 m Mazarico map.
  - On a 12×12 grid at 500 m spacing on the ridge: r = 0.60, MAE 0.073 [computed]. The Slip Day check gave r = 0.977 on 40 points scattered across 86–89.8°S.
  - So use the **Mazarico 60 m map as the static "truth" heatmap**, and the own engine for **dates, months and mast height**, labelled at 80 m (or 20 m if time allows).
- **Prior art is strong.**
  - NASA already published a 30 m south-pole heatmap of average illumination and longest darkness at 10 m height (Fincannon, Fig. 1 [tested]).
  - Ross et al. 2021 quantified tower power (https://arxiv.org/abs/2102.11766 [tested]).
  - So the novelty has to come from **interaction** (date, month, mast height and slip, all re-ranked live) and possibly a **"partner site" map** (where a second array covers the first one's nights; Fincannon 2007: 0.71 → 0.84 illumination and 117 → 68 h of storage, https://ntrs.nasa.gov/citations/20080045536 [paper]).

---

## T1. Feasibility

| Idea | Challenge | Core NASA data (verified URL) | Data access effort (Low/Med/High) | Build effort (person-hours) | Feasible by Sun 16:00? (Yes/Partly/No) | Biggest technical risk |
|---|---|---|---|---|---|---|
| (a) Standalone solar-farm heatmap ("Moon Power Map") | 11 Lunar Landing Site Navigator (power half only); weak secondary: 3 Junior Astronaut (power budgeting) | Mazarico avg Sun visibility `AVGVISIB_85S_060M_201608.IMG` (51 MB) + `LPSR`, `SKYV` http://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/ [tested, listing 200 OK] ; LOLA `LDEM_80S_80M` (115 MB, local) and `LDEM_85S_20M` (460 MB, HEAD 200) http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/ [tested] ; NAIF kernels https://naif.jpl.nasa.gov/pub/naif/generic_kernels/ [tested by Slip Day] ; PGDA 5 m slope `Site01_final_adj_5mpp_slp.tif` (41 MB, HEAD 200) https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/ [tested] | **Low** (all data local or one download) | ~45–55 [estimate] | **Yes** [estimate] | Fine-scale accuracy: 80 m engine vs 60 m NASA map gives only r = 0.60 inside a 6 km box [computed]. Pixel-level "best farm spot" claims need the 20 m DEM or must defer to the Mazarico map |
| (b) Power layer inside Slip Day | 11 (full brief: sites, dates, Sun/Earth, power, DTE) | Everything in (a) plus the Slip Day stack: Horizons API https://ssd.jpl.nasa.gov/api/horizons.api [tested by Slip Day], Mazarico Earth-visibility map | **Low** | Slip Day core ~50–60 + power layer ~12–18 = **~65–75** [estimate] against ~68 available | **Yes for a minimal layer, Partly for the area heatmap** [estimate] | Scope: the team has ~68 person-hours. The area heatmap must be precomputed offline (one region ≈ 5–30 min on 10 cores [computed]) and frozen by Sat midnight, or it falls back to the static Mazarico map |

## T2. Judging score estimate (1–5 each) [estimate]

| Idea | Impact | Creativity | Validity | Relevance | Presentation | Total /25 | One-line rationale |
|---|---|---|---|---|---|---|---|
| (a) Standalone heatmap | 3 | 3 | 4 | 4 | 4 | **18** | Clear visual and real physics, but NASA has already published the same kind of map (Fincannon Fig. 1). It answers only the power half of challenge 11 (no dates as the main axis, no DTE comms) |
| (b) Slip Day + power layer | 4 | 4 | 5 | 5 | 4 | **21–22** | Turns Slip Day's "sunlit %" into the numbers an operator sizes hardware with (kWh/day, battery hours, mast height). It matches NASA's 10 m darkness figure and keeps the full site × date story. The mast-height slider adds a second striking interaction |

*Slip Day alone was scored 20 in `04-feasibility-slip-day-lunar.md`. Scores come from different agents, so a 1–2 point difference is noise (`00-methodology.md`).*

## T3. Resource mapping

| Idea | Listed challenge resource used | Other NASA/partner data | Open-source tools | Sponsor resources |
|---|---|---|---|---|
| (a) | **QuickMap**: compare our heatmap with its LOLA Sun-visibility layers, added 2020 (https://www.lroc.asu.edu/posts/1153 [paper]); **Moon Trek**: 3D deep links per farm candidate; **Horizons**: cross-check Sun el/az at 3 timestamps | Mazarico AVGVISIB/LPSR/SKYV (imbrium [tested]); LOLA LDEM 80 m/20 m; PGDA 5 m site DEM + slope + uncertainty (https://pgda.gsfc.nasa.gov/products/78 [tested]); LROC WAC one-year illumination % map, 100 m GeoTIFF (https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_POLE_ILL_PCT_SOUTH [tested]) as a second independent check | numpy, spiceypy 8.4 (in the scratchpad venv [tested]), rasterio, Plotly / Leaflet with a polar-stereographic image overlay, Streamlit | Azure: Container Apps or App Service for the app, Blob for precomputed tiles. Batch precompute runs locally (10 cores is enough), so no GPU or VM is needed. GoDaddy domain. Copilot for UI code (disclose) |
| (b) | Same as (a), plus Horizons as Slip Day's ephemeris check | Same plus Mazarico Earth visibility; NAIF de440s + moon_pa_de440 | Same as Slip Day: spiceypy, Plotly polar sky plot, calendar heatmap | Same as Slip Day; one Blob container for the per-region monthly power cubes |

## T4. MVP scope

| Idea | Must-have (by Sun 12:00) | Nice-to-have | Cut | Demo moment for 30 s video |
|---|---|---|---|---|
| (a) | Static heatmap: Mazarico 60 m × 1361 W/m² × efficiency (default 0.30, editable) → average W/m² per pixel, with a slope mask (> ~10° greyed out [estimate]). Click a pixel to get a monthly kWh/m² bar chart plus longest night (h) from our engine, for mast heights 2/10/20 m. Battery sizer: load (kW) × longest night → kWh and kg (specific energy editable). A "Solar real estate" stat box | Precomputed date-resolved monthly cube for 2–3 regions; LROC WAC map as a second validation; bifacial / fixed-panel comparison | Thermal model, cable routing, ML, 3D globe | "The Moon's best solar land at 85–90°S: under 1 km² gets > 70 % sun." Drag the mast from 2 m to 20 m and the longest night drops from 8 days to 2 |
| (b) | Everything Slip Day needs (see the Slip Day report T4). **Power layer:** per site × day, kWh/m²/day for a vertical azimuth-tracking panel, longest night in the mission window, battery kWh for a user-set load, and a mast-height selector (2/10/20 m). In the site detail view, a small **area heatmap** around the selected site (Mazarico static, plus our 10 m-mast monthly grid if precomputed) | "Partner site" map: for site A, colour every grid cell by the longest *joint* night if a second array stands there (an AND of two boolean time series; cheap once the series exist) | Same as (a) | "Launch slips 3 weeks → Mons Mouton drops to MARGINAL: longest night 25 days, battery 600 kWh per kW of load. Raise the mast to 10 m on the ridge → 3.6 days. NASA's own figure: 3–4 days." |

---

## 1. Fit with challenge 11 and with other challenges

- **Challenge 11** [paper, verbatim in `01-hackathon-map.md` §4.11]: "visualizing Sun and Earth positions relative to the horizon to assess **power generation potential** and direct-to-Earth communication windows". The considerations list says "**Solar elevation angle is a key metric for power generation**" and "consider how to represent steep slopes".
  - A power heatmap is clearly in scope.
  - But the brief's unit of analysis is a **landing site on a date**, not a farm area, and DTE comms count equally.
  - Variant (a) covers about half the brief. Variant (b) covers all of it.
- **How (a) differs from Slip Day:**
  - Slip Day = a few named sites × many dates → GO/NO-GO.
  - Solar farm = many pixels × aggregated time → energy yield.
  - They share 100 % of the engine (horizon mask + SPICE Sun vector). The only new code is the power formula, the longest-night search, the grid loop and the heatmap rendering.
- **Other 2026 challenges** [paper, `01-hackathon-map.md`]:
  - **3 Junior Astronaut** asks for "power budgeting" in a lunar outpost game. A real south-pole sunlight calendar from our engine could drive the power resource. This is a moderate fit, but the challenge is aimed at ages 7–12.
  - **13 Space Mission Design Game** lists power among its trade-offs. Weak fit.
  - **9 Earth analogs** lists "temperature, illumination, and environmental extremes". Weak fit (no Earth half).
  - **No 2026 challenge is about lunar power as such**, so challenge 11 is the right home.

## 2. Physics: from illumination to W/m², kWh and battery size

- **Sun geometry.** At the pole the Sun circles the horizon once per lunation (29.5 d), and its elevation varies with the 1.54° lunar obliquity plus the site's distance from the pole.
  - From SPICE for 2027, our sites span: −2.05…+2.04° at 89.47°S; −1.85…+1.84° at the Shackleton rim; −6.74…+6.75° at Mons Mouton (84.79°S) [computed, `heat.py`].
  - Fincannon also notes "the Sun elevation does not vary much from 0 deg ... for the entire year" [tested].
- **Panel orientation** [computed: ratio of normal-incidence flux to panel-plane flux]:
  - **Horizontal:** gets sin(el) ≤ sin 2° = 0.035 of the flux, so it is useless at the pole.
  - **Vertical, azimuth-tracking (one rotation per lunation):** gets cos(el) ≥ 0.999, so P ≈ S0·η·f_disc. This is the VSAT concept (a vertical array on a ≥10 m mast, about 10 kW class; https://www.pv-magazine.com/2021/07/22/nasa-developing-10-kw-movable-pv-array-for-moon-mission [paper]). A NASA Glenn design note quotes "~10 kWe class array (7 kWe operational) on a >10 m tower with shadow periods <100 hours" (NTRS 20230012849, https://ntrs.nasa.gov/api/citations/20230012849/downloads/GCD%20Annual%20Review%20VSAT%20September%202023%20Final.pdf [paper, via search snippet, PDF not opened]).
  - **Vertical, fixed (no tracking):** the mean of max(0, cos Δaz) over 360° is 1/π ≈ 0.32 of the tracking yield. A bifacial panel gets ≈ 0.64 (ignoring rear-side losses).
  - **Tilted toward the Sun:** this is the same as vertical, because the tilt from vertical equals the Sun elevation (≤ 2–7°).
- **Formula used in `heat.py`** [computed]:
  - `P(t) = S0 · η · f_disc(t) · cos(el(t))`, with S0 = 1361 W/m² (TSI ≈ 1360.8 W/m², Kopp & Lean 2011, https://doi.org/10.1029/2010GL045777 [paper]) and η = 0.30 [estimate: triple-junction space cells, beginning of life; make it a UI input].
  - `f_disc` = visible fraction of the Sun's disc above the local horizon, using the circular-segment area with solar radius 0.2665° (diameter 0.53°; Fincannon gives 0.52° [tested]).
  - S0 varies about ±3.4 % with Earth–Sun distance. We ignore this [estimate].
- **Energy:** kWh/m² per period = Σ P(t)·Δt. Annual kWh/m² = mean W/m² × 8.766 [computed].
- **Storage:** battery energy ≥ load × longest night (plus margin and depth-of-discharge).
  - Example: a 1 kW load at the 10 m ridge pixel (86 h) needs ≥ 86 kWh. At Mons Mouton (598 h) it needs ≥ 598 kWh [computed].
  - Mass needs a specific-energy assumption, e.g. ~150 Wh/kg at pack level → ~570 kg vs ~4 t [estimate; make it an input, not a claim].
  - Also count Earth eclipses of the Sun: "twice a year and last about 5 hours" (Fincannon [tested]).
  - Fincannon also warns that the darkness is intermittent, so recharge between dark spells matters, not only the single worst night [tested]. A simple state-of-charge simulation over the time series handles this, and it is cheap.

### What our engine produced today (`heat.py`, 1 year 2027 at 2 h steps, η = 0.30, vertical tracking panel) [computed]

| Site | Mast | Mean disc visibility | Longest night (h) | Mean W/m² | kWh/m²/yr |
|---|---|---|---|---|---|
| Ridge best pixel (−89.4733, −137.412) | 2 m | 0.797 | 184 | 325 | 2,853 |
| same | 10 m | 0.889 | **86** (3.6 d) | 363 | 3,182 |
| same | 20 m | 0.917 | 48 | 374 | 3,281 |
| Mons Mouton, IM-2 (−84.7906, 29.1957) | 2 m | 0.438 | 608 | 179 | 1,564 |
| same | 10 m | 0.446 | 598 | 182 | 1,594 |
| Shackleton rim point (−89.68, −166.0) | 2 m | 0.334 | 448 | 136 | 1,194 |
| same | 20 m | 0.489 | 388 | 200 | 1,749 |

- **Cross-checks:**
  - **10 m longest night 86 h vs Fincannon's "3-4 days" at 10 m** [tested]: consistent.
  - **2 m best pixel 0.80 vs the Mazarico map at the same pixel (0.863)** and vs Gläser et al. 2018 (77.1–88.0 % at 2 m for the best south-pole sites, https://elib.dlr.de/119091 [paper, via search snippet]): about 6–8 points low. This is consistent with an 80 m DEM smoothing the peaks [estimate].
- **The Mons Mouton contrast is the story:**
  - At a landing site of interest, a taller mast barely helps (0.44 → 0.45), because the Sun is blocked by large-scale terrain.
  - On the ridge, the mast is decisive.
- **Caveat:** the "Shackleton rim" coordinate is approximate (from the Slip Day site list) and is clearly not the optimal rim pixel. Do not quote it as "Shackleton rim illumination".

### NASA's static map: how much "solar real estate" there is [computed from `AVGVISIB_85S_060M`, 60 m pixels, surface level]

| Average disc visibility | Area at 85–90°S |
|---|---|
| > 50 % | 255 km² |
| > 70 % | **0.85 km²** |
| > 80 % | 0.07 km² (19 pixels) |
| > 90 % | 0 (max 0.884) |

- This gives a pitch line: "the best solar land near the south pole (> 80 % sun at ground level) would fit on about ten football pitches."
  - Footnote: this is at ground level. Elevated panels widen it a lot (Ross et al.: ~55 MW upper limit at > 70 % illumination for towers up to 20 m, https://arxiv.org/abs/2102.11766 [tested]).
- Maximum average power density at ground level = 1361 × 0.30 × 0.884 ≈ 361 W/m² [computed].

## 3. Data reality for ~20 hours

- **Reusable from Slip Day, unchanged** [tested by running it]: DEM loader, polar-stereo projection (sign bug already fixed), 720-azimuth horizon ray march, SPICE kernels and the Sun vector.
  - **New trick in `heat.py`:** one `spkpos` call per time step gives the Sun vector in MOON_ME (a year at 2 h = 4,380 steps in < 0.1 s). Per-pixel az/el is then pure numpy, because Sun parallax across a few km is negligible at 1 AU [computed].
- **Compute cost** [computed]: 0.27 s per pixel (horizon + 1 year at 2 h), single core, measured on 144 points.
  - 20 × 20 km at 200 m = 10,000 px ≈ 45 min on 1 core, ≈ 5 min on 10 cores.
  - The same area at native 80 m = 62,500 px ≈ 4.7 h on 1 core, ≈ 30 min on 10 cores.
  - Each extra mast height doubles or triples this.
  - Store monthly aggregates (12 × mean W/m², longest night) per pixel and height as small `.npy`/PNG tiles. Precompute for 2–3 regions only (ridge/Shackleton, Mons Mouton, Malapert or Nobile).
- **Is the precomputed product enough?**
  - **For a static annual-average heatmap, yes:** `AVGVISIB_85S_060M` (Mazarico 18.6-year average, surface level) × S0 × η gives the map instantly.
  - **It is not enough for** (i) dates or months, (ii) mast height, (iii) longest night. PGDA products 69 and 78 offer no darkness-duration or elevated-height download (https://pgda.gsfc.nasa.gov/products/69, https://pgda.gsfc.nasa.gov/products/78 [tested]; product 78 only *summarises* illumination at 1 m and 5 m for 2024–2026).
  - Note that the PGDA `.TIF`/COG links were broken earlier today; use the imbrium IMG mirror (see the Slip Day report) [tested].
- **Fine-scale accuracy** [computed]: on a 12 × 12 grid at 500 m spacing around the connecting ridge, our 80 m engine vs Mazarico gives r = 0.60, MAE 0.073, bias +0.017.
  - Likely causes [estimate]: 80 m vs the finer DEM behind Mazarico's 60 m map; 1 year vs 18.6 years; 2 m mast vs surface.
  - **Mitigation:** show the NASA map as the base layer and our numbers as "dates and mast-height scenario". If someone has time, rerun near field with `LDEM_85S_20M` (460 MB [tested]) and report the new r.
- **Slope/aspect:**
  - `np.gradient` on the DEM gives slope = atan(|∇z|) and aspect = atan2. At 80 m this underestimates local slopes.
  - For the six PGDA sites, use the 5 m slope GeoTIFFs (Site01 slope 40,980,776 B, HEAD 200 [tested]).
  - A farm-suitability mask needs a slope threshold. We found no published farm threshold, so use ~10–15° as an editable assumption [unverified].
  - Slip Day's landing rule uses 8° [estimate from that report].

## 4. Prior art (Creativity check)

- **Same map, already published:**
  - Fincannon (NASA Glenn), "Lunar Environment and Lunar Power Needs", Fig. 1: a south-pole region in 30 m cells, average annual illumination and longest continuous darkness, at **10 m height** [tested].
  - So a static "illumination/darkness heatmap" is **not novel**.
- **Science:**
  - Mazarico et al. 2011 (Icarus 211; https://ntrs.nasa.gov/citations/20120010094 [paper])
  - Gläser et al. 2014: longest darkness typically 3–5 days at the best spots (https://openpolar.no/Record/ftdlr:oai:elib.dlr.de:94240 [paper, snippet])
  - Gläser et al. 2018: 2 m panel height, 77–88 % (https://elib.dlr.de/119091 [paper])
  - Speyerer & Robinson 2013, persistently illuminated regions (Icarus 222, doi:10.1016/j.icarus.2012.10.010 [paper])
  - Ross, Ruppert, Gläser, Elvis 2021, "Towers on the Peaks of Eternal Light" (https://arxiv.org/abs/2102.11766 [tested])
- **Power-system siting:**
  - Raya-Armenta et al. 2023, multi-site PV lunar settlement (https://vbn.aau.dk/ws/files/539404522/1-s2.0-S0273117722011644-main.pdf [paper])
  - A 2023 microgrid sizing study with 10 m towers at 15 candidate sites [paper, snippet, same search; not opened]
  - Fincannon 2007: linking two sites ~10 km apart raises illumination from 0.71 to 0.84 and cuts storage from 117 to 68 h (https://ntrs.nasa.gov/citations/20080045536 [paper, snippet])
- **Hardware and programs:**
  - NASA VSAT (Astrobotic, Honeybee, Lockheed prototypes) [paper]
  - Astrobotic LunaGrid VSAT in TVAC in 2024; LunaGrid-Lite power transfer NET 2026 (https://www.astrobotic.com/lunagrids-vertical-solar-array-technology-enters-tvac/ [paper])
  - NASA 2022 base-camp concept: 40 kWe fission + 50 kWe PV (https://ntrs.nasa.gov/api/citations/20220005893/downloads/Power%20and%20Energy%20for%20the%20Lunar%20Surface.pdf [paper, snippet])
- **Tools:**
  - QuickMap Sun/Earth visibility layers and TerrainShadows (https://www.lroc.asu.edu/posts/1153 [paper])
  - LROC WAC one-year illumination % map (downloadable GeoTIFF [tested])
  - SVS illumination movies (see the Slip Day report)
- **LSIC power focus group:** not found in this search [unverified]. Do not cite.
- **Past Space Apps:**
  - 2021 "Find my Sun" (team "Solar Power", PUC Minas) built an **Earth** PV-siting heatmap from NASA POWER and was a **Global Nominee**, not a winner (https://2021.spaceappschallenge.org/challenges/statements/you-are-my-sunshine/teams/solar-power [tested]).
  - No lunar solar-siting Global Winner found in 2021–2025 (`03-past-winners.md`, search today) [unverified: search not exhaustive].
- **What is still open, and could be our angle** [estimate]:
  - (1) **Interactive** date, month and mast-height scenarios tied to landing dates (nobody offers this publicly; NASA's maps are static averages).
  - (2) A **partner-site / mini-grid map**: where a second array best covers the first one's nights. This connects to LunaGrid's power transfer and Fincannon 2007.
  - (3) A **battery-mass translator** for operators.

## 5. Pros and cons

**(a) Standalone heatmap**
- Pros:
  - Instantly visual; the Mazarico base map is ready now.
  - Easy to explain ("where would you build the Moon's solar farm?").
  - Fits the team's GIS/BI skills.
- Cons:
  - A static heatmap of this kind already exists (Fincannon Fig. 1), which caps Creativity.
  - Covers only the power half of challenge 11 (no DTE, dates secondary), which caps Relevance.
  - Fine-scale "best pixel" claims are fragile at 80 m (r = 0.60 vs NASA in a 6 km box).

**(b) Merged into Slip Day as its power layer**
- Pros:
  - Hits every objective in the brief, including "power generation potential" and "solar elevation angle".
  - Turns sunlit % into operator units (kWh, battery hours, mast height).
  - The 10 m darkness result matches NASA's published 3–4 days, which is a Validity badge.
- Cons:
  - Adds 12–18 person-hours on top of an already full plan.
  - More UI surface, so there is a risk of a cluttered 30 s video.
  - The area heatmap needs offline precompute, so custom areas cannot be live.

## 6. Build plan (variant b) and roles

- **Patrik** (Sat 13–20):
  - Turn `heat.py` into the `power` module: `P(t)`, kWh per day and month, longest night, a state-of-charge battery sim, mast heights 2/10/20 m. It uses the Slip Day site time series, so there is no extra SPICE work.
  - Overnight: precompute area grids for 2–3 regions on 10 cores.
- **Bence** (Sat 13–22):
  - Validation notebook: Mazarico grid comparison (target r > 0.8 with the 20 m DEM near field), LROC WAC check, the Fincannon 10 m cross-check.
  - Sensitivity of kWh to η and time step.
  - Optional partner-site map (joint-night AND).
- **Yhair** (Sat 14–24):
  - Heatmap panel (polar-stereo PNG overlay with Plotly/Leaflet, colour = W/m² or longest night).
  - Mast-height selector and battery sizer tiles inside the Slip Day UI.
- **Benedek** (Sat 14–Sun 12):
  - Physics explainer panel (why vertical panels; why the mast matters at the ridge but not at Mons Mouton).
  - Pitch line and video storyboard. Sanity-check numbers against Gläser and Fincannon.
- **Freeze at Sun 12:00.** If the area grid is not ready by Sat 24:00, ship the Mazarico static heatmap only, with the per-site power numbers from the engine.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Fine-scale disagreement with NASA's map (r = 0.60 at 500 m within a 6 km box) [computed] | NASA map as the base layer; our values labelled "scenario (80 m DEM)"; try `LDEM_85S_20M` near field; show the r value honestly |
| Point-like or grazing Sun flips light/dark | Already modelled as partial disc visibility (circular segment), which is better than Slip Day's binary flag |
| Over-claiming panel numbers (η, degradation, temperature, dust) | All inputs editable; label outputs "upper-bound beginning-of-life yield". η default 0.30 is marked as an assumption |
| "NASA already has this map" objection | Credit Fincannon/Mazarico on screen; differentiate on dates, mast height, slip and the partner-site map |
| Compute for big areas or more heights | Precompute 2–3 regions × 3 heights × monthly aggregates offline; ≈ 5–30 min each on 10 cores [computed] |
| Scope creep (thermal, cables, fission comparison) | Cut list; mention fission only as context (NASA 40 kWe + 50 kWe PV concept) |
| Approximate site coordinates (Shackleton rim point, Artemis regions) | Snap each named site to the local maximum of the Mazarico map within 1 km and say so |

## 8. Recommendation

1. **Do not run this as a separate idea.** Make it Slip Day's **power layer**. Challenge 11 names power generation explicitly, the code is ~90 % shared, and it raises Slip Day's Impact and Creativity without hurting Validity. Estimated 21–22/25 vs 18 standalone [estimate].
2. **Must-have:** per site × date kWh/m²/day, longest night, battery kWh for a given load, and a 2/10/20 m mast selector. **Nice-to-have:** a small area heatmap around the chosen site (Mazarico static first, our monthly grid if the precompute finishes Sat night) and the "partner site" map.
3. **Pitch hook:**
   - "The sunniest ground at the south pole would fit on ten football pitches."
   - "A 10 m mast turns an 8-day night into 3.6 days, the same as NASA Glenn's estimate."
   - "At Mons Mouton the mast doesn't help: that's why the date matters."

## Top sources to open first

1. [tested] NASA Glenn, Fincannon, "Lunar Environment and Lunar Power Needs" (30 m heatmap, 10 m height, 3–4 day nights, Sun disc 0.52°): https://ntrs.nasa.gov/api/citations/20205002224/downloads/Lunar%20Environment%20and%20Lunar%20Power%20Needs_2.pdf
2. [tested] PGDA Lunar Polar Illumination (Mazarico; product list) https://pgda.gsfc.nasa.gov/products/69 and download mirror http://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/
3. [tested] Ross et al. 2021, "Towers on the Peaks of Eternal Light": https://arxiv.org/abs/2102.11766
4. [paper] Gläser et al. 2018, illumination at the lunar poles, 2 m panels: https://elib.dlr.de/119091
5. [paper] Fincannon 2007, linked-site illumination and storage: https://ntrs.nasa.gov/citations/20080045536
6. [paper] Challenge 11 brief (power generation potential, solar elevation): https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/

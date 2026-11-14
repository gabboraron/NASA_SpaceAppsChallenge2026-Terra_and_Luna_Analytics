# Lunar Shield v2: lunar-mining customers + "Earth too": re-examination

*Prepared Sat 2026-11-14, 10:30–12:00 CET, for the Budapest team. Builds on `research/02-lunar-shield-science.md`, `02b-lunar-shield-data.md` and `04-feasibility-slip-day-lunar.md`. Those reports remain valid unless this one says otherwise (see §7).*

**Labels:**
- **[tested]**: fetched or run today, 14 Nov 2026.
- **[computed]**: our own calculation from data fetched today. Scripts are in `/private/tmp/claude-501/-Users-spatr-Documents-NASA/29e57abf-a334-40a0-9816-6142459d9c5c/scratchpad/scripts/` (`peaks.py`, `hyst2.py`, `crater_int.py`).
- **[paper] / [official]**: a source page or PDF we opened.
- **[estimate]**: AI judgement.
- **[unverified]**: seen only in a search-result snippet, or not opened.

---

## 0. Bottom line

**Team decisions of 14 Nov, reflected throughout this report:**
- **Challenge fit is accepted by the team.** We still name the best challenge and framing (§3), and note the research caveat once there. Fit is not used as the deciding factor in the scores or the recommendation.
- **Each operator decides how each robot reacts.** Lunar Shield delivers three things:
  - the event signal (forecast + S-scale)
  - the restart window
  - an operator-configured per-asset rule
- **It has no built-in hardware failure model.** So missing part-response data is customer-supplied configuration, not a blocker.
- **The build plan reuses** `research/prototypes/lunar-shield-ux/index.html` and `research/05-lunar-shield-architecture.md`.

1. **The business angle is real but thin.** It does not raise the judging score.
   - Long-lived robotic lunar assets are being funded now: two crew-capable LTVs (~$220 M each, delivery in 2028), three "Moon Base" lander missions, Firefly drones, and Interlune's goal of "high-volume, continuous excavation" with "a fleet of lunar rovers".
   - **We found no public statement from any lunar operator about space-weather-driven operations**, and no published price for any space-weather service.
   - On our estimate, a lunar-only market is well under USD 1 M/yr before ~2030.
   - Pitch it as an open capability ("LunaNet-style alert layer"), not a product. The Space Apps rules forbid promoting commercial services.
2. **The Earth angle is credible only as a lookup layer, not a "simulation".**
   - NOAA's official S/G/R scales already translate one event into Earth effects (HF polar blackout, SEUs, GNSS errors, aircraft dose).
   - Simulating grid currents, drag or GNSS errors in 20 hours is not credible.
   - **The strongest new finding** is that Moon and Earth impacts decouple [computed]. **The worst day on Earth is not the worst day on the Moon.**
     - May 2024 (Gannon storm): Earth Kp 9 (G5), but the Moon saw only an S2 proton event (207 pfu) and ~10 cGy of extra CRaTER dose.
     - January 2012: Earth only Kp 5 (G1), but the Moon saw 6,310 pfu and ~184 cGy of extra CRaTER dose, 18× more.
3. **Challenge.** The team accepts the fit; the research caveat is in §3.
   - Best textual fit: **ch 3**, which names DONKI and radiation shielding.
   - Best framing for the ops console as built: **ch 11**, as an "operational window" next to the challenge's own "time remaining before sunset or Earthset". That is, "time until safe restart".
4. **The restart-window differentiator survives a real backtest, but more modestly than the proposal implies** [computed, 6 historic events, GOES >10 MeV].
   - A "come back when flux drops below 10 pfu" rule restarts too early (red again within 24 h) **21 times**.
   - A hysteresis rule (enter at 10 pfu, leave only after 6 h below 5 pfu) cuts that to **2**, at the cost of **+27% downtime** (+208 h over 6 events).
   - A trivial 1-hour hold already cuts it to 6.
   - The 2 remaining failures are *new* injections (13 May 2024, 14 Nov 2025). Both were preceded by DONKI events that a watch rule could use:
     - **Nov 2025:** a CME at 1,081 km/s, 14 Nov 01:25, before the 06:00 restart. Then an X4.0 flare at N24W71, 07:44, i.e. **1 h 46 min before** protons crossed 10 pfu again at 09:30.
     - **May 2024:** flares from 13 May 08:06, ~6 h before red at 14:10.
     - This is a hindcast. DONKI CME analyses arrive with latency, so real-time warning would be shorter [computed + tested].
5. **Scores [estimate].** Fit is not the decider; Relevance is held at 3 per the team decision.
   - **Lunar Shield ops console** with real-event replay, operator-configured rules and the Earth tab: **18–19/25**.
   - Kids' replay-game variant on ch 3: 18.
   - Current leaders: Earth's Twin Finder 23, Research Navigator 23, Slip Day + Power 21–22.
   - **The remaining gap (~3–5) comes from Impact and Creativity**:
     - The market is small and pre-2030.
     - Forecasting and all-clear are owned by NASA, NOAA and CLEAR.
     - The restart gain is real but modest.
6. **Recommendation:** Lunar Shield is now a **defensible, buildable option** but **not the top scorer**.
   - If the team picks it, build the ops-console plan in §5. About 40% of the UI already exists in the prototype.
   - Lead with two moments: the real Nov 2025 second-wave replay, and "the worst day on Earth is not the worst day on the Moon".
   - Show the business canvas without prices.

---

## 1. Customers and business model

### 1.1 Who runs (or plans) long-lived robotic surface assets

| Operator / programme | What, when | Public word on radiation / space-weather ops | Source |
|---|---|---|---|
| NASA "Moon Base" Phase 1 (announced 24 Mar 2026; 10-year, 3-phase plan) | Moon Base 1: Blue Origin MK1 "Endurance" to Shackleton (CLPS). Moon Base 2: Astrobotic Griffin + Astrolab FLIP rover (slipped to Jul 2026). Moon Base 3: Intuitive Machines IM-3 | Article does not mention radiation or space weather | [official/news, opened] https://spacepolicyonline.com/news/nasa-awards-initial-moon-base-rover-and-lander-contracts/ |
| LTVs: Astrolab FLEX/CLV-1 ($219 M), Lunar Outpost Pegasus ($220 M) | Delivery by Blue Origin, $188 M, 2028. Crew-capable, but they operate robotically between crews | None found | same page [opened]; https://www.govconwire.com/articles/nasa-awards-3-spots-on-4-6b-lunar-exploration-vehicle-development-contract [unverified] |
| Firefly "MoonFall" drones (JPL, $75 M) | 3–4 drones at the south pole, 2028. Fly during lunar day, park, wake after night | Night survival discussed; radiation not | spacepolicyonline (above) [opened] |
| **Interlune** (helium-3) | Harvesting "will require a fleet of lunar rovers". Goal: "high-volume, continuous excavation" (with Vermeer). Excavator on FLEX studied with Astrolab (3 Mar 2026). Prospect Moon payload NET 2027–28; pilot plant ~2029 | **None** in the press release | [official, opened] https://www.interlune.space/press-release/interlune-and-astrolab-collaborate-on-technology-for-harvesting-resources-and-building-infrastructure-on-the-moon ; timeline [unverified] https://www.interlune.space/blog/excavate-sort-extract-and-separate-interlune-core-intellectual-property , https://www.geekwire.com/2026/interlune-nasa-contract-extract-helium-3-hydrogen-moon/ (403 to us) |
| Firefly Blue Ghost M1 (2025) | Carried RadPC, a COTS-FPGA computer that self-recovers from radiation faults | The design trend is **on-board autonomous fault recovery**, not ground-commanded safe mode | [official] via 02 report: https://aerospaceamerica.aiaa.org/whats-next-for-this-prototype-computer-that-survived-14-days-on-the-moon/ |
| ispace (Mission 3, 2026; "Lunar Connect" services) | Comms, PNT, SSA services | No radiation service mentioned | [official] via 02 report: https://www.ispace-inc.com/2026/03/27/ispace-announces-new-business-initiative-involving-commercial-lunar-satellite-services/ |
| Lunar Outpost MAPP (Artemis IV, DUSTER) | Characterises surface plasma and dust "driven by space weather" | Science, not operations | [unverified] https://www.exterrajsc.com/p/lunar-outpost-joins-artemis-iv-mission |
| China ILRS / Chang'e-8 (ISRU, 2028–29) | Robotic base phase ~2030 | — | [unverified] https://spectrum.ieee.org/china-aims-for-a-permanent-moon-base-in-the-2030s. **Not a target:** Space Apps T&C bar China affiliation (01-hackathon-map §2.1) |
| ESA ISRU demo / Argonaut | — | Not checked | [unverified] |

**Takeaways:**
- **Buyers will exist by 2028.** That means multi-week robotic operations at the south pole by several operators [official, above].
- **Operators are silent on radiation.** None of them publicly says it changes operations on space-weather forecasts. This repeats the evidence gap noted in 02 §C; we found nothing new.
- **Design trend:** Blue Ghost's RadPC points to radiation-tolerant hardware that recovers by itself. That works *against* a "remote shutdown" product and *for* an advisory "defer risky operations / restart window" product [estimate].

### 1.2 Market sizing (all low reliability)

| Figure | Value | Label |
|---|---|---|
| Space-weather services market 2025 (several market-research vendors; definitions differ) | USD 1.3–3.2 B (2025), ~9–12% CAGR | [unverified, paywalled marketing pages] https://www.gminsights.com/industry-analysis/space-weather-monitoring-market , https://marketintelo.com/report/space-weather-services-market |
| Lunar economy | PwC: ~USD 127 B/yr by 2050. Deloitte: USD 343–566 B cumulative to 2050 | [unverified, news] https://satnews.com/2026/03/03/pwc-projects-127-billion-moon-economy-by-2050-energy-infrastructure-cited-as-primary-bottleneck/ , https://fortune.com/2026/08/26/spacex-moon-musk-lunar-economy-566-billion-deloitte/ |
| Commercial space weather is "a thin market niche at the private revenue level"; "importance is outrunning monetization"; the government baseline limits the private premium | qualitative | [paper/analysis, opened] https://newspaceeconomy.ca/2026/04/08/commercial-space-weather-and-orbital-risk-intelligence-emerging-necessity-or-thin-market-niche/ |
| **Lunar-ops serviceable market 2027–2030** | Assume ~5–15 surface missions/yr × 1–3 months × USD 5–20 k per mission-month ≈ **USD 0.1–0.9 M/yr** | **[estimate]**. Isaacman's target of "10 CLPS missions a year for three years starting in 2027" is the upper bound (spacepolicyonline, opened) |
| Extreme-storm loss scenarios (grid) | Lloyd's: up to USD 2.6 T (2013 US scenario); 2.4 T over 5 yr (newer, global) | [unverified, scenario estimates] https://www.lloyds.com/insights/futureset/futureset-insights/systemic-risk-scenarios/extreme-space-weather/economic-impact |

### 1.3 Pricing benchmarks

- **No published price exists for any space-weather alert service** that we could find. Pricing is negotiated or bundled [unverified, search] (newspaceeconomy above).
- The **baseline data and alerts are free**: NOAA SWPC JSON [tested]; the NOAA Product Subscription Service for e-mail alerts (https://pss.swpc.noaa.gov [unverified]); NASA DONKI and the CCMC SEP Scoreboard [tested]; ESA SWE (free registration, 02b).
- Adjacent price points:
  - ExoAnalytic GEO object-tracking catalogue: USD 90 k – 1.36 M per month (https://exoanalytic.com/commercial-price-list/ [unverified, snippet]).
  - Pay-per-call space-weather wrappers: from USD 2 per 1,000 requests (https://apify.com/quiescent_zebrafish/space-weather/pricing [unverified]).
- **Plausible models** [estimate]: per-asset or per-mission-month subscription; integration and validation consulting per mission; per-event report for insurers; a free open-source core plus a paid hosted SLA.

### 1.4 Competitors / incumbents

| Who | What | Threat |
|---|---|---|
| NOAA SWPC | S/G/R scales, alerts, 3-day S1 probability, free JSON [tested] | Sets the free baseline for Earth |
| NASA SRAG + M2M SWAO + CCMC ISEP **SEP Scoreboard** | Crew-focused 24/7 analysis; >10 real-time SEP models; **all-clear field already in the JSON** (REleASE forecast issued 2026-11-13T20:47Z, `all_clear_boolean: true` [tested]) | Owns forecasting; we must consume, not compete |
| Michigan CLEAR center | All-clear forecasting; ran on Artemis II | Owns all-clear research (02 §B1) |
| ESA SWE Service Network | Spacecraft-operations ("SCO") services; free with login | Covers European operators. https://swe.ssa.esa.int/sco_services [unverified] |
| LunaNet "Space Weather Alerting Services" (LNIS Rev 5, §3.4.2) | Planned alerts to lunar surface users | **Future channel or competitor.** We could not read the section text [unverified] https://ntrs.nasa.gov/api/citations/20230012811/downloads/NASA%20TP%2020210021073%20Rev5.pdf |
| Mission Space (LEEMR, NASA ACO 2026) | Lunar charging/dust sensor, then a "platform" | Closest lunar entrant (02 §B5) |
| Lunar Station Corp (MoonStation) | Planning analytics incl. radiation | Planning-time, not ops (02 §B5) |
| SET, NWRA, Solar Terrestrial Dispatch | Commercial space-weather alerting/tailored services (listed on a NOAA page) | Earth-side incumbents (newspaceeconomy, opened) |

### 1.5 Business model canvas (draft)

Framing: an open capability / reference "B2B API". Use no brand names and no prices in the submission.

| Block | Content |
|---|---|
| Customer segments | (1) Robotic surface operators: landers, rovers, ISRU excavators, 2027+. (2) Payload teams on those landers. (3) Relay/comms providers who could carry alerts (LunaNet-style). (4) Later: small LEO operators and university cubesats (Earth mode). (5) Insurers (event forensics) |
| Value proposition | Turns free community forecasts (SWPC, DONKI, SEP Scoreboard) into three outputs: an **event signal** (forecast + S-scale), a **restart window**, and an **operator-configured per-asset rule**. Each operator sets its own limits per robot (safe/shutdown thresholds, hysteresis hours, CME hold), so Lunar Shield needs no hardware failure model. It is auditable and backtested on real events. "We don't out-forecast NASA" (02 §D4) |
| Channels | Open-source SDK and JSON schema (Scoreboard-compatible); plug-ins for mission-ops stacks (cFS / Space ROS topic); relay-provider integration |
| Customer relationships | Per-mission onboarding (asset profile: shielding g/cm², latch-up-sensitive parts, mission phase); post-event report |
| Revenue streams (future, not pitched) | Per-mission-month subscription; integration and validation services; event reports. Size: see §1.2 [estimate] |
| Key resources | Open data (NOAA/NASA, free); backtest library of historic events; validation code (sphinxval) |
| Key activities | Ingest and cache; rule engine; per-asset profiles; continuous re-validation each new event |
| Key partners | NASA CCMC/M2M, NOAA SWPC, ESA SWE (data); lander/rover integrators |
| Cost structure | Hosting (tens of USD/month on Azure; CLAUDE.md); 24/7 reliability engineering; liability; validation staff. Cost is dominated by people, not data [estimate] |
| Honest risk | Government data are free and keep improving. Operators build radiation tolerance into hardware. The market is small before the 2030s [estimate] |

---

## 2. Earth side: same event, Earth assets

### 2.1 What the same SEP/CME event does on Earth (official NOAA wording)

Source: NOAA scales, [tested] https://www.swpc.noaa.gov/noaa-scales-explanation

| Driver | Earth assets hit | Official effect text (abridged) |
|---|---|---|
| SEP ≥10 MeV, **S2** (≥100 pfu) | Aircraft at high latitude; satellites; HF | "Infrequent single-event upsets possible"; "Small effects on HF propagation through the polar regions" |
| **S3** (≥1,000 pfu) | Satellites, EVA crew, polar HF, navigation | "Single-event upsets, noise in imaging systems, and slight reduction of efficiency in solar panel are likely"; "Radiation hazard avoidance recommended for astronauts on EVA" |
| **S4** (≥10⁴ pfu) | Same, worse | "Blackout of HF radio communications through the polar regions and increased navigation errors over several days are likely" |
| CME → geomagnetic storm (Kp, G-scale) | Power grids (GIC), GNSS (ionosphere), LEO drag, HF | G-scale on the same page. Examples below |

**Documented Earth impacts (May 2024 and other events):**
- ESA/EUMETSAT, May 2024 [paper, opened: Tzamalia et al., SpaceOps 2025 #475, https://publications.spaceops.org/2025/download_by_id.php?id=0475]:
  - ESA missions showed "good resilience". There were "no major consequences reported in onboard electronics, navigation systems, or satellite communications".
  - LEO drag forced larger orbit-control manoeuvres. KANOPUS-V3 decayed up to 4× faster than normal (≈180 m/day per the paper's wording; check the unit in the original, Parker & Linares 2024, JSR 61(5)).
  - A Gaia CCD failed a few days after the storm (linked, root cause unclear).
  - MetOp SEM-2 went to red status (one of 4 times since 2012).
  - For 2003 the paper cites: 59% of GSFC science spacecraft affected, **SMART-1 had 3 engine shutdowns in lunar transfer orbit**, and Mars Express star trackers were unusable for 15 h.
- GNSS-guided farming in the US Midwest was disrupted on 10–12 May 2024. Tractors were off by ~3 m and John Deere said all brands were affected [unverified, news] https://www.space.com/the-universe/sun/wonky-row-crops-and-possessed-tractors-the-surprising-impact-of-solar-storms-on-modern-farming
- Aviation: the ICAO space-weather advisory service, run by three global centres (NOAA SWPC, PECASUS, ACFJ), covers HF, GNSS, radiation and SATCOM. Energetic protons can cause "complete loss of HF COM across polar caps" [unverified, official PDFs via snippet] https://www.bom.gov.au/aviation/data/education/space-weather-advisories.pdf
- Grid: the Québec 1989 blackout (6 M people, 9 h) and Malmö 2003 [unverified] https://www.lloyds.com/insights/futureset/futureset-insights/systemic-risk-scenarios/extreme-space-weather/economic-impact

### 2.2 Open data for a "one event, two worlds" view (all keyless)

| Layer | Endpoint | Status |
|---|---|---|
| SEP at Earth/Moon (GOES >10, >100 MeV), 2010→now | ISWA HAPI `goesp_part_flux_P5M` | [tested] |
| Lunar dose (LRO CRaTER), 2009→Oct 2026 | ISWA HAPI `CRaTER` | [tested] |
| Geomagnetic storm Kp per event | DONKI `GST` (new host) | [tested] |
| Event linkage FLR→CME→SEP | DONKI `SEP` / `CME`, `linkedEvents` | [tested] |
| Live S/G/R levels, alerts | SWPC `noaa-scales.json`, `alerts.json` | [tested] |
| HF absorption map (polar HF) | SWPC `text/drap_global_frequencies.txt` | [tested] |
| Aurora oval (GNSS/HF proxy region) | SWPC `json/ovation_aurora_latest.json` | [tested] |
| Kp history / Dst | SWPC `noaa-planetary-k-index.json`; HAPI `NOAA_KP_P3H`, `dst_final` | [tested] (listed in the catalog) |
| Satellite anomalies | NOAA "Satellite Anomalies Due to Environment" (1971→, legacy) https://catalog.data.gov/dataset/satellite-anomalies-due-to-environment1 ; ESA anomaly telemetry dataset https://zenodo.org/records/12528695 | [unverified]. Old or not space-weather-labelled. **Skip for the MVP** |

### 2.3 Our computed "two worlds" table

GOES >10 MeV and >100 MeV peaks, plus CRaTER (d1_2 detector) dose, are [computed] from HAPI. Kp is [tested] from DONKI GST.

| Event | >10 MeV peak (S-level) | >100 MeV peak | Earth max Kp (DONKI GST) | CRaTER peak / excess event dose | Who had the worse day? |
|---|---|---|---|---|---|
| 23–31 Jan 2012 | **6,310 pfu (S3)** @ 24 Jan 15:30 | 11.9 pfu | **5 (G1)** | 148 cGy/d / **~184 cGy** | **Moon** |
| 7–15 Mar 2012 | 6,530 pfu (S3) @ 8 Mar 11:15 | 69.3 pfu | 7 (G3) | 112 cGy/d / — | Moon |
| 4–14 Sep 2017 | 1,490 pfu (S3) @ 11 Sep 11:45 | 68.1 pfu | 8 (G4) | 55 cGy/d / **~86 cGy** (≈ 9 years of quiet-time dose) | Both |
| 10–16 May 2024 ("Gannon") | **207 pfu (S2)** @ 10 May 17:45 | 7.8 pfu | **9 (G5)** | 7.6 cGy/d / **~10 cGy** | **Earth** |
| 8–9 Jun 2024 | 1,029 pfu (S3) @ 8 Jun 08:00 | 8.9 pfu | 6 (G2) | 49 cGy/d / ~16 cGy | Moon |
| 10–15 Nov 2025 | 1,456 pfu (S3) @ 12 Nov 02:15 | 37.4 pfu | 8.67 (G4–G5) | 43 cGy/d / **~25 cGy** | Both |

Caveats:
- CRaTER d1_2 is the thinnest-shielded detector pair in lunar orbit. It is **not** the dose behind a rover's box: thicker shielding cuts SEP dose strongly (02 §A1: 21.8 cGy behind 10 g/cm² Al vs ~4,275 cGy behind 1 mm).
- "Excess" is the event integral minus the median of a quiet 10-day window before the event.
- The Nov 2025 event is **S3, not S4**: its 1,456 pfu peak is below 10⁴ pfu.

**Why the two worlds decouple** (physics: [paper], 02 §A2; S/G scales: [official]):
- SEP protons reach the Moon unshielded. Earth's magnetosphere keeps them out everywhere except the polar caps, which is why the S-scale effects are polar HF, aircraft and satellites.
- Earth's big effects (grids, GNSS, drag) come from the *geomagnetic storm* when the CME hits, typically 1–3 days later. On the Moon that matters little (Kp is "context only", 02b).
- So one eruption gives two different risk curves at two different times.

### 2.4 Is "one event, two worlds" credible in 20 hours?

- **Yes, as a replay plus translation:**
  - Historic event timelines (GOES, CRaTER, Kp) on one time axis.
  - Each Earth layer mapped to the official NOAA scale text, plus DRAP and OVATION snapshots for live "today".
  - The data are precomputable to static JSON; we fetched all of it today in under 1 minute per event.
- **No, as "predict and simulate better what will be affected" on Earth:**
  - GIC grid modelling, thermosphere drag or GNSS TEC error modelling each need validated physics models (SWMF, WAM-IPE) and asset data we do not have.
  - We cannot beat SWPC/ICAO on Earth impacts, and the judges would know it.
- **Say instead:** "the same eruption, translated into Moon and Earth consequences with NOAA's own scales". **Do not say "we predict Earth impacts better".**

---

## 3. Challenge eligibility (live re-check)

**Method:** we fetched the challenge pages with curl. They are Next.js pages, so we extracted the embedded text and keyword-searched it for `space weather | radiation | DONKI | solar activity`.

| Ch | Hits | Relevant quote (verbatim) | Fit for Lunar Shield v2 |
|---|---|---|---|
| **11 Lunar Landing Site Navigator** | **0** | "create an intuitive tool … to compare landing sites and dates quickly, visualizing Sun and Earth positions relative to the horizon to assess power generation potential and direct-to-Earth communication windows" | **No.** Radiation is outside the brief. A live SEP status is meaningless for a future landing date (agrees with 04-slip-day) |
| **3 Junior Astronaut Mission Trainer** | **27** | "lets kids ages 7–12 manage a lunar or Martian outpost, making real decisions about life support, **radiation shielding**, power budgeting…"; "to reinforce shielding against a radiation event at the cost of tonight's power supply"; "using **DONKI** to reflect actual solar activity and radiation risk"; "a **mission-control-style dashboard experience**"; plus, from the page (01 map): "linking a radiation-shielding decision to actual current space weather data" | **Yes, the only strong fit.** But the audience is kids, so the B2B/API pitch must stay invisible |
| 10 Martian Map | 3 | "the radiation environment on Mars differs from those of Earth, Earth-orbit, and the Moon, so you might include space weather data" | Partial, and only for **Mars**. It would be one layer of a navigation map (MSL RAD is in HAPI as `msl_rad_dosimetry` [tested in catalog]). Loses the lunar story |
| 13 Space Mission Design Game | 0 | "Random events or unexpected mission constraints"; "Mission dashboards showing real-time resource consumption" | Weak: space weather could be a random event, but the core is spacecraft/orbit/launch/budget design with up to 4 players |
| 2 Earth Trend Detective | 0 | (Earth-system trends) | No |
| 4 Health Monitoring | 6 (crew radiation, CSA dosimetry resource) | "Long-duration missions expose astronauts to space radiation…" | Off-team (medicine); robots ≠ astronauts |

**Research caveat (stated once):**
- On the text, ch 3 is the only page that asks for space weather.
- Ch 11's page never mentions radiation, and "must directly address one or more official Challenges" is a minimum eligibility rule (01 map §2.1).
- The team has accepted this fit (`DECISIONS.md`, 05 §9), so the rest of the report does not use fit as a deciding factor.

**Best challenge and framing:**
- **Ch 11, if the product stays the ops console (team choice).**
  - Frame it as the **operations-window layer** of site and date planning.
  - The challenge asks to "clearly communicate time remaining before sunset or Earthset, as this is critical operational information" (01 map, verbatim). Lunar Shield adds a third clock: **"time until safe restart"** after a solar storm, at the same south-pole sites (Mons Mouton, Shackleton).
  - Show the Sun/Earth context only as a site label, and do not claim landing-date ranking from SEP.
  - If Slip Day code is available, one shared site list makes the link concrete.
- **Ch 3, if the team prefers the strongest textual match.** Use the same engine with a kid-level "mission control" skin ("One Sun, Two Worlds"). The challenge explicitly allows a "mission-control-style dashboard experience".
- **Submission form:** if the form allows naming more than one challenge, list 11 and 3 [unverified: check the form].

---

## 4. Resources

### 4.1 Endpoints re-tested today (14 Nov 2026, ~10:40 CET)

| Endpoint | Result | Notes |
|---|---|---|
| DONKI new host `https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-06-15` | 200, 16 kB, 0.95 s [tested] | `linkedEvents` FLR→CME present. **New gotcha: max 60-day range** ("Date range cannot exceed 60 days", HTTP 400) [tested] |
| DONKI `GST`, `notifications` | 200 [tested] | Kp per storm; 8 notifications in the last week |
| SWPC `json/goes/primary/integral-protons-7-day.json` | 200, 1.7 MB [tested] | Now: >10 MeV = 0.20 pfu (09:30Z); 7-day max 0.48 pfu, so **quiet today: no live event for the demo** |
| SWPC `products/noaa-scales.json` | 200 [tested] | R0/S0/G0 today |
| SWPC `alerts.json`, `noaa-planetary-k-index.json`, `solar_probabilities.json`, `drap_global_frequencies.txt`, `ovation_aurora_latest.json`, `instrument-sources.json` | all 200 [tested] | Protons primary = GOES-18; electrons = GOES-19 |
| ISWA HAPI `CRaTER` (d1_2_dose_rate) | 200, 0.7 s [tested] | Hourly cGy/day |
| ISWA HAPI `goesp_part_flux_P5M` | 200 [tested] | 2010-04-14 → 2026-11-14T09:25Z; P1–P500 |
| ISWA HAPI catalog | 200, 327 datasets [tested] | Includes `SWMF2023_RT_MOON`, `NOAA_KP_P3H`, `dst_final`, `msl_rad_dosimetry` |
| SEP Scoreboard redirect `…/api/redirect?…dataID=1215` | **302** → JSON (use `curl -L`) [tested] | REleASE SOHO 30-min; `all_clear_boolean: true` |
| NOAA scales page | 200 [tested] | Official S/G/R effect text |
| SPE list (umbra) `https://umbra.nascom.nasa.gov/SEP/` | 200 [tested] | **Ends at 2017.** Use DONKI/GOES for 2018+ |

### 4.2 Open-source code

All from 02b §5–6 (stars/pushes as checked there):
- `hapiclient`: one client for GOES, CRaTER and Kp. Or use plain HTTP CSV as our scripts do.
- `ktindiana/fetchsep` (MIT): event detection and onset/end times.
- `ktindiana/sphinxval` (MIT): official SEP validation metrics (HSS, FAR, FAER).
- `sunpy`: optional.
- Plotly / Streamlit, or a static Plotly.js page.
- `foxglove-sdk`: optional "ops console" look.
- **Our three scripts** (stdlib + curl, ~40 lines each) already compute event peaks, CRaTER integrals and the restart backtest. Port them into `src/` as the event-library builder.

### 4.3 Papers on robotic hardware SEE / safe mode (verified in 02 or opened today)

- Dyer et al. 2004, SEU rates in the 2003 storms: https://lws-set.gsfc.nasa.gov/documents/credance/Dyer_2004.pdf [paper]
- Halloween 2003 review: 28+ spacecraft affected; anomaly rate peaks 4–5 days after onset; ~10× rise from 100→1,000 pfu. https://arxiv.org/pdf/2211.06775 [paper]
- Tzamalia et al., *May 2024 Space Weather Events and their Impact on Spacecraft Operations*, SpaceOps 2025 #475 [paper, opened today]. Covers ESA resilience, the Gaia CCD loss, MetOp red status, and SMART-1 engine shutdowns in 2003.
- Latch-up needs a power cycle: arXiv:2409.17056 ; NTRS 20010000406 [paper]
- Safe-mode cost and restart targets (Airbus FDIR; Sentinel-1): https://publications.spaceops.org/2025/download_by_id.php?id=0360 [paper, via 02]
- Event-end / decay: Kecskeméty et al. 2009 (two decay populations, ~30 h and ~55 h) https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2008JA013730 [paper, via 02]
- SEP model skill: Whitman et al. NASA/TP-20260000463 ("not yet sufficient for operational use") https://ntrs.nasa.gov/citations/20260000463 [paper, via 02]
- RadPC on Blue Ghost (autonomous recovery) [official, via 02]

### 4.4 Backtest events

Peaks are [computed] from GOES via HAPI. Cross-checks:
- **NOAA SPE list (umbra) [tested]:** Sep 2017 = 1,490 pfu, an exact match. Jan 2012 (6,310 pfu) and Mar 2012 (6,530 pfu) match values we know from that list, but were not re-read today.
- **DONKI SEP records [tested]:** Nov 2025 GOES >10 MeV onset 10 Nov 11:25 and second onset 14 Nov 09:20. May 2024 onset 10 May 13:35 and second injection 13 May 14:00.

| # | Event | Why it is useful |
|---|---|---|
| 1 | **23 Jan 2012** (6,310 pfu S3; CRaTER ~184 cGy) | Biggest lunar dose in the HAPI era, but a weak Earth storm (Kp 5): the decoupling example |
| 2 | **10 Sep 2017** (1,490 pfu; >100 MeV 68 pfu; GLE72; follows the 5 Sep event at 844 pfu) | Multi-event sequence: tests hysteresis and the "second CME" watch |
| 3 | **10–13 May 2024** (207 pfu S2; Kp 9 G5) | The famous Earth storm. A modest lunar event with a second injection on 13 May |
| 4 | **8 Jun 2024** (1,029 pfu S3) | A fast, clean single event (rise <6 h) |
| 5 | **10–14 Nov 2025** (1,456 pfu S3; >100 MeV 37 pfu; Kp 8.67; GLE; second X4.0 flare on 14 Nov per DONKI (X4.1 per SIDC)) | Most recent big event; both worlds; second wave |

### 4.5 Restart-rule backtest (our differentiator, measured)

All 6 events, GOES >10 MeV at 5-min resolution. A "premature restart" means a return to green followed by red again within 24 h. [computed]

| Rule | Premature restarts (sum) | Red hours (sum) | Comment |
|---|---|---|---|
| SWPC-like: red after 3 points ≥10 pfu, green at first point <10 | **21** | 765 | Flickers around the threshold |
| Same, but green only after 1 h below 10 | 6 | 793 | A trivial fix already helps |
| **Hysteresis: green after 6 h below 5 pfu** | **2** | 973 (+27%) | Remaining failures are new injections (13 May 2024; 14 Nov 2025) |
| Hysteresis, 12 h hold | 2 | 1,020 | Diminishing returns |

**Honest reading:**
- The restart logic is a tunable cost–loss trade-off, not a breakthrough.
- Catching new injections needs a flare/CME watch, i.e. a DONKI FLR/CME feed with an X-ray trigger.
- The figure to show judges is the trade-off curve: premature restarts vs downtime.

**Watch-rule hindcast (the two remaining failures)** [computed from GOES via HAPI + DONKI FLR/CME, tested]:

| Event | Hysteresis 6 h says GREEN at | DONKI signal before re-entry | Protons ≥10 pfu again | Lead from signal |
|---|---|---|---|---|
| Nov 2025 | 14 Nov 06:00 | CME 14 Nov 01:25, 1,081 km/s (before the restart); X4.0 flare at N24W71, 07:44 | 14 Nov 09:30 | CME hold would have blocked the restart; flare trigger 1 h 46 min |
| May 2024 | 13 May 04:20 | Flares from 13 May 08:06; CME 09:12 | 13 May 14:10 | ~6 h from the flare |

Caveats:
- This is a hindcast; DONKI analyses arrive hours late, so real-time lead times would be shorter.
- The CME direction was not checked.
- Use it as "the watch rule helps", not as a skill score.

---

## 5. Initial plan (Lunar Shield ops console; reuses the existing prototype and architecture)

### 5.0 What already exists (read today)

**`research/prototypes/lunar-shield-ux/index.html`** (419 lines, static HTML/JS, marked AI-assisted) has four tabs:
1. **Ops console**:
   - Sun–Earth–Moon scene, south-pole fleet map, flux chart with S-scale pill, probability, event log.
   - Per-asset advisory with decision history.
   - A **"Restart hysteresis" toggle**.
2. **"One event, two worlds"**: Moon assets vs Earth systems with S and G pills, using NOAA scale wording.
3. **API**: Ingest → Fuse → Translate → Restart → Audit, plus a live JSON alert.
4. **Business canvas**: with a price-tier card ("per asset / month: to be set").

**Gap:** all flux is **synthetic** (`flux(t)`, `kp(t)`, `FLARE_T`, `CME2_WATCH`, the banner says so).

**`research/05-lunar-shield-architecture.md`** already defines:
- the advisory state machine (CONTINUE/SAFE/SHUTDOWN, hysteresis, second-CME hold, stale-data fail-safe)
- the asset-profile JSON (`limits.safe_pfu`, `limits.shutdown_pfu`, `restart.hysteresis_h`, `restart.hold_on_cme`)
- the advisory JSON with `reason` and `sources[]`
- an MVP slice (§9) that says "replay mode on 2–3 real historic events… instead of the synthetic curve"

This report supplies those events (§4.4) and the backtest numbers (§4.5).

**So the build is mainly:**
- swap the synthetic model for a real event library
- make the per-asset rule editable
- add a backtest panel

The UI shell and story exist.

### 5.1 Target demo

- **Event signal:** pick a real event (Jan 2012, Sep 2017, May 2024, Jun 2024, Nov 2025) or "Live today" (SWPC; quiet today, S0).
  - GOES >10/>100 MeV and CRaTER dose replay on one time axis.
  - S-scale pill computed from flux.
  - DONKI flares and CMEs appear in the event log at their real times.
- **Per-asset rule (operator-configured):** each robot card gets an "Operator rule" editor with these fields:
  - safe pfu, shutdown pfu
  - hysteresis h
  - restart below pfu
  - CME hold on/off and speed threshold
  - "use >100 MeV channel" yes/no
  
  Defaults are labelled "example operator settings, not recommendations". **No part-failure model.** The engine only applies the operator's rule to the signal (team decision).
- **Restart window:** per asset, the earliest safe restart time and what blocks it (flux, hold timer, CME watch, stale data), as in 05 §6.
- **Backtest panel:** for the selected event and each asset's rule:
  - number of SAFE entries, premature restarts and offline hours
  - the same with hysteresis off (the toggle already exists)
  - the 6-event summary table from §4.5
- **Two worlds tab:** real Kp (DONKI GST) with S/G pills and NOAA effect text, plus the "worst day" comparison chart (§2.3).
- **API tab:** the live JSON advisory, now from the real replay, with `sources[]` URLs.
- **Business tab:** keep the canvas. **Remove the price-tier card in the public build** (no commercial promotion). Keep "capability / open core" wording and no brand names.

### 5.2 MVP

**Must (by Sun 11:00):**
1. `events.json` for 5 events, built by a script from HAPI + DONKI.
2. Loader replaces `flux()`/`kp()`.
3. Advisory engine per 05 §5 in JS, a direct port of `hyst2.py`.
4. Per-asset rule editor, 4–5 assets.
5. Restart-window display.
6. Backtest panel.
7. Real Earth tab.
8. Sources/credits in the UI.
9. Static deploy.

**Nice:**
- "Live today" tile (SWPC JSON; CORS OK per the 04 report).
- CME/flare watch rule (§4.5 hindcast).
- SEP Scoreboard all-clear shown as "NASA community view" next to our restart window.
- FastAPI endpoint `/v1/assets/{id}/advisory` on Azure Container Apps (05 §7).
- Audit hash on each advisory.

**Cut:**
- Forecast fusion/ML (05 F2: show Scoreboard values only).
- Part-response models (now customer configuration).
- Terrain shielding.
- Physical rover / ROS 2.
- Multi-tenant, auth.
- Prices.

**Freeze rules:**
- Feature freeze Sun 11:00.
- Number/content freeze 13:00: every number on screen must come from `events.json` or the backtest script, with the URL in `sources[]`.
- Video and slides locked 14:30.
- Submit by 15:30 (team cut-off 16:00).
- After 11:00, bug fixes only.

### 5.3 Hour-by-hour (from Sat 12:00; ~68 person-hours)

| Time | Patrik (architect) | Bence (AI/DS) | Benedek (geophys/pitch) | Yhair (BI/finance) |
|---|---|---|---|---|
| Sat 12–14 | Agree the `events.json` and asset-rule schema (= 05 §6); split prototype JS into `data.js / engine.js / ui.js` under `src/` | Turn `peaks.py` + `crater_int.py` into `build_events.py`: GOES P10/P100 5-min, CRaTER hourly, DONKI FLR/CME/SEP/GST (≤60-day windows) | Choose the 5 events and write one-line context and sources per event; check the S-levels | Mock the rule-editor and backtest panel in the existing style |
| Sat 14–18 | Replace `flux()/kp()/FLARE_T/CME2_WATCH` with the event loader and the real time axis | Port `hyst2.py` as `engine.js` (state machine + restart window); unit tests reproduce §4.5 numbers (21 → 6 → 2) | Earth tab texts from NOAA scales per event; "worst day" chart data (§2.3) | Rule editor wired to the engine; backtest panel table |
| **Sat 18–19** | **Checkpoint: Nov 2025 replays end to end with real data, editable rule, correct backtest numbers** | | | |
| Sat 19–24 | Deploy (Static Web Apps or GoDaddy); optional FastAPI advisory endpoint | CME/flare watch rule; "Live today" SWPC tile | Storyboard the video; draft 7 slides (science, honesty slide "we don't out-forecast NASA") | Business tab cleanup (no prices); credits page |
| Sun 08–11 | Integration, mobile, stale-data fail-safe | Number audit vs script output | Playtest with 2 outsiders: can they explain "restart window" after 1 minute? | Polish, accessibility |
| **Sun 11:00** | **Feature freeze** | | | |
| Sun 11–13 | README (components, data, licences), `AI_USAGE.md`, `DECISIONS.md` | Repro instructions for `build_events.py` | Voice-over; screen capture | Slides |
| **Sun 13:00** | **Content freeze** | | | |
| Sun 13–15:30 | Submission form, public-link check | Backup exports | Video edit (≤30 s, subtitles, SI watermark if any AI images) | Proofread, submit checklist |

### 5.4 30-second video (storyboard)

- **0–3 s:** Team and challenge.
- **3–10 s:** "11 Nov 2025: X5.1 flare." Real GOES flux climbs. The drill rig on Mons Mouton goes SAFE (operator rule: 30 pfu).
- **10–20 s:** **The single strongest moment.**
  - The flux falls, and a naive rule restarts the drill.
  - The DONKI log shows a 1,081 km/s CME, then an X4.0 flare on 14 Nov.
  - Protons cross 10 pfu again at 09:30.
  - Toggle the operator's CME hold on: the restart window stays closed and the drill rides it out.
  - Caption: "real NASA/NOAA data, real second wave".
- **20–26 s:** Two-worlds slider:
  - May 2024: Earth G5, Moon S2 (~10 cGy).
  - Jan 2012: Earth Kp 5, Moon ~184 cGy.
  - Caption: "The worst day on Earth is not the worst day on the Moon."
- **26–30 s:** "Operators set the rules. We supply the signal and the restart window." Then sources.

---

## 6. Feasibility and scores

### T1. Feasibility

| Version | Challenge | Data effort | Build (person-hours) | Feasible by Sun 16:00? | Biggest risk |
|---|---|---|---|---|---|
| **A. Lunar Shield ops console, real-event replay + operator rules + Earth tab** (team direction) | 11 (team-accepted; ch 3 as alternative) | **Low** (all endpoints tested; event peaks and backtest already computed) | ~50–60 (prototype shell exists; main work is data loader, engine port, rule editor, backtest panel) | **Yes** | Judges read it as "a dashboard over NOAA alerts" unless the restart-window backtest and second-wave replay are front and centre |
| B. Same engine, kids' "One Sun, Two Worlds" skin | 3 | Low | ~55–65 (new game UX) | Yes | No game designer; a new UI instead of reusing the prototype |
| C. Mission-design game with storm events | 13 | Low | ~65–75 | Partly | Space weather peripheral |

### T2. Judging estimate (1–5) [estimate]

Relevance is held at 3 for A, per the team decision; it is not used to rank.

| Version | Impact | Creativity | Validity | Relevance | Presentation | Total /25 | Rationale |
|---|---|---|---|---|---|---|---|
| **A. Ops console** | 3 | 3–4 | **4** | 3* | 4 | **17–18** (18 with the CME-hold moment working) | Validity rises because the hardware-model gap is gone (operator config) and the backtest is on real events. Presentation benefits from the existing polished prototype. Impact is capped: small near-term market; NOAA/NASA already alert. Creativity is capped: all-clear and restart are known needs (SRAG, CLEAR), and our gain is a modest trade-off |
| B. Kids' replay on ch 3 | 3 | 4 | 4 | 4 | 3 | 18 | Best textual fit; weaker reuse |
| *Earlier:* Lunar Shield solo (ch 11) / Shield game (ch 3) | | | | | | 17 / 17 | 04 reports |
| *Leaders:* Earth's Twin 23 · Research Navigator 23 · Slip Day + Power 21–22 | | | | | | | 04 reports |

\*Research view of Relevance for A on ch 11 would be 2 (§3), giving a total of 16–17.

Differences of 1–2 points are noise (00-methodology). A gap of 3–5 points to the leaders is probably real.

### Pros / cons (version A)

**Pros:**
- UI shell, story, architecture and data contract already exist.
- All data are keyless and tested today; event peaks, CRaTER integrals and the restart backtest are already computed.
- The operator-configured rule removes the weakest science claim (part-response modelling) and keeps liability with the operator, consistent with 05 §3.
- There are two strong, true demo moments.
- It plays to the team: architect, data scientist, geophysicist, BI.

**Cons:**
- Space is quiet today, so there is no live drama.
- The core function (alerting) is free from NOAA, and all-clear is on the SEP Scoreboard.
- Our restart improvement over a simple 1-hour hold is modest (6 → 2 premature restarts, for more downtime).
- The B2B story cannot be pitched as a product.
- Ch 11 relevance carries the caveat in §3.

### Risks and mitigations

| Risk | Mitigation |
|---|---|
| "It's just NOAA alerts with a UI" | Lead with the restart window and second-wave replay; show the backtest table and trade-off; show the Scoreboard all-clear next to ours ("we consume, not compete") |
| Judges see a business pitch (rule: no promotion of commercial products) | Remove the price-tier card; capability/open-core wording; no brands or prices; MPL-2.0 |
| Default operator thresholds look like safety advice | Label defaults "example operator settings"; the engine only applies the operator's rule |
| CRaTER dose ≠ robot dose | Label it "dose in lunar orbit, thin detector, context only". Rules act on GOES flux, which the operator configures |
| GOES (GEO) used as a Moon proxy | State it; cite Liuzzo 2023 (02 §A2): the magnetotail does not shield SEPs |
| DONKI 60-day limit / outages during judging | Precompute to static JSON; the live tile degrades to "data stale → SAFE" (05 N3) |
| Hindcast CME/flare watch overstated | Call it a hindcast; note DONKI latency; no skill score claimed |
| Scope creep (fusion/ML, FastAPI, auth) | Cut list §5.2; freeze 11:00 |

### Recommendation

1. **Lunar Shield is now a buildable, defensible option**, and the team's two decisions remove its two biggest objections. Expect **~18/25**.
2. **It still ranks below Earth's Twin Finder / Research Navigator (23) and Slip Day + Power (21–22)**, now mainly on Impact and Creativity rather than fit.
3. **If the team chooses it**, follow §5: real-event replay in the existing console, an operator rule editor, the restart-window backtest, and the Nov 2025 second-wave moment.
4. **If the team chooses Slip Day instead**, the cheapest reuse is an "after landing: operations" page with the Nov 2025 replay. Keep it out of landing-date ranking.

---

## 7. Where this report disagrees with earlier ones

- **02b §7 suggests training a LightGBM SEP model.** Cut it. SRAG's 2026 validation says models are not operational-grade, and real-event replay is more honest and more vivid.
- **The proposal, CLAUDE.md and 05 §5 call the restart logic "the main differentiator".** Measured on real events, hysteresis cuts premature restarts 21 → 2 for +27% downtime, but a 1 h hold already reaches 6. The CME/flare watch is what catches the rest. Present it as a validated, operator-tuned trade-off, not a breakthrough.
- **05 §4/§10 plans "per-part response models" in pilot phase 1.** Given the team decision, make them optional customer-supplied configuration, not a roadmap dependency.
- **05 §5 says "6 state changes without hysteresis and 2 with it" from the synthetic event.** Replace that with the real-event numbers (§4.5).
- **The prototype's business tab shows a price-tier card.** Remove it from the public build.
- **The Gannon storm (May 2024) is the wrong headline event for the Moon.** It was only S2 at GOES (207 pfu). For the lunar side use Jan 2012, Sep 2017 or Nov 2025, and use May 2024 for the Earth contrast.
- **Nov 2025 was S3 (1,456 pfu), not S4.** Do not repeat S4 claims.
- **The NOAA SPE list on umbra ends in 2017** (02b lists it as the canonical label set). For 2018+ use DONKI SEP or GOES via HAPI.
- **The DONKI new host has a 60-day maximum range**, not documented in 02b.
- **Versus 04-slip-day (Lunar Shield solo 17, game 17):** we put version A at 17–18.
  - The gains come from the team's operator-configured rule (Validity) and the existing prototype (Presentation).
  - Holding Relevance at 3 also helps, per the team decision.
  - That is within noise of the earlier score; it is not a reversal.

---

## 8. Top sources

1. NOAA SWPC scales (official S/G/R effects text) [tested] https://www.swpc.noaa.gov/noaa-scales-explanation
2. ISWA HAPI: GOES protons and LRO CRaTER [tested] https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/
3. DONKI API, new host [tested] https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-06-15
4. Space Apps ch 3 page [tested] https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/ ; ch 11 page (no radiation mention) [tested] https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/
5. Tzamalia et al., SpaceOps 2025 #475 (May 2024 impacts on spacecraft) [paper] https://publications.spaceops.org/2025/download_by_id.php?id=0475
6. SpacePolicyOnline, Moon Base rover and lander awards, 26 May 2026 [official/news] https://spacepolicyonline.com/news/nasa-awards-initial-moon-base-rover-and-lander-contracts/
7. Interlune–Astrolab press release, 3 Mar 2026 [official] https://www.interlune.space/press-release/interlune-and-astrolab-collaborate-on-technology-for-harvesting-resources-and-building-infrastructure-on-the-moon
8. "Commercial space weather … thin market niche?" (2026) [analysis] https://newspaceeconomy.ca/2026/04/08/commercial-space-weather-and-orbital-risk-intelligence-emerging-necessity-or-thin-market-niche/
9. CCMC SEP Scoreboard JSON (all-clear field) [tested] https://iswa.ccmc.gsfc.nasa.gov/api/redirect?timestamp=2026-11-14T00:00:00Z&search=lessThanOrEqualTo&dataID=1215
10. NOAA SPE list 1976–2017 [tested] https://umbra.nascom.nasa.gov/SEP/
11. LunaNet Interoperability Spec Rev 5 (§3.4.2 Space Weather Alerting) [unverified content] https://ntrs.nasa.gov/api/citations/20230012811/downloads/NASA%20TP%2020210021073%20Rev5.pdf
12. Whitman et al. 2026, SEP model validation [paper] https://ntrs.nasa.gov/citations/20260000463

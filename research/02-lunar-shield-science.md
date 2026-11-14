# Lunar Shield API: Science, Prior-Art and Credibility Review

*Research brief for the NASA Space Apps 2026 team. Compiled 2026-11-14 from web searches and fetched primary sources. Every claim carries a source link. Where I could only read a secondary source, an abstract or a conference slide, I say so. Numbers marked "derived" are my own arithmetic from cited values, not results from a paper.*

---

## 0. Executive summary (TL;DR)

1. **The real hazard is particles, mainly SEP protons, not flare photons.** For hardware, the threats are single-event effects (SEU/SEL) and the large total-dose step from a big SEP event. Surface and deep-dielectric charging is a secondary hazard. X-ray flare photons matter for unshielded EVA crew, not much for electronics. The steady GCR background is the bulk of long-term dose but is not an "event".
2. **Lead time is short and the forecasts are imperfect.** After an eruption, >10 MeV protons can arrive in under an hour. Time-to-peak ranges from about 1.7 h to more than 100 h. NASA SRAG's own 2026 validation says SEP models are "not yet sufficient for operational use" for warning time and skill. Peak-flux errors reach up to 2 orders of magnitude.
3. **Most of your stack already exists at agency level.** NASA SRAG, M2M SWAO, the CCMC SEP Scoreboard (ISEP), NOAA SWPC, ESA SWE/ASPECS and Michigan's CLEAR center (which ran on Artemis II) all exist. So do ML SEP and flare models, foundation models (Surya) and DEM horizon-shielding dose maps (Phipps et al., using LOLA). **Do not pitch any of these as new.**
4. **What is genuinely open:**
   - (a) A **machine-to-machine decision layer for robotic and commercial surface assets**, as opposed to crew. Nobody we found offers this as a product. The nearest are Mission Space (sensors plus planned platform) and LunaNet's planned "Space Weather Alerting Services".
   - (b) **Restart / all-clear logic with hysteresis.** SRAG's "Big Three" console questions include "How long will it last?". All-clear is an active research area (CLEAR center), and SWPC itself says confirming the end of an event can take hours. Event-end prediction is under-served.
   - (c) **Per-asset translation** from flux to effect. Few public tools do this.
   - (d) **Directional terrain shielding** of the *early anisotropic* SEP beam at polar sites. This is a physically motivated hypothesis I did **not** find tested in the literature.
5. **Reframe for credibility:** "We do not out-forecast NASA. We consume the community forecasts (SWPC, DONKI, the SEP Scoreboard) and turn them into asset-specific, auditable actions and restart windows. We validate them with SRAG's own metrics (SPHINX, FAER) on public benchmarks (GSEP, the SEPVAL dataset, the CLEAR benchmark)."

---

## A. Physics and reality check

### A1. What actually threatens lunar hardware

**SEP events (main acute threat).**
- Operations use two thresholds: >10 MeV ≥ 10 pfu (an "SPE", i.e. NOAA S1) and >100 MeV ≥ 1 pfu (an "energetic SPE"). SRAG watches the latter most closely for exploration.
  - CCMC ISEP page: https://ccmc.gsfc.nasa.gov/ISEP
  - SWPC GOES proton flux product: https://www.spaceweather.gov/products/goes-proton-flux
- Michigan's CLEAR center defines "All Clear" in two ways:
  - mission planning: >100 MeV flux ≤ 1 pfu
  - EVA: >10 MeV flux ≤ 10 pfu, with 6 h and 24 h forecast windows
  - Source: Zhao, *CLEAR Space Weather Center of Excellence: All-Clear SEP Prediction*, arXiv:2310.14677 (2023), https://arxiv.org/abs/2310.14677. The thresholds come from the search-result extract of the full text; the abstract page alone does not state them.
- SRAG's 2019 timing analysis covered 10 large SEP events, with dose computed behind 10 g/cm² Al:
  - time to peak flux ranged from **1.7 h** (2001-04-15) to **103 h** (2005-01-15)
  - the October 1989 event delivered **21.8 cGy** behind that shielding and took 26 h to peak
  - SRAG also notes that "SEPs can reach peak flux levels in < 5 hours"
  - Source: E. Semones (NASA JSC SRAG), *Operational Space Weather Forecasting Needs for Manned Exo-LEO Missions*, Space Weather Workshop, 2019-04-03, https://www.spaceweather.gov/sites/default/files/images/u59/02%20Eddie%20Semones%20Official.pdf

**Single-event effects (SEE).**
- During the 2003 Halloween events, several large SPEs approached or exceeded CREME96 worst-case SEU rates in DRAMs. The Guy Fawkes Day event was linked to an anomaly on WMAP.
  - Dyer et al., 2004, https://lws-set.gsfc.nasa.gov/documents/credance/Dyer_2004.pdf
- The CREME96 "worst week" model is based on October 1989 and is treated as a ~99%-confidence worst case.
  - TI application note SLVK046, https://ti.com/lit/slvk046
- Upset rates "may increase considerably during solar storms". One report found up to nine upsets per day in 2001 storms, against a baseline of about 0.25 per day per instrument.
  - Yearby et al., *Space Weather* 2014, https://eprints.whiterose.ac.uk/116286/1/Yearby_et_al-2014-Space_Weather.pdf
- **Latchup (SEL) is the destructive case.** Current limiting alone is not enough: the device must be power-cycled.
  - ISRO MOSFET latch-up protection circuit, arXiv:2409.17056, https://arxiv.org/abs/2409.17056
  - NASA NTRS SEAKR recorder note, https://ntrs.nasa.gov/api/citations/20010000406/downloads/20010000406.pdf
- This is the physical justification for a "shutdown or safe mode" action: lower activity during peak flux, and power-cycle discipline.

**Total ionizing dose (TID).**
- GCR background on the surface: Chang'e-4 LND measured 13.2 ± 1 μGy/h in silicon, of which 3.1 ± 0.5 μGy/h was neutral particles.
  - Zhang et al., *First measurements of the radiation dose on the lunar surface*, Science Advances 2020. Abstract via https://www.bexus.org/et/people/forstner/publication/zhang-2020-lnd-firstresults and https://www.sciencedaily.com/releases/2020/09/200926145212.htm
  - *Derived:* about 0.12 Gy(Si)/yr ≈ 12 rad/yr, which is small against typical krad-level TID tolerances.
  - A secondary news report gives 1,369 μSv/day dose equivalent: https://www.sci.news/space/radiation-dose-rates-lunar-surface-08893.html
- **One extreme SEP can dominate the TID budget.** Phipps et al. (2024) used the October 1989 spectrum on water targets behind 1 mm Al:
  - mean south-polar SEP dose of 4275 ± 301 cGy, maximum 4800 cGy
  - against GCR of only ~0.27 cGy per 30 days
  - Phipps, Stubbs, Looper, Spence, Townsend, *Maps of Primary Radiation Dose Around the Lunar South Pole*, LPSC 2024 abstract 1513, https://www.hou.usra.edu/meetings/lpsc2024/pdf/1513.pdf
  - *Derived:* that is ~43 Gy ≈ 4.3 krad(water) behind thin shielding, which is relevant to COTS parts. Shielding matters a lot here: SRAG's 21.8 cGy behind 10 g/cm² Al shows the difference.
  - Implication: a per-asset model must take a **shielding-depth parameter**.

**Surface charging and deep-dielectric discharge.**
- Plasma-sheet encounters can charge the shadowed surface to about −200 V to −1 kV. During large SEP events the nightside surface has been observed at **a few kV negative**.
- In permanently shadowed regions (PSRs), large SEPs could create subsurface fields ≥10⁶ V/m, enough for dielectric breakdown in the top ~mm.
  - Jordan et al., *JGR Planets* 2014 (LRO/CRaTER plus ACE/EPAM), abstracts via https://ui.adsabs.harvard.edu/abs/2014AGUFM.P11D..08J and https://core.ac.uk/download/72054604.pdf
- A 2026 preprint models the south pole. Potential reaches about −1000 V in the plasma sheet, with E-field rising from 0.1 V/m (solar wind) to about 5 V/m (plasma sheet).
  - arXiv:2607.13510, https://arxiv.org/pdf/2607.13510 (preprint, not verified beyond the excerpt)
- **Relevance:** this is a hazard for PSR rovers and for assets near the terminator. It is driven by plasma regime (magnetotail plasma sheet, SEP electrons), not only by proton flux. It would justify a separate "charging" risk channel.

**X-ray flares.**
- Flare photons arrive at light speed, ahead of particles.
  - NASA, *NASA watches Mars light up during epic solar storm* (2024), https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm
- Hard X-rays can give EVA astronauts acute doses. Smith & Scalo estimate a ≥0.1 Gy dose at about a 10% probability per 100 h of EVA, and note that heavy-element shielding is efficient against them.
  - Smith & Scalo, *Risks due to X-ray Flares during Astronaut EVA*, Space Weather 5, S06004 (2007), https://arxiv.org/abs/astro-ph/0701314
- I found **no source** showing flare X-rays as a significant electronics hazard on the surface. The hardware-damage anecdotes I found are all particle-driven:
  - Mars Odyssey's MARIE failed after the 28 Oct 2003 particle event: https://www.universetoday.com/articles/mars-odyssey-instrument-fails
  - Curiosity navcam "snow": https://www.inverse.com/science/nasa-curiosity-rover-cameras-capture-mars-radiation
- **Conclusion:** treat X-ray flux as a *precursor signal* for SEP risk and an EVA hazard, not as a hardware hazard. This is an inference from the absence of evidence, so flag it as such.

**CMEs at the Moon.**
- CMEs matter at the Moon mainly because their shocks accelerate the gradual SEP population, including the energetic storm particle (ESP) phase at shock arrival.
  - EUHFORIA+iPATH ESP modelling, A&A 2024, https://www.aanda.org/articles/aa/full_html/2024/01/aa47506-23/aa47506-23.html
- The geomagnetic-storm impacts (Kp/Dst) that dominate Earth space-weather products **do not apply on the lunar surface**. That is a point in favour of a lunar-specific product.

### A2. Moon in the solar wind vs. the magnetotail

- The Moon crosses Earth's magnetotail for roughly **4–6 days per month**. One source says 3–5 days.
  - ARTEMIS Science Nuggets 2021 (Liuzzo), https://artemis.igpp.ucla.edu/nuggets/nuggets_2021/Liuzzo/Liuzzo_21.html
- **The magnetotail does NOT shield SEPs.** Liuzzo, Poppe, Lee, Xu & Angelopoulos (2023) used Wind upstream and ARTEMIS in the tail for the June 2013 and September 2017 events. They found SEP ions above ~25 keV reach the Moon deep in the tail along field lines open at one end. This contradicts earlier claims that the tail shields up to 1 GeV.
  - *Unrestricted Solar Energetic Particle Access to the Moon While Within the Terrestrial Magnetotail*, GRL 50 (2023), doi:10.1029/2023GL103990, https://lukeliuzzo.github.io/files/Liuzzo_etal_2023.pdf and https://artemis.igpp.ucla.edu/nuggets/nuggets_2023/Liuzzo_23/Liuzzo_23.html
  - Caveat: the result rests on two events.
- A 2024 follow-up covers solar energetic *electron* access and "shadowing by the lunar surface".
  - https://katalog.lib.cas.cz/KNAV/EdsRecord/edsdoj,edsdoj.43d88a2b060346a2aa01e6b5430f5a09
- **Design implication:** do *not* lower SEP risk when the Moon is in the tail. *Do* raise surface-charging risk during plasma-sheet crossings, which ARTEMIS can observe.

### A3. Measured lunar radiation

| Platform | What it shows | Source |
|---|---|---|
| Chang'e-4 LND (surface, 2019–) | 13.2 ± 1 μGy/h (Si) total, 3.1 ± 0.5 μGy/h neutrals. GCR-dominated during solar minimum. Proton capability checked on a weak, impulsive SEP in May 2019 (≤ ~20 MeV) | Zhang et al. 2020 (above); LND SEP context: https://www.arxiv.org/pdf/2209.05831 and https://www.frontiersin.org/articles/10.3389/fspas.2022.974946/full |
| LRO/CRaTER (orbit, 2009–) | Dose tracks GCR modulation. The cycle 23/24 minimum likely had the highest lunar dose rates since the 1980s. The large SEP of 7 June 2011 was compared with EMMREM | https://arxiv.org/pdf/2104.07862 ; Schwadron et al. 2011, https://prediccs.sr.unh.edu/papers/schwadron2011JE003978.pdf |
| CRaTER, 21 Nov 2024 | A "surprise" SEP with no associated X-ray flare and no forecast CME, later attributed to a back-side source. This is an informal team mailing list, not a paper | https://lists.sr.unh.edu/pipermail/crater-team/2024-November/000298.html |
| Artemis I / Orion (HERA, EAD, M-42, CAD, MARE) | Up to 4× dose-rate differences by location in the shielded cabin. Reorienting during the belt pass cut dose by about 50%. Interplanetary GCR dose-equivalent rates up to 60% lower than previous observations | George et al., *Space radiation measurements during the Artemis I lunar mission*, Nature 634, 48–52 (2024), https://ideas.repec.org/a/nat/nature/v634y2024i8032d10.1038_s41586-024-07927-7.html ; DLR summary https://www.dlr.de/en/latest/news/2024/orion-spacecraft-radiation-protection-tested-initial-findings-from-artemis-i-moon-mission |

Takeaways from Artemis I:
- **Orientation and shielding geometry matter.** That supports a per-asset, geometry-aware model.
- Artemis I flew during low SEP activity, so it gives little SEP data.

### A4. Is terrain or crater-wall shielding physically meaningful?

**Yes, modestly, and it is already published.**

- A flat surface already blocks half the sky (2π). Terrain removes additional low-elevation sky.
- **Phipps et al., simple crater (NESF 2021).** They put Geant4 dose responses for water and Si targets behind Al shells on a 20 km Shackleton-like crater, computed the horizon solid angle per grid point, and scaled the October 1989 SEP dose.
  - Result: dose reduced by "**at least 40 percent** for regions inside craters" and "**at least 10 percent**" outside the rim.
  - The authors explicitly mention "route" choice and "contingency planning during surface operations".
  - https://ntrs.nasa.gov/api/citations/20210021039/downloads/Phipps_NESF_2021_abstract.pdf (also COSPAR 2022: https://ui.adsabs.harvard.edu/abs/2022cosp...44..310P/abstract)
- **Phipps et al., real terrain (LPSC 2024).** The same method on the **128 ppd LOLA DEM** within 10° of the south pole, including the Artemis III candidate sites. Results are given in §A1.
  - https://www.hou.usra.edu/meetings/lpsc2024/pdf/1513.pdf ; AGU 2022: https://ui.adsabs.harvard.edu/abs/2022AGUFM.P42C2429P/abstract ; LEAG 2022: https://www.hou.usra.edu/meetings/leag2022/pdf/5017.pdf
- **Burahmah & Heilbronn (2023), GCR only.** A 15 m deep crater-wall site gave about a 44.9% reduction; a 5 m depth about 10.7%.
  - *Comparison of Doses in Lunar Habitats Located at the Surface and in Crater*, Aerospace 10(11):970, https://mdpi.com/2226-4310/10/11/970
- **AGU 2020 Geant4 crater abstract.** Crater interiors reduced by almost 50%, outside the rim up to about 10%.
  - https://ui.adsabs.harvard.edu/abs/2020AGUFMP061...04P
- **Naito et al. (2020), pits and lava tubes, PHITS.** Surface GCR about 416 mSv/yr; a GLE-like SEP about 2190 mSv per event. A 43 m vertical hole gave <30 mSv/yr GCR; a lava tube gave <1 mSv/yr.
  - J. Radiol. Prot. 40:947, https://iopscience.iop.org/article/10.1088/1361-6498/abb120
- **Matthiä & Berger (2024), regolith shielding.** More than 4 g/cm² of regolith brings SEP dose below 30-day limits; more than 10 g/cm² gives a factor-of-two margin. Extra mass did not significantly reduce GCR dose.
  - *Radiation Exposure and Shielding Effects on the Lunar Surface*, Space Weather (2024), https://elib.dlr.de/210448/1/ME-SBA-2024-Matthi%C3%A4-Berger%20Radiation%20Exposure%20and%20Shielding%20Effects%20on%20the%20Lunar%20Surface-SPACE%20WEATHER.pdf

**Anisotropy (the interesting part).**
- Early in an SEP event, relativistic protons arrive as a narrow, field-aligned beam. Scattering then isotropizes the distribution over an event-dependent timescale τ. Initial anisotropy declines with magnetic connection angle.
  - *Connection-angle dependence of proton anisotropy in GLE events*, arXiv:2603.19953 (2026), https://arxiv.org/pdf/2603.19953
  - Aviation transport simulation, arXiv:1506.00825
- Strong anisotropy is usually seen only in early phases.
- **Hypothesis (not found in the literature I searched):** at polar sites the ecliptic, and hence the nominal Parker-spiral IMF direction, lies near the local horizon. The early field-aligned beam would therefore arrive at **low elevation** and could be blocked by terrain **much more** than the isotropic-average 10–40%.
  - This could be computed from the L1 IMF direction plus the LOLA horizon mask.
  - It is your most defensible *novel* physics twist, but present it as a hypothesis with a sensitivity analysis.
  - The early phase is also short (tens of minutes to hours), and the peak dose usually comes later, when the flux is more isotropic. So the dose benefit is likely limited to the onset phase.

**Bottom line for judges:**
- Terrain shielding is **real but second-order**, roughly 10–50% for isotropic flux.
- It is no substitute for mass shielding. Regolith of ≥4 g/cm² or a lava tube does far more.
- **Cite Phipps et al. as prior art** and say you operationalize their method per asset and per time step, not that you invented it.

### A5. Lead-time realities

- **Release and arrival.**
  - First relativistic protons are released ~5–30 min after the earliest flare photons: https://arxiv.org/pdf/1305.5593
  - In a multi-CME study, injection was 0.4–0.7 h after flare start: https://arxiv.org/pdf/1512.04881
  - Popular summaries from the CLEAR team say particles "usually arrive to Earth in less than an hour", which is less time than surface crews would need to shelter: The Conversation (2024), https://theconversation.com/space-weather-forecasting-needs-an-upgrade-to-protect-future-artemis-astronauts-224921
- **Nowcast-style warnings.**
  - REleASE exploits electrons arriving **~30–90 min** before protons: Malandraki et al., arXiv:2502.15555 (2025), https://arxiv.org/abs/2502.15555 ; HESPERIA page https://hesperia.astro.noa.gr/?p=2251
  - UMASEP-10 v2 reported an average warning time of **2 h 46 min** with POD 91.1% and FAR 12.8% (solar cycle 24, hindcast): JSWSC, https://www.swsc-journal.org/articles/swsc/full_html/2019/01/swsc180069/swsc180069.html
- **CMEs and ESP.** CME transit is typically one to a few days, but **I did not find a primary source pinning "1–3 days"** in my searches, so cite a CME arrival-time paper before using that number. The ESP peak at shock arrival is what makes the CME arrival time relevant to the *later* part of an event.
- **Pre-eruptive forecasting** (before any flare or CME) is where 24 h lead would come from. Its skill is much lower (see §B3).

---

## B. Existing operational and forecasting landscape

### B1. NASA / NOAA operations chain (crew-focused)

**SRAG (NASA JSC).**
- Monitors 24/7 during contingencies. Issues alerts to management and the flight control team, and tells the crew to move to shielded areas.
- On ISS the process "evolves over several hours with international coordination". SRAG says exploration "will require this process to be much faster".
- SRAG's **"Big Three" console questions**:
  - "Will there be an event? How intense will it be? **How long will it last?**"
- SRAG's required and target functionality includes an "**All Clear Forecast**" at 6/24/48 h, plus onset, peak, duration, time profile and dose.
- Source: Semones 2019 (above).

**M2M Space Weather Analysis Office (NASA GSFC).**
- Established in 2020. Provides 24/7 analysis to SRAG, re-measures CMEs for models, and supported Artemis I and II.
  - https://www.newswise.com/articles/providing-the-artemis-mission-with-solar-radiation-forecasts
  - AMS 2024 *Real Time Space Weather Analysis Developments at NASA*, https://ams.confex.com/ams/104ANNUAL/webprogram/Paper438494.html

**Artemis II (2026).**
- NOAA SWPC, SRAG and M2M were staffed around the clock.
- Orion crews build a stowage-bag shelter when **predefined dose-rate thresholds** are exceeded.
  - Space.com, https://www.space.com/space-exploration/artemis/how-the-artemis-2-astronauts-could-weather-a-solar-storm-during-their-moon-mission
- Michigan CLEAR supplied an **ML probability model** (daily, up to 24 h warning, per U-M press) and the **physics-based SOFIE**.
  - SOFIE simulated 4 days of SEP in ~5 h on 1,000 cores. Its earliest forecast came a few hours after CME onset.
  - CLEAR tools: https://clear.engin.umich.edu/sofie ; Liu et al., arXiv:2511.09716 ; U-M story: https://looktomichigan.umich.edu/stories/solar-radiation-forecasts/
- **Note:** the reaction is triggered by *measured* dose rate. The forecast is for situational awareness.

**ISEP / CCMC SEP Scoreboard.**
- ISEP is a collaboration of SRAG, CCMC and M2M. It has more than 10 SEP models running in real time across three scoreboards: probability, peak flux and time profile. All-clear is also displayed.
  - https://ccmc.gsfc.nasa.gov/ISEP ; https://ccmc.gsfc.nasa.gov/scoreboards/sep
- Validation uses **SPHINX** (open source, https://github.com/ktindiana/sphinxval) and VIVID.
- The scoreboard receives about 150,000 forecasts per month.
  - Whitman et al., COSPAR 2026 slides, https://ntrs.nasa.gov/api/citations/20260007046/downloads/COSPAR2026_20260807_Whitman_v2.pdf
  - Whitman et al., *Validation of SEP Forecasting Models for Space Radiation Operations with SPHINX and VIVID*, NASA/TP-20260000463 (2026), https://ntrs.nasa.gov/citations/20260000463

**NOAA SWPC.**
- Issues a 3-day probability of ≥S1 radiation storms, plus alerts, warnings and summaries.
- The end of an event is confirmed by a drop below threshold, which "**can sometimes take several hours to determine**". This is direct support for your hysteresis concept.
  - https://www.spaceweather.gov/products/goes-proton-flux ; 3-day forecast text: https://services.swpc.noaa.gov/text/3-day-forecast.txt
- Historical proton-forecast skill (prediction efficiency against climatology) fell sharply with lead time:
  - 2013: ~0.58 / 0.23 / 0.07 for days 1–3
  - 2012: ~0.57 / 0.27 / 0.14
  - some years were negative
  - https://content-drupal-swpc.woc.noaa.gov/sites/default/files/images/u2/test_stats_2013.pdf ; https://content-drupal-swpc.woc.noaa.gov/sites/default/files/images/u2/test_stats_2012.pdf

**Machine-readable feeds you can consume.**
- NASA DONKI API, with SEP, CME, FLR, IPS and notifications endpoints in JSON: https://ccmc.gsfc.nasa.gov/tools/DONKI
- SEP Scoreboard forecasts as JSON on iSWA, for example SEPSTER: https://iswa.gsfc.nasa.gov/iswa_data_tree/model/heliosphere/sep_scoreboard/SEPSTER/Parker/2024/12/sepster_20241226_0536_0849_Parker_Spiral_iss_20241226_1340.json
- SWPC JSON and text services.

### B2. Individual SEP forecasting models

| Model | Type | Notes / skill | Source |
|---|---|---|---|
| **UMASEP** (Univ. Málaga) | Empirical, post-eruptive (SXR + protons; magnetic-connection detection) | v2 hindcast POD 91.1%, FAR 12.8%, warning ~2 h 46 m. **Real-time scoreboard:** hit rate 69%, FAR 63%, HSS 0.46 | JSWSC 2019 link above; Whitman COSPAR 2026 |
| **REleASE / HESPERIA** | Electron-based nowcast (SOHO/EPHIN, ACE/EPAM) | ~30–90 min warning. Real-time: hit rate 88%, FAR 42%, HSS 0.70. REleASE+ adds type-III radio to suppress false alarms | arXiv:2502.15555 ; https://ccmc.gsfc.nasa.gov/models/HESPERIA_REleASE~v2 ; COSPAR 2026 |
| **SEPSTER / SEPSTER2D** | Empirical from CME speed and connection angle (Parker spiral); DONKI inputs | Many false alarms if triggered on every CME. Real-time hit rate 62%, FAR 64%, HSS 0.44 | https://ccmc.gsfc.nasa.gov/models/SEPSTER~v2 ; COSPAR 2026 |
| **MAG4** (UAH) | Pre-eruptive, magnetogram free-energy proxy | On the probability scoreboard. I did not retrieve skill numbers | https://ccmc.gsfc.nasa.gov/ISEP |
| **SPRINTS** | Pre-/post-eruptive (0–24 h) | In SEPVAL | COSPAR 2026 |
| **SAWS-ASPECS / PROSPER** (ESA; NOA-led consortium) | Probabilities and time profiles from flare and CME; pre-event and nowcast modes; >10/30/100 MeV | Operational status not verified | Papaioannou et al., JSWSC 12, A24 (2022), arXiv:2205.07325 ; ESA exec summary https://nebula.esa.int/sites/default/files/neb_tec_studies/2775/public/4000120480_EX.pdf |
| **MEMPSEP** (SwRI) | Ensemble CNN; probability of >10 MeV ≥ 5 pfu within 6 h of a flare; calibrated | Brier score 0.14 (test), 0.2 (SHINE 2022). Ensemble spread used as uncertainty | Chatterjee et al., Space Weather 2024, arXiv:2309.14570 |
| **SEPSAT, Lavasa, MagPy, UNSPELL, ADEPT, cRT+AEI0, MFLAMPA, ZEUS+iPATH, ENLIL+SEPMOD, STAT, SPREAdFAST, COMESEP, PPS** | Mixed ML, empirical and physics | All in the SEPVAL list (23 models) | COSPAR 2026 slide "SEPVAL Participants" |
| **AFRL PPS** | Empirical | Uses a **1/e decay function to predict end time**, relevant to restart | Whitman et al. 2023 review, https://sciencedirect.com/science/article/pii/S0273117722007244 |

**SEPVAL findings to quote to judges.** Source: Whitman, COSPAR 2026, and NASA/TP-20260000463.
- **Dataset:** 33 SEP events and 30 non-events. It is balanced, which is *not* climatological: https://zenodo.org/records/15555244
- **Post-eruptive vs. pre-eruptive:** "Post-eruptive models have much higher skill than pre-eruptive models."
- **False alarms:** "the median False Alarm Ratio for SEPVAL ranges from 0.03 – 0.46."
- **>100 MeV:** only half the models predict it. Skill there is lower and it is "lacking pre-eruptive models".
- **Peak flux:** it is "typical for peak flux to differ by more than an order of magnitude from observations". In the real-time scoreboard the error reaches "**up to 2 orders**", and models "do not capture event-to-event variability".
- **Real-time verdict:** "Model skill and availability (AWT) not yet sufficient for operational use."
- **New SRAG metric, FAER** = false alarms / (hits + misses). The goal is FAER ≤ 1. Real-time values: UMASEP 1.17, SEPSTER 1.11, REleASE 0.62.
- **Benchmark data:** the **CLEAR SEP Benchmark Dataset v2.0** (GOES 1986–2025): https://ccmc.gsfc.nasa.gov/swxcoe/clear/benchmark.php

Other references:
- **ML SEP review (2026):** Kasapis et al. (76 authors), *Review of Machine Learning Models for SEP Prediction*, arXiv:2606.19539, https://arxiv.org/abs/2606.19539. I only read the abstract, which gives no skill numbers.
- **Earlier comprehensive review:** Whitman et al., *Review of SEP Prediction Models*, Adv. Space Res. 72(12):5161–5242 (2023), https://researchwith.njit.edu/en/publications/review-of-solar-energetic-particle-prediction-models/
- **GSEP catalog (ML benchmark):** Rotti et al., arXiv:2204.12021. It has 341 events in v4.0, with 245 above 10 pfu; a later revision has 433. Harvard Dataverse doi:10.7910/DVN/DZYLHK.

### B3. ML flare forecasting from SDO/HMI: realistic skill

| Work | Data / method | Reported skill | Source |
|---|---|---|---|
| Bobra & Couvidat 2015, ApJ 798:135 | SHARP features, SVM (13 of 25 features) | Uses TSS. Exact value not verified in my fetch | https://ar5iv.arxiv.org/html/1411.1405 |
| Nishizuka et al. 2018 (Deep Flare Net), ApJ 858 | 79 features per AR, DNN | **TSS 0.80 (≥M), 0.63 (≥C)** | https://arxiv.org/abs/1805.03421 |
| Nishizuka et al. 2021, EPS (operational DeFN) | Chronological split | **TSS 0.70 (≥M), 0.59 (≥C)**. A 2024 poster reports 0.70/0.72 operationally for 2019–2023/6 | https://link.springer.com/article/10.1186/s40623-021-01381-9 ; https://ml-helio.github.io/Posters/Nishizuka.pdf |
| Liu et al. 2019 (LSTM), ApJ 877:121 | 25 SHARP + 15 history features | Not retrieved. Jin & Liu found that skill **varies substantially with which years are used for train/test** | https://web.njit.edu/~wangj/LSTMpredict/ ; https://arxiv.org/pdf/1912.00502 |
| Full-disk CNN (Pandey/Aydin group) | Full-disk HMI magnetograms | **TSS ~0.51–0.54, HSS ~0.37–0.38 (≥M)** | https://paperswithcode.com/paper/exploring-deep-learning-for-full-disk-solar |
| Riggi et al. 2025 | SigLIP2 / VideoMAE / Moirai2 transformers | TSS ~0.60–0.65 (image/video); **0.74 for time series on GOES XRS alone** | https://arxiv.org/abs/2510.23400 |
| **Surya** (NASA IMPACT + IBM, 2025) | 366M-parameter foundation model on 9 years of 4096² SDO data; open (Apache-2.0, Hugging Face) | Press: "16% improvement" in flare-strength forecasting and ~2 h spatial lead. **No TSS on the abstract page** | Roy et al., arXiv:2508.14112, https://arxiv.org/abs/2508.14112 ; https://www.infoq.com/news/2025/08/surya-model-heliophysics |
| Leka et al. 2019 (operational comparison, 19 methods, 2016–2017) | Benchmark | "No single winner". Ranking depends on event definition and metric | ApJS 243:36, https://arxiv.org/abs/1907.02905 |
| Barnes et al. 2016 ("All-Clear" workshop) | 11 methods, MDI data | Only **weakly positive skill for ≥M**, none much better than climatology | ApJ 829:89, https://arxiv.org/abs/1608.06319 |

**Honest read:**
- Published TSS for ≥M flares falls between about 0.5 and 0.8. Results drop with chronological splits and operational use.
- **Flare forecasts are not SEP forecasts.** Only a small fraction of flaring active regions produce SEPs.
  - Kasapis et al. 2024 report SEP-from-AR accuracy of about 0.7 ± 0.1 and suggest a limit to what SHARP/SMARP features can do: https://arxiv.org/abs/2403.02536
- Back-side events produce SEPs with no visible flare (CRaTER, Nov 2024).
- A hackathon CNN on magnetograms will at best reproduce published baselines.

### B4. ESA and international

- ESA's Space Weather Service Network has 5 Expert Service Centres, including Space Radiation. A 2025 SpaceOps paper describes it as pre-operational.
  - https://publications.spaceops.org/2025/download_by_id.php?id=0528
- Planned or ongoing components:
  - ESA **ERSA** on Gateway, with an SREM detector covering 11–250 MeV
  - a planned UMASEP-based >30 MeV forecast module
  - NASA will keep using SWPC for core Gateway forecasts
  - https://ntrs.nasa.gov/citations/20230015711
- The ESA workshop of February 2026 had a session on "SEP monitoring and forecasting for the Moon and Mars".
  - https://indico.esa.int/event/604/sessions/2525/session-timetable.pdf

### B5. Commercial and "lunar space weather as a service"

- **Mission Space.** NASA ACO selection, June 30, 2026, with GSFC, for **LEEMR**, a real-time lunar electrostatic, dust and charging monitor. The company calls it "the first step" toward a "real-time space environment platform for lunar surface operations". No API and no customers are named. This is the **closest competitor or partner**.
  - https://www.prnewswire.com/news-releases/mission-space-selected-by-nasa-to-advance-lunar-environmental-monitoring-technology-302814728.html ; https://www.mission.space/
- **Lunar Station Corp.** MoonStation analytics platform, August 2026, integrating NASA datasets on terrain, thermal flux and radiation levels. This is planning-oriented, not real-time.
  - https://satnews.com/2026/08/13/lunar-station-corp-integrates-nasa-datasets-to-model-commercial-surface-infrastructure/
- **Space Environment Technologies (SET).** ARMAS dosimetry for aviation and space, cloud data apps, and an orbit unit flown in 2021. Not lunar-specific.
  - https://spacewx.com/mission
- **ispace Lunar Connect.** Communications, PNT, observation and SSA, announced March 2026. No radiation service mentioned.
  - https://www.ispace-inc.com/2026/03/27/ispace-announces-new-business-initiative-involving-commercial-lunar-satellite-services/
- **LunaNet.** The Interoperability Specification v5 (February 2025) has a "Space Weather Alerting Services" section, and alerts sent directly to surface users are a stated goal.
  - https://ntrs.nasa.gov/api/citations/20230012811/downloads/NASA%20TP%2020210021073%20Rev5.pdf ; https://phys.org/news/2021-10-lunanet-empowering-artemis-interoperability.pdf
  - **This is strong framing:** Lunar Shield could be a prototype *LunaNet-compatible* alert consumer and producer.
- **Not verified:** I did not find lunar-specific products from Tomorrow.io, Spire, Kayhan, Cognitive Space or ExoAnalytic. Do not claim they have or lack such products without checking.

---

## C. Rover and spacecraft safe mode and restart practice

**Lunar landers and rovers.**
- **Chang'e-4 / Yutu-2:** dormancy is driven by **lunar night, power and thermal**, not radiation. Wake-up is triggered autonomously by **solar elevation angle**. A radioisotope heat source supports night survival.
  - https://english.spacechina.com/n17212/c2485068/content.html ; https://www.leonarddavid.com/chinas-farside-exploration-lander-and-rover-resume-work/
  - **Analogy:** wake on "sun elevation > X". Lunar Shield proposes wake on "flux below Y for Z hours", which is the same pattern.
- **Firefly Blue Ghost M1 (March 2025):** 14+ days of surface operations, with surface commissioning by subsystem health checks. It carried **RadPC**, a radiation-tolerant computer built from redundant COTS FPGAs that recovers from radiation faults. RadPC survived the Van Allen belts, transit and the surface, and kept running into lunar night.
  - https://www.nasa.gov/blogs/missions/2025/03/02/nasa-science-touches-down-on-moon-aboard-firefly-aerospace-lander ; https://aerospaceamerica.aiaa.org/whats-next-for-this-prototype-computer-that-survived-14-days-on-the-moon/
  - The trend is **autonomous on-board fault recovery** rather than ground-commanded safe mode.
- **IM-1 Odysseus (February 2024):** its anomalies (tipping, the laser-altimeter workaround) were not radiation-related.
  - https://techcrunch.com/2024/02/23/quick-thinking-and-a-stroke-of-luck-averted-a-moon-lander-disaster-for-intuitive-machines
- **VIPER:** revived, with delivery by Blue Origin Blue Moon. Reports conflict on 2027 (MK1) vs. 2028.
  - https://www.astronomy.com/space-exploration/nasa-revives-viper-moon-rover-taps-blue-origin-for-lunar-landing/
  - I did **not** find public documents on VIPER's radiation FDIR.
- **Not found:** no public evidence that any commercial lunar lander or rover changes mode based on *space-weather forecasts*. This is an **evidence gap**, not proof of absence.

**Precedents from deep space and Earth orbit.**
- In the Halloween 2003 events, at least **28 spacecraft** had problems: star-tracker saturation, instrument switch-off, CPU resets. Many were **intentionally put into safe mode**, including five NASA Earth-observation spacecraft. JAXA's DRTS (Kodama) went into safe mode during the S4 storm.
  - Summary: https://arxiv.org/pdf/2211.06775 ; Dyer 2004
- Anomaly statistics: in high-altitude, high-inclination orbits, anomaly frequency rises about **10×** as proton flux goes from 100 to 1000 pfu, and peaks **4–5 days after onset**.
  - https://arxiv.org/pdf/2211.06775
  - **That lag matters for restart logic:** risk does not end when flux peaks.
- **Safe mode is costly.** Sentinel-1 operators note a "major drawback" of escalating to safe mode. Airbus targets: cold restart < 60 s, and autonomous restart of critical sequences in 5–60 min.
  - SpaceOps 2025, https://publications.spaceops.org/2025/download_by_id.php?id=0360 ; ESA/Airbus FDIR slides, https://indico.esa.int/event/323/contributions/5059/attachments/3761/5218/13.40_-_AOCS_GNC_Autonomy_and_FDIR_-_Airbus_challenges_and_way_forward.pdf
  - **Use this to justify false-alarm costs in your decision logic.**

**All-clear and restart literature (your differentiator's academic home).**
- **SRAG requirement:** an "All Clear Forecast" (6/24/48 h) and "How long will it last?" (Semones 2019).
- **CLEAR center:** a NASA Space Weather Center of Excellence (5 years) explicitly about all-clear. In its own words it will "tell the astronauts when it's safe to leave their shelter".
  - https://clear.engin.umich.edu/ ; The Conversation 2024
- **Barnes et al. 2016**, the "All-Clear" workshop for flare forecasting (above).
- **Event-end and decay forecasting:**
  - AFRL PPS uses 1/e decay for end time (Whitman 2023 review).
  - Kecskeméty et al. found two populations of decay duration, ~30 h and ~55 h on average: JGR 2009, https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2008JA013730
  - Fitting the rise phase can forecast the decay even before the peak (neutron-monitor relativistic events): JSWSC 2023, https://www.swsc-journal.org/articles/swsc/full_html/2023/01/swsc220075/swsc220075.html
  - A real-time diffusion-equation intensity system with a decay term: Zhang et al., Space Weather 2024, https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2023SW003725
- **SWPC:** confirming the end of an event "can take several hours".
- **Sources of a second peak, i.e. why hysteresis is needed:** ESP at shock arrival (EUHFORIA–iPATH), multiple eruptions in sequence (SRAG notes four of its ten big events were multi-event sequences), and the 4–5-day anomaly lag.

**ROS 2 / Space ROS.**
- Space ROS is NASA's hardened ROS 2 subset, aligned with NPR 7150.2 and DO-178C, with a cFS bridge and an RTEMS build.
  - https://space-ros.github.io/docs/rolling/Introduction/About-Space-ROS.html ; https://github.com/space-ros
- Using Space ROS message conventions for the demo "safe-mode" topic adds credibility. Public activity looks modest since late 2024.

---

## D. Gaps, differentiation and how to survive judging

### D1. What is NOT novel (say so up front)

| Proposed element | Prior art | Recommendation |
|---|---|---|
| Real-time SEP risk from GOES/ACE/DONKI | SWPC alerts, SEP Scoreboard, DONKI notifications | Consume these feeds; don't re-invent them |
| CNN flare forecasting from SDO magnetograms | Dozens of papers; operational DeFN; Surya foundation model | **Drop it, or demote it to a stretch goal.** If kept, fine-tune Surya or use a SHARP baseline, report TSS on a **chronological** split, and state that flare ≠ SEP |
| ML SEP probability with uncertainty | MEMPSEP (calibrated ensemble), SEPSAT, Lavasa, MagPy, UNSPELL, the CLEAR ML model on Artemis II | Reasonable as a demo if validated on GSEP / SEPVAL / CLEAR benchmark with SPHINX metrics (HSS, FAR, **FAER**) |
| DEM terrain shielding | Phipps et al. 2021–2024 (LOLA DEM horizon solid angle × Geant4) | Cite as the method you implement. Novelty is per-asset, real-time use, and possibly the **anisotropic early-phase** extension |
| Green/yellow/red levels | NOAA S-scale; CLEAR all-clear thresholds | Map explicitly onto S-scale and CLEAR thresholds |

### D2. What IS plausibly novel or under-served

1. **Restart window with hysteresis**, as a *forecast product with uncertainty*. It combines:
   - a decay-model forecast (1/e, or the rise→decay relation)
   - an ESP / second-CME watch (a pending CME with forecast arrival from DONKI WSA-Enlil)
   - the anomaly-lag tail
   - asymmetric thresholds: enter red at >10 MeV ≥ 10 pfu (or ≥ 1 pfu >100 MeV); return to green only when flux stays below e.g. 50% of threshold for N hours **and** no pending CME arrival lies inside the restart window
   
   This directly answers SRAG's "How long will it last?" and CLEAR's "when it's safe to leave shelter". I found **no public M2M product** that serves it.
2. **Asset-specific translation.** Inputs per asset: shielding depth (g/cm² Al), part susceptibility (SEL-sensitive, SEU tolerance), mission phase (driving, drilling, comms pass, idle). Outputs: action plus expected SEE rate or dose. Use the documented 4× intra-vehicle dose variation (Artemis I) and the 21.8 vs. ~4275 cGy contrast (10 g/cm² vs. 1 mm Al) to show why per-asset matters.
3. **Robotic and commercial (CLPS-class) focus**, versus the existing crew focus of SRAG and CLEAR. CLPS operators get no SRAG console support, and mid-size operators may have no space-weather staff.
4. **A LunaNet-style alert interface.** A machine-readable alert schema, perhaps borrowing the CCMC SEP Scoreboard JSON format, so assets can act autonomously at seconds-level latency. This also handles the light-time and ground-loop delay.
5. **Charging channel.** Plasma-sheet crossings plus SEP-driven deep-dielectric charging in PSRs is a separate risk axis that crew-dose tools ignore.
6. **Anisotropic onset × polar horizon.** A testable hypothesis (see §A4). Present it as "research question", not a claim.

### D3. Weaknesses a judge will attack (and answers)

- **"Flares don't hurt hardware on the Moon; SEPs do."**
  - Agree, and use X-ray flux only as a precursor or trigger.
- **"Your ML won't beat UMASEP or REleASE, and even NASA says models aren't operational-grade."**
  - Agree. Ensemble the community forecasts, and show calibrated probabilities with FAER, HSS and reliability diagrams.
  - Use SRAG's own numbers (median FAR 0.03–0.46; real-time HSS 0.44–0.70) to set realistic expectations.
- **"SEPs are isotropic; crater shielding is negligible."**
  - Reply: published Geant4 + LOLA work gives 10–50% for isotropic flux.
  - Present it as **route and parking-spot optimization**, not protection.
  - Note that lava tubes and ≥4 g/cm² regolith are the real protection.
- **"Lead time is minutes; what can a rover do?"**
  - Reply: rovers *can* act in minutes, unlike crews.
  - Actions: power down SEL-sensitive loads, pause irreversible operations (drilling, sample transfer, firmware writes), park in a better-shielded spot, and checkpoint state.
  - The REleASE ~30–90 min and UMASEP ~2–3 h warnings are enough for robotic actions.
- **"Safe mode itself is risky and costly."**
  - Reply: explicit cost-loss decision with asymmetric false-alarm cost (Sentinel-1 / Airbus FDIR). Make the action ladder graded rather than binary: continue → defer risky operations → safe mode → shutdown of SEL-sensitive loads.
- **"Restart is just 'flux below threshold'."**
  - Reply: SWPC needs hours to confirm the end. Secondary ESP peaks and multi-event sequences recur, and anomalies lag by days. Hysteresis plus a CME-arrival watch is the defensible logic.
  - Show a backtest on the multi-event sequences in the SRAG list (e.g. 1989-10-19, 2005-01-15).
- **"The Moon is in the magnetotail, so it's protected."**
  - Reply: no, see Liuzzo et al. 2023. Show that you know this.
- **"Where's the data at the Moon?"**
  - Reply: GOES and L1 are proxies. Lunar in-situ data exists (CRaTER, LND). Future ERSA (Gateway) and LEEMR-type sensors can be ingested.
  - Admit that the GOES-to-Moon mapping ignores magnetospheric effects GOES sees in geostationary orbit. (This is my inference; verify before claiming specifics.)

### D4. Suggested reframing (pitch sentence)

> "Lunar Shield is an open, LunaNet-style decision layer for robotic lunar assets. It ingests NASA/NOAA community SEP forecasts (DONKI, SWPC, CCMC SEP Scoreboard), adds per-asset shielding and terrain context (Phipps-style LOLA horizon masks), and emits auditable actions plus a *restart window with hysteresis*, the 'How long will it last?' question SRAG says operators face. We validate against SRAG's SPHINX metrics on public SEP benchmarks and are explicit about forecast skill limits."

**Demo validation plan.** Backtest on the SEPVAL dataset (Zenodo 15555244) and the CLEAR benchmark.
- **Report:** hit rate, FAR, HSS, **FAER**, mean warning time, and **restart-window error**, i.e. predicted vs. actual time below threshold. Also report counts of premature restarts (re-entry to red within 24 h of a green call).
- **Ablations:** with and without hysteresis, and with and without the CME watch.

---

## Uncertainties and things I could not verify

- Exact TSS of Bobra & Couvidat 2015 and Liu et al. 2019, and any flare TSS for Surya (not on the abstract pages).
- A primary source for "CME transit 1–3 days" and for median flare-to-10-pfu delays.
- Chang'e-4 LND dose during specific 2020–2024 SEP events.
- CRaTER dose numbers for 2024 SEP events.
- Whether any CLPS lander implements forecast-driven safe modes.
- VIPER and other rovers' radiation FDIR.
- Details of the LunaNet v5 "Space Weather Alerting Services" section (only the table-of-contents heading was seen).
- Commercial products from Spire, Tomorrow.io, Kayhan, Cognitive Space and ExoAnalytic for lunar space weather: not checked.
- The Kasapis 2026 ML-SEP review: only the abstract was read.
- The University of Michigan Artemis II ML model's name and verification scores (press only).
- Several numbers come from conference abstracts or slides (Phipps, Whitman COSPAR 2026), not peer-reviewed papers.

---

## Top 15 must-read sources

1. **Whitman et al. (NASA JSC SRAG), *Validation of SEP Prediction Models for Space Radiation Operations*, COSPAR 2026 slides,** and NASA/TP-20260000463 (2026). State-of-the-art skill, FAER, the "not yet operational" verdict, and the benchmark datasets. https://ntrs.nasa.gov/api/citations/20260007046/downloads/COSPAR2026_20260807_Whitman_v2.pdf ; https://ntrs.nasa.gov/citations/20260000463
2. **Semones (NASA JSC SRAG), *Operational Space Weather Forecasting Needs for Manned Exo-LEO Missions*, 2019.** The "Big Three" questions, the all-clear requirement and the timing table. https://www.spaceweather.gov/sites/default/files/images/u59/02%20Eddie%20Semones%20Official.pdf
3. **Whitman et al., *Review of Solar Energetic Particle Prediction Models*, Adv. Space Res. 72 (2023).** https://researchwith.njit.edu/en/publications/review-of-solar-energetic-particle-prediction-models/
4. **Zhao, *CLEAR Space Weather Center of Excellence: All-Clear SEP Prediction*, arXiv:2310.14677 (2023).** https://arxiv.org/abs/2310.14677
5. **Phipps, Stubbs, Looper, Spence, Townsend, *Maps of Primary Radiation Dose Around the Lunar South Pole*, LPSC 2024,** plus the NESF 2021 crater abstract. Terrain-shielding prior art. https://www.hou.usra.edu/meetings/lpsc2024/pdf/1513.pdf ; https://ntrs.nasa.gov/api/citations/20210021039/downloads/Phipps_NESF_2021_abstract.pdf
6. **Zhang et al., *First measurements of the radiation dose on the lunar surface*, Science Advances (2020)** (Chang'e-4 LND). https://www.bexus.org/et/people/forstner/publication/zhang-2020-lnd-firstresults
7. **George et al., *Space radiation measurements during the Artemis I lunar mission*, Nature 634 (2024).** https://ideas.repec.org/a/nat/nature/v634y2024i8032d10.1038_s41586-024-07927-7.html
8. **Liuzzo et al., *Unrestricted SEP Access to the Moon While Within the Terrestrial Magnetotail*, GRL (2023).** https://lukeliuzzo.github.io/files/Liuzzo_etal_2023.pdf
9. **Matthiä & Berger, *Radiation Exposure and Shielding Effects on the Lunar Surface*, Space Weather (2024).** https://elib.dlr.de/210448/1/ME-SBA-2024-Matthi%C3%A4-Berger%20Radiation%20Exposure%20and%20Shielding%20Effects%20on%20the%20Lunar%20Surface-SPACE%20WEATHER.pdf
10. **Jordan et al., deep dielectric charging of regolith in PSRs (JGR Planets 2014 / AGU abstracts).** https://core.ac.uk/download/72054604.pdf
11. **Chatterjee et al., *MEMPSEP I*, Space Weather (2024), arXiv:2309.14570.** Calibrated ensemble with uncertainty. https://arxiv.org/abs/2309.14570
12. **Roy et al., *Surya: Foundation Model for Heliophysics*, arXiv:2508.14112 (2025).** https://arxiv.org/abs/2508.14112
13. **Leka et al., *A Comparison of Flare Forecasting Methods II*, ApJS 243:36 (2019),** plus Barnes et al. 2016 (All-Clear workshop). https://arxiv.org/abs/1907.02905 ; https://arxiv.org/abs/1608.06319
14. **Malandraki et al., *Forecasting and Analysis of SEP Radiation Storms* (HESPERIA REleASE), arXiv:2502.15555 (2025),** plus the UMASEP JSWSC papers. https://arxiv.org/abs/2502.15555 ; https://www.swsc-journal.org/articles/swsc/full_html/2019/01/swsc180069/swsc180069.html
15. **CCMC ISEP / SEP Scoreboard and DONKI API pages** (what you can consume M2M today). https://ccmc.gsfc.nasa.gov/ISEP ; https://ccmc.gsfc.nasa.gov/scoreboards/sep ; https://ccmc.gsfc.nasa.gov/tools/DONKI

Honourable mentions:
- Naito et al. 2020 (lava tubes): https://iopscience.iop.org/article/10.1088/1361-6498/abb120
- Nishizuka et al. 2018/2021 (DeFN): https://arxiv.org/abs/1805.03421
- GSEP catalog: https://arxiv.org/abs/2204.12021
- Kasapis et al. 2026 ML-SEP review: https://arxiv.org/abs/2606.19539
- Mission Space LEEMR press release (closest commercial analogue): https://www.prnewswire.com/news-releases/mission-space-selected-by-nasa-to-advance-lunar-environmental-monitoring-technology-302814728.html
- Kecskeméty et al. 2009 (SEP decay phase): https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2008JA013730

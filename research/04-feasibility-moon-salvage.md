# Feasibility: "Lunar Hardware Resource Recovery & Repurposing" vs Challenge 4.1

*Prepared Sat 2026-11-14 ~10:00 CET. Every URL below was fetched or HTTP-checked (200) today unless marked [secondary] or [unverified].*

**Challenge 4.1, "Abandoned but not Forgotten"** (https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/). The brief asks for "an engaging, story-driven educational tool or narrative that teaches school-age and casual space enthusiasts about the hardware left on the Moon, Mars, and elsewhere … explaining what they are, why they were originally sent into space, and the scientific discoveries they made". It also says "a strong narrative focus will serve your project well". Difficulty: Intermediate, Beginner/Youth.

**Variants assessed**
- **(a) As originally framed:** an engineering and economic tool. It inventories the artifacts, estimates material yield, harvest effort and recycling priority, and adds a heritage tag.
- **(b) Reframed:** a story-driven interactive experience for kids. Working title: "Moon Salvage or Museum?" The player is a young engineer at a future Artemis base who explores a 3D Moon (and Mars) globe of real artifacts. Each artifact has a card that tells its story and the science it made possible. For each one the player decides "recycle it or preserve it?" and sees what follows.

---

## Key verified data findings

1. **LROC "Anthropogenic Objects" shapefile.** This is the best core dataset. Product page: https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_ANTHROPOGENIC_OBJECTS. Direct ZIP: https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/EXTRAS/SHAPEFILE/ANTHROPOGENIC_OBJECTS/ANTHROPOGENIC_OBJECTS_180.ZIP
   - I downloaded and parsed it: **71 point records, "Last updated: 2026-08-14"**.
   - Fields: OBJECT_ID, SHORT_NAME, VEHCL_NAME, MISSION, OBJECT, LATITUDE, LONGITUDE, RADIUS, COORD_SRC, UNCERTAIN (m), DATE, REFERENCES.
   - Coverage: all Apollo LM descent stages, the ALSEP central stations and seismometers, retroreflectors, all three LRVs, the S-IVB and LM ascent-stage impact sites, Surveyors, Rangers, Luna and Lunokhod, Chang'e 3–6, SLIM, IM-1, IM-2, Blue Ghost 1 and Hakuto-R 1/2. It even has a 2026 Falcon 9 booster impact.
   - Citation: Wagner et al. 2017, *Icarus* 283, 92–103, doi:10.1016/j.icarus.2016.05.011.
   - **It has no mass and no material fields.**
2. **NASA History Office "Catalogue of Manmade Material on the Moon" (2012).** https://history.nasa.gov/FINAL%20Catalogue%20of%20Manmade%20Material%20on%20the%20Moon.pdf, mirror at https://www.nasa.gov/wp-content/uploads/2024/02/final-catalogue-of-manmade-material-on-the-moon.pdf
   - I extracted the text: about 850 lines of item-level lists per Apollo mission (PLSS backpacks, boots, TV cameras, "Defecation Collection Device", the Bible on the LRV dashboard, and so on) plus coordinates for robotic craft.
   - **It gives no masses.** It is great story fodder ("what's really up there").
   - Companion page with maps: https://www.nasa.gov/wp-content/uploads/static/history/humanartifacts.html
3. **Masses come from NSSDCA (a listed challenge resource).**
   - Apollo 11 LM (https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C): descent stage dry mass including stowed surface equipment **2034 kg**.
   - Apollo 15 (https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C): **2797 kg**.
   - LRV (https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html): **210 kg**. Its tires are zinc-coated woven steel strands on a spun aluminium hub.
   - Note that the resource list calls 1971-063C "LRVs", but it is actually the Apollo 15 LM/ALSEP entry.
4. **Material composition is thin and coarse. This is the main validity gap for variant (a).**
   - NASA TN D-7084, the Apollo Experience Report on the LM structural subsystem (https://ntrs.nasa.gov/api/citations/19730010174/downloads/19730010174.pdf), names Al **2219 and 7075-T6** as the major alloys, "primarily" in the ascent stage.
   - Secondary sources describe the descent stage as chem-milled Al alloy with Ti fittings and fasteners.
   - The LRV chassis is 2219 Al tubing and its wheels are zinc-coated steel wire with titanium chevrons [secondary].
   - No public per-artifact bill of materials exists. Any "kg of Al / Ti / Cu" figure would be an **estimate**: mass × assumed fraction, which must be labelled as such.
5. **Mars coordinates.** PDS Geosciences Node ODE landing-site table: https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm. It covers Viking 1 and 2, Pathfinder, Spirit, Phoenix and others. Opportunity and InSight coordinates are on the Planetary Society map [secondary]. Masses are on the science.nasa.gov mission pages listed in the challenge.
6. **Heritage.**
   - **Artemis Accords §9** (https://www.nasa.gov/wp-content/uploads/2022/11/Artemis-Accords-signed-13Oct2020.pdf), verbatim: "The Signatories intend to preserve outer space heritage, which they consider to comprise historically significant human or robotic landing sites, artifacts, spacecraft, and other evidence of activity on celestial bodies…". §10 (Space Resources) follows it directly, which gives a natural "recycle vs preserve" tension.
   - **One Small Step to Protect Human Heritage in Space Act**, P.L. 116-275, signed 2020-12-31: https://www.congress.gov/116/plaws/publ275/PLAW-116publ275.htm. It requires lunar-activity licensees to agree to NASA's 2011 artifact-protection recommendations: https://www.nasa.gov/wp-content/uploads/2017/10/617743main_nasa-usg_lunar_historic_sites_reva-508.pdf
7. **Recycling and ISRU literature.**
   - NASA LunaRecycle Challenge ($3M Centennial Challenge): https://www.nasa.gov/prizes-challenges-and-crowdsourcing/centennial-challenges/lunarecycle/
   - Patil et al. 2026, "Towards a circular space economy: Knowledge and classification of end-of-life equipment on the Moon", *J. Innovation & Knowledge* 17:101049, doi:10.1016/j.jik.2026.101049 (https://researchportal.list.lu/publications/detail/towards-a-circular-space-economy-knowledge-and-classification-of-end-of-life-equipment-on-the-moon). **This is direct academic prior art for variant (a)**: it ranks lunar end-of-life equipment by composition, mass and recycling potential.
   - ESA study "Recycling of Hardware for Moon and Martian Settlement": https://nebula.esa.int/content/recycling-hardware-moon-and-martian-settlement
   - "Logistics Analysis for Lunar Post-Mission Disposal": https://arxiv.org/abs/2502.13679
   - NASA ICES-2021-147 on recycling vs mining economics: https://ntrs.nasa.gov/api/citations/20210019592/downloads/ICES-2021-147.pdf
   - The "~181,000 kg of material on the Moon" figure appears only in Astronomy magazine [secondary, unverified]: https://www.astronomy.com/space-exploration/how-will-future-lunar-trash-be-dealt-with/

## Visualization stack (verified)

- **Moon Trek / Mars Trek WMTS.**
  - API documentation: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon
  - Working capabilities file for the Moon: https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml
  - Working capabilities file for Mars: https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml
  - Viewers: https://trek.nasa.gov/moon/ and https://trek.nasa.gov/mars/
- **CesiumJS + Cesium Moon Terrain.** 3D Tiles built from LRO data: https://cesium.com/platform/cesium-ion/content/cesium-moon-terrain. It needs a free Cesium ion token and requires setting the default ellipsoid to the Moon. Cesium's own example disables the globe, imagery picker and geocoder for lunar use. One community thread reports a height offset of about 2.5 km; that does not matter for markers.
- **Simplest robust option: Three.js sphere** textured with the NASA SVS CGI Moon Kit (https://svs.gsfc.nasa.gov/4720; colour map + LOLA displacement), with markers placed from lat/lon.
- **NASA 3D models (glTF/STL)** on https://github.com/nasa/NASA-3D-Resources and https://science.nasa.gov/3d-resources/. They include Apollo Lunar Module, Viking Lander, Spirit/Opportunity MER, InSight, Ingenuity, LADEE and LRO. These are great for artifact cards (`<model-viewer>`).
- **LROC NAC close-ups of the sites:** https://www.lroc.asu.edu/featured_sites. The shapefile REFERENCES column links to the identification images.

---

## T1 Feasibility

| Idea | Challenge | Core NASA data (verified URL) | Data access effort (Low/Med/High) | Build effort (person-hours) | Feasible by Sun 16:00? (Yes/Partly/No) | Biggest technical risk |
|---|---|---|---|---|---|---|
| (a) Lunar wreckage extractor: an engineering/economic recycling-priority tool | 4.1 (weak fit: the audience is kids, the ask is storytelling) | LROC anthropogenic shapefile (https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_ANTHROPOGENIC_OBJECTS) + NSSDCA masses (https://nssdc.gsfc.nasa.gov/) + TN D-7084 alloys (https://ntrs.nasa.gov/api/citations/19730010174/downloads/19730010174.pdf) | **Med–High**. Coordinates are trivial. Per-artifact material breakdowns do not exist publicly and must be assumed. Energy and tooling models need literature we cannot validate in 20 h. | ~70–90 | **Partly**. A demo is possible, but the numbers would be guesses and it misses the brief. | Material-yield and harvest-energy figures with no defensible source. A judge with a materials background (the local mentor Áron Selmeci, materials specialist) would see through it. |
| (b) "Moon Salvage or Museum?": a story-driven 3D globe + artifact cards + recycle-vs-preserve choices for kids | 4.1 (strong fit) | Same shapefile (71 objects, updated 2026-08-14) + NASA History catalogue (https://history.nasa.gov/FINAL%20Catalogue%20of%20Manmade%20Material%20on%20the%20Moon.pdf) + NSSDCA mission pages (listed resources) + Trek WMTS / SVS Moon Kit + ODE Mars sites | **Low**. One ZIP → GeoJSON in 15 minutes (already parsed). Cards are hand-curated for 12–15 hero artifacts. | ~55–70 | **Yes** | Scope creep (Moon + Mars + 3D + SI narrator). Content curation, not code, is the bottleneck. Second risk: 3D globe performance or token issues if CesiumJS is used; mitigate with the Three.js + SVS texture route. |

## T2 Judging score estimate

| Idea | Impact | Creativity | Validity | Relevance | Presentation | Total /25 | One-line rationale |
|---|---|---|---|---|---|---|---|
| (a) | 3 | 3 | 2 | 2 | 3 | **13** | Interesting circular-economy angle, but it answers a question the challenge did not ask, for an audience it did not name. Yield numbers are unsourced estimates, and Patil et al. 2026 already proposes this classification. |
| (b) | 4 | 4 | 4 | 5 | 4–5 | **21–22** | Hits every objective: what each item is, why it was sent, the science it enabled, kid audience. The "recycle or preserve?" dilemma is a fresh, discussable hook tied to the real Artemis Accords §9 vs §10 tension and real NASA data. It is a contender for Best Storytelling and Most Inspirational. |

## T3 Resource mapping

| Idea | Listed challenge resource used | Other NASA/partner data | Open-source tools | Sponsor resources (Azure/GoDaddy/Copilot/other) |
|---|---|---|---|---|
| (a) | NSSDCA entries for Apollo LMs (1969-059C), LRV/Apollo 15 (1971-063C), ALSEP (1969-099C), Surveyor | LROC anthropogenic shapefile; NASA TN D-7084 (LM alloys); NASA LunaRecycle Challenge; ICES-2021-147; NSSDC LRV page; ESA recycling study | Python (pandas, pyshp/geopandas), Streamlit or Plotly Dash, Leaflet/Plotly geo | Azure App Service or Container Apps for the Python app; GoDaddy domain; Copilot for boilerplate |
| (b) | NSSDCA + all listed Moon items (Apollo LMs, LRVs, ALSEP, Surveyor) + listed Mars items (Viking, Sojourner/Pathfinder, Spirit/Opportunity, Phoenix, InSight, Ingenuity), using the science.nasa.gov pages for "why sent / what it found" | LROC shapefile + NAC featured-site images; NASA History catalogue + humanartifacts maps; Moon/Mars Trek WMTS; SVS CGI Moon Kit 4720; NASA-3D-Resources glTF models; ODE Mars landing sites; Artemis Accords §9/§10; P.L. 116-275; NASA 2011 lunar heritage recommendations; LunaRecycle | Three.js (or CesiumJS + Cesium Moon Terrain via free ion token), `<model-viewer>`, Vite, Python build script (pyshp → GeoJSON/JSON), optional Ink/Twine-style branching JSON | Azure Static Web Apps (free tier) for hosting; optional Azure OpenAI as an "artifact narrator", strictly grounded on card facts; optional Azure AI Speech TTS for card narration (accessibility); GoDaddy domain (e.g. a CNAME to the SWA); Copilot for Three.js glue code |

## T4 MVP scope

| Idea | Must-have (by Sun 12:00) | Nice-to-have | Cut | Demo moment for 30 s video |
|---|---|---|---|---|
| (a) | Table of about 70 objects with coordinates; mass for about 15 NASA objects; assumed material-fraction model; priority score; heritage flag; map | Energy/tooling estimate; sensitivity sliders | Real harvest-energy physics, Mars, 3D | A map lighting up "top 10 recyclables" with kg of aluminium. Weak emotionally, and it invites "is this number real?" |
| (b) | 3D Moon globe with all 71 LROC objects as pins (filter: NASA / other nations / impact sites). **12–15 hand-written hero cards**, each with photo or LROC NAC crop, 3D model where available, "Why it was sent", "What it discovered", "Is it still working?" (e.g. Apollo 11/14/15 retroreflectors are still laser-ranged; PSE moonquakes), mass from NSSDCA, a "made of" badge with a confidence label. **Story loop:** "It's 2040, your Artemis base needs 2 t of aluminium. Recycle or preserve?" leads to a consequence panel and a final "your Moon museum vs your base" result citing Accords §9 and the 2020 law. English UI, accessible text, hosted on a public URL. | Mars tab (6–8 artifacts via SVS/Trek Mars texture). TTS narration ("the artifact speaks"). Grounded SI "ask the rover" chat. Classroom mode (vote tally). "Junk drawer" gallery from the 2012 catalogue (boots, golf balls, Bible on the LRV). Hungarian toggle for local impact. | The engineering yield/energy model (keep only a simple "kg of metal" teaser on cards). Deep space items (Pioneer, Dawn, Kepler) beyond a timeline footnote. User accounts. Live LROC queries. | 0–5 s: the globe spins and 71 glowing pins appear ("We've left 71 places on the Moon"). 5–15 s: a kid clicks the Apollo 15 rover card, which flips to "210 kg, still parked, drove 27.9 km". 15–25 s: the dilemma screen "Recycle for your base or preserve for history?" with a choice and its consequence. 25–30 s: tagline "Abandoned, but not forgotten" + team, with the NASA data sources on screen. |

---

## Build plan for variant (b) (~20 working hours, 4 people)

**Stack.**
- Static site (Vite + vanilla JS or React) with Three.js globe (SVS Moon Kit texture, 2k/4k JPG).
- Data: `artifacts.json` generated by one Python script from the LROC ZIP, merged with a hand-curated `cards.csv` (Yhair keeps one source URL per cell).
- `<model-viewer>` for NASA glTF models.
- Hosting: Azure Static Web Apps + GitHub Actions, GoDaddy domain.
- CesiumJS is the stretch option only. Do not depend on an ion token at demo time.

**Who does what.**
- **Patrik (architect):** repo, globe, pin layer, card UI, deploy pipeline. Set the data contract (JSON schema) in the first hour.
- **Bence (AI engineer):** LROC ZIP → GeoJSON/JSON script (fields already known). NSSDCA mass scraping for the hero set. Optional grounded narrator via Azure OpenAI, plus Azure TTS. He also owns the SI-disclosure text and watermarking of any generated images (rules in 01-hackathon-map.md §2.3).
- **Benedek (geophysics + storyteller):** the story script, hero-card copy at a 10–14-year-old reading level, the science "what it discovered" facts (seismometers → moonquakes and lunar interior; LRRR → Earth–Moon distance and recession of about 3.8 cm/yr; Surveyor 3 parts returned by Apollo 12), the pitch and the 30 s video.
- **Yhair (BI):** curation spreadsheet (mass, material class, status, heritage significance, source URLs). Recycle/preserve scoring and the end-screen "your Moon" summary chart. The ≤7-slide backup deck.

**Timeline.**
- Sat 10–13: lock the concept; data contract; parse the shapefile; globe skeleton; story outline.
- Sat 13–20: pins + cards working; 8 hero cards written; dilemma flow.
- Sat 20–23: integrate; deploy v0.
- Sun 08–12: remaining hero cards, polish, accessibility, optional Mars tab. **Feature freeze 12:00.**
- Sun 12–15: record and edit the 30 s video (with English subtitles); fill the submission form, including the NASA data list and every third-party citation; SI disclosure.
- Sun 15–16: buffer.

---

## Prior art and competition

- **NASA History "Human Artifacts on the Moon"** (static maps + 2012 catalogue): https://www.nasa.gov/wp-content/uploads/static/history/humanartifacts.html. Authoritative but static and not story-driven.
- **For All Moonkind "Moon Registry"** (free online heritage registry of every mission that reached the Moon): https://moonregistry.forallmoonkind.org/. Its press coverage is at https://www.space.com/for-all-moonkind-moon-registry. This is the closest heritage-catalogue prior art. It is a catalogue, not a kids' story or game.
- **Orbital Radar "Lunar Globe"** (https://orbitalradar.com/moon), starlust.org's landing-site interactive map, and an NZZ 3D debris globe [secondary, not opened] show that "pins on a Moon globe" alone is **not novel**. Novelty must come from the narrative and the recycle-vs-preserve dilemma.
- **Patil et al. 2026 (J. Innov. & Knowledge)** already classifies lunar end-of-life equipment for recycling, which undercuts the creativity of variant (a) as a tool. Cite it in (b) as "real scientists are asking this question".
- **Past Space Apps Best Storytelling winners** were all narrative-first and child- or public-facing:
  - 2025: HerCode Space, "A Solar Tale" (https://www.spaceappschallenge.org/2025/meet-the-2025-global-winners/)
  - 2024: TerraTales, "Tell Us a Climate Story!"
  - 2023: TeamVoyagers
  - 2022: MIMBI (Paraguay), QR-linked art + web app
  - 2021: Space Travelers, a game for "Trail to Mars" (https://www.spaceappschallenge.org/blog/2021-global-winners/)
  - These support variant (b)'s format.
- **Expect many 4.1 teams worldwide to build "map + cards" or a picture book.** The recycle-or-preserve ethical choice, grounded in the real Accords §9/§10 tension and NASA LunaRecycle, is a distinctive and debatable hook that kids can act on.

## Risks

1. **Relevance (a):** the challenge is explicitly storytelling and education for school-age audiences. An engineering tool scores low on Relevance and Presentation no matter how good it is. **Mitigation:** choose (b), and keep the recovery idea only as the story's dramatic engine.
2. **Heritage ethics:** proposing to "recycle Eagle's descent stage" can read as advocating destruction of protected heritage (P.L. 116-275; Accords §9). **Mitigation:** frame it as an open question the player must weigh. Make Apollo landing sites, first-of-kind craft and still-working retroreflectors "protected" in the game logic: recycling them triggers a heritage explanation, not points. Offer recyclable alternatives such as impact debris, spent stages and post-2020 commercial wreckage. Keep the tone respectful of the crews.
3. **Validity of material numbers:** there is no public per-artifact bill of materials. Show mass (NSSDCA, sourced) and a material class ("mostly aluminium alloy, titanium fittings; source TN D-7084") with an "estimate" badge. Never show a fake-precise "1,432 kg Al".
4. **Scope:** Moon + Mars + 3D + SI. Freeze the Moon first; Mars is a stretch goal.
5. **Rules:** no NASA logos or insignia in generated content. SI-generated images or voice need a visible watermark or disclosure. Cite every source in the form, including the LROC shapefile (Wagner et al. 2017), SVS, the 3D models and the JS libraries. No minors' likenesses in the video. The video must be ≤30 s, or the slides ≤7.
6. **Tech:** Cesium ion token and terrain offset issues; Trek tile CORS or speed during the live demo. **Mitigation:** bundle the static SVS texture locally and keep Trek tiles optional.
7. **Coordinate conventions:** the LROC file comes in both −180..180 and 0..360 longitude versions, and Mars sources disagree slightly (ODE vs Planetary Society). Use one source per body and state it.

## Recommendation

**Do not build (a) as framed. It scores about 13/25. Build (b), "Moon Salvage or Museum?" (about 21–22/25), and treat the resource-recovery idea as its narrative hook, not as the product.**

- Core data is ready: I have already downloaded and parsed the LROC anthropogenic shapefile (71 objects, coordinates, dates, references, updated 2026-08-14). Combine it with the NASA 2012 catalogue and NSSDCA masses.
- The build fits comfortably in about 60 person-hours. The real work is writing 12–15 excellent hero cards and one tight dilemma loop.
- Pitch around one emotional beat: *"Future astronauts will need metal. Our first footsteps are made of metal. What would you do?"* This targets Best Storytelling and Most Inspirational. It also gives the Budapest jury (an analog astronaut, the Puli Space CEO, a space-law mentor on the mentor list) a concrete heritage-law discussion point.

*Files from this research (scratchpad):*
- `/private/tmp/claude-501/-Users-spatr-Documents-NASA/29e57abf-a334-40a0-9816-6142459d9c5c/scratchpad/dl_shp/` (LROC shapefile + README)
- `/private/tmp/claude-501/-Users-spatr-Documents-NASA/29e57abf-a334-40a0-9816-6142459d9c5c/scratchpad/dl_cat/cat.txt` (catalogue text)
- `/private/tmp/claude-501/-Users-spatr-Documents-NASA/29e57abf-a334-40a0-9816-6142459d9c5c/scratchpad/dl_cat/aa.txt` (Artemis Accords text)

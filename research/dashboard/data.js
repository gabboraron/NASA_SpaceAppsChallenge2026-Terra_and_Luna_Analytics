/* Idea data for the decision board. Sources: research/*.md feasibility reports (14 Nov 2026).
   Scores are agent estimates, not facts: adjust them as a team. */
window.DATA = {
  meta: {
    teamCutoff: '2026-11-15T16:00:00+01:00',
    officialDeadline: '2026-11-15T23:59:00+01:00',
    team: ['Patrik', 'Bence', 'Benedek', 'Yhair'],
    headline: 'Pick one idea by Saturday midday: about 68 person-hours remain until the Sunday 16:00 cut-off.',
    subline: 'Every idea below was checked against its challenge text, live data sources, prior art and past winners. Scores are research estimates: use the sliders and the vote tab to make the team call.'
  },
  checks: [
    { key: 'fits', label: 'Answers the challenge text' },
    { key: 'nasa', label: 'NASA data is the core' },
    { key: 'data', label: 'Data verified today' },
    { key: 'demo', label: 'Public demo by Sun 16:00' },
    { key: 'skills', label: 'Uses our strongest skills' },
    { key: 'novel', label: 'Clear novelty vs prior art' },
    { key: 'local', label: 'Hook for Budapest jury' },
    { key: 'video', label: 'Strong 30 s video moment' }
  ],
  reports: [
    ['../00-methodology.md', 'How the research was produced, kinds of claims (tested / paper / computed / estimate), how scores were made, limitations'],
    ['../01-hackathon-map.md', 'Full hackathon map: dates, rules, judging, awards, Budapest event, all 14 challenges with resources, sponsor offers'],
    ['../02-lunar-shield-science.md', 'Lunar Shield deep research: radiation physics, existing forecasting systems, safe-mode practice, gaps, 15 must-read sources'],
    ['../02b-lunar-shield-data.md', 'Lunar Shield data inventory: live-verified space-weather, lunar and terrain endpoints, repos, 48 h stack'],
    ['../03-past-winners.md', 'Patterns in the 50 global winners 2021–2025'],
    ['../04-feasibility-slip-day-lunar.md', 'Feasibility: Slip Day, Slip Day + Lunar Shield layer, Lunar Shield game'],
    ['../04-feasibility-earth-twin.md', 'Feasibility: Earth analog similarity search + breakdown dashboard'],
    ['../04-feasibility-trend-navigator.md', 'Feasibility: Research Navigator + LLM front-end'],
    ['../04-feasibility-sar-pollen.md', 'Feasibility: Budapest ground motion (rail, buildings), Pollen & Bee'],
    ['../04-feasibility-trailbreaker.md', 'Feasibility: Trailbreaker / Marswalk planner'],
    ['../04-feasibility-lunar-solar-farm.md', 'Feasibility: lunar solar-farm heatmap, standalone and as a Slip Day power layer'],
    ['../04-feasibility-ai-datacenter-heat.md', 'Feasibility: GPU smuggling sticky (rejected) and its ch. 2 reframe, AI data-center heat footprint'],
    ['../04-feasibility-moon-salvage.md', 'Feasibility: lunar hardware recovery / Moon Salvage or Museum'],
    ['../05-lunar-shield-architecture.md', 'Lunar Shield solution architecture: requirements, C4 diagrams, advisory state machine, API, Azure deployment, risks, roadmap'],
    ['../prototypes/lunar-shield-ux/index.html', 'Lunar Shield UX prototype: ops console replaying a synthetic SEP event, Moon + Earth impacts, API, business model'],
    ['../space-apps-2026-map.html', 'Visual hackathon map (also published as a private Claude artifact)']
  ],
  ideas: [
    /* ---------------------------------------------------------------- */
    {
      id: 'twin', sources: [["Challenge 9 brief", "https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/"], ["USGS known analog sites (validation set)", "https://www.usgs.gov/data/known-terrestrial-analog-sites-planetary-science"], ["Closest prior ML work: Meng et al. 2024", "https://arxiv.org/abs/2501.08584"], ["2025 global winners (none on analogs)", "https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/"]], short: 'Earth Twin', name: "Earth's Twin Finder", family: 'Earth ↔ Moon/Mars', chNum: '9',
      challenge: 'Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars',
      summary: 'Global 0.05° Earth grid scored against a Moon-base rim and Jezero on slope, roughness, albedo, thermal inertia proxy, diurnal ΔT, aridity and mineral class; every hit opens a radar chart of where the analogy holds and where it breaks.',
      scores: { impact: 4, creativity: 5, validity: 4, relevance: 5, presentation: 5 },
      scoreWhy: 'Hits the brief\'s own words (similarity ranking, systematic search, where the analogy breaks). Validity is 4 only with the tiered comparability scheme and the USGS validation run.',
      feasible: 'Yes', effortH: '60–70', dataEffort: 'Med', teamFit: 5, riskLevel: 3,
      coreData: 'MODIS CMG LST/NDVI/albedo, ASTER GED, LOLA slope maps, TES thermal inertia/albedo/minerals',
      risk: 'Cross-planet normalization: naive z-scores give confident nonsense; polar Moon targets lack some global maps.',
      res: {
        listed: 'Earthdata Search, Worldview, PDS, LRO, Diviner',
        other: 'Copernicus DEM (ESA), Global Aridity Index, USGS Known Analog Sites (validation), Artemis III regions, EMIT minerals for zoom',
        tools: 'Google Earth Engine/geemap, earthaccess, rasterio/xarray, scikit-learn, Streamlit or Leaflet + Plotly',
        sponsor: 'Planetary Computer / Google Cloud for Earth features; Azure or GoDaddy hosting; Copilot'
      },
      mvp: {
        must: '0.05° Earth feature stack; 2 targets (Artemis rim, Jezero); weighted similarity heatmap; top-20 table; radar breakdown per hit; fixed "Earth cannot do this" row; USGS validation number',
        nice: 'Weight sliders; third target; "Hungary\'s best Mars analog" card; EMIT zoom',
        cut: 'Deep-learning image embeddings, CRISM, 30 m resolution, caves',
        demo: 'Click Jezero → Earth lights up → zoom to a surprise hit → radar shows green match axes, red break axes → "X % of known analogs in our top 5 %"'
      },
      roles: [['Bence', 'Earth feature stack in GEE, similarity engine, validation'], ['Patrik', 'Moon/Mars target vectors, pipeline, deploy'], ['Benedek', 'Feature physics, tier table, "where it breaks" text, pitch'], ['Yhair', 'Dashboard: map, radar, top-N table']],
      data: [['MOD11C3 LST 0.05°', 'https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod11c3-061'], ['MOD13C2 NDVI 0.05°', 'https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061'], ['MCD43C3 albedo', 'https://www.earthdata.nasa.gov/data/catalog/lpcloud-mcd43c3-061'], ['ASTER GED emissivity', 'https://www.earthdata.nasa.gov/data/catalog/lpcloud-ag1km-003'], ['LOLA slope / Hurst (PGDA)', 'https://pgda.gsfc.nasa.gov/products/70'], ['Mars TES data (ASU)', 'https://www.mars.asu.edu/data/'], ['USGS Known Terrestrial Analog Sites', 'https://www.usgs.gov/data/known-terrestrial-analog-sites-planetary-science', 'validation set'], ['Artemis III regions', 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/']],
      prior: ['USGS analog catalogue, ESA Catalogue of Planetary Analogues, Europlanet field sites: lists, not searches', 'Meng et al. 2024 CNN analog search: one region, image only', 'No published global multi-feature Earth-wide search with per-dimension breakdown found', 'Challenge is new in 2026: many teams will submit "Atacama story" entries'],
      risks: [['Normalization attack on Validity', 'Tier A raw physics / Tier B within-planet percentiles / Tier C class match; show it in the UI'], ['Spurious hits (salt flats, ice, clouds)', 'Masks + human check of top 50'], ['Account latency (GEE, Earthdata)', 'Register now; CMG files via earthaccess as fallback'], ['Numbers still changing on Sunday', 'Freeze outputs Sun 08:00']],
      pros: ['Answers the full brief: discovery + explanation', 'No past global winner on this topic', 'Benedek\'s geophysics is the natural defence; analog-astronaut juror is in Budapest', 'Very visual 30 s arc'],
      cons: ['Validity hinges on a careful comparability argument', 'Heavy data prep on Saturday (GEE export)', 'Tight: ~65 h of ~68 available'],
      verdict: 'Build',
      checks: { fits: 1, nasa: 1, data: 0.5, demo: 1, skills: 1, novel: 1, local: 1, video: 1 },
      report: '../04-feasibility-earth-twin.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'navigator', sources: [["Challenge 2 brief", "https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/"], ["NASA POWER API (tested 0.84 s)", "https://power.larc.nasa.gov/docs/services/api/temporal/"], ["Competitor: Microsoft/NASA Earth Copilot", "https://github.com/microsoft/Earth-Copilot"], ["FDR for trend maps: Wilks 2016", "https://doi.org/10.1175/BAMS-D-15-00267.1"]], short: 'Navigator', name: 'Earth Science Research Navigator', family: 'Earth observation', chNum: '2',
      challenge: 'Be An Earth System Trend Detective!',
      summary: '"Is southern Peru getting drier?" → AI picks variables from a curated catalogue with why/limitation cards → significance-tested trend maps (corrected Mann-Kendall, Sen slope, FDR) → reproducible export.',
      scores: { impact: 5, creativity: 4, validity: 4, relevance: 5, presentation: 5 },
      scoreWhy: 'Combined version estimated 23–24. Validity comes from autocorrelation-corrected tests and FDR; the LLM only routes and explains, never computes.',
      feasible: 'Yes', effortH: '65–70', dataEffort: 'Med', teamFit: 4, riskLevel: 3,
      coreData: 'NASA POWER API, GPM IMERG, GLDAS, MOD13C2 NDVI, GRACE/GRACE-FO',
      risk: 'Regional data cubes take longer than planned; Azure OpenAI quota surprises.',
      res: {
        listed: 'Giovanni (cross-check), AppEEARS (optional pre-fetch), KNMI Climate Explorer (method comparison); Hydrology Data Rods is being discontinued',
        other: 'NASA POWER, GPM IMERG, GLDAS, MOD13C2, GRACE mascons, MERRA-2',
        tools: 'earthaccess, xarray, pymannkendall, scipy, statsmodels, Streamlit + Plotly, OpenAI-compatible function calling',
        sponsor: 'Azure OpenAI (≈ €1–5), Azure App Service + Blob, Copilot, GoDaddy domain (DNS only)'
      },
      mvp: {
        must: '3 regions (southern Peru, Hungary Homokhátság, one more) × 5 variables; variable cards; deseasonalized series + Sen line; corrected MK p-value; FDR-stippled map; CSV + methods export; question box with wizard fallback',
        nice: 'Period slider, Giovanni overlay, Spanish/Hungarian UI, notebook download',
        cut: 'Arbitrary regions, live AppEEARS, SMAP trends, ML forecasts',
        demo: 'Type the question → variable cards slide in → Peru map turns brown with stippled significant pixels → "Reproduce" downloads notebook'
      },
      roles: [['Patrik', 'Data cubes, Earthdata, deploy'], ['Bence', 'Statistics module + LLM layer with number guard'], ['Benedek', 'Variable cards, literature check, pitch'], ['Yhair', 'POWER loader, dashboard, export, Spanish strings']],
      data: [['NASA POWER API', 'https://power.larc.nasa.gov/docs/services/api/temporal/', 'no login, 0.8 s'], ['GPM IMERG monthly V07', 'https://www.earthdata.nasa.gov/data/catalog/ges-disc-gpm-3imergm-07', 'ends 2025-09'], ['Giovanni', 'https://giovanni.gsfc.nasa.gov/'], ['AppEEARS', 'https://appeears.earthdatacloud.nasa.gov/'], ['Planetary Computer MODIS', 'https://planetarycomputer.microsoft.com/api/stac/v1/collections/modis-13A1-061']],
      prior: ['NASA/Microsoft Earth Copilot (now Planetary Explorer) does natural-language EO search: direct competitor to a chat-only version', 'Giovanni has no significance testing; KNMI is expert-only', 'No past winner combining trend significance with a student guide'],
      risks: [['Data cubes slip', 'Fallback: POWER + GRACE only'], ['LLM invents numbers', 'Only numbers from the stats engine are shown'], ['Azure OpenAI quota', 'Deploy model in the first hour; wizard works without it'], ['Sunday crunch', 'Freeze 12:00']],
      pros: ['Exactly the brief, incl. "significant"', 'Strong Validity story', 'Yhair\'s Peru angle + Hungarian drought region', 'LLM use is modern but safe'],
      cons: ['Crowded EO space; Earth Copilot exists', 'Tight hours', 'Less "space" wow than lunar ideas'],
      verdict: 'Build',
      checks: { fits: 1, nasa: 1, data: 1, demo: 1, skills: 1, novel: 0.5, local: 1, video: 0.5 },
      report: '../04-feasibility-trend-navigator.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'trail', sources: [["Challenge 10 brief", "https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/"], ["Gale 1 m DEM ImageServer (tested)", "https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer"], ["Curiosity traverse with tilt", "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json"], ["Prior art: Perseverance ENav", "https://arxiv.org/abs/2011.06022"]], short: 'Marswalk', name: 'Trailbreaker Marswalk Planner', family: 'Mars', chNum: '10',
      challenge: 'Interplanetary Survival Guide: Martian Map',
      summary: 'Layered map of a 3×3 km area around Curiosity at Mount Sharp: 1 m HiRISE DEM slope, THEMIS sand/rock proxy, weather; least-cost routes plus 1,000 Monte Carlo walkers that show how dust storms narrow the safe corridor.',
      scores: { impact: 4, creativity: 4, validity: 4, relevance: 5, presentation: 4 },
      scoreWhy: 'Hybrid estimated 21. The full Trailbreaker (calibrated AI verdicts) drops to 16 because no orbital ground-truth labels exist.',
      feasible: 'Yes', effortH: '55–65', dataEffort: 'Low', teamFit: 3, riskLevel: 3,
      coreData: 'Mars Trek Gale DEM 1 m ImageServer, HiRISE/CTX tiles, THEMIS night IR, Curiosity traverse + weather',
      risk: 'Monte Carlo speed and map projection bugs; astronaut limits need sourcing.',
      res: {
        listed: 'Mars Trek, USGS geologic maps, Curiosity Mount Sharp route example, Perseverance raw images',
        other: 'Curiosity traverse with measured tilt (slope validation), MSL weather feed, DONKI',
        tools: 'rasterio, numpy, scikit-image least-cost path, Leaflet',
        sponsor: 'Azure for batch runs; static build on GoDaddy or Azure Static Web Apps; Copilot'
      },
      mvp: {
        must: 'Slope + hazard layers for 3×3 km; least-cost route to boxwork; Monte Carlo heatmap; scenario sliders; slope check against Curiosity tilt',
        nice: 'Astronaut vs rover modes, raw image popups',
        cut: 'Per-tile AI verdicts, Jezero, onboard autonomy claims',
        demo: '1,000 walkers stream toward the boxwork; dust-storm slider narrows the corridor and the safe-return rate drops'
      },
      roles: [['Patrik', 'Data pulls, integration'], ['Bence', 'Cost model, routing, Monte Carlo, tilt validation'], ['Benedek', 'Science story, EVA limits, pitch'], ['Yhair', 'Front end, panels']],
      data: [['Gale DEM 1 m ImageServer', 'https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer'], ['Mars Trek', 'https://trek.nasa.gov/mars/'], ['Curiosity traverse JSON', 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json'], ['MSL weather feed', 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json', 'to 2026-08-25'], ['AI4Mars (rover-view labels only)', 'https://zenodo.org/records/15995036']],
      prior: ['Perseverance ENav / MLNav already do onboard decisions: avoid claiming that', 'JPL orbital traversability tools exist; retarget to suited astronauts', 'No 2023–2025 Mars-route global winner found'],
      risks: [['Unsourced EVA limits', 'Benedek sources Apollo / xEVA values, show as adjustable'], ['Live services fail', 'Pre-download, ship static build'], ['Weather ends Aug 2026', '"Latest sol" + scenarios'], ['Scope creep', 'One area, one target']],
      pros: ['Strong relevance; data access is easy', 'Rover tilt gives real validation', 'Visually striking simulation'],
      cons: ['Mars is a step away from the team\'s lunar/EO profile', 'Main AI claim already done by JPL', 'No Hungarian hook'],
      verdict: 'Consider',
      checks: { fits: 1, nasa: 1, data: 1, demo: 1, skills: 0.5, novel: 0.5, local: 0, video: 1 },
      report: '../04-feasibility-trailbreaker.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'salvage', sources: [["Challenge 1 brief", "https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/"], ["LROC human-made objects (71, parsed)", "https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_ANTHROPOGENIC_OBJECTS"], ["Prior art: Patil et al. 2026", "https://doi.org/10.1016/j.jik.2026.101049"], ["One Small Step Act 2020", "https://www.congress.gov/116/plaws/publ275/PLAW-116publ275.htm"]], short: 'Moon Salvage', name: 'Moon Salvage or Museum?', family: 'Moon · storytelling', chNum: '1',
      challenge: "Abandoned but not Forgotten: NASA's Discarded Equipment",
      summary: '3D Moon with all 71 human-made objects from the LROC catalogue; 12–15 hero cards; a kids\' story loop: "It\'s 2040 and your base needs aluminium. Recycle or preserve?" grounded in the Artemis Accords heritage clause.',
      scores: { impact: 4, creativity: 4, validity: 4, relevance: 5, presentation: 4 },
      scoreWhy: 'Story version estimated 21–22. The original engineering recycling tool scores 13: wrong audience, unsourced material numbers, recent prior paper.',
      feasible: 'Yes', effortH: '55–70', dataEffort: 'Low', teamFit: 3, riskLevel: 2,
      coreData: 'LROC anthropogenic-objects shapefile (71 objects), NSSDCA masses, NASA 2012 artifact catalogue',
      risk: 'Content curation is the bottleneck; heritage ethics framing.',
      res: {
        listed: 'NSSDCA + all listed Moon and Mars hardware pages',
        other: 'LROC shapefile, NASA History catalogue, Moon/Mars Trek tiles, SVS Moon kit, NASA-3D-Resources models, Artemis Accords §9/§10, One Small Step Act',
        tools: 'Three.js, model-viewer, Vite, Python shapefile → JSON',
        sponsor: 'Azure Static Web Apps (free), optional Azure OpenAI narrator / Speech, GoDaddy domain'
      },
      mvp: {
        must: 'Globe with 71 pins; 12–15 hero cards; recycle-or-preserve story loop with consequences; ending citing heritage law',
        nice: 'Mars tab, narration, junk-drawer gallery, Hungarian toggle',
        cut: 'Engineering yield model',
        demo: 'Kid taps Apollo 11 → "Recycle or preserve?" → heritage alert → museum vs base ending'
      },
      roles: [['Patrik', 'Globe, card UI, deploy'], ['Bence', 'Data script, masses, optional AI narrator'], ['Benedek', 'Story script, science facts, video'], ['Yhair', 'Curation sheet with sources, scoring, backup deck']],
      data: [['LROC anthropogenic objects', 'https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_ANTHROPOGENIC_OBJECTS', 'parsed: 71 objects'], ['NASA catalogue of manmade material', 'https://history.nasa.gov/FINAL%20Catalogue%20of%20Manmade%20Material%20on%20the%20Moon.pdf'], ['NSSDCA', 'https://nssdc.gsfc.nasa.gov/'], ['SVS CGI Moon Kit', 'https://svs.gsfc.nasa.gov/4720'], ['One Small Step Act', 'https://www.congress.gov/116/plaws/publ275/PLAW-116publ275.htm']],
      prior: ['Artifact maps exist (NASA, For All Moonkind registry): pins alone are not novel', 'Patil et al. 2026 ranks lunar equipment for recycling (hits the engineering version)', 'Past Storytelling winners were all narrative/game formats for kids'],
      risks: [['"Recycle Eagle" reads as destroying heritage', 'Protected sites trigger heritage logic, framed as an open question'], ['Fake-precise material numbers', 'Badge them as estimates'], ['Scope creep into Mars', 'Mars only as stretch']],
      pros: ['Easiest data, lowest risk', 'Fits Storytelling / Inspirational awards', 'Keeps the circular-economy theme the team liked'],
      cons: ['Education product; less use of AI/data skills', 'Needs strong writing + design', 'Drops the B2B/engineering angle'],
      verdict: 'Consider',
      checks: { fits: 1, nasa: 1, data: 1, demo: 1, skills: 0.5, novel: 0.5, local: 0, video: 1 },
      report: '../04-feasibility-moon-salvage.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'ground', sources: [["Challenge 5 brief", "https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/"], ["NISAR data user guide", "https://nisar-docs.asf.alaska.edu/"], ["EGMS ground motion service", "https://egms.land.copernicus.eu/"], ["Prior art: ESA RailSAT", "https://business.esa.int/projects/railsat"]], short: 'Ground Motion', name: 'Budapest Ground-Motion Explorer', family: 'Earth observation · SAR', chNum: '5',
      challenge: 'Dancing with the SARs',
      summary: 'Railways and buildings in Budapest: NISAR L-band interferograms (66 pairs over the city, Jun–Oct 2026) as the hero visual, EGMS 2020–2024 Sentinel-1 velocities for the long-term trend, hotspot ranking along rail line 1.',
      scores: { impact: 4, creativity: 4, validity: 4, relevance: 4, presentation: 4 },
      scoreWhy: 'Merged rail + buildings estimated 20–21. Validity depends on honest "what 80 m NISAR can and cannot show".',
      feasible: 'Yes', effortH: '45–60', dataEffort: 'Low', teamFit: 5, riskLevel: 2,
      coreData: 'NISAR GUNW / GCOV provisional over Budapest (ASF), EGMS (Copernicus)',
      risk: '80 m NISAR over ~4 months cannot show mm/yr settlement; judges may see EGMS (ESA) as the real engine.',
      res: {
        listed: 'ASF Vertex, NISAR Data User Guide, Intro to SAR, NISAR StoryMaps, Applications White Papers',
        other: 'EGMS ground motion, OpenStreetMap rail lines, SMAP/GPM drivers',
        tools: 'asf_search, earthaccess, h5py, MintPy, geopandas, MapLibre/deck.gl, Power BI',
        sponsor: 'Azure VM + Blob for ~25 GB, Static Web Apps or GoDaddy, Copilot'
      },
      mvp: {
        must: 'EGMS velocities on Budapest rail + line 1 with top-10 hotspots; NISAR GUNW stack on one track; click a segment to compare both time series; physics/limits slide',
        nice: 'Asc/desc decomposition, SMAP correlation, Power BI asset view',
        cut: 'Own PS-InSAR processing, ML, nationwide scale',
        demo: 'Zoom into the red/green rail network; click a red segment: 5-year EGMS curve and 2026 NISAR curve agree'
      },
      roles: [['Patrik', 'Accounts, data schema, web map, deploy'], ['Bence', 'NISAR GUNW subset + displacement series'], ['Benedek', 'Area choice, physics, validity slide, pitch'], ['Yhair', 'EGMS + OSM, hotspot ranking, Power BI']],
      data: [['ASF Vertex (NISAR)', 'https://search.asf.alaska.edu/'], ['NISAR Data User Guide', 'https://nisar-docs.asf.alaska.edu/'], ['EGMS', 'https://egms.land.copernicus.eu/', 'EU Login likely']],
      prior: ['Commercial rail InSAR is mature (TRE Altamira, SkyGeo)', 'Budapest-wide PS-InSAR studies exist, none rail-specific found', 'First L-band NISAR look at Hungary is a real hook'],
      risks: [['Provisional NISAR data', 'Present as "provisional first look", coherence mask'], ['2.3 GB files', 'Azure VM in West Europe, ≤10 pairs'], ['EGMS login friction', 'Register now, manual export fallback'], ['Over-claiming', '"What we can / cannot claim" slide']],
      pros: ['Best skill match (Benedek\'s geophysics + GIS)', 'Strong local impact story for Budapest', 'Data verified over the city today', 'Lowest data risk'],
      cons: ['Mature commercial market lowers Creativity', 'Long-term signal comes from ESA, not NASA', 'Less "space" for a space-heavy jury'],
      verdict: 'Consider',
      checks: { fits: 1, nasa: 0.5, data: 1, demo: 1, skills: 1, novel: 0.5, local: 1, video: 0.5 },
      report: '../04-feasibility-sar-pollen.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'pollen', sources: [["Radar flowering only shown for rapeseed: Han et al. 2021", "https://doi.org/10.3390/rs13010105"], ["CAMS pollen via Open-Meteo", "https://open-meteo.com/en/docs/air-quality-api"], ["Challenge 5 brief", "https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/"]], short: 'Pollen', name: 'Pollen & Bee EO Monitor', family: 'Earth observation', chNum: '5',
      challenge: 'Dancing with the SARs (Field Shift fits poorly)',
      summary: 'Hyperlocal pollen-source activity + wind dispersion map. Only defensible form today: an August 2026 ragweed season replay using NISAR to flag stubble/fallow fields as ragweed habitat.',
      scores: { impact: 4, creativity: 4, validity: 2, relevance: 3, presentation: 4 },
      scoreWhy: 'Estimated 17: broad appeal but the radar → flowering link is unproven for trees and ragweed, and there is no pollen season in November.',
      feasible: 'Partly', effortH: '60–75', dataEffort: 'Med', teamFit: 3, riskLevel: 4,
      coreData: 'NISAR GCOV, MODIS/VIIRS NDVI, CAMS pollen via Open-Meteo',
      risk: 'No proven radar flowering signal; only an 11 km model to validate against.',
      res: {
        listed: 'ASF Vertex, NISAR guide, Earthdata Search, StoryMaps',
        other: 'Copernicus land-cover layers, NASA POWER degree days, Open-Meteo CAMS pollen, Meteomatics wind',
        tools: 'asf_search, xarray, rasterio, numpy dispersion, MapLibre/Streamlit',
        sponsor: 'Meteomatics, Azure VM, GoDaddy, Copilot'
      },
      mvp: {
        must: 'Land-cover source map; NISAR stubble flag Jun–Sep 2026; 25 Aug wind plume calibrated to CAMS; time slider',
        nice: 'Beekeeper rapeseed layer, route exposure',
        cut: 'Species classifier, live alerts, trap data',
        demo: 'Slider to 25 Aug: fields light up, plume drifts over Budapest, 583 grains/m³'
      },
      data: [['Open-Meteo air quality (CAMS pollen)', 'https://open-meteo.com/en/docs/air-quality-api'], ['ASF Vertex (NISAR)', 'https://search.asf.alaska.edu/']],
      prior: ['Google, Airmine, CAMS pollen maps', '2025 BloomWatch teams, QUENARIS 2025 Local Impact winner', 'Radar flowering papers exist only for rapeseed'],
      risks: [['Unproven science', 'Ragweed habitat framing only'], ['No live season', 'Replay August 2026'], ['Trap data not open', 'Calibrate to CAMS']],
      pros: ['Wide public appeal; strong Hungarian ragweed story', 'Beekeeper angle is unusual'],
      cons: ['Weakest Validity', 'No live demo season', 'Crowded with 2025 BloomWatch entries'],
      verdict: 'Drop',
      checks: { fits: 0.5, nasa: 0.5, data: 0.5, demo: 0.5, skills: 0.5, novel: 0.5, local: 1, video: 1 },
      report: '../04-feasibility-sar-pollen.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'shield-solo', sources: [["SRAG 2026 SEP model validation", "https://ntrs.nasa.gov/citations/20260000463"], ["CCMC SEP Scoreboard", "https://ccmc.gsfc.nasa.gov/scoreboards/sep/"], ["CLEAR center (Artemis II)", "https://clear.engin.umich.edu/"], ["DONKI new host (tested)", "https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP"]], short: 'Shield API', name: 'Lunar Shield API (standalone)', family: 'Moon · space weather', chNum: '11',
      challenge: 'Lunar Landing Site Navigator',
      summary: 'Machine-to-machine service turning NOAA/NASA space-weather data into per-asset green/yellow/red risk, safe-mode actions and a restart window with hysteresis for lunar surface hardware.',
      scores: { impact: 4, creativity: 4, validity: 3, relevance: 2, presentation: 4 },
      scoreWhy: 'Our estimate: the brief is Sun/Earth geometry, power and comms, so Relevance is low when submitted alone. Forecasting itself is not novel.',
      feasible: 'Yes', effortH: '45–55', dataEffort: 'Low', teamFit: 4, riskLevel: 3,
      coreData: 'NOAA SWPC GOES protons, DONKI (new CCMC host), ISWA HAPI CRaTER, SEP Scoreboard',
      risk: 'Relevance: the challenge does not ask for radiation. Quiet Sun now: live demo needs a historical replay.',
      res: {
        listed: 'None of the challenge 11 resources (Quickmap, Moon Trek, Horizons) is central',
        other: 'SWPC JSON, DONKI, ISWA HAPI (CRaTER lunar dose), SEP Scoreboard, PGDA DEMs',
        tools: 'FastAPI, hapiclient, sphinxval, LightGBM, ROS 2 / foxglove-sdk for rover demo',
        sponsor: 'Azure Functions for polling + App Service; GoDaddy domain; Copilot'
      },
      mvp: {
        must: 'Live ingest; per-asset rule engine with hysteresis; replay of a historic SEP event; restart window; JSON alert endpoint; mini-rover reacts',
        nice: 'Terrain open-sky factor, ML SEP probability',
        cut: 'SDO CNN flare forecaster',
        demo: 'Replay Oct 1989 / 2024 event: rover stops drilling, LED red, restart window counts down'
      },
      data: [['DONKI API (new host)', 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP'], ['SWPC JSON', 'https://services.swpc.noaa.gov/json/'], ['ISWA HAPI', 'https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/'], ['CCMC SEP Scoreboard', 'https://ccmc.gsfc.nasa.gov/scoreboards/sep/']],
      prior: ['NASA SRAG, M2M office, CCMC SEP Scoreboard, CLEAR (Artemis II) cover forecasting', 'Space weather won 5 global awards 2022–2025', 'No lunar space-weather-as-a-service API or lander mode-switch practice found'],
      risks: [['Off-brief for challenge 11', 'Even as a Slip Day layer it scores only 17; keep the restart idea as future work in the pitch'], ['"Commercial product" rule', 'Pitch as capability, not product'], ['No live event this weekend', 'Historic replay']],
      pros: ['Team\'s favourite idea; restart window is genuinely open', 'Physical rover demo precedent (2022 Art & Tech)', 'All data keyless and verified'],
      cons: ['Weak Relevance to any 2026 challenge', 'Forecasting part already done by NASA', 'Hardware demo adds build risk'],
      verdict: 'Drop',
      checks: { fits: 0, nasa: 1, data: 1, demo: 1, skills: 1, novel: 0.5, local: 0.5, video: 1 },
      report: '../02-lunar-shield-science.md'
    }
    ,
    /* ---------------------------------------------------------------- */
    {
      id: 'slipday', sources: [["Challenge 11 brief", "https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/"], ["LOLA polar DEM used", "http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/"], ["Illumination maps (validation, r = 0.977)", "http://imbrium.mit.edu/EXTRAS/ILLUMINATION/"], ["IM-2 landing site (LROC)", "https://www.lroc.asu.edu/images/1401"]], short: 'Slip Day', name: 'Slip Day', family: 'Moon · mission planning', chNum: '11',
      challenge: 'Lunar Landing Site Navigator',
      summary: 'Every south-pole site × every day: sunlit %, longest darkness, Earth-visible hours, time to sunset/Earthset, slope and power from a LOLA horizon mask + SPICE ephemeris. GO / MARGINAL / NO-GO with ensemble confidence; "launch slipped N days" re-ranks instantly.',
      scores: { impact: 3, creativity: 3, validity: 5, relevance: 5, presentation: 4 },
      scoreWhy: 'Estimated 20. Covers every objective in the brief and is already validated against NASA\'s illumination map (r = 0.977). Creativity is capped: many teams will plot Sun/Earth az/el.',
      feasible: 'Yes', effortH: '50–60 (engine ~70 % done)', dataEffort: 'Low', teamFit: 4, riskLevel: 1,
      coreData: 'LOLA LDEM_80S_80M polar DEM, NAIF SPICE kernels, JPL Horizons, Mazarico illumination maps (validation)',
      risk: 'Near-grazing Sun (0–2° elevation): small DEM errors flip sunlit/dark. Mitigated by a landing-ellipse ensemble.',
      res: {
        listed: 'Horizons (cross-check, custom sites), QuickMap (digitize Artemis regions), Moon Trek (3D deep links)',
        other: 'PGDA 5 m site DEMs with uncertainty clones, SVS 4930 illumination movies, CSA Moon Exploration',
        tools: 'spiceypy, numpy, rasterio, Streamlit + Plotly',
        sponsor: 'Azure for precompute + hosting; GoDaddy domain; Copilot'
      },
      mvp: {
        must: '~12 sites + custom lat/lon; hourly Sun/Earth table 2026-12 → 2028-12; per site×day metrics; GO/MARGINAL/NO-GO with thresholds and ensemble confidence; site×date heatmap; slip slider; sky plot with horizon and Sun/Earth tracks',
        nice: 'PGDA 5 m near-field + uncertainty confidence; educator mode; static open-sky column',
        cut: 'Kev/Jev LLM decision model, live radiation, non-polar DEM',
        demo: 'Launch slips 9 days → heatmap re-ranks → Mons Mouton drops, Shackleton rim becomes GO; sky plot shows the Sun skimming the ridge'
      },
      roles: [['Patrik', 'Package the engine, run the precompute'], ['Bence', 'Validation notebook, confidence ensemble, scoring rule'], ['Benedek', 'Site list, science panels, pitch, video'], ['Yhair', 'Streamlit UI: heatmap, slip slider, sky plot']],
      data: [['LOLA polar DEM LDEM_80S_80M', 'http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/', '115 MB, tested'], ['NAIF SPICE kernels', 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/'], ['JPL Horizons API', 'https://ssd.jpl.nasa.gov/api/horizons.api', 'coord@301 tested'], ['Illumination maps (validation)', 'http://imbrium.mit.edu/EXTRAS/ILLUMINATION/'], ['PGDA 5 m site DEMs', 'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/'], ['QuickMap', 'https://quickmap.lroc.asu.edu/']],
      prior: ['QuickMap, Moon Trek, Horizons exist but are hard for quick comparisons (the brief\'s own point)', 'Many teams will plot Sun/Earth angles; the slip re-ranking + validated confidence is the differentiator', 'IM-2 landed on Mons Mouton carrying Puli Space\'s instrument: a hook for the Puli CEO on the jury'],
      risks: [['Grazing-Sun errors', 'Ellipse ensemble, cite Barker 2021'], ['Horizons has no CORS', 'Precompute tables; optional proxy'], ['No official Artemis region coordinates', 'Digitize in QuickMap, label "approx."'], ['Artemis III is now an Earth-orbit test', 'Say "Artemis crewed-landing candidate regions"']],
      pros: ['Working, validated core already exists (prototype in research/prototypes/slip-day)', 'Maximum Relevance and Validity', 'Lowest technical risk of all ideas', 'Strong local hook (Puli Space on IM-2)'],
      cons: ['Lower Creativity: expect similar entries', 'Less AI than the team hoped (LLM model dropped)', 'Polar only in the MVP'],
      verdict: 'Build',
      checks: { fits: 1, nasa: 1, data: 1, demo: 1, skills: 1, novel: 0.5, local: 1, video: 1 },
      report: '../04-feasibility-slip-day-lunar.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'slipday-shield', sources: [["Terrain dose maps: Phipps et al. LPSC 2024", "https://www.hou.usra.edu/meetings/lpsc2024/pdf/1513.pdf"], ["LOLA sky-visibility map", "http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/"], ["NOAA GOES protons JSON", "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-7-day.json"]], short: 'Slip Day + Shield', name: 'Slip Day + Lunar Shield layer', family: 'Moon · mission planning', chNum: '11',
      challenge: 'Lunar Landing Site Navigator',
      summary: 'Slip Day plus a terrain open-sky fraction column and a "today\'s space weather" panel from NOAA GOES protons, optionally a safe-mode / restart rule backtested on a historic event.',
      scores: { impact: 3, creativity: 4, validity: 3, relevance: 4, presentation: 3 },
      scoreWhy: 'Estimated 17. Live SEP status means nothing for a landing date weeks away, and terrain only shields 2–8 % at real landing sites (open-sky 0.92–0.98 in our runs). Two messages in one 30 s video.',
      feasible: 'Partly', effortH: '75–90', dataEffort: 'Med', teamFit: 4, riskLevel: 3,
      coreData: 'Slip Day data + NOAA SWPC GOES protons, DONKI, LOLA sky-visibility map',
      risk: 'Scientific coherence: judges will spot that live radiation does not belong in landing-date planning.',
      res: {
        listed: 'Same as Slip Day',
        other: 'SWPC GOES integral protons (CORS open), DONKI, LOLA SKYV map, Phipps et al. LPSC 2024',
        tools: 'Slip Day stack + requests-cache',
        sponsor: 'Azure Functions timer caching SWPC/DONKI every 15 min'
      },
      mvp: {
        must: 'All of Slip Day + static open-sky column + operations-time space-weather panel',
        nice: 'Restart hysteresis rule backtested on May 2024 SEP',
        cut: 'Directional SEP shielding, ML forecasting',
        demo: 'Slip demo, then "and today: proton flux 0.23 pfu, all clear". Risk: two stories in 30 s'
      },
      data: [['SWPC GOES protons JSON', 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-7-day.json'], ['DONKI', 'https://ccmc.gsfc.nasa.gov/tools/DONKI/'], ['LOLA polar DEM', 'http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/']],
      prior: ['Terrain shielding published by Phipps, Stubbs et al. (LPSC 2024)', 'SEP forecasting covered by NASA SRAG, CCMC Scoreboard'],
      risks: [['Off-message radiation layer', 'Keep only the static open-sky column'], ['DONKI flaky', 'Cache, register a key'], ['Scope', 'Add only if Slip Day is done by Sat midnight']],
      pros: ['Keeps the team\'s Lunar Shield idea alive', 'More original than plain Slip Day'],
      cons: ['Weakens Validity and the video story', 'Terrain effect is small at landing sites', '+25–30 person-hours'],
      verdict: 'Merge',
      checks: { fits: 0.5, nasa: 1, data: 0.5, demo: 0.5, skills: 1, novel: 0.5, local: 1, video: 0.5 },
      report: '../04-feasibility-slip-day-lunar.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'shield-game', sources: [["Challenge 3 brief (lists DONKI, RadLab)", "https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/"], ["RadLab dosimetry API", "https://visualization.osdr.nasa.gov/radlab/gui/data-api/"], ["Past winners 2021 to 2025", "https://www.spaceappschallenge.org/awards/"]], short: 'Shield Game', name: 'Lunar Shield outpost game', family: 'Moon · education', chNum: '3',
      challenge: 'Build a Junior Astronaut Mission Trainer',
      summary: 'Browser game for kids: run a lunar outpost with power, life support and shielding; real historic DONKI events trigger radiation storms; "this really happened" cards at the end.',
      scores: { impact: 3, creativity: 3, validity: 3, relevance: 4, presentation: 4 },
      scoreWhy: 'Estimated 17. Uses listed resources (DONKI, RadLab), but this entry-level challenge will draw many games, and the technical Budapest jury is less likely to reward it.',
      feasible: 'Partly', effortH: '55–70', dataEffort: 'Low', teamFit: 2, riskLevel: 3,
      coreData: 'DONKI historic events, RadLab dosimetry, NASA Open APIs',
      risk: 'Game feel and balancing for ages 7–12 with no game designer on the team.',
      res: {
        listed: 'DONKI, RadLab, NASA Open APIs, OSDR, CSA STEM toolkits',
        other: 'Slip Day sunlight calendar for real power, SWPC live link',
        tools: 'Phaser.js or plain JS/Canvas',
        sponsor: 'GoDaddy hosting (browser game), Copilot'
      },
      mvp: {
        must: '1 outpost, 3 resources, ~10 turns, embedded real DONKI events, shelter-vs-power trade-off, "what really happened" card',
        nice: 'Live space-weather button, real sunlight calendar, ISS dose comparison',
        cut: 'Mars mode, food system, multiplayer',
        demo: 'Kid taps "Shield up!", power drops, the real 10 May 2024 storm hits, crew safe'
      },
      data: [['DONKI', 'https://ccmc.gsfc.nasa.gov/tools/DONKI/'], ['RadLab', 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/'], ['NASA Open APIs', 'https://api.nasa.gov/']],
      prior: ['Trail to Mars (2021 Storytelling winner) was a radiation/crew game for 10–14 year olds', 'Space weather won 5 global awards 2022–2025'],
      risks: [['No game designer', 'Keep to 10 turns, one trade-off'], ['Too many numbers for kids', 'Real data on end cards only']],
      pros: ['Only challenge listing space-weather data', 'Fits Inspirational / Storytelling awards'],
      cons: ['Off-profile for an engineering/data team', 'Crowded youth challenge', 'Drops the B2B angle entirely'],
      verdict: 'Drop',
      checks: { fits: 1, nasa: 1, data: 1, demo: 0.5, skills: 0, novel: 0, local: 0, video: 1 },
      report: '../04-feasibility-slip-day-lunar.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'slipday-power', sources: [["Challenge 11 brief (names power generation)", "https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/"], ["Fincannon, NASA Glenn: 3–4 days darkness at 10 m (tested)", "https://ntrs.nasa.gov/api/citations/20205002224/downloads/Lunar%20Environment%20and%20Lunar%20Power%20Needs_2.pdf"], ["PGDA lunar polar illumination (Mazarico)", "https://pgda.gsfc.nasa.gov/products/69"], ["Ross et al. 2021, Towers on the Peaks of Eternal Light", "https://arxiv.org/abs/2102.11766"], ["Fincannon 2007, linked sites", "https://ntrs.nasa.gov/citations/20080045536"]], short: 'Slip Day + Power', name: 'Slip Day + Moon Power layer', family: 'Moon · mission planning', chNum: '11',
      challenge: 'Lunar Landing Site Navigator',
      summary: 'Slip Day plus a power layer: per site × day kWh/m² for a vertical tracking panel, longest night, battery size for a given load, and a mast-height selector (2/10/20 m). A small area heatmap around each site shows where a solar array would work best.',
      scores: { impact: 4, creativity: 4, validity: 5, relevance: 5, presentation: 4 },
      scoreWhy: 'Estimated 21–22 (vs 20 for Slip Day alone, a different agent: 1–2 points is noise). Challenge 11 asks for "power generation potential". Our engine reproduces NASA Glenn\'s 3–4 day darkness at 10 m (computed 86 h on the ridge). Fine-scale agreement with NASA\'s map is only r = 0.60 at 500 m spacing, so NASA\'s map stays the base layer.',
      feasible: 'Yes', effortH: '65–75 (Slip Day 50–60 + power 12–18)', dataEffort: 'Low', teamFit: 4, riskLevel: 2,
      coreData: 'Slip Day stack (LOLA DEM, SPICE, Horizons) + Mazarico average-visibility map, PGDA 5 m site DEMs, LROC WAC illumination map (check)',
      risk: 'Scope: about the whole 68 person-hours. Area heatmaps must be precomputed offline (5–30 min per region on 10 cores) and frozen by Sat 24:00.',
      res: {
        listed: 'QuickMap (Sun-visibility layers), Moon Trek, Horizons',
        other: 'Mazarico AVGVISIB 60 m map, LOLA 20 m DEM (460 MB), PGDA 5 m slope GeoTIFFs, LROC WAC illumination %',
        tools: 'spiceypy, numpy, rasterio, Plotly/Leaflet polar overlay, Streamlit',
        sponsor: 'Azure Blob for precomputed power cubes, Container Apps for the app; GoDaddy domain; Copilot'
      },
      mvp: {
        must: 'All of Slip Day + per site×day kWh/m², longest night, battery kWh for a user load, mast 2/10/20 m, small area heatmap (NASA static map)',
        nice: 'Precomputed monthly power grids for 2–3 regions; "partner site" map (second array that best covers the first one\'s nights)',
        cut: 'Thermal model, cable routing, ML, 3D globe',
        demo: 'Launch slips 3 weeks → Mons Mouton drops to MARGINAL (25-day night). Raise the mast to 10 m on the ridge → 3.6 days, same as NASA\'s own figure'
      },
      roles: [['Patrik', 'Power module from heat.py, overnight precompute'], ['Bence', 'Validation vs Mazarico, LROC WAC and Fincannon; partner-site map'], ['Benedek', 'Physics explainer, pitch, video'], ['Yhair', 'Heatmap panel, mast selector, battery sizer in the Slip Day UI']],
      data: [['Mazarico illumination maps', 'http://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/', 'tested'], ['PGDA 5 m site DEMs + slope', 'https://pgda.gsfc.nasa.gov/products/78', 'tested'], ['LROC WAC illumination % (south)', 'https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_POLE_ILL_PCT_SOUTH', 'tested'], ['LOLA polar DEMs', 'http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/', 'tested'], ['NAIF SPICE kernels', 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/']],
      prior: ['NASA Glenn already published a 30 m south-pole illumination + longest-darkness map at 10 m: a static heatmap alone is not new', 'Mazarico 2011, Gläser 2014/2018, Speyerer & Robinson 2013, Ross et al. 2021 (towers), Fincannon 2007 (linked sites 0.71 → 0.84)', 'Hardware concepts: NASA VSAT, Astrobotic LunaGrid', 'Space Apps 2021 "Find my Sun" (Earth solar siting) was a nominee, not a winner; no lunar solar-siting winner found'],
      risks: [['Fine-scale disagreement with NASA map (r = 0.60)', 'NASA map as base; label ours "scenario (80 m DEM)"; try 20 m DEM'], ['Over-claiming panel output', 'Efficiency (default 0.30) and load editable; label "upper bound"'], ['"NASA already has this map"', 'Credit Fincannon/Mazarico; differentiate on dates, mast, slip, partner site'], ['Scope', 'Freeze rule: no grid by Sat 24:00 → static map + per-site numbers']],
      pros: ['Turns "sunlit %" into kWh, battery hours and mast height: the numbers an operator sizes hardware with', 'Matches a published NASA number (credible)', 'About 90 % shared code with the validated Slip Day prototype', 'Mast slider + "only 0.07 km² gets > 80 % sun" are strong pitch hooks'],
      cons: ['Uses nearly all team hours', 'Strong prior art on static maps', 'Fine-scale accuracy of our 80 m engine is moderate'],
      verdict: 'Build',
      checks: { fits: 1, nasa: 1, data: 1, demo: 1, skills: 1, novel: 0.5, local: 1, video: 1 },
      report: '../04-feasibility-lunar-solar-farm.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'solarfarm', sources: [["Challenge 11 brief", "https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/"], ["Prior art: Fincannon, NASA Glenn 10 m map (tested)", "https://ntrs.nasa.gov/api/citations/20205002224/downloads/Lunar%20Environment%20and%20Lunar%20Power%20Needs_2.pdf"], ["PGDA lunar polar illumination", "https://pgda.gsfc.nasa.gov/products/69"], ["Gläser et al. 2018", "https://elib.dlr.de/119091"]], short: 'Moon Power Map', name: 'Moon Power Map (standalone solar-farm heatmap)', family: 'Moon · power', chNum: '11',
      challenge: 'Lunar Landing Site Navigator',
      summary: 'A south-pole heatmap of solar power potential (W/m², longest night, battery size) with mast-height scenarios, showing where a solar farm could go.',
      scores: { impact: 3, creativity: 3, validity: 4, relevance: 4, presentation: 4 },
      scoreWhy: 'Estimated 18. Clear visual and real physics, but NASA has published the same kind of map, and it covers only the power half of challenge 11 (no dates, no direct-to-Earth comms). Better merged into Slip Day.',
      feasible: 'Yes', effortH: '45–55', dataEffort: 'Low', teamFit: 4, riskLevel: 2,
      coreData: 'Mazarico average-visibility map, LOLA polar DEM, SPICE kernels',
      risk: 'Fine-scale accuracy: our 80 m engine agrees with NASA\'s map only at r = 0.60 on a 500 m grid.',
      res: {
        listed: 'QuickMap, Moon Trek, Horizons',
        other: 'PGDA 5 m site DEMs, LROC WAC illumination %',
        tools: 'numpy, spiceypy, rasterio, Plotly/Leaflet, Streamlit',
        sponsor: 'Azure Blob + Container Apps; GoDaddy domain; Copilot'
      },
      mvp: {
        must: 'Static heatmap (NASA map × 1361 W/m² × efficiency), slope mask, click a pixel for monthly kWh and longest night at 2/10/20 m, battery sizer',
        nice: 'Precomputed monthly grids for 2–3 regions, bifacial/fixed comparison',
        cut: 'Thermal, cables, ML, 3D globe',
        demo: '"Under 1 km² at 85–90°S gets > 70 % sun." Drag the mast from 2 m to 20 m: longest night drops from 8 days to 2'
      },
      roles: [['Patrik', 'Engine + precompute'], ['Bence', 'Validation'], ['Benedek', 'Physics explainer, pitch'], ['Yhair', 'Heatmap UI']],
      data: [['Mazarico illumination maps', 'http://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/', 'tested'], ['LOLA polar DEMs', 'http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/', 'tested'], ['PGDA 5 m site DEMs', 'https://pgda.gsfc.nasa.gov/products/78', 'tested']],
      prior: ['Fincannon (NASA Glenn) 30 m map with 10 m-mast darkness', 'Mazarico 2011, Gläser 2018, Ross et al. 2021'],
      risks: [['Prior art', 'Differentiate on scenarios'], ['Half the brief', 'Merge into Slip Day']],
      pros: ['Striking visual', 'Low data risk, all tested', 'Real physics a judge can check'],
      cons: ['Answers only half of challenge 11', 'NASA already published a similar map', 'Weaker than the merged version'],
      verdict: 'Merge',
      checks: { fits: 0.5, nasa: 1, data: 1, demo: 1, skills: 1, novel: 0, local: 0.5, video: 1 },
      report: '../04-feasibility-lunar-solar-farm.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'dc-heat', sources: [["Challenge 2 brief", "https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/"], ["FAS 2026: tracking hyperscale data centers", "https://fas.org/publication/tracking-hyperscale/"], ["Prior art: Marinoni et al. 2026 (preprint)", "https://arxiv.org/html/2603.20897v3"], ["Epoch AI data-center list (CC BY)", "https://epoch.ai/data/data_centers/data_centers.csv"], ["Planetary Computer Landsat C2 L2 (tested)", "https://planetarycomputer.microsoft.com/dataset/landsat-c2-l2"]], short: 'Cloud Heat', name: 'Heat & Light of the Cloud (AI data-center footprint)', family: 'Earth observation', chNum: '2',
      challenge: 'Be An Earth System Trend Detective!',
      summary: 'Trend detection of the physical footprint of AI data centers: land surface temperature, vegetation and night lights around 4–6 sites vs control sites, with Mann-Kendall significance tests. Includes a pre-construction baseline for the planned Paks AI campus.',
      scores: { impact: 4, creativity: 3, validity: 4, relevance: 5, presentation: 4 },
      scoreWhy: 'Estimated 20 standalone, 21–22 as the headline case of Research Navigator (same challenge). First test near Stargate Abilene: about +3.2 °C relative warming (computed, n = 4, site footprint not confirmed). Creativity capped by FAS, Marinoni and Epoch prior art.',
      feasible: 'Yes', effortH: '50–60', dataEffort: 'Med', teamFit: 4, riskLevel: 2,
      coreData: 'Landsat C2 L2 surface temperature/NDVI, ECOSTRESS LST, VIIRS Black Marble, HLS',
      risk: 'Attribution: construction-driven warming looks like waste heat. Use night LST, control sites and careful wording ("associated with").',
      res: {
        listed: 'AppEEARS, Giovanni, Mann-Kendall guides from the challenge page',
        other: 'Epoch AI site list and timelines, CSO Ireland data-center electricity statistics',
        tools: 'pystac-client, planetary-computer, rasterio/stackstac, xarray, pymannkendall, Streamlit',
        sponsor: 'Microsoft Planetary Computer (tested, no login), Azure for the API, GoDaddy domain, Copilot'
      },
      mvp: {
        must: '4–6 sites + 2 controls; Landsat summer LST + NDVI 2015–2026, site vs ring; Mann-Kendall + Sen\'s slope verdict; map + chart page; citation and AI disclosure panel',
        nice: 'ECOSTRESS night LST, Black Marble radiance trend, before/after opening test',
        cut: 'Water use, chip/compute estimates, commercial imagery, any national framing',
        demo: '2016 → 2026 slider: a field becomes a server campus while the LST trend climbs ("+X °C, significant"). Cut to Paks: "Baseline recorded."'
      },
      roles: [['Patrik', 'STAC pipeline, API, Azure deploy'], ['Bence', 'Trend statistics, control sites, night LST'], ['Benedek', 'Site footprints, physical interpretation, video'], ['Yhair', 'Map + charts, energy context, citations']],
      data: [['Landsat C2 L2 (Planetary Computer)', 'https://planetarycomputer.microsoft.com/dataset/landsat-c2-l2', 'tested'], ['ECOSTRESS ECO_L2T_LSTE', 'https://cmr.earthdata.nasa.gov/search/concepts/C2076090826-LPCLOUD.html', 'tested, Earthdata login'], ['VIIRS Black Marble VNP46A3', 'https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/VNP46A3/', 'tested, Earthdata login'], ['Epoch AI data centers', 'https://epoch.ai/data/data_centers/data_centers.csv', 'CC BY']],
      prior: ['Marinoni et al. 2026 measured data-center heat islands from satellites (preprint)', 'FAS 2026 tracks hyperscale sites with imagery', 'Epoch AI publishes site lists and timelines'],
      risks: [['Attribution of warming', 'Night LST, controls, cautious wording'], ['Site footprint errors', 'Check each polygon in imagery'], ['Earthdata login delays', 'Start with Landsat on Planetary Computer (no login)']],
      pros: ['Topical "AI\'s physical footprint" story', 'Direct ch. 2 fit with real statistics', 'Hungarian hook: Paks baseline', 'Merges naturally into Research Navigator'],
      cons: ['Published prior art', 'Attribution is hard', 'Paks campus status is a letter of intent (news, unverified)'],
      verdict: 'Merge',
      checks: { fits: 1, nasa: 1, data: 1, demo: 1, skills: 1, novel: 0.5, local: 1, video: 1 },
      report: '../04-feasibility-ai-datacenter-heat.md'
    },
    /* ---------------------------------------------------------------- */
    {
      id: 'gpu', sources: [["FAS 2026: imagery cannot directly observe GPUs", "https://fas.org/publication/tracking-hyperscale/"], ["Space Apps terms: must address a challenge; no discriminatory language", "https://www.spaceappschallenge.org/legal/"], ["The 14 challenges", "https://www.spaceappschallenge.org/2026/challenges/"]], short: 'GPU smuggling', name: 'Detect GPU smuggling from space (original sticky)', family: 'Earth observation', chNum: '–',
      challenge: 'None (no matching challenge)',
      summary: 'The original board sticky: detect chip smuggling from orbit. Kept here so the team can see why it was reframed.',
      scores: { impact: 2, creativity: 3, validity: 1, relevance: 1, presentation: 2 },
      scoreWhy: 'Estimated 9. Fits no 2026 challenge (submissions must address one), GPUs and shipments are invisible from orbit, and naming a nationality risks the conduct rules. See "Heat & Light of the Cloud" for the usable version.',
      feasible: 'No', effortH: 'n/a (core cannot be built)', dataEffort: 'High', teamFit: 2, riskLevel: 5,
      coreData: 'None measures the target; imagery only shows buildings',
      risk: 'The core signal (chips, shipments) cannot be observed from orbit.',
      res: { listed: 'None applicable', other: 'Landsat/Sentinel-2 (buildings only)', tools: '–', sponsor: '–' },
      mvp: { must: '–', nice: '–', cut: 'Everything that names a country or claims chip detection', demo: '–' },
      roles: [],
      data: [],
      prior: ['FAS 2026 explicitly says imagery cannot see indoor hardware'],
      risks: [['Ineligible', 'Reframe under ch. 2'], ['Discriminatory framing', 'Drop national targeting']],
      pros: ['Catchy, topical'],
      cons: ['No challenge fit', 'Not observable', 'Conduct-rule risk'],
      verdict: 'Drop',
      checks: { fits: 0, nasa: 0, data: 0, demo: 0, skills: 0.5, novel: 0.5, local: 0, video: 0.5 },
      report: '../04-feasibility-ai-datacenter-heat.md'
    }

  ]
};

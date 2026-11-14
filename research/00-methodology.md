# How this research was produced

Read this before trusting any number in `research/`, the dashboard or the Miro board. The team asked for every finding to
be checkable, so this file explains where each kind of claim comes from and how to verify it.

## Process (14 Nov 2026)

| Step | Who | Output | How to check it |
|---|---|---|---|
| 1. Read the team's idea docs | Claude Code | `CLAUDE.md` idea table | Compare with `ideas/*.docx` |
| 2. Map the hackathon | One research agent: fetched the 14 challenge pages, FAQ, submission guide, judging guide, terms, Global Offers and Budapest event page | `01-hackathon-map.md`, `space-apps-2026-map.html` | Every section names its source URL; the challenge text is quoted verbatim |
| 3. Lunar Shield deep dive | Two agents: science and prior art; data and tooling | `02-lunar-shield-science.md`, `02b-lunar-shield-data.md` | Inline citations; endpoints tagged [V] verified, [V-page] page loads, [U] unverified, [X] failed |
| 4. Past winners | Claude Code, from the team's CSV | `03-past-winners.md` | `hackathon/NASA Space Apps Global Winners 2021-2025 (CSV).csv` |
| 5. Feasibility per idea | Six agents, one per idea group, all given the same brief and the same four table formats | `04-feasibility-*.md` | Each report cites URLs and lists what it could not verify |
| 5b. Board additions | Two more agents, same brief: solar-farm heatmap, GPU-smuggling sticky (reframed) | `04-feasibility-lunar-solar-farm.md`, `04-feasibility-ai-datacenter-heat.md`, `prototypes/lunar-solar-farm/heat.py`, `prototypes/datacenter-heat/lst_test.py` | Rerun the scripts; heat.py prints r vs the Mazarico map |
| 6. Slip Day prototype | The Slip Day agent | `prototypes/slip-day/*.py` | Rerun `val.py`: compares the computed sunlit fraction with NASA's illumination map (reported r = 0.977, MAE 0.02 on 40 points) |
| 7. Synthesis | Claude Code | `dashboard/`, README table, Miro "Idea review" section | Each idea in `dashboard/data.js` has a `sources` list and a `report` link |

## Kinds of claims

| Label | Meaning | Example | Trust level |
|---|---|---|---|
| Tested | The agent fetched the URL or data on 14 Nov 2026 and it returned real content | NASA POWER API answered in 0.84 s | High, but services change; retest before the demo |
| Paper / official page | Taken from a cited publication or agency page | Terrain shielding ≥ 40 % inside craters (Phipps et al., LPSC 2024) | Open the link; conference abstracts are not peer reviewed |
| Computed | Our own calculation | Open-sky fraction 0.92 to 0.98 at landing sites (Slip Day prototype) | Reproducible from `prototypes/` |
| Estimate | An agent's judgement | Every 1 to 5 judging score, person-hours, "feasible by Sun 16:00" | Low: use for ranking discussion only |
| Unverified | Marked in the reports as not confirmed | "A similar topic won last year" (not found among global winners) | Check before using |

## How the scores were made

Each feasibility agent rated its idea 1 to 5 on the five official judging criteria (Impact, Creativity, Validity, Relevance,
Presentation; https://www.spaceappschallenge.org/resources/judging-awards-guide/), using the challenge text, the data checks,
prior art and the 2021–2025 winners. There is no jury data behind these numbers.

- Different agents scored different ideas, so their scales may not match exactly.
- Treat a difference of 1 to 2 points out of 25 as noise.
- The dashboard's "decision score" is a weighted mix of the judging estimate, feasibility, team fit, data ease and risk,
  with weights the team sets with sliders (`dashboard/app.js`, function `decision`). Team fit and risk were set by
  Claude Code from the reports and the team profiles in `CLAUDE.md`; adjust them in `data.js` if you disagree.

## Known limitations

- Agents can misread or over-summarize a source. Check every number that goes into the pitch or the video.
- Some sources are slides or abstracts (e.g. Whitman COSPAR 2026, Phipps LPSC 2024), and one figure (the Chang'e-4 daily dose) came from a news report.
- Several web pages refused automated fetches (USGS ScienceBase, the 2025 winners page in one run), so a few claims rest on secondary sources; the reports say which.
- Prior-art searches are not exhaustive. "No prior work found" means "not found in this search".

## Where the sources are

- Per idea: the `sources` list in `dashboard/data.js` (shown on each idea page under "Evidence") and the Miro idea cards.
- Per claim: inline links in each `research/*.md` report.
- Hackathon rules: `01-hackathon-map.md`, section headers give the page URLs.

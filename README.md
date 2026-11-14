<div align="center">

# Terra & Luna Analytics

**Our NASA Space Apps Challenge 2026 entry, built in Budapest**

*We use open NASA data about the Earth and the Moon to help people make concrete decisions.*

[![NASA Space Apps 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-0B3D91?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/2026/)
[![Local event](https://img.shields.io/badge/Local%20event-Budapest-E4572E?style=for-the-badge)](https://www.spaceappschallenge.org/2026/local-events/budapest/)
[![Theme](https://img.shields.io/badge/Theme-The%20Next%20Frontier-1d2c5e?style=for-the-badge)](https://www.spaceappschallenge.org/2026/)

[![Status](https://img.shields.io/badge/status-research%20%E2%86%92%20decision-orange?style=flat-square)](#status)
[![License](https://img.shields.io/badge/license-MPL--2.0-blue?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![NASA Open Data](https://img.shields.io/badge/data-NASA%20open%20data-0B3D91?style=flat-square)](#data-and-citations)
[![Built with Azure](https://img.shields.io/badge/hosted%20on-Azure-0078D4?style=flat-square&logo=microsoftazure&logoColor=white)](#tech-stack)
[![AI use disclosed](https://img.shields.io/badge/AI%20use-disclosed-8A2BE2?style=flat-square)](AI_USAGE.md)
[![Last commit](https://img.shields.io/github/last-commit/gabboraron/NASA_SpaceAppsChallange2026-Terra_and_Luna_Analytics?style=flat-square)](https://github.com/gabboraron/NASA_SpaceAppsChallange2026-Terra_and_Luna_Analytics/commits)

[About](#about) · [Status](#status) · [Candidate ideas](#candidate-ideas) · [Quick start](#quick-start) · [Repo layout](#repository-layout) · [Data](#data-and-citations) · [Team](#team)

</div>

## About

[Terra & Luna Analytics](https://www.spaceappschallenge.org/2026/find-a-team/terra-and-luna-analytics/) is a four-person team at the Budapest local event of the
[NASA International Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/), held 14 to 15 November 2026.
This repository holds our research, our decisions, and the solution we submit for judging.

> Final project: _to be announced once the team picks a challenge_<br>
> Demo video (30 s or less): _link added at submission_<br>
> Live app: _link added at submission_

## Status

| Phase | What | State |
|---|---|---|
| 1. Research | Map the hackathon and check every idea against data, prior art and past winners | Done |
| 2. Decision | Pick one idea and one challenge, logged in [`DECISIONS.md`](DECISIONS.md) | In progress |
| 3. Build | Implementation in `src/`, deployed to a public URL | Next |
| 4. Submit | 30 s video, project page, NASA data list, AI disclosure | Due Sun 15 Nov, 23:59 CET |

## Candidate ideas

The scores are our own research estimates. Each of the five judging criteria (Impact, Creativity, Validity, Relevance,
Presentation) is rated from 1 to 5. The [decision board](#quick-start) lets you explore and re-weight them.

| Idea | Challenge | Est. score | Verdict |
|---|---|:---:|:---:|
| Earth's Twin Finder: global search for Moon and Mars analogs on Earth | [Earth analogs](https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/) | 23/25 | Build |
| Earth Science Research Navigator: from a question to significance-tested trends | [Trend Detective](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/) | 23/25 | Build |
| Trailbreaker Marswalk planner | [Martian Map](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/) | 21/25 | Consider |
| Moon Salvage or Museum? | [Discarded Equipment](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/) | 21/25 | Consider |
| Slip Day: go/no-go for each south-pole site and day, validated prototype in `research/prototypes/slip-day` | [Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/) | 20/25 | Build |
| Budapest Ground-Motion Explorer (NISAR) | [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/) | 20/25 | Consider |
| Slip Day with a Lunar Shield layer | [Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/) | 17/25 | Merge |
| Lunar Shield API on its own | [Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/) | 17/25 | Drop |
| Lunar Shield outpost game | [Junior Astronaut Trainer](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/) | 17/25 | Drop |
| Pollen & Bee EO Monitor | [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/) | 17/25 | Drop |

## Quick start

```bash
git clone https://github.com/gabboraron/NASA_SpaceAppsChallange2026-Terra_and_Luna_Analytics.git
cd NASA_SpaceAppsChallange2026-Terra_and_Luna_Analytics
open research/dashboard/index.html      # macOS · on Linux: xdg-open, on Windows: start
```

The decision board in `research/dashboard/` is a single HTML/JS page that runs without a server or any install. It shows:
- a ranking you can re-weight with sliders;
- feasibility, scoring, resources and demo scope side by side;
- pros and cons, with a team vote;
- the 14 challenges with every NASA resource each one lists.

## Repository layout

```text
.
├── README.md              ← you are here
├── CLAUDE.md              ← project context for AI coding assistants (kept current)
├── DECISIONS.md           ← decision log: what we chose and why
├── AI_USAGE.md            ← AI ("SI") usage disclosure required by Space Apps
├── LICENSE                ← Mozilla Public License 2.0
├── research/
│   ├── 01-hackathon-map.md            rules, judging, awards, all 14 challenges + resources
│   ├── 02-lunar-shield-science.md     radiation physics, existing systems, gaps
│   ├── 02b-lunar-shield-data.md       live-verified space-weather & lunar data endpoints
│   ├── 03-past-winners.md             patterns in global winners 2021–2025
│   ├── 04-feasibility-*.md            one feasibility study per idea
│   ├── prototypes/slip-day/           horizon mask + SPICE ephemeris prototype (validated)
│   ├── space-apps-2026-map.html       visual hackathon map
│   └── dashboard/                     interactive decision board (open index.html)
├── hackathon/             ← official material (past winners CSV)
├── ideas/                 ← original idea documents
└── src/                   ← solution code (created after the decision)
```

## Tech stack

This is the planned stack; we confirm it once we have picked an idea.
- **Language and API:** Python 3.11 with FastAPI or Streamlit.
- **Data libraries:** `earthaccess`, `xarray` and `rasterio`.
- **Front end:** a static Leaflet, Plotly or Three.js page.
- **Hosting:** Azure App Service or Static Web Apps, using the domain from the GoDaddy Space Apps offer.
- **Coding assistant:** GitHub Copilot.

## Data and citations

Space Apps requires every source to be cited. The final solution will list each dataset here with its licence, and the
research files cite their sources inline. The candidate ideas draw on these NASA data and resources:
- NASA Earthdata (MODIS, GPM IMERG, GLDAS, GRACE-FO, NISAR via ASF DAAC)
- LRO LOLA, LROC and Diviner (PDS, PGDA)
- Moon Trek and Mars Trek
- JPL Horizons
- DONKI (CCMC)
- NASA POWER
- NSSDCA

## Team

| Member | Focus |
|---|---|
| Patrik P. Süli | Research, software architecture |
| Bence Majer | AI engineering, data science |
| Benedek Máté | Geophysics, pitching, technical writing |
| Yhair Sifuentes | Business intelligence, analytics, business model |

## AI use

Space Apps allows AI assistants. We use Claude Code and GitHub Copilot to help with research and code; the team came up
with the solution ideas. [`AI_USAGE.md`](AI_USAGE.md) records what each tool did and how we label AI output.

## License

The code is released under the [Mozilla Public License 2.0](LICENSE). Third-party data keeps its own licence, listed under
[Data and citations](#data-and-citations).

<div align="center"><sub>Made in Budapest for NASA Space Apps 2026 · not affiliated with or endorsed by NASA</sub></div>

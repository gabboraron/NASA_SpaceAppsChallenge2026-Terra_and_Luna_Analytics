---
name: project-context
description: Background on the NASA Space Apps Challenge 2026 project (goals, challenge chosen, team conventions). Use when starting work or when unsure about project scope.
---

# NASA Space Apps Challenge 2026: Nyírség Pollination Marketplace

- **Challenge:** to be confirmed by the team (not recorded yet; ask before writing it anywhere).
- **Goal / deliverable:** a localhost-or-Docker web map for the Nyírség (NE Hungary) that matches migratory
  beekeepers with orchard, sunflower and black-locust parcels. It shows weekly bloom state (HLS NDYI, POWER GDD),
  drought / low-nectar flags (SMAP L4), Natura 2000 blocks and warnings, explainable matches, and a move-economics
  calculator. Demo years: 2022 (drought) vs 2024.
- **Plan:** `docs/implementation_plans/nasa_space_apps_48_hour_hackathon_mvp_planv3.md` (decisions D1–D24, WP0–WP25,
  one GitHub issue per WP). The business brief is owned by the pitch team.
- **Tech stack:** Python 3.12, uv, FastAPI, pydantic, httpx, shapely/pyproj, earthaccess/rasterio/h5py;
  React + Vite + TS + MapLibre + Terra Draw; Docker Compose (api + nginx web).
- **Conventions:** see `CLAUDE.md` (uv only, pyright strict, Conventional Commits, provenance on every value,
  synthetic actors labelled, live-data checks for NASA clients).

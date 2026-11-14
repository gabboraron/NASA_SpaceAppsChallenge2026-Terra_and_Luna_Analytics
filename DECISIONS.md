# Decisions log

Build-level decisions (D1–D24) are in the
[implementation plan](docs/implementation_plans/nasa_space_apps_48_hour_hackathon_mvp_planv3.md#1-decisions-log-from-design-review).

| Date | Decision | Why | Who |
|---|---|---|---|
| 2026-11-14 | Build the **Nyírség Pollination Marketplace** (grew out of the Pollen & Bee EO Monitor idea); other candidate ideas (incl. Lunar Shield API, Slip Day, Trailbreaker) dropped | Team choice after the research phase | Team |
| 2026-11-14 | Follow the 48-hour MVP plan v3; one GitHub issue per work package | Parallel work across DATA / ENGINE / FRONT tracks | Team |
| 2026-11-14 | NASA POWER requests and cache keys snap to the MERRA-2 grid (0.5° lat × 0.625° lon), not 0.5° (amends plan D21) | Live check: 0.5° snapping returned a neighbouring cell's data | Patrik P. Süli |
| 2026-11-14 | Repo scoped to this project only; research files for the other ideas removed (still in git history) | Repo is the submission and should show only the chosen solution | Patrik P. Süli |
| 2026-11-14 | Docker Compose stack (api + nginx web) so the system builds and runs anywhere | Easy setup for teammates and judges; plan D24 keeps localhost as the demo target | Patrik P. Süli |
| _pending_ | Target challenge | | |

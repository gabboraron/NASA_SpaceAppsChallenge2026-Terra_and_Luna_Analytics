# Going live: plan

Goal: the deployed app serves the latest season from NASA without a person warming it, and says honestly how fresh each value is.

## Where we are (main, after #80)

- `latest_season(today)` adds the newest **completed** season (this year from mid-September, so 2026 now) to the two shipped demo seasons.
- A request for it answers at once with POWER only (`pending`), a background thread reads HLS and SMAP (about 16 and 6 minutes cold), and the UI asks again every 20 s.
- Results are kept in memory and on disk (`.cache/`). They are only fetched again after a failure (`RETRY_FAILED_S`).
- Drawn polygons already query POWER and HLS on request.

## Gaps

1. **First visitor waits minutes.** Nothing warms the latest season before a judge opens it.
2. **No refresh.** Once fetched, a season is never updated. A running season (March to August) would go stale.
3. **No "today" cutoff.** `latest_season` only knows completed seasons (see its `shortcut:` comment), so July data appears only in September.
4. **Label can overclaim.** The season is labelled "live from NASA" even when served from disk. It should show when it was fetched.
5. **Azure unknowns.** Token, storage, single instance and request time limits are untested.

## Work packages

| # | Package | Done when |
|---|---|---|
| L1 | **Azure config.** `EARTHDATA_TOKEN` as a secret; `.cache/` on an Azure Files mount; exactly one replica (verification and timeline state are in memory); outbound internet. | `/api/health` ok; a restart keeps the fetched cache. |
| L2 | **Warm on startup.** In the API lifespan, start the latest-season fetch in the background once a token is set. | A fresh deploy has the latest season ready within about 25 min, without any visitor. |
| L3 | **Fetch time stamp.** Keep `fetched_at` per season, return it in the timeline, show it next to the season label and drop the unqualified "live". | UI says "fetched <date> from NASA". Plan rule: never present an estimate as live. |
| L4 | **Refresh.** Fetch a season again when its inputs are older than a set age (for example 24 h) while it is the running season. Reuse the background thread. | A second fetch happens at most once a day and never blocks a request. |
| L5 | **Running season (optional).** Add a "today" cutoff to `latest_season` and to the week range, so weeks after the last settled date show `Missing`, not a gap-fill. | July 2027 shows data up to about two weeks ago, later weeks `Missing` with a reason. |
| L6 | **Live check.** Probe the real NASA endpoints from the deployed host (a scratch script, not committed) and state the result in the PR, as `CLAUDE.md` requires. | PR text lists what ran, from where, and how long it took. |

## Order and time

L1 and L3 first (about 1 h together), then L2 (30 min), L6 against the deployment (30 min). L4 and L5 only if time remains. L2 and L3 are small and independent, so two people can split them.

## Risks

- **Azure request limit (about 230 s on most ingress).** Safe, because the slow read is already a background thread, not a request.
- **Token expiry.** Earthdata user tokens expire. An expired token turns HLS into `Missing` with a reason, so the app degrades, and does not fail. Use a token that outlives the judging period.
- **Cloudy scenes.** A live season can have few valid HLS scenes. The existing gap-fill rules and `Missing` handling cover it.
- **Cache growth.** A new season adds entries. Keep the shipped zip for 2022 and 2024 only.

## Out of scope

Daily alerts, other regions, a database, more than one replica.

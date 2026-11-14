# Verification against historical ground truth

This folder is a standalone test framework. It asks the running API for the model's weekly bloom and
nectar output for past seasons and compares it with records measured on the ground. Each check ends with
one status:

| Status | Meaning |
|---|---|
| PASS / FAIL | A gated check is inside or outside its limit. |
| REPORTED | An informative check with no limit. |
| INSUFFICIENT | Model or reference data is missing, so nothing was judged. |
| ERROR | The check itself crashed. Treat it as a bug in this framework. |

## Why not a pollen API

Pollen forecast services such as the Google Maps Pollen API cannot verify this model. They forecast only
1–5 days ahead, so past seasons cannot be queried. They cover wind-pollinated allergen taxa (birch, alder,
hazel, olive, grasses, ragweed and a few others), while apple, cherry, black locust and sunflower are
insect-pollinated, shed little airborne pollen and are not covered. Their index is itself a model output.
Access is paid, and the terms forbid storing responses or deriving content from them.

The European pollen reanalyses (CAMS, SILAM) cover the same allergen taxa and have the same gap.

## What we compare with

| Reference | What it measures | Why it fits |
|---|---|---|
| Hive-scale weights (two colonies, hourly and 10-minute readings, 2021–2025) | Colony weight. A gain during the day is nectar coming in. | A gain needs both bloom and nectar, the two things the model predicts. The scales are independent of the satellite and reanalysis data the model uses. |
| iNaturalist research-grade observations of black locust | Dated, geolocated photos, used as weekly counts only | Available for any region, so the same check works wherever the product is used. |
| PEP725 flowering dates (optional) | BBCH 60/61 "beginning of flowering" records | The only source for orchards. It needs registration, so you supply the export yourself. |

## Scenarios

| ID | Question | Model output (NASA input) | Reference | Gate |
|---|---|---|---|---|
| R0 | Which nectar flows do the hives show? | none | hive weights | report |
| S1 | Does black-locust bloom start when the flow started? | onset (POWER GDD) | hive spring-flow onset | \|error\| ≤ 10 days per year |
| S2 | Is the year-to-year shift right? | onset shift between the years | hive shift (iNaturalist shift shown) | same direction, \|Δ\| ≤ 7 days |
| S3 | Is accumulated GDD a better clock than the calendar? | POWER temperature at the hives, all years | hive onsets, leave-one-year-out | report |
| S4 | Does sunflower bloom peak with the summer flow? | peak (HLS NDYI) | hive summer-flow peak | \|error\| ≤ 14 days per year |
| S5 | Does the low-nectar flag mark weak years? | `low_nectar` share (SMAP L4 rule) | season flow kg per year | report |
| S6 | Are POWER flight-weather days real? | Tmax ≥ 15 °C and wind < 5 m/s | daily hive gain | report |
| S7 | Does the locust peak match iNaturalist? | locust peak | weekly observation peak | report |
| S8 | Do orchard onsets match PEP725? | apple, sour cherry onset | PEP725 BBCH 60/61 | report |
| B0 | Is the model better than the calendar? | S1 onset and S4 peak errors | mean date of the other years | model error ≤ calendar error |

All gates and settings are in [`thresholds.toml`](thresholds.toml). They were fixed before the first run on real
model output. Change them only in a reviewed PR, and only for a reason other than making a failing check pass.

## How it works

1. `model.py` fetches `/parcels` and `/timeline?year=…`. For each crop and week it computes the share of
   parcels that are `blooming`, the share flagged `low_nectar`, and the share without evidence (`Missing`
   provenance). A week counts as blooming when at least half of the crop's parcels bloom. Timeline weeks start
   on 1 March and the hive data uses calendar dates, so the two are compared by date.
2. `signals.py` turns the hive weights into nectar flows:
   - The last reading before 05:00, when the colony is at rest, is the night weight. A day's gain is the next
     night's weight minus this one.
   - Jumps over 5 kg in a day are dropped, since they come from adding supers or harvesting.
   - A day that gains at least 0.3 kg is a flow day. Up to two other days, usually rain, may interrupt a flow,
     and a flow needs at least 3 kg in total.
   - A crop's flow is the largest flow whose peak falls in its calendar window: 10 Apr–20 Jun for locust,
     15 Jun–31 Aug for sunflower.
3. `model.py` also reads NASA POWER daily Tmax, Tmin and wind at the hive location through the project's
   cached POWER client.
4. `scenarios.py` turns both sides into metrics and a status. A missing model value makes a check
   INSUFFICIENT; it can never pass.
5. The report is printed and saved to `.cache/verification/report.md` and `report.csv`. It is not committed.

Hive files are downloaded to `.cache/verification/hives/` and pinned by SHA-256, so every run compares against
the same bytes. Their daily gains are cached by file hash and signal settings, and POWER and iNaturalist responses
share the app's `.cache/`. A repeat run therefore only calls the model API.

## Run it

```sh
# offline unit tests on synthetic data: a correct model must pass, a shifted one must fail
uv run pytest verification

# live data checks; the end-to-end test also needs the API
VERIFY_LIVE=1 uv run pytest verification
VERIFY_LIVE=1 VERIFY_API=http://127.0.0.1:8000 uv run pytest verification/test_live.py

# full report against the running stack (docker compose up -d --wait, or uvicorn on :8000)
uv run python -m verification --api http://127.0.0.1:8000
uv run python -m verification --only S1,S2,B0
uv run python -m verification --pep725 my_pep725_export.csv
```

The command exits with 1 if any gated scenario fails or any scenario crashes. `--cache` sets the cache root
(default `.cache`) and `--out` sets the report folder (default `<cache>/verification`). CI tests only `tests/`,
so it does not run this folder.

To use PEP725, register at <https://www.pep725.eu>, export the records, and normalise them to a CSV with
the columns `crop,year,bbch,doy,lon,lat`. `crop` uses the parcel names (`apple`, `sour_cherry`, …) and `doy`
is the day of year. Keep the file out of git.

## How to read the result

INSUFFICIENT on S1, S2, S4, S5 and B0 means the timeline has no evidence-backed bloom for that crop yet. The
WP2 fixtures and `Missing` values give this result.

S3 reports which GDD base temperature makes accumulated warmth the most stable predictor of locust onset, and
whether it predicts onset better than the calendar. If `data/phenology.json` is calibrated from it, fit on the
other years and test on the demo years. Fitting on the year you test would make the test meaningless.

S5 rests on two colonies at one site, so treat it as a direction with no statistical test behind it.

## Limitations

- The dataset names only the nearest city, with no coordinates, and the colonies may have been moved between
  pastures.
- Both colonies stand at one apiary, so the hive data says nothing about other regions. S7 and S8 add
  references from elsewhere.
- Flows are attributed to crops by calendar window. Oilseed rape can overlap black locust in spring, so the
  locust season totals may include rape.
- iNaturalist counts follow observer activity, and some photos show leaves or pods. Only weeks inside the bloom
  window are used, and years with fewer than 30 records are skipped.
- Apple and sour cherry stay unverified unless PEP725 data is supplied.

## Sources and licences

- Ilyés-Vincze, C., Vincze, F., Leelossy, A., Mészáros, R. (2025). *Hive scale dataset near Debrecen, Hungary
  between 2020-2025*. Mendeley Data, V1. <https://doi.org/10.17632/3v3hhkddmz.1>. CC BY 4.0. Used unchanged:
  downloaded at run time and not redistributed.
- iNaturalist observation histogram API, <https://api.inaturalist.org/v1/docs/>. Only aggregate counts are used.
- NASA POWER daily point API (MERRA-2), <https://power.larc.nasa.gov/>.
- PEP725 Pan European Phenology database, <https://www.pep725.eu>, if supplied. Subject to its data policy.
- Google Maps Pollen API documentation, <https://developers.google.com/maps/documentation/pollen/overview>.
  Reviewed and not used, for the reasons above.

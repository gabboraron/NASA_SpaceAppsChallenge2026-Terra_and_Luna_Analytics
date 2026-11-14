# Verification against historical ground truth

This folder is a standalone test framework. It checks whether the model's weekly bloom and nectar
output for past seasons matches what was measured on the ground. It talks to the running API like any
client would and compares the answers with independent records. Every check ends as **PASS**, **FAIL**,
**REPORTED** (informative, no gate) or **INSUFFICIENT** (data missing, nothing judged).

## Why not a pollen API

Pollen forecast services (for example the Google Maps Pollen API) cannot verify this model:

- **No history.** They forecast 1–5 days ahead. Past seasons cannot be queried.
- **Wrong plants.** They cover wind-pollinated allergen taxa (birch, alder, hazel, olive, grasses, ragweed and
  others). Apple, cherry, black locust and sunflower are insect-pollinated and shed little airborne pollen, so
  none of them is covered.
- **Modelled values.** The index is itself a model output, so we would be comparing one model with another.
- **Terms.** Paid access, and storing the responses or deriving content from them is not allowed.

European pollen reanalyses (CAMS, SILAM) have the same species gap.

## What we compare with

| Reference | What it measures | Why it fits |
|---|---|---|
| Hive-scale weights (two colonies, hourly and 10-minute readings, 2021–2025) | Colony weight. A gain during the day is nectar coming in. | It measures *bloom and nectar together*, which is exactly what the model predicts. It is independent of the satellite and reanalysis data the model uses. |
| iNaturalist research-grade observations of black locust | Dated, geolocated photos, used as weekly counts only | Available for any region, so the same check works wherever the product is used. |
| PEP725 flowering dates (optional) | BBCH 60/61 "beginning of flowering" records | The only option for orchards. It needs registration, so you supply the export yourself. |

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
model output. Change them only in a reviewed PR, and never to turn a FAIL into a PASS.

## How it works

1. **Model side** (`model.py`): fetch `/parcels` and `/timeline?year=…`. For each crop and week, compute the
   share of parcels that are `blooming`, flagged `low_nectar`, or without evidence (`Missing` provenance). A
   week counts as blooming when at least half of the crop's parcels bloom. Weeks are compared by date, never
   by week number.
2. **Hive side** (`signals.py`):
   - Take the last reading before 05:00 each night (colony at rest). The day's gain is the next night's weight
     minus this one.
   - Drop jumps over 5 kg (supers added, harvest).
   - A day gaining ≥ 0.3 kg is a flow day. Up to two other days (rain) may interrupt a flow, and a flow needs
     ≥ 3 kg in total.
   - The largest flow whose peak falls in a crop's calendar window (locust 10 Apr–20 Jun, sunflower
     15 Jun–31 Aug) is that crop's flow.
3. **Weather** (`model.py`): NASA POWER daily Tmax, Tmin and wind at the hive location, through the project's
   cached POWER client.
4. **Scenarios** (`scenarios.py`) turn both sides into metrics and a status. A missing model value is never
   counted as a pass.
5. **Report**: printed and saved to `.cache/verification/report.md` and `report.csv`. The report is never
   committed.

Downloads are cached in `.cache/verification/` and pinned by SHA-256, so every run compares against the same
bytes.

## Run it

```sh
# offline unit tests of the framework (synthetic data; a correct model must pass, a shifted one must fail)
uv run pytest verification

# live data checks; the end-to-end test also needs the API
VERIFY_LIVE=1 uv run pytest verification
VERIFY_LIVE=1 VERIFY_API=http://127.0.0.1:8000 uv run pytest verification/test_live.py

# full report against the running stack (docker compose up -d --wait, or uvicorn on :8000)
uv run python -m verification --api http://127.0.0.1:8000
uv run python -m verification --only S1,S2,B0
uv run python -m verification --pep725 my_pep725_export.csv
```

The command exits with 1 if any gated scenario fails. CI does not run this folder: CI tests only `tests/`.

**PEP725 input:** register at <https://www.pep725.eu>, export the records, and normalise them to a CSV with
the columns `crop,year,bbch,doy,lon,lat`. `crop` uses the parcel names (`apple`, `sour_cherry`, …) and `doy`
is the day of year. Keep the file out of git.

## How to read the result

- **INSUFFICIENT** on S1, S2, S4, S5 and B0 means the timeline has no evidence-backed bloom for that crop yet.
  The WP2 fixtures and `Missing` values give this result.
- **S3** says which GDD base temperature makes accumulated warmth the most stable predictor of locust onset,
  and whether it beats the calendar. If `data/phenology.json` is calibrated from it, fit on the other years and
  test on the demo years. Never fit on the year you test.
- **S5** has two colonies at one site. It shows a direction, not a statistically tested result.

## Limitations

- **Hive location:** the dataset only says the hives are near a city near the demo region; there are no
  coordinates. The colonies may also have been moved between pastures.
- **One site:** two colonies at one apiary, so the hive side says nothing about other regions. S7 and S8 exist
  to widen this.
- **Crop attribution:** flows are attributed to crops by calendar window. In spring, oilseed rape can overlap
  black locust, and season totals for locust can include it.
- **iNaturalist bias:** the counts follow observer activity, and some photos show leaves or pods. Only weeks
  inside the bloom window are used, and years with fewer than 30 records are skipped.
- **Orchards:** apple and sour cherry stay unverified unless PEP725 data is supplied.

## Sources and licences

- Ilyés-Vincze, C., Vincze, F., Leelossy, A., Mészáros, R. (2025). *Hive scale dataset near Debrecen, Hungary
  between 2020-2025*. Mendeley Data, V1. <https://doi.org/10.17632/3v3hhkddmz.1>. CC BY 4.0. Used unchanged:
  downloaded at run time and not redistributed.
- iNaturalist observation histogram API, <https://api.inaturalist.org/v1/docs/>. Only aggregate counts are used.
- NASA POWER daily point API (MERRA-2), <https://power.larc.nasa.gov/>.
- PEP725 Pan European Phenology database, <https://www.pep725.eu>, if supplied. Subject to its data policy.
- Google Maps Pollen API documentation, <https://developers.google.com/maps/documentation/pollen/overview>.
  Reviewed and not used, for the reasons above.

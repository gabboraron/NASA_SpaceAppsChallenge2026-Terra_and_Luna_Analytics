# Verification report

| ID | Question | Status |
|---|---|---|
| R0 | Which nectar flows do the reference hives show? | **REPORTED** |
| S1 | Does black-locust bloom start when the hives saw the flow start? | **PASS** |
| S2 | Does the model reproduce the year-to-year shift of the locust flow? | **PASS** |
| S3 | Is accumulated GDD (POWER) a better clock than the calendar? | **REPORTED** |
| S4 | Does sunflower bloom peak when the summer flow peaks? | **PASS** |
| S5 | Does the low-nectar flag mark the years with weak flows? | **REPORTED** |
| S6 | Do POWER flight-weather days match the days hives gain weight? | **REPORTED** |
| S7 | Does the locust peak match iNaturalist observation peaks? | **REPORTED** |
| S8 | Do orchard onsets match PEP725 flowering dates? | **INSUFFICIENT** |
| B0 | Is the model better than a fixed-calendar baseline? | **PASS** |

## R0: Which nectar flows do the reference hives show?

Status: **REPORTED**

- `black_locust_2021_hive12`: 2021-05-26..2021-06-03 peak 2021-05-31 (ISO wk 22), +17.4 kg; season +25.1 kg
- `black_locust_2022_hive12`: 2022-05-20..2022-05-24 peak 2022-05-24 (ISO wk 21), +17.0 kg; season +31.9 kg
- `black_locust_2022_hive18`: 2022-05-21..2022-05-30 peak 2022-05-24 (ISO wk 21), +15.1 kg; season +15.1 kg
- `black_locust_2023_hive12`: 2023-05-19..2023-05-25 peak 2023-05-22 (ISO wk 21), +15.2 kg; season +20.5 kg
- `black_locust_2023_hive18`: 2023-05-23..2023-05-26 peak 2023-05-23 (ISO wk 21), +11.6 kg; season +14.9 kg
- `black_locust_2024_hive12`: 2024-04-30..2024-05-06 peak 2024-05-03 (ISO wk 18), +23.0 kg; season +38.3 kg
- `black_locust_2024_hive18`: 2024-04-30..2024-05-04 peak 2024-05-01 (ISO wk 18), +21.2 kg; season +43.9 kg
- `black_locust_2025_hive12`: 2025-04-24..2025-05-03 peak 2025-04-30 (ISO wk 18), +11.6 kg; season +15.9 kg
- `black_locust_2025_hive18`: 2025-04-24..2025-05-03 peak 2025-04-30 (ISO wk 18), +6.5 kg; season +10.9 kg
- `sunflower_2021_hive12`: 2021-07-03..2021-07-09 peak 2021-07-06 (ISO wk 27), +20.3 kg; season +30.9 kg
- `sunflower_2022_hive12`: 2022-07-04..2022-07-07 peak 2022-07-04 (ISO wk 27), +12.1 kg; season +30.4 kg
- `sunflower_2023_hive12`: 2023-06-25..2023-07-07 peak 2023-07-05 (ISO wk 27), +15.6 kg; season +18.7 kg
- `sunflower_2023_hive18`: 2023-06-27..2023-07-08 peak 2023-07-08 (ISO wk 27), +16.7 kg; season +33.9 kg
- `sunflower_2024_hive12`: 2024-07-06..2024-07-12 peak 2024-07-09 (ISO wk 28), +8.5 kg; season +8.5 kg
- `sunflower_2024_hive18`: 2024-07-06..2024-07-10 peak 2024-07-06 (ISO wk 27), +13.5 kg; season +23.4 kg
- Missing hive-years had no data or no flow in the crop window.

## S1: Does black-locust bloom start when the hives saw the flow start?

Status: **PASS**

- `2022_model_onset`: 2022-05-15
- `2022_hive_onset`: 2022-05-21
- `2022_error_days`: -6
- `2024_model_onset`: 2024-04-25
- `2024_hive_onset`: 2024-04-30
- `2024_error_days`: -5
- `2022_first_blooming_week`: 2022-05-10
- `2022_week_error_days`: -11
- `2024_first_blooming_week`: 2024-04-19
- `2024_week_error_days`: -11
- `limit_days`: 10.00

## S2: Does the model reproduce the year-to-year shift of the locust flow?

Status: **PASS**

- `inat_shift_days`: -23
- `years`: 2022->2024
- `model_shift_days`: -19
- `hive_shift_days`: -20
- `difference_days`: 1
- `limit_days`: 7.00

## S3: Is accumulated GDD (POWER) a better clock than the calendar?

Status: **REPORTED**

- `years`: 2021,2022,2023,2024,2025
- `calendar_baseline_mae_days`: 15.40
- `base0_gdd_at_onset_mean`: 915.20
- `base0_cv`: 0.13
- `base0_loo_mae_days`: 7.60
- `base5_gdd_at_onset_mean`: 443.27
- `base5_cv`: 0.13
- `base5_loo_mae_days`: 7.20
- `base10_gdd_at_onset_mean`: 161.59
- `base10_cv`: 0.19
- `base10_loo_mae_days`: 5.20
- `best_base_c`: 10.00
- `gdd_beats_calendar`: True
- `gdd_stable`: False
- Leave-one-year-out: thresholds learnt on the other years predict the held-out year; calibrate phenology.json the same way, never on the test year.

## S4: Does sunflower bloom peak when the summer flow peaks?

Status: **PASS**

- `2022_model_peak`: 2022-07-08
- `2022_hive_peak`: 2022-07-04
- `2022_error_days`: 4
- `2024_model_peak`: 2024-07-08
- `2024_hive_peak`: 2024-07-07
- `2024_error_days`: 1
- `2022_jaccard`: 0.20
- `2024_jaccard`: 0.50
- `limit_days`: 14.00

## S5: Does the low-nectar flag mark the years with weak flows?

Status: **REPORTED**

- `black_locust_2022_low_nectar_share`: 0.00
- `black_locust_2022_hive_flow_kg`: 23.49
- `black_locust_2024_low_nectar_share`: 0.00
- `black_locust_2024_hive_flow_kg`: 41.08
- `sunflower_2022_low_nectar_share`: 1.00
- `sunflower_2022_hive_flow_kg`: 30.40
- `sunflower_2024_low_nectar_share`: 0.00
- `sunflower_2024_hive_flow_kg`: 15.97
- `sunflower_ranking_agrees`: False
- Two hives in one area: descriptive only, no significance claimed.

## S6: Do POWER flight-weather days match the days hives gain weight?

Status: **REPORTED**

- `flight_days`: 782
- `non_flight_days`: 50
- `flight_median_gain_kg`: 0.00
- `non_flight_median_gain_kg`: -0.10
- `flight_share_gaining`: 0.34
- `non_flight_share_gaining`: 0.14
- `rule_consistent`: True

## S7: Does the locust peak match iNaturalist observation peaks?

Status: **REPORTED**

- `2021_inat_obs_in_season`: 38
- `2021_inat_peak`: 2021-05-27
- `2021_inat_minus_hive_days`: -4
- `2022_inat_obs_in_season`: 91
- `2022_inat_peak`: 2022-05-19
- `2022_inat_minus_hive_days`: -5
- `2022_model_minus_inat_days`: -6
- `2023_inat_obs_in_season`: 101
- `2023_inat_peak`: 2023-05-25
- `2023_inat_minus_hive_days`: 3
- `2024_inat_obs_in_season`: 262
- `2024_inat_peak`: 2024-04-25
- `2024_inat_minus_hive_days`: -7
- `2024_model_minus_inat_days`: -3
- `2025_inat_obs_in_season`: 238
- `2025_inat_peak`: 2025-05-15
- `2025_inat_minus_hive_days`: 15

## S8: Do orchard onsets match PEP725 flowering dates?

Status: **INSUFFICIENT**

- No PEP725 export supplied (--pep725); orchards stay unverified.

## B0: Is the model better than a fixed-calendar baseline?

Status: **PASS**

- `black_locust_model_mae_days`: 5.50
- `black_locust_calendar_mae_days`: 13.00
- `sunflower_model_mae_days`: 2.50
- `sunflower_calendar_mae_days`: 2.50

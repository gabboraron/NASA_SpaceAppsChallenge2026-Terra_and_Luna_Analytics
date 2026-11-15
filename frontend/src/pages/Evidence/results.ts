/**
 * Snapshot of one verification run: `uv run python -m verification` against the
 * running API (exit code 0), on the commit and date below. Every number here is
 * copied from that report; rerun the command and update this file together.
 */
export const RUN = {
  date: "15 November 2026",
  commit: "143a389",
  years: "2022 and 2024",
  offlineTests: "23 passed",
};

export type Status = "PASS" | "REPORTED" | "NOT TESTED";

export type Check = {
  id: string;
  question: string;
  input: string;
  reference: string;
  gate: string;
  result: string;
  status: Status;
};

export const CHECKS: Check[] = [
  {
    id: "R0",
    question: "Which nectar flows do the hives show?",
    input: "none",
    reference: "Hive weights, 2021 to 2025",
    gate: "report",
    result: "15 flows: 9 black locust, 6 sunflower",
    status: "REPORTED",
  },
  {
    id: "S1",
    question: "Does black-locust bloom start when the flow started?",
    input: "Onset from POWER temperature",
    reference: "Start of the spring flow",
    gate: "|error| ≤ 10 days, each year",
    result: "−6 days (2022), −5 days (2024)",
    status: "PASS",
  },
  {
    id: "S2",
    question: "Is the shift between the two years right?",
    input: "Onset shift, 2022 to 2024",
    reference: "Shift of the flow start",
    gate: "same direction, |Δ| ≤ 7 days",
    result: "model −19 days, hives −20 days",
    status: "PASS",
  },
  {
    id: "S3",
    question: "Is accumulated warmth a better clock than the calendar?",
    input: "POWER temperature at the hives",
    reference: "Flow starts, five years, leave one year out",
    gate: "report",
    result: "mean error 5.2 to 7.6 days against 15.4 for the calendar",
    status: "REPORTED",
  },
  {
    id: "S4",
    question: "Does sunflower bloom peak with the summer flow?",
    input: "Declared window (synthetic in the demo)",
    reference: "Peak of the summer flow",
    gate: "|error| ≤ 14 days, each year",
    result: "+4 days (2022), +1 day (2024); tests the declared window",
    status: "PASS",
  },
  {
    id: "S5",
    question: "Does the low-nectar flag mark the weak years?",
    input: "Flag from SMAP soil moisture",
    reference: "Season gain per hive",
    gate: "report",
    result:
      "No: 2022 was flagged and the hives gained 30.4 kg; 2024 was not and they gained 16.0 kg",
    status: "REPORTED",
  },
  {
    id: "S6",
    question: "Are the flight-weather days real?",
    input: "POWER Tmax ≥ 15 °C and wind < 5 m/s",
    reference: "Daily hive gain",
    gate: "report",
    result:
      "34% of 782 flight days gained ≥ 0.3 kg; 14% of 50 non-flight days did",
    status: "REPORTED",
  },
  {
    id: "S7",
    question: "Does the locust peak match photo records?",
    input: "Peak bloom week",
    reference: "iNaturalist weekly counts",
    gate: "report",
    result: "model 6 days (2022) and 3 days (2024) before the photo peak",
    status: "REPORTED",
  },
  {
    id: "S8",
    question: "Do orchard onsets match station records?",
    input: "Apple and sour cherry onset",
    reference: "PEP725 flowering dates",
    gate: "report",
    result: "No PEP725 export supplied; apple and sour cherry are unverified",
    status: "NOT TESTED",
  },
  {
    id: "B0",
    question: "Is the model better than the calendar?",
    input: "S1 and S4 errors",
    reference: "Mean date of the other years",
    gate: "model error ≤ calendar error",
    result:
      "black locust 5.5 against 13.0 days; sunflower 2.5 against 2.5 days (a tie)",
    status: "PASS",
  },
];

export type MarkKind = "model" | "hive" | "base";
export type Mark = {
  x: number;
  kind: MarkKind;
  label: string;
  below?: boolean;
};
export type Row = { name: string; marks: Mark[]; band?: [number, number] };

/** Figure 1: black-locust onset as day of year; the band is the ±10-day gate. */
export const ONSET_ROWS: Row[] = [
  {
    name: "2022",
    band: [131, 151],
    marks: [
      { x: 130, kind: "base", label: "10 May" },
      { x: 135, kind: "model", label: "15 May", below: true },
      { x: 141, kind: "hive", label: "21 May" },
    ],
  },
  {
    name: "2024",
    band: [111, 131],
    marks: [
      { x: 116, kind: "model", label: "25 Apr", below: true },
      { x: 121, kind: "hive", label: "30 Apr" },
      { x: 136, kind: "base", label: "15 May" },
    ],
  },
];

/** Figure 2: error in days when each year is predicted from the other four. */
export const HOLDOUT_ROWS: Row[] = [
  [2021, -17, 8],
  [2022, -11, -6],
  [2023, -11, 1],
  [2024, 15, -3],
  [2025, 23, 8],
].map(([year, calendar, warmth]) => ({
  name: String(year),
  marks: [
    { x: calendar, kind: "base" as const, label: signed(calendar) },
    { x: warmth, kind: "model" as const, label: signed(warmth), below: true },
  ],
}));

function signed(days: number): string {
  return days > 0 ? `+${days}` : String(days).replace("-", "−");
}

/** Hive files of the reference dataset, pinned by hash in the verification code. */
export const HIVE_FILES = [
  {
    name: "Hive 12 (.xlsx)",
    sha256: "2829004900a89e796abb959e4b6dcace9de7d5c7af35c586f0fa4982f34edc59",
  },
  {
    name: "Hive 18 (.csv)",
    sha256: "96a90814128ff7e8dab546d747070771669a0fb96e5641be633842ef42058e09",
  },
];

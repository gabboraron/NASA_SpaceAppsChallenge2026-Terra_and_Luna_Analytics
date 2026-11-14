// Pure helpers for the move calculator: field metadata, parsing and wording (D9).
import type {
  CalculatorInput,
  CalculatorResult,
  Provenance,
} from "../../api/client";
import { prov } from "../ProvenanceBadge/ProvenanceBadge";

export type FieldKey = Exclude<
  keyof CalculatorInput,
  "service_type" | "provenance"
>;
export type Field = {
  key: FieldKey;
  label: string;
  unit: string;
  min: number;
  max?: number;
  step: number;
  /** Shown value = stored value × scale (fractions shown as percent). */
  scale?: number;
  integer?: boolean;
};

export const COLONIES: Field = {
  key: "colonies",
  label: "Colonies",
  unit: "",
  min: 20,
  max: 100,
  step: 1,
  integer: true,
};

export const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "The move",
    fields: [
      {
        key: "distance_km",
        label: "Road distance",
        unit: "km",
        min: 0,
        step: 0.1,
      },
      {
        key: "legs",
        label: "One-way trips",
        unit: "trips",
        min: 0,
        step: 1,
        integer: true,
      },
    ],
  },
  {
    title: "Income",
    fields: [
      {
        key: "fee_per_colony",
        label: "Fee per colony",
        unit: "€",
        min: 0,
        step: 1,
      },
      {
        key: "price_uncertainty",
        label: "Price uncertainty",
        unit: "%",
        min: 0,
        max: 100,
        step: 1,
        scale: 100,
      },
      {
        key: "honey_margin",
        label: "Honey margin",
        unit: "€",
        min: -100_000,
        step: 10,
      },
    ],
  },
  {
    title: "Transport",
    fields: [
      {
        key: "fuel_l_per_100km",
        label: "Fuel use",
        unit: "L/100 km",
        min: 0,
        step: 0.5,
      },
      {
        key: "fuel_price_per_l",
        label: "Fuel price",
        unit: "€/L",
        min: 0,
        step: 0.01,
      },
      {
        key: "vehicle_cost_per_km",
        label: "Vehicle cost",
        unit: "€/km",
        min: 0,
        step: 0.01,
      },
      {
        key: "driving_hours",
        label: "Driving time",
        unit: "h",
        min: 0,
        step: 0.1,
      },
      {
        key: "extra_trips_low",
        label: "Extra round trips (low case)",
        unit: "trips",
        min: 0,
        step: 1,
        integer: true,
      },
    ],
  },
  {
    title: "Labour and other costs",
    fields: [
      {
        key: "loading_hours",
        label: "Loading time",
        unit: "h",
        min: 0,
        step: 0.5,
      },
      {
        key: "hourly_labor_cost",
        label: "Labour rate",
        unit: "€/h",
        min: 0,
        step: 0.5,
      },
      {
        key: "extra_feed_cost",
        label: "Extra feed",
        unit: "€",
        min: 0,
        step: 10,
      },
      {
        key: "other_placement_cost",
        label: "Other placement costs",
        unit: "€",
        min: 0,
        step: 10,
      },
    ],
  },
  {
    title: "Alternative",
    fields: [
      {
        key: "alternative_contribution",
        label: "Contribution if hives stay home",
        unit: "€",
        min: -100_000,
        step: 10,
      },
    ],
  },
];

export const ALL_FIELDS: Field[] = [
  COLONIES,
  ...GROUPS.flatMap((g) => g.fields),
];

export type Draft = Record<FieldKey, string>;

const round = (v: number) => Math.round(v * 1e6) / 1e6;

/** Editable text for every field, rounded so 17.6893… shows as 17.7. */
export function toDraft(input: CalculatorInput): Draft {
  return Object.fromEntries(
    ALL_FIELDS.map((f) => {
      const v = input[f.key] * (f.scale ?? 1);
      const digits = f.integer ? 0 : f.step < 0.1 ? 2 : 1;
      return [f.key, String(round(Number(v.toFixed(digits))))];
    }),
  ) as Draft;
}

/**
 * Validate a draft; on success return the input to send (edited fields re-sourced).
 * With `followDriving`, driving time tracks edited distance and trips at the
 * prefill's speed until the user types a driving time.
 */
export function parseDraft(
  draft: Draft,
  prefilled: CalculatorInput,
  initial: Draft = toDraft(prefilled),
  followDriving = false,
): { input?: CalculatorInput; errors: Partial<Record<FieldKey, string>> } {
  const errors: Partial<Record<FieldKey, string>> = {};
  const input: CalculatorInput = {
    ...prefilled,
    provenance: { ...prefilled.provenance },
  };
  for (const f of ALL_FIELDS) {
    const text = draft[f.key].trim();
    const shown = Number(text);
    const range =
      f.max === undefined ? `${f.min} or more` : `${f.min} to ${f.max}`;
    if (text === "" || !Number.isFinite(shown))
      errors[f.key] = `Enter a number (${range}).`;
    else if (shown < f.min || (f.max !== undefined && shown > f.max))
      errors[f.key] = `Enter ${range}.`;
    else if (f.integer && !Number.isInteger(shown))
      errors[f.key] = "Enter a whole number.";
    if (errors[f.key] || text === initial[f.key]) continue;
    input[f.key] = shown / (f.scale ?? 1);
    input.provenance![f.key] = edited(f, initial[f.key]);
  }
  if (Object.keys(errors).length) return { errors };
  const km = (i: CalculatorInput) => i.legs * i.distance_km;
  const speed = km(prefilled) / prefilled.driving_hours;
  if (
    followDriving &&
    km(input) !== km(prefilled) &&
    Number.isFinite(speed) &&
    speed > 0
  ) {
    input.driving_hours = km(input) / speed;
    input.provenance!.driving_hours = {
      ...prefilled.provenance!.driving_hours,
      note: "Follows the edited distance and trips",
    };
  }
  return { input, errors };
}

/** Provenance of a value the user typed over the prefill. */
const edited = (field: Field, was: string): Provenance =>
  prov(
    "Reported",
    "You entered",
    `Prefilled ${was}${field.unit === "%" ? " %" : field.unit ? ` ${field.unit}` : ""}`,
  );

const EUR = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "€1,168.48", "−€84.85", or with `sign` "+€591.04". */
export function eur(value: number, sign = false): string {
  const text = EUR.format(Math.abs(value));
  if (Math.abs(value) < 0.005) return text;
  return value < 0 ? `−${text}` : sign ? `+${text}` : text;
}

/** One line on how robust the base verdict is across the low and high cases. */
export function rangeText(result: CalculatorResult): string {
  const [low, base, high] = [result.low, result.base, result.high].map(
    (s) => s.benefit_vs_alternative,
  );
  if (low >= 0)
    return `Positive in all three scenarios: ${eur(low)} to ${eur(high)}.`;
  if (high < 0) return `Negative in all three scenarios, down to ${eur(low)}.`;
  if (base >= 0) return `Turns negative in the low scenario (${eur(low)}).`;
  return `Only the high-price scenario beats the alternative (${eur(high, true)}).`;
}

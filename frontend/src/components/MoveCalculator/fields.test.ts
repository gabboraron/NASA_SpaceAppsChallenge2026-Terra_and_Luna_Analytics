import { describe, expect, it } from "vitest";
import { calculate, matches } from "../../api/mocks";
import type { CalculatorInput } from "../../api/client";
import { eur, parseDraft, rangeText, toDraft, type Draft } from "./fields";

// The worked example reconstructed in tests/test_calculator.py.
const EXAMPLE: CalculatorInput = {
  service_type: "pollination",
  colonies: 40,
  distance_km: 50,
  fee_per_colony: 60,
  legs: 4,
  fuel_l_per_100km: 12,
  fuel_price_per_l: 1.65,
  vehicle_cost_per_km: 0.3,
  driving_hours: 6,
  loading_hours: 6,
  hourly_labor_cost: 15,
  extra_feed_cost: 200,
  other_placement_cost: 159.92,
  honey_margin: 0,
  alternative_contribution: 400,
  price_uncertainty: 0.2,
  extra_trips_low: 1,
  provenance: {},
};

describe("mock calculator mirrors the engine", () => {
  it("reproduces the worked example", () => {
    const { base, verdict } = calculate(EXAMPLE);
    expect(base.contribution).toBeCloseTo(1568.48, 2);
    expect(base.benefit_vs_alternative).toBeCloseTo(1168.48, 2);
    expect(verdict).toBe("move");
  });
  it("prefills a calculator input on every open match", () => {
    for (const card of matches("B1", 2024, 9))
      expect(card.calculator_input === null).toBe(card.blocked);
    expect(matches("nobody", 2024, 9)).toEqual([]);
  });
  it("gives the far beekeeper a do-not-move on a 20-colony orchard", () => {
    const orchard = matches("B2", 2024, 9).find((c) => c.parcel_id === "P2")!;
    expect(calculate(orchard.calculator_input!).verdict).toBe("do_not_move");
  });
});

describe("draft parsing", () => {
  it("shows fractions as percent and round-trips unchanged", () => {
    const draft = toDraft(EXAMPLE);
    expect(draft.price_uncertainty).toBe("20");
    const { input, errors } = parseDraft(draft, EXAMPLE);
    expect(errors).toEqual({});
    expect(input).toEqual(EXAMPLE);
  });
  it("keeps unedited precise values and re-sources edited ones", () => {
    const precise = { ...EXAMPLE, distance_km: 17.68934 };
    const draft = { ...toDraft(precise), fee_per_colony: "80" };
    expect(draft.distance_km).toBe("17.7");
    const { input } = parseDraft(draft, precise);
    expect(input!.distance_km).toBe(17.68934);
    expect(input!.fee_per_colony).toBe(80);
    expect(input!.provenance!.fee_per_colony).toMatchObject({
      kind: "Reported",
      source: "You entered",
      note: "Prefilled 60 €",
    });
    expect(input!.provenance!.distance_km).toBeUndefined();
  });
  it("converts percent back to a fraction", () => {
    const draft = { ...toDraft(EXAMPLE), price_uncertainty: "35" };
    expect(parseDraft(draft, EXAMPLE).input!.price_uncertainty).toBe(0.35);
  });
  it.each([
    ["colonies", "140", "Enter 20 to 100."],
    ["colonies", "30.5", "Enter a whole number."],
    ["distance_km", "", "Enter a number (0 or more)."],
    ["fee_per_colony", "-1", "Enter 0 or more."],
    ["price_uncertainty", "abc", "Enter a number (0 to 100)."],
  ] as const)("rejects %s = %j", (key, text, message) => {
    const { input, errors } = parseDraft(
      { ...toDraft(EXAMPLE), [key]: text },
      EXAMPLE,
    );
    expect(input).toBeUndefined();
    expect(errors[key]).toBe(message);
  });
});

describe("driving time follows distance and trips", () => {
  // EXAMPLE drives 4 × 50 km in 6 h: 33.3 km/h.
  const withProv: CalculatorInput = {
    ...EXAMPLE,
    provenance: {
      driving_hours: {
        kind: "Estimated",
        source: "Trips x distance at 60 km/h",
        observed_at: null,
        interpolated: false,
        note: "",
      },
    },
  };
  const parse = (edits: Partial<Draft>, follow: boolean) =>
    parseDraft({ ...toDraft(withProv), ...edits }, withProv, undefined, follow)
      .input!;

  it("rescales driving time at the prefill's speed", () => {
    const input = parse({ distance_km: "100", legs: "6" }, true);
    expect(input.driving_hours).toBeCloseTo(18, 6); // 600 km at 33.3 km/h
    expect(input.provenance!.driving_hours).toMatchObject({
      kind: "Estimated",
      note: "Follows the edited distance and trips",
    });
  });
  it("leaves an untouched prefill alone", () => {
    expect(parse({}, true)).toEqual(withProv);
  });
  it("stops following once the user types a driving time", () => {
    const input = parse({ distance_km: "100", driving_hours: "2" }, false);
    expect(input.driving_hours).toBe(2);
    expect(input.provenance!.driving_hours.source).toBe("You entered");
  });
  it("cannot derive a speed from a zero-distance prefill", () => {
    const zero = { ...withProv, distance_km: 0, driving_hours: 0 };
    const draft = { ...toDraft(zero), distance_km: "10" };
    expect(parseDraft(draft, zero, undefined, true).input!.driving_hours).toBe(
      0,
    );
  });
});

describe("wording", () => {
  it("formats euros with a real minus sign", () => {
    expect(eur(1168.48)).toBe("€1,168.48");
    expect(eur(-84.85)).toBe("−€84.85");
    expect(eur(591.04, true)).toBe("+€591.04");
    expect(eur(0, true)).toBe("€0.00");
  });
  it("describes how robust the verdict is", () => {
    const at = (low: number, base: number, high: number) =>
      rangeText({
        ...calculate(EXAMPLE),
        low: { ...calculate(EXAMPLE).low, benefit_vs_alternative: low },
        base: { ...calculate(EXAMPLE).base, benefit_vs_alternative: base },
        high: { ...calculate(EXAMPLE).high, benefit_vs_alternative: high },
      });
    expect(at(343.76, 591.04, 811.84)).toBe(
      "Positive in all three scenarios: €343.76 to €811.84.",
    );
    expect(at(-670.08, -84.85, 135.95)).toBe(
      "Only the high-price scenario beats the alternative (+€135.95).",
    );
    expect(at(-10, 5, 20)).toBe(
      "Turns negative in the low scenario (−€10.00).",
    );
    expect(at(-30, -20, -10)).toBe(
      "Negative in all three scenarios, down to −€30.00.",
    );
  });
});

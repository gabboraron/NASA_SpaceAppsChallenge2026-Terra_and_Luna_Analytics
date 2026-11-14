import { useEffect, useState } from "react";
import { calculate, getParcels, type CalculatorResult } from "../../api/client";
import { cropName } from "../../domain/season";
import { eur } from "../../components/MoveCalculator/fields";
import { loadMatches } from "../../hooks/useMatches";
import styles from "./Landing.module.css";

const BEEKEEPER = "B1";
const PARCEL = "P03";
const YEAR = 2024;
const WEEK = 20;

const LINES: {
  key: keyof CalculatorResult["base"];
  label: string;
  cost?: boolean;
}[] = [
  { key: "revenue", label: "Revenue" },
  { key: "commission", label: "Commission", cost: true },
  { key: "transport_cost", label: "Transport", cost: true },
  { key: "other_costs", label: "Other costs", cost: true },
  { key: "contribution", label: "Contribution after incremental costs" },
];

type Live = { heading: string; result: CalculatorResult } | "loading" | "error";

/** Fig. 5: the base scenario of a live calculator run for a synthetic beekeeper. */
export function Receipt() {
  const [live, setLive] = useState<Live>("loading");

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      const [cards, parcels] = await Promise.all([
        loadMatches(BEEKEEPER, YEAR, WEEK, ctrl.signal),
        getParcels(),
      ]);
      // P03 in the real data; the offline mocks use other ids, so fall back to the top card.
      const card =
        cards.find((c) => c.parcel_id === PARCEL && c.calculator_input) ??
        cards.find((c) => c.calculator_input);
      if (!card?.calculator_input) throw new Error("No priced placement.");
      const result = await calculate(card.calculator_input, ctrl.signal);
      const crop = parcels.find((p) => p.id === card.parcel_id)?.crop;
      const heading = [
        `${BEEKEEPER} → ${card.parcel_id}`,
        crop && cropName(crop).toUpperCase(),
        `${YEAR} WK ${WEEK}`,
      ]
        .filter(Boolean)
        .join(" · ");
      setLive({ heading, result });
    })().catch(() => {
      if (!ctrl.signal.aborted) setLive("error");
    });
    return () => ctrl.abort();
  }, []);

  const base = typeof live === "object" ? live.result.base : null;
  const value = (v: number | undefined, sign = false) =>
    v === undefined ? (live === "loading" ? "…" : "") : eur(v, sign);

  return (
    <figure className={styles.fig}>
      <div className={`${styles.receipt} mono`} aria-busy={live === "loading"}>
        <span className={styles.receiptHead}>
          {typeof live === "object"
            ? live.heading
            : `${BEEKEEPER} · ${YEAR} WK ${WEEK} · BASE SCENARIO`}
        </span>
        {LINES.map((l) => (
          <span key={l.key} className={styles.line}>
            <span>{l.label}</span>
            <span>
              {base && l.cost ? value(-base[l.key]) : value(base?.[l.key])}
            </span>
          </span>
        ))}
        <span className={`${styles.line} ${styles.total}`}>
          <span>Benefit relative to the alternative</span>
          <span>{value(base?.benefit_vs_alternative, true)}</span>
        </span>
        {base && (
          <span className={styles.receiptNote}>
            Base scenario. The explorer also shows the low and high price cases.
          </span>
        )}
        {live === "error" && (
          <span className={styles.receiptNote}>
            The live result could not be loaded. Open the explorer to run it.
          </span>
        )}
      </div>
      <figcaption>
        Fig. 5 · A live calculator result for a synthetic beekeeper. Line items
        come from the app.
      </figcaption>
    </figure>
  );
}

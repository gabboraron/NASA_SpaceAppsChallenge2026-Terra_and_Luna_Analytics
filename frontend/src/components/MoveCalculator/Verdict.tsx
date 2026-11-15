import type { CalculatorResult } from "../../api/client";
import { eur, rangeText } from "./fields";
import styles from "./MoveCalculator.module.css";

/** The base-case verdict of a move and how robust it is across the scenarios. */
export function Verdict({
  result,
  pending = false,
}: {
  result: CalculatorResult;
  pending?: boolean;
}) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy={pending}
      className={styles.verdict}
      data-verdict={result.verdict}
      data-pending={pending}
    >
      <span className={styles.kicker}>
        {result.verdict === "move" ? "Move pays off" : "Do not move"}
      </span>
      <strong>{eur(result.base.benefit_vs_alternative, true)}</strong>
      <span>
        {result.verdict === "move"
          ? "benefit relative to the alternative, base case"
          : result.message}
      </span>
      <span>{pending ? "Updating…" : rangeText(result)}</span>
    </section>
  );
}

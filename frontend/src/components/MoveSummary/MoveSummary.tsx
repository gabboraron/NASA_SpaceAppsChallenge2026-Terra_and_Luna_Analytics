import { useEffect, useState } from "react";
import {
  calculate,
  type CalculatorResult,
  type MatchCard,
  type Parcel,
} from "../../api/client";
import { Verdict } from "../MoveCalculator/Verdict";
import { PlacementRequest } from "../PlacementRequest/PlacementRequest";
import styles from "./MoveSummary.module.css";

type Props = {
  parcel: Parcel;
  /** The signed-in beekeeper's match for this parcel; undefined while it loads. */
  card?: MatchCard;
  /** False when there is no home parcel to measure the move from. */
  hasHome: boolean;
  failed: boolean;
  stay: { start: string; end: string } | null;
  onAdjust: () => void;
};

/**
 * The move from the beekeeper's home to the selected parcel, priced as soon as
 * the parcel is selected with their own profile and costs.
 */
export function MoveSummary(props: Props) {
  const { parcel, card, hasHome, failed, stay, onAdjust } = props;
  const input = card?.calculator_input ?? null;
  const body = input ? JSON.stringify(input) : "";
  const [answer, setAnswer] = useState<{
    body: string;
    result?: CalculatorResult;
  }>({ body: "" });

  useEffect(() => {
    if (!body) return;
    const controller = new AbortController();
    calculate(JSON.parse(body) as typeof input & object, controller.signal)
      .then((result) => setAnswer({ body, result }))
      .catch(() => {
        if (!controller.signal.aborted) setAnswer({ body });
      });
    return () => controller.abort();
  }, [body]);

  const done = answer.body === body;
  const result = done ? answer.result : undefined;
  const km = card?.distance_km.value;
  const error = failed || (done && !result);
  return (
    <section className={styles.move} aria-labelledby="move-h">
      <h3 id="move-h">Your move here</h3>
      {!hasHome ? (
        <p role="status">
          Draw your own parcel on the map first: moves are measured from your
          home apiary.
        </p>
      ) : card?.blocked ? (
        <div role="status" className={styles.blocked}>
          <strong>Not possible for you this week</strong>
          <ul>
            {card.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : error ? (
        <p role="alert">
          Could not calculate your move. Check that the API is running.
        </p>
      ) : !result || !card ? (
        <p role="status">Calculating your move…</p>
      ) : (
        <>
          <Verdict result={result} />
          <p className={styles.facts}>
            {km != null && `${km.toFixed(1)} km from your home apiary · `}
            {input?.colonies} colonies · rank {card.rank} of your placements
            this week
          </p>
          {input?.provenance?.honey_margin?.kind === "Missing" && (
            <p className={styles.facts}>
              Forage hosts pay no fee: enter your honey margin in the calculator
              to judge this move.
            </p>
          )}
          <button type="button" className={styles.adjust} onClick={onAdjust}>
            Open the calculator and adjust the numbers
          </button>
          <PlacementRequest
            key={parcel.id}
            parcel={parcel}
            stay={stay}
            colonies={input?.colonies ?? 20}
            benefit={result.base.benefit_vs_alternative}
          />
        </>
      )}
    </section>
  );
}

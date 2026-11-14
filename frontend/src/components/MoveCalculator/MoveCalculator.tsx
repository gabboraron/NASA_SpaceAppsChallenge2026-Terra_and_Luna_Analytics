import { useEffect, useMemo, useState } from "react";
import { useEscape } from "../../hooks/useEscape";
import {
  calculate,
  getMatches,
  type Beekeeper,
  type CalculatorInput,
  type CalculatorResult,
  type Parcel,
  type Season,
} from "../../api/client";
import { BeekeeperPicker } from "../BeekeeperPicker/BeekeeperPicker";
import { cropName } from "../MapCanvas/layers";
import { ProvenanceBadge } from "../ProvenanceBadge/ProvenanceBadge";
import {
  ALL_FIELDS,
  COLONIES,
  GROUPS,
  eur,
  parseDraft,
  rangeText,
  toDraft,
  type Draft,
  type Field,
  type FieldKey,
} from "./fields";
import styles from "./MoveCalculator.module.css";

const DEBOUNCE_MS = 300;
const ROWS: {
  key: keyof CalculatorResult["base"];
  label: string;
  cost?: boolean;
}[] = [
  { key: "revenue", label: "Revenue" },
  { key: "commission", label: "Commission (8 %)", cost: true },
  { key: "transport_cost", label: "Transport", cost: true },
  { key: "other_costs", label: "Other costs", cost: true },
  { key: "contribution", label: "Contribution after incremental costs" },
  {
    key: "benefit_vs_alternative",
    label: "Benefit relative to the alternative",
  },
];
const SCENARIOS = [
  ["low", "Low"],
  ["base", "Base"],
  ["high", "High"],
] as const;

type Prefill =
  | { status: "loading" }
  | { status: "error" }
  | { status: "none"; reason: string }
  | {
      status: "ready";
      input: CalculatorInput;
      initial: Draft;
      draft: Draft;
      /** Driving time tracks distance and trips until the user types one. */
      followDriving: boolean;
    };

type Props = {
  parcel: Parcel;
  beekeepers: Beekeeper[];
  keeperId: string;
  onKeeper: (id: string) => void;
  year: Season;
  week: number;
  onBack: () => void;
  onClose: () => void;
};

/** Economics of moving one beekeeper's hives to a parcel: low / base / high (WP19). */
export function MoveCalculator({
  parcel,
  beekeepers,
  keeperId,
  onKeeper,
  year,
  week,
  onBack,
  onClose,
}: Props) {
  const [prefill, setPrefill] = useState<Prefill>({ status: "loading" });
  const [matchAttempt, setMatchAttempt] = useState(0);
  const [calcAttempt, setCalcAttempt] = useState(0);
  // The prefill does not depend on the week, so the slider must not refetch it.
  const [openWeek] = useState(week);
  useEscape(onClose);

  // The match's calculator input for this beekeeper and parcel.
  useEffect(() => {
    const controller = new AbortController();
    getMatches(keeperId, year, openWeek, controller.signal)
      .then((cards) => {
        const input = cards.find(
          (c) => c.parcel_id === parcel.id,
        )?.calculator_input;
        if (!input)
          setPrefill({
            status: "none",
            reason: "No move to price for this beekeeper and parcel.",
          });
        else {
          const initial = toDraft(input);
          setPrefill({
            status: "ready",
            input,
            initial,
            draft: initial,
            followDriving: true,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setPrefill({ status: "error" });
      });
    return () => controller.abort();
  }, [keeperId, parcel.id, year, openWeek, matchAttempt]);

  const parsed = useMemo(
    () =>
      prefill.status === "ready"
        ? parseDraft(
            prefill.draft,
            prefill.input,
            prefill.initial,
            prefill.followDriving,
          )
        : undefined,
    [prefill],
  );
  const body = useMemo(
    () => (parsed?.input ? JSON.stringify(parsed.input) : ""),
    [parsed],
  );

  const [calc, setCalc] = useState<{
    result?: CalculatorResult;
    pending: boolean;
    error: boolean;
  }>({ pending: false, error: false });
  useEffect(() => {
    if (!body) return;
    const controller = new AbortController();
    setCalc((c) => ({ ...c, pending: true, error: false }));
    const timer = setTimeout(() => {
      calculate(JSON.parse(body) as CalculatorInput, controller.signal)
        .then((result) => setCalc({ result, pending: false, error: false }))
        .catch(() => {
          if (!controller.signal.aborted)
            setCalc((c) => ({ ...c, pending: false, error: true }));
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [body, calcAttempt]);

  const setField = (key: FieldKey, text: string) =>
    setPrefill((p) =>
      p.status === "ready"
        ? {
            ...p,
            draft: { ...p.draft, [key]: text },
            followDriving: p.followDriving && key !== "driving_hours",
          }
        : p,
    );
  const reset = () =>
    setPrefill((p) =>
      p.status === "ready"
        ? { ...p, draft: p.initial, followDriving: true }
        : p,
    );
  const retry = () => {
    if (prefill.status === "error") {
      setPrefill({ status: "loading" });
      setMatchAttempt((a) => a + 1);
    } else setCalcAttempt((a) => a + 1);
  };

  const keeper = beekeepers.find((b) => b.id === keeperId);
  const crop = cropName(parcel.crop);
  const forage = parcel.service_type === "forage";
  const errors = parsed?.errors ?? {};
  const shownInput =
    parsed?.input ?? (prefill.status === "ready" ? prefill.input : undefined);
  const changed = (key: FieldKey) =>
    prefill.status === "ready" && prefill.draft[key] !== prefill.initial[key];
  const edited = ALL_FIELDS.some((f) => changed(f.key));
  // The backend marks the honey margin Missing where it decides the move (forage).
  const honeyMissing =
    shownInput?.provenance?.honey_margin?.kind === "Missing" &&
    !changed("honey_margin");
  const result = calc.result;

  const field = (f: Field) => {
    if (prefill.status !== "ready") return null;
    const id = `calc-${f.key}`;
    const error = errors[f.key];
    const provenance = shownInput?.provenance?.[f.key];
    return (
      <div key={f.key} className={styles.field} data-edited={changed(f.key)}>
        {/* The colonies slider above carries the visible label. */}
        <label
          htmlFor={id}
          className={f.key === "colonies" ? "sr-only" : undefined}
        >
          {f.label}
        </label>
        <div className={styles.box} data-invalid={!!error}>
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={f.min}
            max={f.max}
            step={f.step}
            value={
              f.key === "driving_hours" &&
              prefill.followDriving &&
              parsed?.input
                ? toDraft(parsed.input).driving_hours
                : prefill.draft[f.key]
            }
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-e` : undefined}
            onChange={(e) => setField(f.key, e.target.value)}
          />
          {f.unit && <span>{f.unit}</span>}
        </div>
        {error ? (
          <small id={`${id}-e`} className={styles.error}>
            {error}
          </small>
        ) : (
          provenance && <ProvenanceBadge provenance={provenance} />
        )}
      </div>
    );
  };

  const scale = Math.max(
    1,
    ...SCENARIOS.map(([s]) =>
      Math.abs(result?.[s].benefit_vs_alternative ?? 0),
    ),
  );

  return (
    <aside className={styles.panel} aria-labelledby="calc-h">
      <div className={styles.head}>
        <button
          type="button"
          className={styles.icon}
          aria-label={`Back to parcel ${parcel.id}`}
          onClick={onBack}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M10 3 L5 8 L10 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div>
          <small>
            Parcel {parcel.id} · {crop} · Illustrative parcel
          </small>
          <h2 id="calc-h">Move calculator</h2>
        </div>
        <button
          type="button"
          className={styles.icon}
          aria-label="Close calculator"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3 3 L13 13 M13 3 L3 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <BeekeeperPicker
        beekeepers={beekeepers}
        value={keeperId}
        onChange={onKeeper}
        service={parcel.service_type}
      />

      {prefill.status === "loading" && (
        <p role="status" className={styles.note}>
          Loading the match for {keeperId}…
        </p>
      )}
      {prefill.status === "none" && (
        <p role="status" className={styles.note}>
          {prefill.reason}
        </p>
      )}
      {(prefill.status === "error" || calc.error) && (
        <div role="alert" className={styles.alert}>
          <strong>Could not calculate. Check that the API is running.</strong>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {prefill.status === "ready" && (
        <>
          {honeyMissing && (
            <div role="note" className={styles.honey}>
              <strong>Enter a honey margin to judge this move</strong>
              <span>
                Forage hosts pay no fee, so the move only pays through honey.
                Without it every forage move reads as a loss.
              </span>
            </div>
          )}

          {result && (
            <section
              role="status"
              aria-live="polite"
              aria-busy={calc.pending}
              className={styles.verdict}
              data-verdict={result.verdict}
              data-pending={calc.pending}
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
              <span>{calc.pending ? "Updating…" : rangeText(result)}</span>
            </section>
          )}

          {parsed && !parsed.input && (
            <p role="status" className={styles.error}>
              Fix the highlighted values. Showing the last valid result.
            </p>
          )}

          {result && (
            <section aria-labelledby="bars-h">
              <h3 id="bars-h">Benefit relative to the alternative</h3>
              <ul className={styles.bars}>
                {SCENARIOS.map(([s, label]) => {
                  const v = result[s].benefit_vs_alternative;
                  const sign = v < 0 ? "neg" : "pos";
                  return (
                    <li key={s} data-base={s === "base"}>
                      <span>{label}</span>
                      <span className={styles.track} aria-hidden="true">
                        <span
                          data-sign={sign}
                          style={{ width: `${(Math.abs(v) / scale) * 50}%` }}
                        />
                      </span>
                      <span data-sign={sign}>{eur(v, true)}</span>
                    </li>
                  );
                })}
              </ul>
              <small>0 = same as keeping the hives at the home apiary</small>
            </section>
          )}

          {result && (
            <section aria-labelledby="tbl-h">
              <h3 id="tbl-h">Breakdown (EUR)</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <td />
                    {SCENARIOS.map(([s, label]) => (
                      <th key={s} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.key} data-total={!r.cost && r.key !== "revenue"}>
                      <th scope="row">{r.label}</th>
                      {SCENARIOS.map(([s]) => (
                        <td key={s}>
                          {r.cost
                            ? eur(-result[s][r.key])
                            : eur(result[s][r.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <small>
                Low: fee −{prefill.draft.price_uncertainty} % and{" "}
                {prefill.draft.extra_trips_low} extra round trip(s). High: fee +
                {prefill.draft.price_uncertainty} %.{" "}
                {forage
                  ? "Forage: no fee, no commission."
                  : "Commission 8 % on pollination fees only."}
              </small>
            </section>
          )}

          <section aria-labelledby="in-h" className={styles.inputs}>
            <div className={styles.inputsHead}>
              <h3 id="in-h">Assumptions (all editable)</h3>
              <button type="button" onClick={reset} disabled={!edited}>
                Reset to prefilled
              </button>
            </div>
            <div className={styles.colonies}>
              <label htmlFor="calc-colonies-range">
                Colonies{" "}
                <span>
                  {COLONIES.min}–{COLONIES.max}
                </span>
              </label>
              <input
                id="calc-colonies-range"
                type="range"
                min={COLONIES.min}
                max={COLONIES.max}
                step={1}
                value={Number(prefill.draft.colonies) || COLONIES.min}
                onChange={(e) => setField("colonies", e.target.value)}
              />
              {field(COLONIES)}
            </div>
            {GROUPS.map((g) => (
              <fieldset key={g.title}>
                <legend>{g.title}</legend>
                <div className={styles.grid}>{g.fields.map(field)}</div>
              </fieldset>
            ))}
          </section>
          <p className={styles.note}>
            Illustrative economics for planning, not a quote. Contribution is
            after incremental costs only; fixed costs of the operation are not
            included.
            {keeper?.synthetic && ` ${keeper.id} is a synthetic beekeeper.`}
          </p>
        </>
      )}
    </aside>
  );
}

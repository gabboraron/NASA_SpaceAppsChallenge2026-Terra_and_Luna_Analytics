import { useState } from "react";
import type { Parcel } from "../../api/client";
import {
  addPlacement,
  cancelPlacement,
  newId,
  useAccount,
} from "../../account/session";
import { formatDay as day } from "../../domain/season";
import { Link, ROUTES } from "../../site/router";
import styles from "./PlacementRequest.module.css";

type Props = {
  parcel: Parcel;
  /** Suggested stay: the parcel's bloom window this season, if known. */
  stay: { start: string; end: string } | null;
  colonies: number;
  /** Base-case benefit relative to the alternative, kept with the request. */
  benefit: number | null;
};

/** Ask to place hives on a listed parcel for a period (demo: stored in this browser). */
export function PlacementRequest({ parcel, stay, colonies, benefit }: Props) {
  const account = useAccount();
  const [start, setStart] = useState(stay?.start ?? "");
  const [end, setEnd] = useState(stay?.end ?? "");
  const [count, setCount] = useState(String(colonies));
  const [error, setError] = useState("");
  const existing = account?.placements.find((p) => p.parcel_id === parcel.id);

  if (existing)
    return (
      <section className={styles.box} data-done="true" role="status">
        <strong>Placement requested</strong>
        <span>
          {day(existing.start)} – {day(existing.end)} · {existing.colonies}{" "}
          colonies
        </span>
        <small>
          Demo: stored in this browser only; no grower is contacted.
        </small>
        <div className={styles.row}>
          <Link to={ROUTES.placements}>My placements</Link>
          <button type="button" onClick={() => cancelPlacement(existing.id)}>
            Cancel request
          </button>
        </div>
      </section>
    );

  const submit = () => {
    const n = Number(count);
    if (!start || !end) return setError("Choose the first and last day.");
    if (end < start) return setError("The last day is before the first day.");
    if (!Number.isInteger(n) || n < 1)
      return setError("Enter a whole number of colonies.");
    setError("");
    addPlacement({
      id: newId("pl"),
      parcel_id: parcel.id,
      crop: parcel.crop,
      service_type: parcel.service_type,
      start,
      end,
      colonies: n,
      benefit_eur: benefit,
      created_at: new Date().toISOString(),
    });
  };

  const id = `req-${parcel.id}`;
  return (
    <section className={styles.box} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>Request this parcel for a period</h3>
      <div className={styles.fields}>
        <label htmlFor={`${id}-from`}>
          From
          <input
            id={`${id}-from`}
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label htmlFor={`${id}-to`}>
          Until
          <input
            id={`${id}-to`}
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label htmlFor={`${id}-n`}>
          Colonies
          <input
            id={`${id}-n`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <small role="alert" className={styles.error}>
          {error}
        </small>
      )}
      <button type="button" className={styles.primary} onClick={submit}>
        Request placement
      </button>
      <small>
        {stay
          ? "Dates are prefilled with this season's bloom window. "
          : "No bloom window is known for this parcel; choose your dates. "}
        Demo: the request is stored in this browser only; no grower is
        contacted.
      </small>
    </section>
  );
}

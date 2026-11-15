import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { getParcels, getTimeline, type Season } from "../../api/client";
import { SEASONS, WEEKS, weekLabel } from "../../domain/season";
import { Link, ROUTES } from "../../site/router";
import {
  buildCalendar,
  inFlower,
  monthAxis,
  type CalendarRow,
} from "./calendar";
import styles from "./Landing.module.css";

type Load =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; rows: CalendarRow[] };

const WEEK_NUMBERS = Array.from({ length: WEEKS }, (_, i) => i + 1);
const NO_ROWS: CalendarRow[] = [];

function Flower() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20">
      <g className={styles.fCard}>
        <ellipse cx="10" cy="4.5" rx="2.6" ry="3.6" />
        <ellipse cx="10" cy="15.5" rx="2.6" ry="3.6" />
        <ellipse cx="4.5" cy="10" rx="3.6" ry="2.6" />
        <ellipse cx="15.5" cy="10" rx="3.6" ry="2.6" />
      </g>
      <circle cx="10" cy="10" r="2.8" className={styles.fHoneyDeep} />
    </svg>
  );
}

/**
 * Fig. 1: bloom state per crop and season week, from the model's timeline.
 *
 * The honeycomb is a picture: a click on a cell picks its week, and one
 * range input carries keyboard and screen-reader use, with the readout
 * announced politely.
 */
export function HoneycombCalendar() {
  const [year, setYear] = useState<Season>(2024);
  const [week, setWeek] = useState(19);
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const rangeId = useId();

  useEffect(() => {
    let live = true;
    setLoad({ status: "loading" });
    Promise.all([getTimeline(year), getParcels()])
      .then(([timeline, parcels]) => {
        if (live)
          setLoad({ status: "ready", rows: buildCalendar(timeline, parcels) });
      })
      .catch(() => {
        if (live) setLoad({ status: "error" });
      });
    return () => {
      live = false;
    };
  }, [year, attempt]);

  const rows = load.status === "ready" ? load.rows : NO_ROWS;
  const axis = useMemo(() => monthAxis(year), [year]);
  const dates = `${weekLabel(year, week)} ${year}`;
  const summary = useMemo(() => inFlower(rows, week), [rows, week]);

  return (
    <figure className={styles.fig1}>
      <div className={styles.figHead}>
        <span className={styles.figLabel}>
          Fig. 1 · The honeycomb calendar: crops × 26 weeks, pilot region
        </span>
        <div role="group" aria-label="Season" className={styles.seasons}>
          {SEASONS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={year === s}
              onClick={() => setYear(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.calBody}>
        <div className={styles.calScroll}>
          {load.status === "error" ? (
            <div role="alert" className={styles.calError}>
              <p>Could not load the season. Check that the API is running.</p>
              <button type="button" onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </button>
            </div>
          ) : (
            <div className={styles.cal} aria-busy={load.status === "loading"}>
              {load.status === "loading" &&
                [0, 1, 2, 3].map((r) => (
                  <div key={r} className={styles.calRow} aria-hidden="true">
                    <span className={styles.rowLabel}>
                      <span className={styles.skelText} />
                    </span>
                    {WEEK_NUMBERS.map((w) => (
                      <span
                        key={w}
                        className={styles.cell}
                        data-skeleton
                        style={{ "--i": w + r * 3 } as CSSProperties}
                      />
                    ))}
                  </div>
                ))}
              {rows.map((row) => (
                <div
                  key={row.crop}
                  className={styles.calRow}
                  aria-hidden="true"
                >
                  <span className={styles.rowLabel}>
                    <strong>{row.name}</strong>
                    <span className="mono">{row.signal}</span>
                  </span>
                  {row.cells.map((state, i) => (
                    <span
                      key={i}
                      className={styles.cell}
                      data-state={state}
                      data-selected={i + 1 === week}
                      onClick={() => setWeek(i + 1)}
                    >
                      {(state === "full" || state === "low") && <Flower />}
                    </span>
                  ))}
                </div>
              ))}
              <div className={styles.calRow} aria-hidden="true">
                <span />
                {axis.map((m, i) => (
                  <span
                    key={i}
                    className={`${styles.tick} mono`}
                    data-month={m !== ""}
                    data-selected={i + 1 === week}
                  >
                    {m}
                  </span>
                ))}
              </div>
              <div className={styles.calRow}>
                <label
                  htmlFor={rangeId}
                  className={`${styles.rangeLabel} mono`}
                >
                  Week
                </label>
                <input
                  id={rangeId}
                  className={styles.range}
                  type="range"
                  min={1}
                  max={WEEKS}
                  value={week}
                  aria-valuetext={`Week ${week}, ${dates}`}
                  onChange={(e) => setWeek(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.readout} aria-live="polite">
          <span className={`${styles.readoutWeek} mono`}>
            WEEK {week} OF {WEEKS}
          </span>
          <strong>{dates}</strong>
          <span className={styles.readoutText}>
            {load.status === "ready"
              ? `${summary} Click any cell to move the week.`
              : load.status === "loading"
                ? "Loading the season…"
                : "No season loaded."}
          </span>
          <Link to={`${ROUTES.app}?year=${year}&week=${week}`}>
            See week {week} on the map
          </Link>
        </div>
      </div>

      <figcaption className={styles.calCaption}>
        <ul className={styles.key}>
          <li data-state="full">Full bloom</li>
          <li data-state="edge">Starting or ending</li>
          <li data-state="low">Bloom, low nectar (drought)</li>
          <li data-state="none">No bloom</li>
          <li data-state="missing">No data</li>
          <li data-state="selected">Selected week</li>
        </ul>
        <span className={styles.swipe}>
          Swipe the calendar sideways to see all 26 weeks.
        </span>
        <span>
          Model output for the pilot region&apos;s illustrative parcels,
          labelled Estimated. Weeks between satellite passes are interpolated.
          The explorer shows each value with its source.
        </span>
      </figcaption>
    </figure>
  );
}

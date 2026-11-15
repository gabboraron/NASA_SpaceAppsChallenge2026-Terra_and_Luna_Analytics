import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { getParcels, getTimeline, type Season } from "../../api/client";
import { SEASONS, WEEKS, weekLabel } from "../../domain/season";
import { CuteBee, type BeePose } from "../../site/CuteBee";
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

type CellKind = CalendarRow["cells"][number];

/** What grows in a honeycomb cell: a bud at the edges of bloom, the crop's own flower in full bloom, a drooping one on dry soil. */
function Flower({ crop, state }: { crop: string; state: CellKind }) {
  const ink = { stroke: "#1c1912", strokeWidth: 1.1 };
  if (state === "edge")
    return (
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20">
        <path d="M10 19v-6" stroke="#5f8a3a" strokeWidth="1.6" />
        <ellipse cx="10" cy="9" rx="4" ry="5" fill="#a7c46a" {...ink} />
        <path d="M8 5.5q2-3 4 0" fill="#f3c641" {...ink} />
      </svg>
    );
  if (state !== "full" && state !== "low") return null;
  const petals =
    crop === "sunflower"
      ? { n: 8, fill: "#f3c641", centre: "#5a3a08", rx: 2.4, ry: 4 }
      : crop === "apple"
        ? { n: 5, fill: "#fbe0de", centre: "#e3a92b", rx: 3.2, ry: 3.8 }
        : crop === "black_locust"
          ? { n: 6, fill: "#fcf8ec", centre: "#a7c46a", rx: 2.4, ry: 3.6 }
          : { n: 5, fill: "#fcf8ec", centre: "#e9806e", rx: 3.2, ry: 3.8 };
  const droop = state === "low";
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20">
      <g transform={droop ? "rotate(35 10 10) translate(0 1.5)" : undefined}>
        {Array.from({ length: petals.n }, (_, i) => (
          <ellipse
            key={i}
            cx="10"
            cy={10 - petals.ry - 0.6}
            rx={petals.rx}
            ry={petals.ry}
            fill={petals.fill}
            transform={`rotate(${(360 / petals.n) * i} 10 10)`}
            {...ink}
          />
        ))}
        <circle cx="10" cy="10" r="2.8" fill={petals.centre} {...ink} />
      </g>
      {droop && (
        <path
          d="M16.5 1.5c-1.6 2.2-2 3.2-2 3.9a2 2 0 0 0 4 0c0-.7-.4-1.7-2-3.9z"
          fill="#9cc6e8"
          {...ink}
        />
      )}
    </svg>
  );
}

/** Small drawing of each crop for the row labels; grassland and others get grass. */
function CropIcon({ crop }: { crop: string }) {
  const ink = {
    stroke: "#1c1912",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
  };
  const body = (() => {
    switch (crop) {
      case "sour_cherry":
        return (
          <>
            <path
              d="M12 3c-1 4-4 6-5 9M12 3c1 4 2 6 3 10"
              fill="none"
              {...ink}
            />
            <circle cx="7" cy="15" r="3.6" fill="#c8553d" {...ink} />
            <circle cx="15" cy="16" r="3.6" fill="#c8553d" {...ink} />
          </>
        );
      case "apple":
        return (
          <>
            <path d="M11 6c-1-2-1-3 0-4" fill="none" {...ink} />
            <path d="M12 5c2-2 4-2 5-1-1 2-3 2-5 1z" fill="#a7c46a" {...ink} />
            <path
              d="M11 7c-4-2-8 1-7 6 1 4 4 7 7 6 3 1 6-2 7-6 1-5-3-8-7-6z"
              fill="#e9806e"
              {...ink}
            />
          </>
        );
      case "black_locust":
        return (
          <>
            <path d="M11 2v6" fill="none" {...ink} />
            {[
              [8, 8],
              [14, 8],
              [7, 12.5],
              [15, 12.5],
              [9, 16.5],
              [13, 16.5],
              [11, 20],
            ].map(([x, y]) => (
              <ellipse
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                rx="2.4"
                ry="2.1"
                fill="#fcf8ec"
                {...ink}
              />
            ))}
          </>
        );
      case "sunflower":
        return (
          <>
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse
                key={i}
                cx="11"
                cy="5"
                rx="2.3"
                ry="3.6"
                fill="#f3c641"
                transform={`rotate(${i * 45} 11 11)`}
                {...ink}
              />
            ))}
            <circle cx="11" cy="11" r="3.6" fill="#5a3a08" {...ink} />
          </>
        );
      default:
        return (
          <path
            d="M4 20c1-6 1-9 0-13M8 20c0-5 1-9 4-13M12 20c0-6 0-9-1-14M15 20c0-4 1-7 4-10"
            fill="none"
            {...ink}
            stroke="#5f8a3a"
          />
        );
    }
  })();
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 22 22">
      {body}
    </svg>
  );
}

/** The readout bee's mood for a week: thirsty on dry bloom, happy in bloom, asleep otherwise. */
function moodOf(rows: CalendarRow[], week: number): BeePose {
  const states = rows.map((r) => r.cells[week - 1]);
  if (states.includes("low")) return "thirsty";
  if (states.includes("full")) return "heart";
  if (states.includes("edge")) return "happy";
  return "sleepy";
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
              {load.status === "ready" && (
                <div className={styles.calRow} aria-hidden="true">
                  <span />
                  {WEEK_NUMBERS.map((w) => (
                    <span key={w} className={styles.hover}>
                      {w === week && <CuteBee pose="happy" size={26} />}
                    </span>
                  ))}
                </div>
              )}
              {rows.map((row) => (
                <div
                  key={row.crop}
                  className={styles.calRow}
                  aria-hidden="true"
                >
                  <span className={styles.rowLabel}>
                    <CropIcon crop={row.crop} />
                    <span>
                      <strong>{row.name}</strong>
                      <span className="mono">{row.signal}</span>
                    </span>
                  </span>
                  {row.cells.map((state, i) => (
                    <span
                      key={i}
                      className={styles.cell}
                      data-state={state}
                      data-selected={i + 1 === week}
                      onClick={() => setWeek(i + 1)}
                    >
                      <Flower crop={row.crop} state={state} />
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
          {load.status === "ready" && (
            <span className={styles.readoutBee} aria-hidden="true">
              <CuteBee pose={moodOf(rows, week)} size={76} />
            </span>
          )}
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

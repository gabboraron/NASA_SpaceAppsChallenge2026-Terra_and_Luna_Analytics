import { useEffect, useMemo, useState } from "react";
import type { Season } from "../../api/client";
import { WEEKS, monthTicks, weekLabel } from "../../domain/season";
import styles from "./TimeSlider.module.css";

const STEP_MS = 700;

type Props = {
  year: Season;
  week: number;
  /** Per week: blooming parcels and those also low on nectar. */
  summary: { blooming: number; low: number }[];
  onWeek: (week: number) => void;
};

/** Weekly scrubber for March–August (D12); the map recolours from loaded data only. */
export function TimeSlider({ year, week, summary, onWeek }: Props) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (week >= WEEKS) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => onWeek(week + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, week, onWeek]);
  const ticks = useMemo(() => monthTicks(year), [year]);
  const label = weekLabel(year, week);

  const most = Math.max(1, ...summary.map((s) => s.blooming));
  const at = (w: number) =>
    `calc(var(--thumb) / 2 + (100% - var(--thumb)) * ${(w - 1) / (WEEKS - 1)})`;

  return (
    <section className={styles.slider} aria-label="Season timeline">
      <div className={styles.head}>
        <button
          type="button"
          className={styles.play}
          aria-label={playing ? "Pause" : "Play the season"}
          onClick={() => {
            if (!playing && week >= WEEKS) onWeek(1);
            setPlaying(!playing);
          }}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
            <path
              fill="currentColor"
              d={playing ? "M3 2h3v10H3zM8 2h3v10H8z" : "M3 1.5v11l9-5.5z"}
            />
          </svg>
        </button>
        <p className={styles.title}>
          <strong>Week {week}</strong>
          <span className="mono">
            {label} {year}
          </span>
        </p>
        <span className={styles.season}>
          Season starts 1 March · {WEEKS} weeks
        </span>
      </div>
      <div className={styles.rail}>
        <div
          className={styles.strip}
          aria-hidden="true"
          style={{ "--weeks": WEEKS } as React.CSSProperties}
        >
          {summary.map((s, i) => (
            <span
              key={i}
              style={{
                left: at(i + 1),
                opacity: s.blooming ? 0.3 + (0.7 * s.blooming) / most : 1,
              }}
              data-state={s.low ? "low" : s.blooming ? "bloom" : "none"}
            />
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={WEEKS}
          step={1}
          value={week}
          aria-label="Week of the season"
          aria-valuetext={`Week ${week}, ${label}`}
          onChange={(e) => {
            setPlaying(false);
            onWeek(Number(e.target.value));
          }}
        />
        <div className={`${styles.months} mono`} aria-hidden="true">
          {ticks.map((t) => (
            <span key={t.label} style={{ left: at(t.week) }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

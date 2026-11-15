import type { Mark, MarkKind, Row } from "./results";
import styles from "./Evidence.module.css";

const W = 720;
const LEFT = 64;
const RIGHT = 24;
const TOP = 8;
const ROW_H = 62;
const AXIS_H = 44;

const NAMES: Record<MarkKind, string> = {
  model: "Model",
  hive: "Hives",
  base: "Calendar",
};

function Glyph({ kind, x, y }: { kind: MarkKind; x: number; y: number }) {
  if (kind === "model")
    return (
      <rect
        className={styles.mModel}
        x={x - 6}
        y={y - 6}
        width="12"
        height="12"
        transform={`rotate(45 ${x} ${y})`}
      />
    );
  return (
    <circle
      className={kind === "hive" ? styles.mHive : styles.mBase}
      cx={x}
      cy={y}
      r="6"
    />
  );
}

type Props = {
  rows: Row[];
  /** Lowest and highest value on the x axis. */
  domain: [number, number];
  ticks: number[];
  axisLabel: string;
  /** Draws a reference line at this x value. */
  zero?: number;
  /** Legend names, in order; defaults to the kinds used. */
  legend: Partial<Record<MarkKind, string>>;
  /** Text alternative read by screen readers. */
  summary: string;
};

/** Dot plot: one row per year, marks placed on a shared day axis. */
export function DotRows({
  rows,
  domain,
  ticks,
  axisLabel,
  zero,
  legend,
  summary,
}: Props) {
  const [lo, hi] = domain;
  const sx = (v: number) => LEFT + ((v - lo) / (hi - lo)) * (W - LEFT - RIGHT);
  const plotH = rows.length * ROW_H;
  const height = TOP + plotH + AXIS_H;
  const tip = (row: Row, m: Mark) =>
    `${row.name} · ${legend[m.kind] ?? NAMES[m.kind]}: ${m.label}`;
  return (
    <figure className={styles.fig}>
      <p className={styles.swipe}>Swipe sideways to see the whole figure.</p>
      <div className={styles.scroll}>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${W} ${height}`}
          role="img"
          aria-label={summary}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                className={t === zero ? styles.zero : styles.grid}
                x1={sx(t)}
                x2={sx(t)}
                y1={TOP}
                y2={TOP + plotH}
              />
              <text
                className={styles.tick}
                x={sx(t)}
                y={TOP + plotH + 16}
                textAnchor="middle"
              >
                {t}
              </text>
            </g>
          ))}
          <text
            className={styles.tick}
            x={(LEFT + W - RIGHT) / 2}
            y={height - 6}
            textAnchor="middle"
          >
            {axisLabel}
          </text>
          {rows.map((row, i) => {
            const y = TOP + i * ROW_H + ROW_H / 2;
            return (
              <g key={row.name}>
                {row.band && (
                  <rect
                    className={styles.band}
                    x={sx(row.band[0])}
                    y={y - 13}
                    width={sx(row.band[1]) - sx(row.band[0])}
                    height="26"
                  />
                )}
                <text className={styles.rowName} x="0" y={y + 5}>
                  {row.name}
                </text>
                {row.marks.map((m) => (
                  <g key={m.kind} className={styles.mark}>
                    <title>{tip(row, m)}</title>
                    <circle className={styles.hit} cx={sx(m.x)} cy={y} r="16" />
                    <Glyph kind={m.kind} x={sx(m.x)} y={y} />
                    <text
                      className={styles.val}
                      x={sx(m.x)}
                      y={m.below ? y + 26 : y - 15}
                      textAnchor="middle"
                    >
                      {m.label}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className={styles.legend}>
        {(Object.keys(legend) as MarkKind[]).map((kind) => (
          <li key={kind}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
              <Glyph kind={kind} x={9} y={9} />
            </svg>
            {legend[kind]}
          </li>
        ))}
        {rows.some((r) => r.band) && (
          <li>
            <span aria-hidden="true" className={styles.bandKey} />
            Pass limit, ±10 days around the hives
          </li>
        )}
      </ul>
    </figure>
  );
}

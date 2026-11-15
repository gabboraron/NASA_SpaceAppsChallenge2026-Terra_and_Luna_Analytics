import type { ReactNode } from "react";
import { BeeMark } from "../../site/BeeMark";
import { ReadingPage } from "../../site/ReadingPage";
import { Link, ROUTES } from "../../site/router";
import page from "../../site/page.module.css";
import { HoneycombCalendar } from "./HoneycombCalendar";
import { Receipt } from "./Receipt";
import styles from "./Landing.module.css";

const FLIGHT = "M58 30 C260 4 470 54 700 28 S980 6 1150 46";
const FLIGHT_SECONDS = 12;
const BEES = 1;

/** A small bee facing +x, for flying along a path. */
function FlyingBee({ delay }: { delay: number }) {
  const dur = `${FLIGHT_SECONDS}s`;
  return (
    <g className={styles.flyer} opacity="0">
      <animateMotion
        path={FLIGHT}
        rotate="auto"
        dur={dur}
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.05;0.93;1"
        dur={dur}
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
      <g transform="scale(1.4)">
        <g className={styles.bob}>
          <ellipse
            className={styles.wing}
            cx="-1.5"
            cy="-5"
            rx="2.6"
            ry="3.8"
          />
          <ellipse className={styles.wing} cx="2" cy="-5" rx="2.6" ry="3.8" />
          <ellipse cx="0" cy="0" rx="7" ry="4.6" className={styles.fHoney} />
          <path d="M-2.2-4.3v8.6M1.4-4.5v9M-7 0h-2.4" />
          <circle cx="4.4" cy="-1" r="0.9" fill="currentColor" stroke="none" />
        </g>
      </g>
    </g>
  );
}

/** Dashed flight from a hive to a flower, drawn behind the headline; bees fly it on a loop. */
function FlightPath() {
  return (
    <svg
      aria-hidden="true"
      className={styles.flight}
      viewBox="0 0 1200 260"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={FLIGHT}
        fill="none"
        stroke="#c98a12"
        strokeWidth="1.6"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <path
        transform="translate(24 14)"
        d="M0 18h28M2 18V6h24v12M2 10h24M2 14h24"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <g transform="translate(1160 30)">
        <g className={styles.sway}>
          <g className={styles.fHoney} stroke="currentColor" strokeWidth="1.1">
            <ellipse cx="14" cy="5" rx="4" ry="5.5" />
            <ellipse cx="14" cy="23" rx="4" ry="5.5" />
            <ellipse cx="5" cy="14" rx="5.5" ry="4" />
            <ellipse cx="23" cy="14" rx="5.5" ry="4" />
            <ellipse
              cx="7.6"
              cy="7.6"
              rx="4"
              ry="5.2"
              transform="rotate(-45 7.6 7.6)"
            />
            <ellipse
              cx="20.4"
              cy="20.4"
              rx="4"
              ry="5.2"
              transform="rotate(-45 20.4 20.4)"
            />
            <ellipse
              cx="20.4"
              cy="7.6"
              rx="4"
              ry="5.2"
              transform="rotate(45 20.4 7.6)"
            />
            <ellipse
              cx="7.6"
              cy="20.4"
              rx="4"
              ry="5.2"
              transform="rotate(45 7.6 20.4)"
            />
          </g>
          <circle cx="14" cy="14" r="5" fill="#5a3a08" />
        </g>
      </g>
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        {Array.from({ length: BEES }, (_, i) => (
          <FlyingBee key={i} delay={(i * FLIGHT_SECONDS) / BEES} />
        ))}
      </g>
      {/* A heart pops from the flower each time a bee arrives. */}
      <path
        className={styles.heart}
        opacity="0"
        d="M0 2.2C-1.6-.6-6-.2-5.2 3.2-4.6 5.6 0 8.4 0 8.4S4.6 5.6 5.2 3.2C6-.2 1.6-.6 0 2.2Z"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          values="1174 26;1182 2"
          dur={`${FLIGHT_SECONDS / BEES}s`}
          begin={`${FLIGHT_SECONDS * 0.93}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;1;0"
          dur={`${FLIGHT_SECONDS / BEES}s`}
          begin={`${FLIGHT_SECONDS * 0.93}s`}
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

/** One numbered chapter: hex numeral, source, text, figure. */
function Chapter({
  mark,
  source,
  title,
  titleId,
  children,
  figure,
}: {
  mark: ReactNode;
  source: string;
  title: string;
  titleId: string;
  children: ReactNode;
  figure: ReactNode;
}) {
  return (
    <section className={styles.ch} aria-labelledby={titleId}>
      <span
        className={`hex ${page.hexNum} ${styles.numeral}`}
        data-tone={typeof mark === "string" ? undefined : "ink"}
      >
        {mark}
      </span>
      <span className={`${styles.source} mono`}>{source}</span>
      <div className={styles.text}>
        <h2 id={titleId} className={page.h2}>
          {title}
        </h2>
        {children}
      </div>
      {figure}
    </section>
  );
}

const SWATCHES = ["pass", "pass", "pass", "pass", "pass", "interp."];

export function LandingPage() {
  return (
    <ReadingPage>
      <section className={`${page.wrap} ${styles.hero}`}>
        <FlightPath />
        <div className={styles.heroGrid}>
          <div className={styles.lead}>
            <BeeMark size={30} />
            <h1 className={styles.slogan}>
              Don&apos;t worry, <mark>bee happy.</mark>
            </h1>
            <p className={styles.headline}>
              Bloom moves. The hives should follow.
            </p>
          </div>
          <p className={styles.heroText}>
            Satellites see each field flower, week by week. HappyBee turns that
            into where a beekeeper should put colonies next, and whether the
            trip pays. We do the worrying, you keep the bees happy.{" "}
            <Link to={ROUTES.method}>How it works</Link>
          </p>
        </div>
        <HoneycombCalendar />
      </section>

      <div className={`${page.wrap} ${styles.chapters}`}>
        <Chapter
          mark="01"
          source="NASA HLS · NDYI"
          title="A sunflower field turns yellow from orbit."
          titleId="ch1"
          figure={
            <figure className={styles.fig}>
              <div className={styles.swatches} aria-hidden="true">
                {SWATCHES.map((_, i) => (
                  <span key={i} />
                ))}
              </div>
              <div className={`${styles.swatchLabels} mono`} aria-hidden="true">
                {SWATCHES.map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </div>
              <figcaption>
                Fig. 2 · One parcel across six weeks. Schematic colours; dashed
                = interpolated, never shown as observed.
              </figcaption>
            </figure>
          }
        >
          <p>
            Harmonized Landsat and Sentinel-2 imagery revisits every few days. A
            yellowness index (NDYI) rises as petals open; we show it next to the
            grower&apos;s declared window. Between clear passes the week is
            interpolated, and the map marks it so.
          </p>
          <p>
            Orchards and black locust flower white, which the index cannot see.
            For those we count heat units on NASA POWER temperatures and show
            them next to the grower&apos;s own declared window.
          </p>
        </Chapter>

        <Chapter
          mark="02"
          source="NASA SMAP L4"
          title="A field can flower and still offer little nectar."
          titleId="ch2"
          figure={
            <figure className={styles.fig}>
              <svg
                role="img"
                aria-label="Schematic soil moisture percentile falling below the 10th percentile line in mid-summer"
                viewBox="0 0 360 180"
                className={styles.diagram}
              >
                <rect
                  x="196"
                  y="12"
                  width="92"
                  height="148"
                  className={styles.fDrought}
                  fillOpacity=".1"
                />
                <line
                  x1="20"
                  y1="132"
                  x2="344"
                  y2="132"
                  className={styles.sDrought}
                  strokeDasharray="5 4"
                />
                <text
                  x="344"
                  y="126"
                  textAnchor="end"
                  className={styles.fDroughtInk}
                >
                  10th percentile
                </text>
                <path
                  d="M20 60 C70 50 110 72 150 92 S210 150 240 148 S300 120 344 96"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <text x="20" y="172" className={styles.fMuted}>
                  Mar
                </text>
                <text x="330" y="172" className={styles.fMuted}>
                  Aug
                </text>
              </svg>
              <figcaption>
                Fig. 3 · Schematic. Shaded weeks are flagged where bloom
                overlaps the dry spell.
              </figcaption>
            </figure>
          }
        >
          <p>
            When root-zone soil moisture is the driest on record for that cell
            and week (below the 10th percentile), flowering sunflower is flagged
            &ldquo;high bloom, low nectar&rdquo;: nectar is at risk.
          </p>
          <p>
            SMAP sees a cell about 9 km across, so the flag covers every field
            in that cell. It is a labelled heuristic.
          </p>
        </Chapter>

        <Chapter
          mark="03"
          source="EEA Natura 2000"
          title="Some places are off limits."
          titleId="ch3"
          figure={
            <figure className={styles.fig}>
              <svg
                role="img"
                aria-label="Diagram: a parcel inside a protected site is blocked, a parcel within 3 km gets a warning, a distant parcel is clear"
                viewBox="0 0 360 180"
                className={styles.diagram}
              >
                <path
                  d="M30 40 q70 -30 130 10 t20 100 q-80 30 -150 -10z"
                  className={`${styles.fNatura} ${styles.sNatura}`}
                  fillOpacity=".16"
                  strokeWidth="1.5"
                />
                <path
                  d="M18 28 q80 -44 158 6 t30 124 q-96 46 -186 -10z"
                  fill="none"
                  className={styles.sNatura}
                  strokeDasharray="3 4"
                />
                <rect
                  x="70"
                  y="80"
                  width="40"
                  height="30"
                  className={styles.fNone}
                  stroke="currentColor"
                />
                <rect
                  x="196"
                  y="100"
                  width="40"
                  height="30"
                  className={styles.fPre}
                  stroke="currentColor"
                />
                <rect
                  x="290"
                  y="40"
                  width="40"
                  height="30"
                  className={styles.fHoney}
                  stroke="currentColor"
                />
                <g textAnchor="middle" fill="currentColor">
                  <text x="90" y="128">
                    blocked
                  </text>
                  <text x="216" y="148">
                    warning
                  </text>
                  <text x="310" y="88">
                    clear
                  </text>
                </g>
                <text x="186" y="22" className={styles.fNatura}>
                  3 km
                </text>
              </svg>
              <figcaption>Fig. 4 · The protected-area rule.</figcaption>
            </figure>
          }
        >
          <p>
            A parcel inside a protected site is blocked outright. One whose 3 km
            surroundings touch a site stays on the list with a warning. The rule
            works with any protected-area layer; the demo uses Natura 2000.
          </p>
        </Chapter>

        <Chapter
          mark="04"
          source="Move calculator"
          title="The calculator also shows when staying put pays better."
          titleId="ch4"
          figure={<Receipt />}
        >
          <p>
            Put your apiary on the map and pick the honey you want. Each parcel
            you open is then priced as a move from there, with your own fuel and
            labour costs, against keeping the hives at home. Every placement
            comes with its reasons, warnings and what is still missing, and you
            can request a parcel for the weeks it blooms.
          </p>
          <Link to={ROUTES.app} className={styles.try}>
            Try it in the explorer
          </Link>
        </Chapter>

        <Chapter
          mark={<BeeMark size={40} inverse />}
          source="Legend"
          title="Every number says where it came from."
          titleId="legend"
          figure={
            <dl className={styles.legend}>
              <dt className="kind-chip" data-kind="Observed">
                Observed
              </dt>
              <dd>Measured for this place and date.</dd>
              <dt className="kind-chip" data-kind="Estimated">
                Estimated
              </dt>
              <dd>Derived by a named model from observations.</dd>
              <dt className="kind-chip" data-kind="Reported">
                Reported
              </dt>
              <dd>Declared by a grower or beekeeper.</dd>
              <dt className="kind-chip" data-kind="Missing">
                Missing
              </dt>
              <dd>No usable data, with the reason.</dd>
            </dl>
          }
        >
          <p>
            Values carry a label, a source and the date of the last usable
            observation. If NASA data is unavailable, the map says Missing and
            gives the reason.
          </p>
        </Chapter>

        <p className={styles.signoff}>
          Happy bees, happy fields, happy keepers.
          <br />
          <mark>Bee happy.</mark>
        </p>
        <Link to={ROUTES.app} className={styles.cta}>
          <span aria-hidden="true" className="hex" />
          Open the explorer
        </Link>
      </div>
    </ReadingPage>
  );
}

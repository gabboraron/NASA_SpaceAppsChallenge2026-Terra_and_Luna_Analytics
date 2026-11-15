import type { ReactNode } from "react";
import { ReadingPage } from "../../site/ReadingPage";
import page from "../../site/page.module.css";
import { Link, ROUTES } from "../../site/router";
import styles from "./Method.module.css";

const STEPS = [
  {
    title: "Observe",
    tag: "HLS · SMAP L4 · POWER",
    text: "Requests to NASA for each parcel, cached on disk so a season replays without refetching. Each value shows the date it describes.",
  },
  {
    title: "Model",
    tag: "bloom · nectar · limits",
    text: "A weekly bloom state per parcel, a drought flag per 9 km cell, and protected-area checks.",
  },
  {
    title: "Decide",
    tag: "matches · calculator",
    text: "Ranked placements with reasons, and the economics of a move against staying put.",
  },
];

const TOC = [
  { id: "bloom", label: "Bloom by crop" },
  { id: "nectar", label: "Drought and nectar" },
  { id: "protect", label: "Protected areas" },
  { id: "match", label: "Matching" },
  { id: "calc", label: "Move calculator" },
  { id: "limits", label: "What it cannot do yet" },
];

type CropRow = {
  crop: string;
  signal: string;
  source: string;
  label: string;
  reported?: boolean;
};

const CROPS: CropRow[] = [
  {
    crop: "Sunflower",
    signal:
      "Grower-declared window; the yellowness index (NDYI) is shown as evidence until its bloom threshold is calibrated",
    source: "HLS L30 / S30, 30 m",
    label: "Reported · NDYI as context",
  },
  {
    crop: "Apple",
    signal: "Spring heat sum reaches the start of bloom (Chmielewski 2011)",
    source: "POWER daily max/min temperature",
    label: "Estimated · heat units",
  },
  {
    crop: "Sour cherry",
    signal: "Growing degree days reach the start of bloom (Matzneller 2014)",
    source: "POWER daily max/min temperature",
    label: "Estimated · heat units",
  },
  {
    crop: "Black locust",
    signal: "Winter chill, then spring heat, reach full bloom (Kim 2021)",
    source: "POWER daily max/min temperature",
    label: "Estimated · heat units",
  },
  {
    crop: "Any crop",
    signal: "Window the grower declares",
    source: "None",
    label: "Reported",
    reported: true,
  },
];

const ZONES = [
  {
    kind: "inside",
    title: "Inside a site",
    text: 'Blocked. Listed under "Not possible" with the reason.',
  },
  {
    kind: "near",
    title: "Within 3 km",
    text: "Allowed, with a warning on the match.",
  },
  { kind: "far", title: "Further away", text: "No restriction." },
];

const LIMITS = [
  "Beekeepers and growers in the demo are synthetic; parcels are illustrative, not real holdings.",
  "Clouds hide fields from HLS; long gaps lower confidence and show as Missing.",
  'No booking: "Request quote" is switched off.',
  "Spray calendars and road routing are not modelled.",
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.sec} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className={page.h2}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Pipeline() {
  return (
    <section aria-label="Pipeline" className={`${page.wrap} ${styles.pipe}`}>
      <ol className={`${page.cardGrid} ${styles.flow}`}>
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span
              className={`hex ${page.hexNum}`}
              data-tone={i === STEPS.length - 1 ? "ink" : undefined}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <strong className={styles.stepTitle}>{s.title}</strong>
            <span className={`mono ${styles.tag}`}>{s.tag}</span>
            <span className={page.small}>{s.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CropTable() {
  return (
    <div className={styles.scroll}>
      <table className={styles.tbl}>
        <thead>
          <tr>
            <th scope="col">Crop</th>
            <th scope="col">Signal</th>
            <th scope="col">NASA source</th>
            <th scope="col">Label in the app</th>
          </tr>
        </thead>
        <tbody>
          {CROPS.map((r) => (
            <tr key={r.crop}>
              <th scope="row">{r.crop}</th>
              <td>{r.signal}</td>
              <td className={r.reported ? undefined : `mono ${styles.src}`}>
                {r.source}
              </td>
              <td>
                <span
                  className={`mono ${styles.chip}`}
                  data-kind={r.reported ? "reported" : "estimated"}
                >
                  {r.label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** How it works: the pipeline and the rules behind each map layer. */
export function MethodPage() {
  return (
    <ReadingPage
      kicker="Method"
      title="From a satellite pass to a hive on a truck."
      lead="The same three steps run for every parcel and every week of the season, from 1 March to the end of August. Nothing on the map is typed in by hand except what growers and beekeepers declare, and that is labelled Reported."
    >
      <Pipeline />

      <div className={`${page.wrap} ${styles.lay}`}>
        <nav aria-label="On this page" className={styles.toc}>
          <span className={`mono ${styles.tocLabel}`}>ON THIS PAGE</span>
          {TOC.map((t) => (
            <a key={t.id} href={`#${t.id}`}>
              {t.label}
            </a>
          ))}
        </nav>

        <div>
          <Section
            id="bloom"
            title="Bloom is measured differently for each crop"
          >
            <p className={page.body}>
              Yellow flowers show up in satellite reflectance and white blossom
              on trees does not, so each crop uses a signal that can detect it.
            </p>
            <CropTable />
            <p className={styles.note}>
              Each phenology threshold in{" "}
              <span className="mono">data/phenology.json</span> carries a cited
              source. Weeks between two clear satellite passes are interpolated
              and drawn dashed; they are never shown as observations.
            </p>
            <p className={page.body}>
              The black-locust bloom dates are checked against hive-scale
              records the model never saw:{" "}
              <Link to={ROUTES.evidence}>see the evidence</Link>.
            </p>
          </Section>

          <Section id="nectar" title="Drought and nectar">
            <p className={page.body}>
              For each SMAP cell we compare this week&apos;s root-zone soil
              moisture with the same week in that cell&apos;s own history. When
              it is the driest such week on record (below the 10th percentile of
              2015&ndash;2024), flowering sunflower in the cell is downgraded to{" "}
              <strong>bloom, low nectar</strong>: dry soil during bloom puts
              nectar at risk. Orchards are assumed irrigated. Black locust is
              left out, because the rule did not agree with hive-scale records
              for it.
            </p>
            <pre className={`mono ${styles.rule}`}>
              {`low_nectar = flowering
  and crop == sunflower
  and rootzone_moisture < p10(cell, same week, 2015-2024)`}
            </pre>
            <p className={styles.note}>
              This is a labelled heuristic applied to a whole ~9 km cell. Nectar
              in individual fields is not measured.
            </p>
          </Section>

          <Section id="protect" title="Protected areas">
            <div className={styles.zones}>
              {ZONES.map((z) => (
                <div key={z.kind} className={styles.zone} data-kind={z.kind}>
                  <strong>{z.title}</strong>
                  <span className={page.small}>{z.text}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="match" title="Matching">
            <p className={page.body}>
              Hard filters first: the beekeeper&apos;s goal (pollination service
              or forage) and protected-area blocks. The rest are ranked, and
              each card shows its reasons, warnings, missing items and a
              confidence level.
            </p>
            <p className={page.body}>
              Distance is the straight-line distance times a 1.3 detour factor,
              labelled Estimated and editable in the calculator. The ranking
              weighs three things: how much of the bloom window the beekeeper
              can cover, how close the parcel is, and how well the bloom timing
              is evidenced. The weights are a design choice, not a measurement.
            </p>
          </Section>

          <Section id="calc" title="Move calculator">
            <p className={page.body}>
              The calculator reports the{" "}
              <strong>contribution after incremental costs</strong> of a move,
              and its <strong>benefit relative to the alternative</strong> of
              staying put. Every input is prefilled from the match and can be
              changed. It makes no yield claims.
            </p>
          </Section>

          <Section id="limits" title="What it cannot do yet">
            <ul className={styles.limits}>
              {LIMITS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </ReadingPage>
  );
}

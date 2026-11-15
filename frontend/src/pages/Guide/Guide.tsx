import type { ReactNode } from "react";
import { REPO } from "../../site/meta";
import { ReadingPage } from "../../site/ReadingPage";
import page from "../../site/page.module.css";
import styles from "./Guide.module.css";

const STEPS = [
  {
    title: "Pick a season",
    text: "2022 or 2024, top right. 2022 was a drought year.",
  },
  {
    title: "Move the week",
    text: "Drag the slider or press play. Parcels recolour by bloom.",
  },
  {
    title: "Choose a beekeeper",
    text: "B1, B2 and B3 are synthetic. Their placements appear on the right.",
  },
  {
    title: "Open a parcel",
    text: "Its weekly timeline, with the source of every value.",
  },
  {
    title: "Calculate the move",
    text: "Change any input and compare with staying put.",
  },
];

const GLOSSARY = [
  {
    term: "NDYI",
    def: "Normalized difference yellowness index. It rises when yellow petals cover a field.",
  },
  {
    term: "GDD · growing degree days",
    def: "Heat accumulated above a base temperature since the season started. Trees flower after a set amount.",
  },
  {
    term: "Root-zone percentile",
    def: "How dry the soil is compared with the same week in other years, for one SMAP cell.",
  },
  {
    term: "Interpolated week",
    def: "A week between two clear satellite passes. Drawn dashed, never shown as observed.",
  },
  {
    term: "Natura 2000",
    def: "The European network of protected sites, used here as the protected-area layer.",
  },
  {
    term: "Benefit relative to the alternative",
    def: "What a move adds compared with leaving the colonies where they are.",
  },
];

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Is this a real marketplace?",
    a: "Not yet. It is a working demo: the NASA data is real (each value shows the date it describes), the beekeepers are synthetic, the parcels are illustrative and booking is switched off.",
  },
  {
    q: "Does it work outside the pilot region?",
    a: "The NASA datasets are global, so the method carries over. Each new region needs parcels, protected-area boundaries and phenology parameters with sources.",
  },
  {
    q: "Why does a value say Missing?",
    a: "Clouds, a failed request or no satellite pass that week. The badge gives the reason.",
  },
  {
    q: "Why is a match low confidence?",
    a: "Confidence follows the evidence for the bloom timing: low for a grower's declaration alone, medium for a model estimate, high once the bloom is observed.",
  },
  {
    q: "Can I trust the calculator?",
    a: "It shows the contribution after incremental costs from inputs you can see and change. It makes no yield promises.",
  },
  {
    q: "How do I run it myself?",
    a: (
      <>
        <span className={`mono ${styles.code}`}>docker compose up --build</span>
        , then open localhost:8080. Instructions are in the{" "}
        <a href={REPO}>repository README</a>.
      </>
    ),
  },
];

/** Guide and FAQ: the five steps through the explorer, terms and questions. */
export function GuidePage() {
  return (
    <ReadingPage
      kicker="Guide · 2 minutes"
      title="Five moves through the explorer."
    >
      <section aria-label="Steps" className={`${page.wrap} ${styles.stepsSec}`}>
        <ol className={`${page.cardGrid} ${styles.steps}`}>
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span
                className={`hex ${page.hexNum} ${styles.num}`}
                data-tone={i === STEPS.length - 1 ? "ink" : undefined}
              >
                {i + 1}
              </span>
              <strong>{s.title}</strong>
              <span className={page.small}>{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className={`${page.wrap} ${styles.two}`}>
        <section aria-labelledby="gl-h" className={styles.col}>
          <h2 id="gl-h" className={`${page.h2} ${styles.h2}`}>
            Glossary
          </h2>
          <dl className={styles.glossary}>
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <dt className="mono">{g.term}</dt>
                <dd>{g.def}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="faq-h">
          <h2 id="faq-h" className={`${page.h2} ${styles.h2}`}>
            Questions
          </h2>
          {FAQ.map((f, i) => (
            <details key={f.q} className={styles.faq} open={i === 0}>
              <summary>
                <span aria-hidden="true" className={`hex ${styles.plus}`}>
                  +
                </span>
                {f.q}
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      </div>
    </ReadingPage>
  );
}

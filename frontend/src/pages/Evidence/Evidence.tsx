import type { ReactNode } from "react";
import { ReadingPage } from "../../site/ReadingPage";
import { REPO } from "../../site/meta";
import page from "../../site/page.module.css";
import { Link, ROUTES } from "../../site/router";
import method from "../Method/Method.module.css";
import { DotRows } from "./DotRows";
import styles from "./Evidence.module.css";
import { CHECKS, HIVE_FILES, HOLDOUT_ROWS, ONSET_ROWS, RUN } from "./results";
import { REFERENCES } from "./references";

const VERIFICATION = `${REPO}/tree/main/verification`;
const THRESHOLDS = `${REPO}/blob/main/verification/thresholds.toml`;

const VERDICTS = [
  {
    big: "5 to 6 days",
    title: "Bloom start, black locust",
    text: "The model put the start of bloom 6 days (2022) and 5 days (2024) before the hives began to gain weight. The limit was 10 days.",
  },
  {
    big: "19 vs 20 days",
    title: "Early year, late year",
    text: "Bloom came 20 days earlier in 2024 than in 2022 according to the hives. The model said 19.",
  },
  {
    big: "5.5 vs 13.0",
    title: "Against the calendar",
    text: "Mean error in days: the model, then a guess from the usual date. The calendar guess misses the 10-day limit in both years.",
  },
  {
    big: "5 years",
    title: "Warmth as the clock",
    text: "Predicting each year from the other four, accumulated temperature errs by 5.2 to 7.6 days and the calendar by 15.4.",
  },
];

const TOC = [
  { id: "claim", label: "What is tested" },
  { id: "reference", label: "The reference: hive scales" },
  { id: "design", label: "Test design" },
  { id: "results", label: "Results" },
  { id: "table", label: "All ten checks" },
  { id: "limits", label: "What this does not show" },
  { id: "rerun", label: "Run it yourself" },
  { id: "refs", label: "References" },
];

const SIGNAL_STEPS = [
  "Night weight: the last reading before 05:00, when the colony is home and still. A day's gain is the next night's weight minus this one.",
  "Changes above 5 kg in a day are dropped. They are hive work: a box added, honey taken.",
  "A day that gains at least 0.3 kg is a flow day. A flow is a run of flow days, broken by at most two other days, that adds at least 3 kg.",
  "A flow belongs to a crop when its peak falls in the crop's calendar window: 10 April to 20 June for black locust, 15 June to 31 August for sunflower. The largest such flow is used.",
  "With two hives in a year, the reference date is the mean of the two.",
];

const DESIGN = [
  {
    title: "Independent reference",
    text: "The model reads satellite and weather data. The reference is a scale under a beehive. Neither uses the other.",
  },
  {
    title: "Parameters not fitted here",
    text: "The black-locust model and its three parameters are taken as published, fitted on trees in another continent. Nothing was tuned to these hives.",
  },
  {
    title: "Limits set first",
    text: "The pass limits were written into a file before the first run on real model output, so a result could not shape its own limit.",
  },
  {
    title: "A baseline to beat",
    text: "A result inside the limit still has to do at least as well as the mean date of the other years.",
  },
  {
    title: "Missing data cannot pass",
    text: "A check with no model value or no reference ends as not tested.",
  },
  {
    title: "The checks are tested",
    text: "On synthetic data a correct model passes every check, and a model three weeks late fails.",
  },
];

const LIMITS = [
  "Two test years and two hives at one apiary. The results show agreement at one place; they carry no statistical significance and say nothing yet about other regions. Skill measured on so few cases is unstable.",
  "A weight gain needs open flowers, nectar and flying weather, so the flow starts some days after the first flowers. The model was early in both years, which fits that, but two years cannot separate a constant offset from chance.",
  "The dataset gives only the nearest city, without coordinates, and colonies may have been moved between pastures.",
  "Night-to-night gain understates what the bees brought in, because nectar loses water overnight (Meikle et al. 2018). This affects amounts more than dates.",
  "Flows are assigned to a crop by calendar window. Oilseed rape can overlap black locust in spring.",
  "Sunflower bloom in the demo is a declared window with synthetic growers. S4 and the sunflower line of B0 therefore test a declaration, since sunflower has no bloom model yet, and the tie with the calendar is not counted as skill.",
  "The low-nectar flag is not supported by this data. In the one comparison available it marked the year in which the hives gained more. Its settings were also chosen with these hive records in view, so S5 is not an independent test. A field study of sunflower found air humidity and temperature mattered more for nectar than soil water (Chabert et al. 2020).",
  "Apple and sour cherry are unverified. Their check needs PEP725 station records, which require registration; the models themselves are published with errors of about 4 days.",
  "The first run of S1 failed at −11 days in both years because it read the first day of the blooming week instead of the modelled start date. We changed the reading and kept the limit. The weekly reading is still reported, and it is still 11 days early: the week slider shows bloom from that week.",
  "S3 reports three base temperatures and the best one was picked after seeing the errors. All three beat the calendar, so the conclusion does not rest on that choice.",
  "Photo counts follow where and when people take photos, with more at weekends and during organised events (Di Cecco et al. 2021). In 2025 the photo peak came 15 days after the hive peak.",
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
    <section id={id} className={method.sec} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className={page.h2}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Verdicts() {
  return (
    <>
      <section aria-label="Main results" className={page.wrap}>
        <ul className={`${page.cardGrid} ${styles.verdicts}`}>
          {VERDICTS.map((v) => (
            <li key={v.title}>
              <span className={styles.big}>{v.big}</span>
              <strong className={styles.cardTitle}>{v.title}</strong>
              <span className={page.small}>{v.text}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className={`${page.wrap} ${page.small} ${styles.scope}`}>
        Scope: black-locust bloom timing, checked on the seasons {RUN.years}{" "}
        against two hives at one apiary. The results show agreement at that one
        site; other crops and other regions are untested.{" "}
        <a href="#limits">What this does not show</a>.
      </p>
    </>
  );
}

function CheckTable() {
  return (
    <div className={method.scroll}>
      <table className={method.tbl}>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Question</th>
            <th scope="col">Model output</th>
            <th scope="col">Reference</th>
            <th scope="col">Limit</th>
            <th scope="col">Result</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {CHECKS.map((c) => (
            <tr key={c.id}>
              <th scope="row" className={styles.id}>
                {c.id}
              </th>
              <td>{c.question}</td>
              <td>{c.input}</td>
              <td>{c.reference}</td>
              <td>{c.gate}</td>
              <td>{c.result}</td>
              <td>
                <span
                  className={`mono ${styles.status}`}
                  data-status={c.status}
                >
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Evidence: how the bloom model is checked against measured data, and the results. */
export function EvidencePage() {
  return (
    <ReadingPage
      bee="magnifier"
      kicker="Evidence"
      title="Checked against beehives on a scale."
      lead="We compare the bloom model with records it never saw: the weight of two bee colonies, measured at least every hour over five seasons. The test, its results and its weak points are below, with the commands to repeat it."
    >
      <Verdicts />

      <div className={`${page.wrap} ${method.lay}`}>
        <nav aria-label="On this page" className={method.toc}>
          <span className={`mono ${method.tocLabel}`}>ON THIS PAGE</span>
          {TOC.map((t) => (
            <a key={t.id} href={`#${t.id}`}>
              {t.label}
            </a>
          ))}
        </nav>

        <div>
          <Section id="claim" title="What is tested">
            <p className={page.body}>
              The claim: from NASA POWER daily temperature alone, the model
              gives the start of black-locust bloom closely enough to plan a
              hive move, and better than assuming the usual date. Black locust
              is the main spring honey crop where the reference hives stand, and
              its bloom date moves by weeks from year to year, so the calendar
              is a weak guide.
            </p>
            <p className={page.body}>
              The model is the chill-days model of Cesaraccio et al. (2004) with
              the black-locust parameters of Kim et al. (2021): chilling
              accumulates from 1 October, then warmth above 8.88 °C accumulates
              until full bloom. The source reports an error (RMSE) of 6.1 days.
              The rules for every crop are on{" "}
              <Link to={ROUTES.method}>How it works</Link>.
            </p>
            <pre className={`mono ${method.rule}`}>
              {`chill:  sum of daily chill from 1 Oct  until  C* = -138.95 °D
heat:   then sum of daily warmth above 8.88 °C  until  F* = 247.73 °D  (full bloom)
bloom:  10 days centred on full bloom; onset = its first day
input:  NASA POWER T2M_MAX, T2M_MIN (daily)`}
            </pre>
          </Section>

          <Section id="reference" title="The reference: hive scales">
            <p className={page.body}>
              A hive on a scale gains weight when bees bring in nectar. That
              needs both things the model predicts: flowers that are open and
              nectar in them. Continuous hive weighing is established practice
              (Meikle &amp; Holst 2015), and NASA scientists have used
              scale-hive nectar flows to track bloom timing against satellite
              green-up (Esaias et al. 2011). The data here is an open dataset of
              two colonies weighed every hour or every ten minutes from 2021 to
              2025 (Ilyés-Vincze et al. 2025, CC BY 4.0).
            </p>
            <p className={page.body}>
              Weights become nectar flows by fixed rules:
            </p>
            <ol className={styles.steps}>
              {SIGNAL_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className={method.note}>
              The rules found 15 flows: black locust in each of the five years,
              sunflower in four. Two more references are used where they fit:
              weekly counts of research-grade iNaturalist photos of black
              locust, and PEP725 station records for orchards when a user
              supplies them. Pollen forecast services were reviewed and not
              used: they cover wind-pollinated allergen plants and cannot be
              queried for past seasons.
            </p>
          </Section>

          <Section id="design" title="Test design">
            <div className={method.zones}>
              {DESIGN.map((d) => (
                <div key={d.title} className={method.zone}>
                  <strong>{d.title}</strong>
                  <span className={page.small}>{d.text}</span>
                </div>
              ))}
            </div>
            <p className={method.note}>
              The limits are in{" "}
              <a href={THRESHOLDS}>
                <span className="mono">verification/thresholds.toml</span>
              </a>
              : 10 days for the bloom start, 7 days for the shift between years.
              A week is the unit a beekeeper plans in, and the published model
              error is 4.6 to 6.1 days on sites it was not fitted to (Kim et al.
              2021). Judging a forecast against a simple reference is standard
              forecast verification, and holding out whole years follows the
              advice for data that is ordered in time (Roberts et al. 2017).
            </p>
          </Section>

          <Section id="results" title="Results">
            <p className={page.body}>
              In both test years the modelled start of bloom is inside the limit
              and a few days before the hives start gaining. The calendar guess,
              the mean start date of the other years, is outside the limit in
              both.
            </p>
            <DotRows
              rows={ONSET_ROWS}
              domain={[105, 155]}
              ticks={[110, 120, 130, 140, 150]}
              axisLabel="Day of year"
              legend={{
                hive: "Hives: start of the spring flow",
                model: "Model: start of bloom",
                base: "Calendar: mean of the other years",
              }}
              summary="Start of black-locust bloom. 2022: calendar 10 May, model 15 May, hives 21 May. 2024: model 25 April, hives 30 April, calendar 15 May."
            />
            <p className={styles.caption}>
              Figure 1. Start of black-locust bloom in the two test years. Model
              error −6 and −5 days; calendar error −11 and +15 days.
            </p>

            <p className={page.body}>
              Spring 2024 was early. The hives started 20 days earlier than in
              2022, the model 19 days earlier, and the iNaturalist photo peak 23
              days earlier.
            </p>

            <p className={page.body}>
              The five-year check leaves the app&apos;s model aside and asks a
              simpler question of the same NASA temperature data: if the heat
              sum at the start of the flow is learnt from four years, how well
              does it date the fifth? Simple growing degree days from 1 January,
              with base 0, 5 and 10 °C, give mean errors of 7.6, 7.2 and 5.2
              days. The calendar gives 15.4.
            </p>
            <DotRows
              rows={HOLDOUT_ROWS}
              domain={[-27, 27]}
              ticks={[-20, -10, 0, 10, 20]}
              zero={0}
              axisLabel="Error in days (negative: too early)"
              legend={{
                model: "Heat sum, base 10 °C",
                base: "Calendar: mean of the other years",
              }}
              summary="Error of each held-out year. Calendar: minus 17, minus 11, minus 11, plus 15, plus 23 days. Heat sum: plus 8, minus 6, plus 1, minus 3, plus 8 days."
            />
            <p className={styles.caption}>
              Figure 2. Each year predicted from the other four. Mean absolute
              error 5.2 days for the heat sum and 15.4 days for the calendar.
              The heat sum at onset still varies between years (coefficient of
              variation 0.19), so warmth is the better clock but still an
              inexact one.
            </p>

            <p className={page.body}>
              The app counts a day as flying weather when POWER gives at least
              15 °C and wind below 5 m/s. On 782 such days in the bloom seasons,
              the hives gained 0.3 kg or more on 34%. On the 50 other days they
              did so on 14%, and the median day lost weight.
            </p>
          </Section>

          <Section id="table" title="All ten checks">
            <p className={page.body}>
              Four checks have a pass limit. The rest report a number without
              judging it, and one could not be run.
            </p>
            <CheckTable />
            <p className={method.note}>
              Run on {RUN.date} at commit{" "}
              <span className="mono">{RUN.commit}</span>, seasons {RUN.years}.
              The command exited with 0: no check with a limit failed and none
              crashed.
            </p>
          </Section>

          <Section id="limits" title="What this does not show">
            <ul className={method.limits}>
              {LIMITS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Section>

          <Section id="rerun" title="Run it yourself">
            <p className={page.body}>
              The checks are <a href={VERIFICATION}>open code</a>. They download
              the hive files, verify them against the hashes below so every run
              compares with the same bytes, ask the running app for its timeline
              and print the report.
            </p>
            <pre className={`mono ${method.rule}`}>
              {`docker compose up -d --wait
uv run python -m verification      # full report, exit code 1 on a failed limit
uv run pytest verification         # the checks' own tests, no network`}
            </pre>
            <div className={method.scroll}>
              <table className={method.tbl}>
                <thead>
                  <tr>
                    <th scope="col">Reference file</th>
                    <th scope="col">SHA-256</th>
                  </tr>
                </thead>
                <tbody>
                  {HIVE_FILES.map((f) => (
                    <tr key={f.name}>
                      <th scope="row">{f.name}</th>
                      <td className={`mono ${styles.hash}`}>{f.sha256}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={method.note}>
              The numbers on this page are a snapshot of the run above. NASA
              responses for the two test seasons ship with the code, so the
              model side replays without a login.
            </p>
          </Section>

          <Section id="refs" title="References">
            <ol className={styles.refs}>
              {REFERENCES.map((r) => (
                <li key={r.href}>
                  {r.text} <a href={r.href}>{r.link}</a>. {r.use}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </ReadingPage>
  );
}

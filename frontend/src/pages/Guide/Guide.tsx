import type { ReactNode } from "react";
import { ReadingPage } from "../../site/ReadingPage";
import { Link, ROUTES } from "../../site/router";
import page from "../../site/page.module.css";
import { FAQ, GLOSSARY } from "./faq";
import styles from "./Guide.module.css";

const IMG = `${import.meta.env.BASE_URL}guide/`;

const STEPS = [
  {
    title: "Pick a season",
    text: "2022, 2024 or the latest season, top right. 2022 was a drought year; compare it with 2024.",
  },
  {
    title: "Move the week",
    text: "Drag the slider or press play. Parcels recolour by bloom.",
  },
  {
    title: "Sign in, draw your apiary",
    text: "Continue as the demo beekeeper in one click, or register. Matches from your home parcel appear on the right.",
  },
  {
    title: "Open a parcel",
    text: "Its week in detail, with the source of every value.",
  },
  {
    title: "Calculate the move",
    text: "Change any input and compare with staying put.",
  },
];

const TOC = [
  { id: "problem", label: "The problem" },
  { id: "solution", label: "Our solution" },
  { id: "start", label: "Quick start" },
  { id: "tour", label: "The explorer at a glance" },
  { id: "season", label: "Seasons and drought" },
  { id: "week", label: "Week slider" },
  { id: "layers", label: "Layers and legend" },
  { id: "matches", label: "Matches" },
  { id: "parcel", label: "Parcel details" },
  { id: "verify", label: "Field photo" },
  { id: "calculator", label: "Move calculator" },
  { id: "draw", label: "Draw your own field" },
  { id: "provenance", label: "Where values come from" },
  { id: "more", label: "Phone, links, errors" },
  { id: "glossary", label: "Glossary" },
  { id: "faq", label: "Questions" },
];

const TOUR = [
  ["Season switch", "Top right. Each season is loaded once, then kept."],
  [
    "Layers",
    "Left. Toggles and the legend for colours, outlines and hatching.",
  ],
  [
    "Map",
    "Parcels, protected sites, soil moisture cells and your own parcels. Hover a parcel for its week; click it for details.",
  ],
  [
    "Week slider",
    "Bottom. 26 weeks from 1 March; the strip above it shows how many parcels bloom.",
  ],
  ["Side panel", "Right. Your matches, a parcel's details, or the calculator."],
];

const KINDS = [
  ["Observed", "Measured for this place and date, such as an HLS pass."],
  ["Estimated", "Derived by a named model from observations."],
  ["Reported", "Declared by a grower or beekeeper."],
  ["Missing", "No usable data. The badge says why."],
] as const;

const TROUBLE = [
  [
    "Fetching the season from NASA…",
    "The first load of a season. With the shipped cache it takes seconds; a cold cache can take a minute.",
  ],
  [
    "Fetching satellite data from NASA…",
    "The live season only. Bloom from weather is already shown; the map asks again every 20 seconds until satellite bloom and soil moisture arrive, which can take several minutes.",
  ],
  [
    "Lost connection to the API",
    "The map keeps what it has and checks again every 5 seconds; the rest reloads by itself.",
  ],
  ["Could not load …", "Press Try again. Only the parts that failed reload."],
  [
    "Soil moisture not available",
    "No SMAP cells for that season, so nectar shows as unknown on drought-sensitive crops.",
  ],
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

/** A screenshot from the explorer; width and height reserve its space. */
function Shot({
  src,
  alt,
  w,
  h,
  caption,
  narrow,
}: {
  src: string;
  alt: string;
  w: number;
  h: number;
  caption?: ReactNode;
  narrow?: boolean;
}) {
  return (
    <figure className={styles.shot} data-narrow={narrow || undefined}>
      <img
        src={IMG + src}
        alt={alt}
        width={w}
        height={h}
        loading="lazy"
        decoding="async"
      />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** Screenshot beside its explanation; stacks on narrow screens. */
function Split({ shot, children }: { shot: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.split}>
      {shot}
      <div className={styles.splitText}>{children}</div>
    </div>
  );
}

function Problem() {
  return (
    <Section id="problem" title="The problem">
      <p className={page.body}>
        Many of the crops we eat need insects to carry pollen. Fruit, vegetable
        or seed production from 87 of 115 leading global food crops depends on
        animal pollination, and those crops make up about 35 % of global crop
        production by volume
        <sup>
          <a href="#src-klein">1</a>
        </sup>
        . The food production that relies directly on pollination is worth an
        estimated US$235–577 billion a year
        <sup>
          <a href="#src-ipbes">2</a>
        </sup>
        .
      </p>
      <p className={page.body}>
        Where wild pollinators are not enough, growers hire honey bee colonies,
        and migratory beekeepers truck them from crop to crop through the
        season.
      </p>
      <ul className={styles.points}>
        <li>
          Bloom dates move from year to year. A warm spring brings the orchards
          forward and a cold one holds them back, so hives that arrive a week
          late can miss the bloom.
        </li>
        <li>
          In a drought a field can be in full flower and still give the bees
          little nectar.
        </li>
        <li>
          Protected sites have their own rules, and bees forage well beyond the
          field edge.
        </li>
        <li>
          Fuel, trips, labour and feed add up, and sometimes leaving the
          colonies at home pays better.
        </li>
      </ul>
      <p className={page.body}>
        Without data, planning starts from the grower&apos;s guess of when the
        field will flower. Satellites pass over every field every few days.
      </p>
    </Section>
  );
}

function Solution() {
  return (
    <Section id="solution" title="Our solution">
      <p className={page.body}>
        Pollination Marketplace puts three NASA datasets on one weekly map, so a
        beekeeper and a grower can see the same picture and decide together.
      </p>
      <div className={`${page.cardGrid} ${styles.pillars}`}>
        <div>
          <strong>When it blooms</strong>
          <span className={page.small}>
            Heat sums from NASA POWER for orchards and black locust; the HLS
            yellowness index as evidence for sunflower; the grower&apos;s
            declared window next to both.
          </span>
        </div>
        <div>
          <strong>Whether there is nectar</strong>
          <span className={page.small}>
            NASA SMAP root-zone soil moisture flags sunflower that blooms on
            unusually dry soil.
          </span>
        </div>
        <div>
          <strong>Where hives may go</strong>
          <span className={page.small}>
            Protected sites block a parcel or add a warning; matches are ranked
            with their reasons.
          </span>
        </div>
        <div>
          <strong>Whether the trip pays</strong>
          <span className={page.small}>
            A calculator compares the move with staying put, with every input
            editable.
          </span>
        </div>
      </div>
      <p className={page.body}>
        Every number shows its source and date. When NASA has no usable data,
        the map says Missing and gives the reason. The method is written up in{" "}
        <Link to={ROUTES.method}>How it works</Link>; every source is listed
        under <Link to={ROUTES.data}>Data</Link>.
      </p>
      <p className={styles.note}>
        Demo status: the NASA data is real. Sign-in is a mock: your account,
        parcels and placement requests are stored in your browser only and no
        grower is contacted. Growers are synthetic and the listed parcels are
        illustrative.
      </p>
    </Section>
  );
}

function QuickStart() {
  return (
    <Section id="start" title="Quick start · 2 minutes">
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
      <Link to={ROUTES.app} className={styles.try}>
        <span aria-hidden="true" className="hex" />
        Open the explorer
      </Link>
    </Section>
  );
}

function Features() {
  return (
    <>
      <Section id="tour" title="The explorer at a glance">
        <Shot
          src="overview.webp"
          w={1600}
          h={1000}
          alt="The explorer: layer toggles on the left, the map with parcels and soil moisture cells in the middle, the week slider at the bottom and ranked placements on the right."
          caption="The 2022 season, week 20 (mid-July). Screenshot from an earlier version."
        />
        <dl className={styles.tour}>
          {TOUR.map(([t, d], i) => (
            <div key={t}>
              <dt>
                <span className={`hex ${styles.dot}`}>{i + 1}</span>
                {t}
              </dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="season" title="Seasons and the drought comparison">
        <Shot
          src="season.webp"
          w={748}
          h={112}
          narrow
          alt="The top bar with the Demo · synthetic actors label and the 2022 and 2024 season buttons."
        />
        <p className={page.body}>
          Switch between 2022, a drought year, and 2024. Put both on the same
          week and compare: in mid-July 2022 the soil moisture cells are red and
          the flowering sunflower is hatched as high bloom, low nectar; in 2024
          the same fields bloom normally.
        </p>
        <p className={page.body}>
          The third button, marked live, is the latest complete season. It is
          read from NASA when you open it, not from the shipped cache: bloom
          from weather shows at once, and satellite bloom and soil moisture
          follow where the server has an Earthdata login.
        </p>
        <div className={styles.pair}>
          <Shot
            src="map-2022.webp"
            w={900}
            h={969}
            alt="Map of week 20 in 2022: red soil moisture cells and hatched sunflower parcels."
            caption="2022, week 20: dry soil, nectar at risk."
          />
          <Shot
            src="map-2024.webp"
            w={900}
            h={969}
            alt="Map of week 20 in 2024: the same parcels with normal bloom."
            caption="2024, week 20: the same fields."
          />
        </div>
      </Section>

      <Section id="week" title="Week slider">
        <Shot
          src="timeline.webp"
          w={1504}
          h={242}
          alt="The week slider at week 20, 12 to 18 July 2022, with a strip of bloom counts and month ticks from March to August."
        />
        <ul className={styles.points}>
          <li>
            The season runs 26 weeks from 1 March. Drag the handle, use the
            arrow keys, or press play to watch the season unfold.
          </li>
          <li>
            The strip above the slider shows how many parcels bloom each week.
            Darker yellow means more parcels; a hatched week has parcels flagged
            low nectar.
          </li>
          <li>
            Matches, parcel details and the map all follow the selected week.
          </li>
        </ul>
      </Section>

      <Section id="layers" title="Layers and legend">
        <Split
          shot={
            <Shot
              src="layers.webp"
              w={544}
              h={2000}
              narrow
              alt="The layers panel with switches for parcels, Natura 2000, soil moisture, foraging radius, beekeepers and satellite imagery, and the bloom and crop legends."
            />
          }
        >
          <dl className={styles.defs}>
            <dt>Parcels</dt>
            <dd>
              The fill shows the bloom state this week (not in bloom, before,
              blooming, after); the outline colour shows the crop. A hatched
              fill means high bloom, low nectar; a dashed outline means the week
              is interpolated.
            </dd>
            <dt>Natura 2000</dt>
            <dd>Protected sites, hatched green. No hives inside.</dd>
            <dt>Soil moisture (SMAP)</dt>
            <dd>
              ~9 km cells; the redder, the drier than usual for that week.
            </dd>
            <dt>Foraging radius</dt>
            <dd>
              1, 2 and 3 km rings around the beekeeper&apos;s home and the
              selected parcel.
            </dd>
            <dt>My apiary and ranks</dt>
            <dd>
              Your home apiary pin and the ranks of your placements. The parcels
              you drew always show with a blue outline.
            </dd>
            <dt>Satellite imagery</dt>
            <dd>Swaps the street basemap for aerial imagery.</dd>
          </dl>
          <p className={styles.note}>
            On a tablet the panel opens from the Layers button in the top bar;
            on a phone it is the Layers tab.
          </p>
        </Split>
      </Section>

      <Section id="matches" title="Matches: where to place hives">
        <Split
          shot={
            <Shot
              src="matches.webp"
              w={766}
              h={2000}
              narrow
              alt="The matches panel of an earlier version: beekeeper cards and a ranked placement card for a sunflower parcel with distance, reasons, warnings and missing items."
              caption="Screenshot from an earlier version, which had a beekeeper picker."
            />
          }
        >
          <p className={page.body}>
            Matches are computed for you, from your home parcel, with the
            colonies, maximum distance and availability of your{" "}
            <Link to={ROUTES.account}>account</Link>. The panel lists the
            parcels that fit, best fit first, and you can filter them by honey
            type (the bloom source).
          </p>
          <p className={page.body}>Each card shows:</p>
          <ul className={styles.points}>
            <li>The rank (also drawn on the map) and the road distance.</li>
            <li>The parcel&apos;s bloom and nectar state this week.</li>
            <li>
              A confidence level: low, medium or high, from how well the bloom
              timing is evidenced.
            </li>
            <li>
              <span className={styles.ok}>✓</span> reasons it fits,{" "}
              <span className={styles.warn}>!</span> warnings, and{" "}
              <span className={styles.miss}>?</span> what is still missing, such
              as a spray calendar.
            </li>
            <li>
              <strong>Calculate this move</strong> opens the calculator. You can
              also send a placement request for a period; in the demo it is
              stored in your browser only, under{" "}
              <Link to={ROUTES.placements}>My placements</Link>, and no grower
              is contacted.
            </li>
          </ul>
          <p className={page.body}>
            Hover a card to outline its parcel on the map; click the title to
            open the parcel. Parcels that cannot be used are listed under{" "}
            <strong>Not possible</strong> with the reason.
          </p>
          <Shot
            src="blocked.webp"
            w={686}
            h={1478}
            narrow
            alt="The Not possible list: black locust parcels whose bloom ended, and grassland parcels inside a Natura 2000 site."
            caption="A forage search in July: black locust has finished; grassland inside a protected site is blocked."
          />
        </Split>
      </Section>

      <Section id="parcel" title="Parcel details">
        <Split
          shot={
            <Shot
              src="parcel.webp"
              w={766}
              h={1979}
              narrow
              alt="Parcel P07, sunflower: a Natura 2000 warning, the week's state High bloom / Low nectar with bloom and nectar sources, and the satellite and weather values with their badges."
            />
          }
        >
          <p className={page.body}>
            Click a parcel on the map, or the title of a match. The panel shows
            everything known about it for the selected week:
          </p>
          <dl className={styles.defs}>
            <dt>Protected-area notice</dt>
            <dd>
              Red if the parcel is inside a site (blocked), amber if a site is
              within 3 km (allowed, check local rules).
            </dd>
            <dt>This week</dt>
            <dd>
              The bloom and nectar state, each with its source. Interpolated
              weeks say so.
            </dd>
            <dt>Satellite and weather</dt>
            <dd>
              NDYI and NDVI from HLS, the heat sum of the crop&apos;s bloom
              model from POWER, and the soil moisture percentile of its SMAP
              cell.
            </dd>
            <dt>Bloom window</dt>
            <dd>The grower&apos;s declared window next to the estimate.</dd>
            <dt>Listing</dt>
            <dd>
              Area, service, colonies requested and irrigation, from the
              (synthetic) grower.
            </dd>
          </dl>
          <p className={page.body}>
            <strong>Calculate a move here</strong> opens the calculator for a
            move from your home parcel. Press Esc or ✕ to close.
          </p>
        </Split>
      </Section>

      <Section id="verify" title="Confirming bloom with a field photo">
        <Split
          shot={
            <Shot
              src="verified.webp"
              w={766}
              h={1236}
              narrow
              alt="The same parcel after the simulated photo: the bloom badge now reads Observed, Grower field photo (simulated)."
            />
          }
        >
          <p className={page.body}>
            At the bottom of a parcel&apos;s panel,{" "}
            <strong>Simulate grower field photo</strong> stands in for a
            geotagged photo taken by the grower. The parcel&apos;s blooming
            weeks switch from Reported or Estimated to <strong>Observed</strong>
            , and match confidence goes up.
          </p>
          <p className={styles.note}>
            Demo only. Nothing is uploaded, and it resets when the server
            restarts.
          </p>
        </Split>
      </Section>

      <Section id="calculator" title="Move calculator">
        <Split
          shot={
            <Shot
              src="calculator.webp"
              w={900}
              h={2346}
              narrow
              alt="The move calculator: verdict Move pays off with the benefit in the base case, low, base and high bars, the breakdown table and the editable assumptions."
            />
          }
        >
          <p className={page.body}>
            The calculator compares moving the colonies to this parcel with
            keeping them at home.
          </p>
          <dl className={styles.defs}>
            <dt>Verdict</dt>
            <dd>
              <em>Move pays off</em> or <em>Do not move</em>, with the benefit
              relative to the alternative in the base case.
            </dd>
            <dt>Low · base · high</dt>
            <dd>
              The same move with a lower fee and an extra round trip (low), or a
              higher fee (high). Zero means the same as staying home.
            </dd>
            <dt>Breakdown</dt>
            <dd>
              Revenue, commission, transport and other costs, then the
              contribution after incremental costs.
            </dd>
            <dt>Assumptions</dt>
            <dd>
              Colonies, road distance, trips, fee, honey margin, fuel, labour,
              feed and what the colonies earn at home. All prefilled, from the
              moving costs of your <Link to={ROUTES.account}>account</Link>{" "}
              where you set them, each with its source, all editable.{" "}
              <strong>Reset to prefilled</strong> undoes your changes.
            </dd>
          </dl>
          <p className={styles.note}>
            Forage hosts pay no fee, so enter a honey margin to judge a forage
            move. The calculator is a planning aid, not a quote, and makes no
            yield claims.
          </p>
        </Split>
      </Section>

      <Section id="draw" title="Draw your own field">
        <Shot
          src="draw.webp"
          w={1100}
          h={702}
          alt="A field drawn on the map with its card: heat sum, rain, rain against 2015–2024 and bee-flight days from NASA POWER, and the HLS satellite rows."
        />
        <ol className={styles.points}>
          <li>
            Press <strong>Draw a field</strong> at the top left of the map.
          </li>
          <li>
            Click the corners of the field. Click the first point again, or
            press Enter, to finish.
          </li>
          <li>
            The card fetches live from NASA for the selected season: heat sum
            and rain since 1 March, rain against the 2015–2024 mean and the
            number of good bee-flight days from POWER, and NDVI and NDYI from
            the latest HLS satellite scene.
          </li>
        </ol>
        <p className={page.body}>
          This works anywhere on the map, not only on the listed parcels. The
          first read of a new field can take a minute.
        </p>
        <p className={page.body}>
          A parcel you draw is kept in your account as an apiary site: choose
          its crop and its bloom is modelled where it lies from NASA POWER
          weather. Name it, mark it as your home apiary or delete it under{" "}
          <Link to={ROUTES.account}>Account</Link>.
        </p>
        <p className={styles.note}>
          Satellite rows need a NASA Earthdata token on the server; without one
          they show Missing with that reason, as here.
        </p>
      </Section>

      <Section id="provenance" title="Where values come from">
        <p className={page.body}>
          Every value carries a badge that says how it was obtained.
        </p>
        <dl className={styles.kinds}>
          {KINDS.map(([k, d]) => (
            <div key={k}>
              <dt className="kind-chip" data-kind={k}>
                {k}
              </dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
        <p className={page.body}>
          Next to the badge: the source (for example{" "}
          <span className="mono">NASA HLS S30/L30 v2.0</span>), the date of the
          observation, and a note. &ldquo;Last obs.&rdquo; before the date means
          the week is interpolated from that observation.
        </p>
      </Section>

      <Section id="more" title="Phone, links and when something goes wrong">
        <Split
          shot={
            <Shot
              src="mobile-map.webp"
              w={780}
              h={1688}
              narrow
              alt="The explorer on a phone: the map on top, the week slider, and tabs for Matches, Parcel and Layers."
            />
          }
        >
          <h3 className={styles.h3}>On a phone</h3>
          <p className={page.body}>
            The map sits on top and the panels move into tabs below it:{" "}
            <strong>Matches</strong>, <strong>Parcel</strong> and{" "}
            <strong>Layers</strong>. The menu button opens the site pages.
          </p>
          <h3 className={styles.h3}>Share a view</h3>
          <p className={page.body}>
            Add the season and week to the explorer address, for example{" "}
            <Link to={`${ROUTES.app}?year=2022&week=20`} className="mono">
              /app?year=2022&amp;week=20
            </Link>
            .
          </p>
          <h3 className={styles.h3}>Messages you may see</h3>
          <dl className={styles.defs}>
            {TROUBLE.map(([t, d]) => (
              <div key={t}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </Split>
      </Section>
    </>
  );
}

function Reference() {
  return (
    <>
      <Section id="glossary" title="Glossary">
        <dl className={styles.glossary}>
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="mono">{g.term}</dt>
              <dd>{g.def}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="faq" title="Questions">
        <div>
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
        </div>
      </Section>

      <section aria-labelledby="src-h" className={styles.sources}>
        <h2 id="src-h" className={`mono ${styles.srcLabel}`}>
          SOURCES
        </h2>
        <ol>
          <li id="src-klein">
            Klein, A.-M. et al. (2007). Importance of pollinators in changing
            landscapes for world crops. <em>Proc. R. Soc. B</em> 274, 303–313.{" "}
            <a href="https://doi.org/10.1098/rspb.2006.3721">
              doi.org/10.1098/rspb.2006.3721
            </a>
          </li>
          <li id="src-ipbes">
            IPBES (2016). The assessment report on pollinators, pollination and
            food production.{" "}
            <a href="https://doi.org/10.5281/zenodo.3402856">
              doi.org/10.5281/zenodo.3402856
            </a>
          </li>
        </ol>
      </section>
    </>
  );
}

/** Guide: the problem, the solution, every explorer feature, glossary and FAQ. */
export function GuidePage() {
  return (
    <ReadingPage
      kicker="Guide"
      title="Everything the explorer does, and why."
      lead="Why hive moves depend on timing, which NASA data the map uses, and how to use each part of it."
    >
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
          <Problem />
          <Solution />
          <QuickStart />
          <Features />
          <Reference />
        </div>
      </div>
    </ReadingPage>
  );
}

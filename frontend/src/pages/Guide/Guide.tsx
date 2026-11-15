import type { ReactNode } from "react";
import { ReadingPage } from "../../site/ReadingPage";
import { Link, ROUTES } from "../../site/router";
import page from "../../site/page.module.css";
import { FAQ, GLOSSARY } from "./faq";
import styles from "./Guide.module.css";

const IMG = `${import.meta.env.BASE_URL}guide/`;

const STEPS = [
  {
    title: "Sign in",
    text: "Continue as the demo beekeeper in one click, or register with any email.",
  },
  {
    title: "Draw your apiary",
    text: "Add my parcel, click its corners, confirm. Its bloom is modelled at that spot.",
  },
  {
    title: "Pick a honey",
    text: "Acacia, sunflower, fruit blossom or meadow. Other parcels fade; jump to their bloom weeks.",
  },
  {
    title: "Open a parcel",
    text: "Your move there is priced at once, with your own fuel and labour costs.",
  },
  {
    title: "Request it",
    text: "Pick the dates and colonies. Your requests are listed under My placements.",
  },
];

const TOC = [
  { id: "problem", label: "The problem" },
  { id: "solution", label: "Our solution" },
  { id: "start", label: "Quick start" },
  { id: "signin", label: "Signing in" },
  { id: "tour", label: "The explorer at a glance" },
  { id: "season", label: "Seasons and drought" },
  { id: "week", label: "Week slider" },
  { id: "layers", label: "Layers and legend" },
  { id: "apiary", label: "Your apiary parcels" },
  { id: "honey", label: "Honey you want to make" },
  { id: "matches", label: "Matches" },
  { id: "parcel", label: "Parcel details" },
  { id: "move", label: "Your move and requests" },
  { id: "calculator", label: "Move calculator" },
  { id: "account", label: "Account and moving costs" },
  { id: "placements", label: "My placements" },
  { id: "verify", label: "Field photo" },
  { id: "draw", label: "Live NASA readings" },
  { id: "provenance", label: "Where values come from" },
  { id: "more", label: "Phone, links, errors" },
  { id: "glossary", label: "Glossary" },
  { id: "faq", label: "Questions" },
];

const TOUR = [
  [
    "Top bar",
    "The season switch, and the menu with the site pages, My placements and your account.",
  ],
  [
    "Layers",
    "Left. Toggles and the legend for colours, outlines and hatching.",
  ],
  [
    "Map",
    "Listed parcels, your own parcels (blue outline), protected sites and soil moisture cells. Hover a parcel for its week; click it for details.",
  ],
  [
    "Week slider",
    "Bottom. 26 weeks from 1 March; the strip above it shows how many parcels bloom.",
  ],
  [
    "Side panel",
    "Right. Your parcels, the honey filter and your matches; a parcel's details and your move; or the calculator.",
  ],
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
    "Loading soil moisture for this view…",
    "You moved the map to an area whose soil moisture is not loaded yet. It is read from NASA once, which can take a few minutes; the area around the view is read ahead in the background, so moving on is usually instant.",
  ],
  [
    "Fetching satellite data from NASA…",
    "The live season only. Bloom from weather is already shown; the map asks again every 5 seconds until satellite bloom and soil moisture arrive, which can take several minutes.",
  ],
  [
    "Lost connection to the API",
    "The map keeps what it has and checks again every 5 seconds; the rest reloads by itself.",
  ],
  ["Could not load …", "Press Try again. Only the parts that failed reload."],
  [
    "This shape is larger than a field",
    "A parcel can be at most about 8 km across. Discard it, zoom in to your apiary and draw again.",
  ],
  [
    "Could not model the bloom of …",
    "The message under it says why. If the parcel itself was refused, remove it and draw it again; otherwise press Try again.",
  ],
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

function SignIn() {
  return (
    <Section id="signin" title="Signing in">
      <Split
        shot={
          <Shot
            src="signin.webp"
            w={1400}
            h={783}
            alt="The sign-in page: three steps on the left, and a card with Sign in and Register tabs, a Continue as demo beekeeper button, email and password fields and the demo note."
          />
        }
      >
        <p className={page.body}>
          The explorer, your account and your placements need a beekeeper
          account. <strong>Continue as demo beekeeper</strong> signs you in with
          one click as a ready-made beekeeper who already has a home apiary, so
          matches show at once.
        </p>
        <p className={page.body}>
          To start from scratch, choose <strong>Register</strong> and enter a
          name and an email. After signing in you land on the page you asked
          for.
        </p>
        <p className={styles.note}>
          Sign-in is a demo. Accounts, parcels and requests live in this browser
          only: they survive a reload, but not another browser or clearing the
          site data. The password is not stored or checked, and nothing is sent
          to a server.
        </p>
      </Split>
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
          alt="The explorer signed in as the demo beekeeper: layer toggles on the left; the map with the home apiary, rank hexagons and soil moisture cells; the week slider at the bottom; and on the right the honey filter set to acacia with ranked placements."
          caption="2024, week 9 (late April), with the acacia filter on."
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
          w={453}
          h={40}
          narrow
          alt="The top bar with the Demo · illustrative listings label and the 2022, 2024 and live season buttons."
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
              w={542}
              h={2106}
              narrow
              alt="The layers panel with switches for parcels, Natura 2000, soil moisture, foraging radius, my apiary and ranks and satellite imagery, and the bloom and crop legends with your own parcel."
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
              1, 2 and 3 km rings around your home apiary and the selected
              parcel.
            </dd>
            <dt>My apiary and ranks</dt>
            <dd>
              Your home apiary pin and the ranks of your placements. The parcels
              you drew always show with a blue outline.
            </dd>
            <dt>Satellite imagery</dt>
            <dd>Swaps the street basemap for aerial imagery.</dd>
            <dt>Satellite view of the week</dt>
            <dd>
              The clearest NASA HLS passes of the chosen week in true colour, so
              you can see the fields as the satellite saw them. Clouds are not
              removed.
            </dd>
          </dl>
          <p className={styles.note}>
            On a tablet the panel opens from the Layers button in the top bar;
            on a phone it is the Layers tab.
          </p>
        </Split>
        <h3 className={styles.h3}>Circles, hexagons and the hive pin</h3>
        <Split
          shot={
            <Shot
              src="pins.webp"
              w={940}
              h={780}
              alt="A close-up of the map: round parcel markers in bloom colours with crop-coloured rims, numbered honey hexagons beside some of them, and the dark hive pin of the home apiary with dashed rings around it."
            />
          }
        >
          <dl className={styles.defs}>
            <dt>Circles are parcels</dt>
            <dd>
              Zoomed out, each parcel is a circle, because a parcel is only a
              few hectares. Zoom in and it becomes the field&apos;s real shape.
              The fill is the bloom state this week (honey yellow blooming, pale
              yellow before, brown after, beige not in bloom, white no data).
              The rim is the crop; a thick blue rim is one of your own parcels,
              and a red rim means bloom on dry soil, nectar at risk.
            </dd>
            <dt>Numbered honey hexagons are your ranks</dt>
            <dd>
              A hexagon sits up and right of each parcel you can place hives on
              this week, with the same number as its card in the side panel.
              Blocked parcels get none, and the honey filter hides the ranks of
              other blooms.
            </dd>
            <dt>The dark box with two stripes is your hive</dt>
            <dd>
              Your home apiary, where moves and distances start. The dashed
              rings around it are 1, 2 and 3 km, a guide to how far the bees
              forage.
            </dd>
          </dl>
        </Split>
      </Section>

      <Section id="apiary" title="Your apiary parcels">
        <Split
          shot={
            <Shot
              src="save-dialog.webp"
              w={832}
              h={932}
              narrow
              alt="The Save this parcel? dialog: a name field, What blooms here set to sunflower, bloom from and until dates, and Save parcel and Discard buttons."
            />
          }
        >
          <ol className={styles.points}>
            <li>
              Zoom in to where your hives stand. A parcel can be at most about 8
              km across.
            </li>
            <li>
              Press <strong>Add my parcel</strong> at the top left of the map
              and click the corners of the field. Click the first point again,
              or press Enter, to finish.
            </li>
            <li>
              A dialog asks you to confirm. Name the parcel and say what blooms
              there, then press <strong>Save parcel</strong>. Discard or Esc
              keeps nothing. A shape larger than a field cannot be saved.
            </li>
          </ol>
          <p className={page.body}>
            Your first parcel becomes your <strong>home apiary</strong>: every
            move and distance starts from it. Black locust, apple and sour
            cherry bloom is modelled at the parcel&apos;s own spot from NASA
            POWER temperatures, for each season. For sunflower and grassland you
            can give the bloom dates yourself; they show as Reported.
          </p>
        </Split>
        <Split
          shot={
            <Shot
              src="own-parcel.webp"
              w={383}
              h={2544}
              narrow
              alt="The panel of the home apiary parcel: blooming this week, with the heat-unit model as the source, the satellite and weather values, the estimated bloom window 25 April to 4 May, and Your parcel with its area and role."
            />
          }
        >
          <p className={page.body}>
            Click your parcel on the map, or its name under{" "}
            <strong>My parcels</strong> in the side panel, to see its bloom this
            week, where each value comes from, and the live NASA weather at that
            spot.
          </p>
          <ul className={styles.points}>
            <li>
              <strong>Use as my home apiary</strong> moves your starting point
              to another of your parcels.
            </li>
            <li>
              The bin icon in My parcels, or <strong>Remove this parcel</strong>{" "}
              in its panel, removes it after you confirm.
            </li>
            <li>
              Rename a parcel or change its crop under{" "}
              <Link to={ROUTES.account}>Account</Link>.
            </li>
          </ul>
        </Split>
      </Section>

      <Section id="honey" title="Honey you want to make">
        <Split
          shot={
            <Shot
              src="honey.webp"
              w={343}
              h={182}
              narrow
              alt="The Honey I want to make filter with Acacia (black locust) chosen, and the note that black locust blooms in weeks 8 to 10, with a link to the first bloom week."
            />
          }
        >
          <p className={page.body}>
            Pick the honey you are after, above your matches:{" "}
            <strong>Acacia</strong> (black locust), <strong>Sunflower</strong>,{" "}
            <strong>Fruit blossom</strong> (apple and sour cherry) or{" "}
            <strong>Meadow</strong> (grassland).
          </p>
          <ul className={styles.points}>
            <li>
              Parcels of other blooms fade on the map and drop out of your
              matches and ranks.
            </li>
            <li>
              The note says in which weeks that bloom is out this season.{" "}
              <strong>Go to the first bloom week</strong> moves the slider
              there.
            </li>
            <li>The week strip counts only the chosen honey&apos;s parcels.</li>
          </ul>
          <p className={styles.note}>
            The honey kind names the parcel&apos;s bloom. The map does not
            forecast honey yield or quality.
          </p>
        </Split>
      </Section>

      <Section id="matches" title="Matches: where to place hives">
        <Split
          shot={
            <Shot
              src="matches.webp"
              w={766}
              h={2100}
              narrow
              alt="The matches panel: My parcels with the home apiary, the honey filter set to acacia, and ranked cards for black locust parcels with distance, bloom this week, reasons, warnings, missing items and the Calculate this move and Request placement buttons."
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
              <strong>Calculate this move</strong> opens the calculator;{" "}
              <strong>Request placement</strong> opens the parcel with its
              request form. A parcel you already requested says Requested ✓.
            </li>
          </ul>
          <p className={page.body}>
            Hover a card to outline its parcel on the map; click the title to
            open the parcel. Parcels that cannot be used this week are listed
            under <strong>Not possible this week</strong> with the reason.
          </p>
          <Shot
            src="blocked.webp"
            w={343}
            h={1458}
            narrow
            alt="The Not possible this week list: orchard and black locust parcels whose bloom ended, a parcel wanting more colonies than you have, and grassland inside a Natura 2000 site."
            caption="Mid-July: the orchards and black locust have finished; grassland inside a protected site is blocked."
          />
        </Split>
      </Section>

      <Section id="parcel" title="Parcel details">
        <Split
          shot={
            <Shot
              src="parcel.webp"
              w={383}
              h={2942}
              narrow
              alt="Parcel P15, black locust: Your move here with the verdict and the request form, then the week's bloom and nectar with their sources, the satellite and weather values, the bloom window and the listing."
            />
          }
        >
          <p className={page.body}>
            Click a parcel on the map, or the title of a match. The panel shows
            your move there first, then everything known about the parcel for
            the selected week:
          </p>
          <dl className={styles.defs}>
            <dt>Your move here</dt>
            <dd>
              Priced at once from your home apiary with your own costs (see
              below).
            </dd>
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
          <p className={page.body}>Press Esc or ✕ to close the panel.</p>
        </Split>
      </Section>

      <Section id="move" title="Your move and placement requests">
        <Split
          shot={
            <Shot
              src="move.webp"
              w={343}
              h={731}
              narrow
              alt="Your move here: the verdict Do not move with the benefit relative to the alternative, distance, colonies and rank, a note to enter the honey margin, the calculator button and the Request this parcel for a period form with dates and colonies."
            />
          }
        >
          <p className={page.body}>
            When you open a listed parcel, <strong>Your move here</strong>{" "}
            prices the move straight away: from your home apiary, with the
            colonies, distance limit and availability of your profile, and the
            moving costs you set in your account.
          </p>
          <ul className={styles.points}>
            <li>
              <em>Move pays off</em> or <em>Do not move</em>, with the benefit
              relative to keeping the hives at home, and how it holds in the low
              and high cases.
            </li>
            <li>
              Forage hosts pay no fee, so a forage move only pays through honey:
              enter your honey margin in the calculator to judge it.
            </li>
            <li>
              <strong>Open the calculator and adjust the numbers</strong> for
              anything that differs for this one move.
            </li>
          </ul>
          <h3 className={styles.h3}>Request the parcel for a period</h3>
          <p className={page.body}>
            The request form is prefilled with this season&apos;s bloom window
            and your colonies. Change the dates or the number and press{" "}
            <strong>Request placement</strong>. It then shows as requested, can
            be cancelled there, and is listed under{" "}
            <Link to={ROUTES.placements}>My placements</Link>.
          </p>
          <Shot
            src="requested.webp"
            w={343}
            h={192}
            narrow
            alt="Placement requested: 25 April to 4 May 2024, 50 colonies, with links to My placements and Cancel request."
          />
          <p className={styles.note}>
            Requests are a demo: they are stored in this browser only and no
            grower is contacted.
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
              w={503}
              h={3009}
              narrow
              alt="The move calculator: the verdict with the benefit in the base case, low, base and high bars, the breakdown table, the editable assumptions and the request form."
            />
          }
        >
          <p className={page.body}>
            The calculator compares moving your colonies to this parcel with
            keeping them at home. Open it from a match card or from Your move
            here.
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
              feed and what the colonies earn at home. All prefilled, each with
              its source: your own moving costs show as Reported, “Your cost
              settings”; the rest are marketplace defaults. Changes here apply
              to this move only; <strong>Reset to prefilled</strong> undoes
              them. To change a cost for every move, set it in your{" "}
              <Link to={ROUTES.account}>account</Link>.
            </dd>
          </dl>
          <p className={styles.note}>
            Forage hosts pay no fee, so enter a honey margin to judge a forage
            move. The calculator is a planning aid, not a quote, and makes no
            yield claims.
          </p>
        </Split>
      </Section>

      <Section id="account" title="Account and moving costs">
        <Shot
          src="account-costs.webp"
          w={968}
          h={497}
          alt="My moving costs in the account: fuel price 2.4 and labour rate 25 with a blue border and the label Yours with the default, the other costs empty with Default under them, and a Reset to defaults button."
        />
        <p className={page.body}>
          Open <Link to={ROUTES.account}>Account</Link> from your name in the
          menu. Everything saves as you type.
        </p>
        <dl className={styles.defs}>
          <dt>Profile</dt>
          <dd>
            Your name, colonies (20 to 100), how far you will travel, when you
            are available (month and day; every season uses the same dates),
            your vehicle&apos;s fuel use, and what the colonies earn if they
            stay home. Matches and every move use these.
          </dd>
          <dt>My moving costs</dt>
          <dd>
            Fuel price, vehicle cost, average speed, trips per move, labour
            rate, loading time, extra feed and other placement costs such as
            site rent. A value you set has a blue border and says <em>Yours</em>{" "}
            with the default next to it; an empty field uses the marketplace
            default shown in grey. Reset to defaults clears them.
          </dd>
          <dt>My parcels</dt>
          <dd>
            Rename your parcels, change what blooms there or the declared bloom
            dates, mark one as your home apiary, or delete one.
          </dd>
        </dl>
        <Shot
          src="account-parcels.webp"
          w={968}
          h={580}
          alt="My parcels in the account: the home apiary with a blue border, black locust, and a second parcel, sunflower, with declared bloom dates, each with Irrigated, Home apiary, Show on map and Delete."
        />
        <p className={page.body}>
          <strong>Sign out</strong> is in the account menu. Your account stays
          in this browser for the next time you sign in.
        </p>
      </Section>

      <Section id="placements" title="My placements">
        <Shot
          src="placements.webp"
          w={1400}
          h={719}
          alt="My placements: a March to August timeline with the requested stay on P15, black locust, and a table with parcel, crop, service, stay, colonies, benefit relative to the alternative, request date, status Requested · demo and a Cancel button."
        />
        <p className={page.body}>
          Every parcel you requested, with its stay on a March to August bar,
          the colonies, and the benefit relative to the alternative when you
          requested it. <strong>Cancel</strong> withdraws a request. The menu
          shows how many requests you have next to My placements.
        </p>
      </Section>

      <Section id="draw" title="Live NASA readings for your parcel">
        <Shot
          src="draw.webp"
          w={1100}
          h={702}
          alt="A drawn shape on the map with its card: heat sum, rain, rain against 2015–2024 and bee-flight days from NASA POWER, and the HLS satellite rows."
        />
        <p className={page.body}>
          While you draw a parcel, and whenever you open one of yours, a card on
          the map reads NASA live for the selected season: heat sum and rain
          since 1 March, rain against the 2015–2024 mean and the number of good
          bee-flight days from POWER, and NDVI and NDYI from the latest HLS
          satellite scene.
        </p>
        <p className={page.body}>
          This works anywhere on Earth, including far from the listed parcels.
          The first read of a new place can take a minute. After that the answer
          is kept for the session.
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
              w={390}
              h={844}
              narrow
              alt="The explorer on a phone, signed in: the map with the home apiary on top, the week slider, and tabs for Matches, Parcel and Layers."
            />
          }
        >
          <h3 className={styles.h3}>On a phone</h3>
          <p className={page.body}>
            The map sits on top and the panels move into tabs below it:{" "}
            <strong>Matches</strong> (with your parcels and the honey filter),{" "}
            <strong>Parcel</strong> and <strong>Layers</strong>. The menu button
            opens the site pages, My placements and your account.
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
          <SignIn />
          <Features />
          <Reference />
        </div>
      </div>
    </ReadingPage>
  );
}

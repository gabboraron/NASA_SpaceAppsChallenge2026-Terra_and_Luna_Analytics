import { ReadingPage } from "../../site/ReadingPage";
import page from "../../site/page.module.css";
import styles from "./Data.module.css";

type Source = {
  badge: string;
  tone: "honey" | "natura" | "ink";
  title: string;
  text: string;
  facts: [string, string][];
  licence: string;
  href: string;
  linkText: string;
};

const SOURCES: Source[] = [
  {
    badge: "HLS",
    tone: "honey",
    title: "Harmonized Landsat Sentinel-2",
    text: "Surface reflectance from Landsat 8/9 and Sentinel-2, harmonized. We compute NDVI and the yellowness index NDYI for sunflower bloom.",
    facts: [
      ["Product", "HLSS30 / HLSL30 v2.0"],
      ["Pixel", "30 m"],
      ["Archive", "LP DAAC"],
    ],
    licence: "Earthdata login · NASA open data",
    href: "https://lpdaac.usgs.gov/products/hlss30v002/",
    linkText: "lpdaac.usgs.gov/products/hlss30v002",
  },
  {
    badge: "SMAP",
    tone: "honey",
    title: "SMAP Level 4 soil moisture",
    text: "Root-zone soil moisture, compared with each cell's own same-week history to flag drought weeks.",
    facts: [
      ["Product", "SPL4SMGP"],
      ["Grid", "~9 km cell"],
      ["Archive", "NSIDC DAAC"],
    ],
    licence: "Earthdata login · NASA open data",
    href: "https://nsidc.org/data/spl4smgp",
    linkText: "nsidc.org/data/spl4smgp",
  },
  {
    badge: "POWER",
    tone: "honey",
    title: "NASA POWER daily weather",
    text: "Temperature for growing degree days, plus precipitation and wind for flight-weather days.",
    facts: [
      ["Basis", "MERRA-2"],
      ["Grid", "0.5° × 0.625°"],
      ["Step", "daily"],
    ],
    licence: "No login · NASA open data",
    href: "https://power.larc.nasa.gov/",
    linkText: "power.larc.nasa.gov",
  },
  {
    badge: "N2K",
    tone: "natura",
    title: "EEA Natura 2000",
    text: "Protected-site boundaries for the block and 3 km warning rules.",
    facts: [
      ["Service", "EEA map service"],
      ["Use", "clipped to the pilot"],
    ],
    licence: "EEA reuse policy",
    href: "https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/Natura2000Sites/MapServer",
    linkText: "bio.discomap.eea.europa.eu",
  },
  {
    badge: "OSM",
    tone: "ink",
    title: "OpenStreetMap and OpenFreeMap",
    text: "Illustrative parcel geometry (via Overpass) and the basemap tiles.",
    facts: [["Use", "geometry, basemap"]],
    licence: "ODbL",
    href: "https://www.openstreetmap.org/copyright",
    linkText: "openstreetmap.org/copyright",
  },
];

const RULES = [
  {
    title: "No invented values",
    text: "A failed NASA request shows Missing with the reason, never a filled-in number.",
  },
  {
    title: "Dates on estimates",
    text: "Each Estimated value shows the date of its latest usable observation.",
  },
  {
    title: "Synthetic people",
    text: "Demo beekeepers and growers are synthetic and labelled; no personal data is stored.",
  },
];

function SourceRow({ s }: { s: Source }) {
  return (
    <article className={styles.src}>
      <span
        aria-hidden="true"
        className={`hex ${page.hexNum} ${styles.badge}`}
        data-tone={s.tone}
        data-small={s.badge.length > 4 || s.tone !== "honey" || undefined}
      >
        {s.badge}
      </span>
      <div className={styles.cell}>
        <h2 className={styles.name}>{s.title}</h2>
        <span className={styles.text}>{s.text}</span>
      </div>
      <dl className={`mono ${styles.facts}`}>
        {s.facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.licence}>
        <span>{s.licence}</span>
        <a href={s.href}>{s.linkText}</a>
      </div>
    </article>
  );
}

/** Data and sources: every dataset, its product facts and licence. */
export function DataPage() {
  return (
    <ReadingPage
      kicker="Data & sources"
      title="Three NASA datasets and two open maps."
      lead="All sources are open. NASA data is requested from NASA and cached locally, so a value can be older than today and always shows its date; the cache is never committed and rebuilds from the same requests. Protected-area and parcel geometry is stored with the code."
    >
      <div className={`${page.wrap} ${styles.list}`}>
        {SOURCES.map((s) => (
          <SourceRow key={s.badge} s={s} />
        ))}

        <section aria-labelledby="rules-h" className={styles.rulesSec}>
          <h2 id="rules-h" className={page.h2}>
            House rules for data
          </h2>
          <div className={`${page.cardGrid} ${styles.rules}`}>
            {RULES.map((r) => (
              <div key={r.title}>
                <strong>{r.title}</strong>
                <span className={page.small}>{r.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ReadingPage>
  );
}

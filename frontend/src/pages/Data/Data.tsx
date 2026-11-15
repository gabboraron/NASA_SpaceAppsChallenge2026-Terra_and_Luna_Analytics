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
    text: "Surface reflectance from Landsat 8/9 and Sentinel-2, harmonized. We compute NDVI and the yellowness index NDYI as evidence of sunflower bloom.",
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
    badge: "NISAR",
    tone: "honey",
    title: "NISAR L-band radar",
    text: "Dual-polarization radar backscatter (HH, HV), turned into a radar vegetation index (RVI) for a point. An experimental script, not yet shown on the map.",
    facts: [
      ["Product", "L2 GCOV"],
      ["Band", "L-band SAR"],
      ["Archive", "ASF DAAC"],
    ],
    licence: "Earthdata login · NASA open data",
    href: "https://asf.alaska.edu/datasets/daac/nisar/",
    linkText: "asf.alaska.edu/datasets/daac/nisar",
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
  {
    badge: "ESRI",
    tone: "ink",
    title: "Esri World Imagery",
    text: "Optional satellite basemap, switched on in the layer panel.",
    facts: [["Use", "basemap"]],
    licence: "Esri terms of use · attribution on the map",
    href: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
    linkText: "arcgis.com · World Imagery",
  },
  {
    badge: "LIT",
    tone: "ink",
    title: "Published phenology models",
    text: "Chill and forcing parameters for apple, sour cherry and black locust bloom, each value cited to its paper.",
    facts: [["Use", "bloom model parameters"]],
    licence: "Scientific literature",
    href: "/evidence",
    linkText: "References on the evidence page",
  },
  {
    badge: "CHECK",
    tone: "ink",
    title: "Hive scales, iNaturalist and PEP725",
    text: "Past hive weights, black-locust observations and orchard flowering dates. Used only to check the models, not by the map.",
    facts: [["Use", "verification only"]],
    licence: "CC BY 4.0 and the providers' terms",
    href: "https://doi.org/10.17632/3v3hhkddmz.1",
    linkText: "doi:10.17632/3v3hhkddmz.1",
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
    text: "Growers are synthetic and labelled. A beekeeper account lives only in your browser; no personal data reaches the server.",
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
      title="NASA datasets, open maps and cited science."
      lead="All sources are open. NASA data is requested from NASA and cached locally, so a value can be older than today and always shows its date; raw NASA data is never committed; a small cache of the responses for the two demo seasons ships with the code and rebuilds from the same requests. Protected-area and parcel geometry is stored with the code."
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

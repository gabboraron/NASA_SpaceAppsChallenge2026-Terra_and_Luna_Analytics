import { Link, ROUTES } from "../../site/router";
import {
  BLOOM_COLORS,
  BLOOM_LABELS,
  CROP_COLORS,
  DROUGHT,
  OTHER_CROP,
  OWN,
  type LayerId,
} from "../MapCanvas/layers";
import { CROP_NAMES } from "../../domain/season";
import styles from "./LayerPanel.module.css";

const LAYER_ROWS: { id: LayerId; label: string; caption: string }[] = [
  { id: "parcels", label: "Parcels", caption: "Fill = bloom, outline = crop" },
  {
    id: "natura",
    label: "Natura 2000",
    caption: "Protected areas, no hives inside",
  },
  {
    id: "smap",
    label: "Soil moisture (SMAP)",
    caption: "~9 km cells; red = drier than usual",
  },
  {
    id: "buffers",
    label: "Foraging radius",
    caption: "1, 2 and 3 km around the selection",
  },
  {
    id: "beekeepers",
    label: "My apiary and ranks",
    caption: "Your home pin and your ranked placements",
  },
  {
    id: "imagery",
    label: "Satellite imagery",
    caption: "Esri World Imagery basemap",
  },
  {
    id: "hls",
    label: "Satellite view of the week",
    caption: "NASA HLS true colour, clearest passes",
  },
];

type Props = {
  visible: Record<LayerId, boolean>;
  onToggle: (id: LayerId) => void;
};

/** Layer toggles, legend and a short reading note. */
export function LayerPanel({ visible, onToggle }: Props) {
  return (
    <aside className={styles.panel} aria-label="Layers and legend">
      <section aria-labelledby="layers-h">
        <h2 id="layers-h">Layers</h2>
        {LAYER_ROWS.map((row) => (
          <button
            key={row.id}
            type="button"
            role="switch"
            aria-checked={visible[row.id]}
            className={styles.toggle}
            onClick={() => onToggle(row.id)}
          >
            <span
              aria-hidden="true"
              className={styles.swatch}
              data-layer={row.id}
            />
            <span className={styles.text}>
              <strong>{row.label}</strong>
              <small>{row.caption}</small>
            </span>
            <span aria-hidden="true" className={styles.track} />
          </button>
        ))}
      </section>

      <section aria-labelledby="bloom-h">
        <h2 id="bloom-h">Parcel fill: bloom</h2>
        <ul className={styles.legend}>
          {Object.entries(BLOOM_LABELS).map(([state, label]) => (
            <li key={state}>
              <span
                className={styles.chip}
                style={{
                  background: BLOOM_COLORS[state as keyof typeof BLOOM_LABELS],
                }}
              />
              {label}
            </li>
          ))}
          <li>
            <span
              className={`${styles.chip} ${styles.low}`}
              style={{ borderColor: DROUGHT }}
            />
            High bloom / Low nectar
          </li>
          <li>
            <span className={`${styles.chip} ${styles.gap}`} />
            Gap-filled week (interpolated)
          </li>
          <li>
            <span
              className={styles.chip}
              style={{ background: BLOOM_COLORS.missing }}
            />
            No data
          </li>
        </ul>
      </section>

      <section aria-labelledby="crop-h">
        <h2 id="crop-h">Parcel outline: crop</h2>
        <ul className={styles.legend}>
          {[...Object.entries(CROP_COLORS), ["other", OTHER_CROP]].map(
            ([crop, color]) => (
              <li key={crop}>
                <span
                  className={styles.chip}
                  style={{ border: `3px solid ${color}` }}
                />
                {CROP_NAMES[crop] ?? "Other crops"}
              </li>
            ),
          )}
          <li>
            <span
              className={styles.chip}
              style={{ border: `3px solid ${OWN}` }}
            />
            Your own parcel
          </li>
        </ul>
      </section>

      <div className={styles.note}>
        <strong>Reading the map</strong>
        <p>
          A dashed outline marks a gap-filled week between satellite passes,
          never an observation. Low nectar is a labelled heuristic: sunflower
          blooming while root-zone soil moisture is the driest on record for
          that week. Listed parcels are illustrative; the blue-outlined ones are
          yours.
        </p>
        <Link to={ROUTES.guide}>Open the guide</Link>
      </div>
    </aside>
  );
}

import type { Season } from "../../api/client";
import {
  BLOOM_COLORS,
  BLOOM_LABELS,
  CROP_COLORS,
  CROP_NAMES,
  DROUGHT,
  OTHER_CROP,
  type LayerId,
} from "../MapCanvas/layers";
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
    label: "Beekeepers",
    caption: "Home apiaries (synthetic profiles)",
  },
  {
    id: "imagery",
    label: "Satellite imagery",
    caption: "Esri World Imagery basemap",
  },
];

type Props = {
  year: Season;
  weekText: string;
  visible: Record<LayerId, boolean>;
  onYear: (year: Season) => void;
  onToggle: (id: LayerId) => void;
};

/** Season switch, layer toggles and legend. */
export function LayerPanel({
  year,
  weekText,
  visible,
  onYear,
  onToggle,
}: Props) {
  return (
    <aside className={styles.panel}>
      <section aria-labelledby="season-h">
        <h2 id="season-h">Season</h2>
        <div role="group" aria-label="Season" className={styles.segment}>
          {([2022, 2024] as const).map((y) => (
            <button
              key={y}
              type="button"
              aria-pressed={year === y}
              onClick={() => onYear(y)}
            >
              {y}
              <small>{y === 2022 ? "drought year" : "comparison"}</small>
            </button>
          ))}
        </div>
        <p className={styles.week}>{weekText}</p>
      </section>

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
            Low nectar
          </li>
          <li>
            <span
              className={styles.chip}
              style={{ background: BLOOM_COLORS.missing }}
            />
            No data
          </li>
        </ul>
        <h2>Parcel outline: crop</h2>
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
        </ul>
        <p className={styles.note}>
          Low nectar is a labelled heuristic: blooming while root-zone soil
          moisture is below the 20th percentile for that week. Parcels are
          illustrative; beekeepers are synthetic.
        </p>
      </section>
    </aside>
  );
}

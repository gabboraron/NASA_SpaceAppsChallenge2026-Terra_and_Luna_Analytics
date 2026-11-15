import type { OwnParcel } from "../../account/session";
import { cropName } from "../../domain/season";
import styles from "./MyParcels.module.css";

type Props = {
  parcels: OwnParcel[];
  homeId: string;
  selected: string;
  onSelect: (id: string) => void;
  /** Asks for confirmation before removing. */
  onRemove: (id: string) => void;
};

/** The beekeeper's own parcels on the map page: show one, or remove it. */
export function MyParcels({
  parcels,
  homeId,
  selected,
  onSelect,
  onRemove,
}: Props) {
  if (parcels.length === 0) return null;
  return (
    <section className={styles.box} aria-labelledby="my-parcels-h">
      <h3 id="my-parcels-h">My parcels ({parcels.length})</h3>
      <ul>
        {parcels.map((p) => (
          <li key={p.id} data-selected={p.id === selected}>
            <span aria-hidden="true" className={styles.swatch} />
            <button
              type="button"
              className={styles.name}
              aria-pressed={p.id === selected}
              onClick={() => onSelect(p.id)}
            >
              <strong>{p.name}</strong>
              <small>
                {cropName(p.crop)}
                {p.id === homeId && " · Home apiary"}
              </small>
            </button>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${p.name}`}
              onClick={() => onRemove(p.id)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

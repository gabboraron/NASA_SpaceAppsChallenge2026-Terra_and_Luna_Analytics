import type { Beekeeper } from "../../api/client";
import styles from "./BeekeeperPicker.module.css";

type Props = {
  beekeepers: Beekeeper[];
  value: string;
  onChange: (id: string) => void;
  /** Disable beekeepers whose goal differs (the calculator prices one parcel). */
  service?: Beekeeper["goal"];
};

const GOALS: Record<Beekeeper["goal"], string> = {
  pollination: "Offers pollination",
  forage: "Seeks forage",
};

/** Choose the synthetic beekeeper the map, matches and calculator follow (WP18). */
export function BeekeeperPicker({
  beekeepers,
  value,
  onChange,
  service,
}: Props) {
  const unfit = service && beekeepers.some((b) => b.goal !== service);
  return (
    <fieldset className={styles.picker}>
      <legend>Beekeeper</legend>
      <div>
        {beekeepers.map((b) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={b.id === value}
            disabled={!!service && b.goal !== service}
            title={b.name}
            onClick={() => onChange(b.id)}
          >
            <strong>
              {b.id}{" "}
              {b.synthetic && <span className={styles.tag}>Synthetic</span>}
            </strong>
            <span>{GOALS[b.goal]}</span>
            <span>
              {b.colonies} colonies · ≤&nbsp;{b.max_distance_km}&nbsp;km
            </span>
          </button>
        ))}
      </div>
      {unfit && (
        <small>
          Greyed beekeepers{" "}
          {service === "forage" ? "want pollination" : "seek forage"}; this
          parcel offers {service}.
        </small>
      )}
    </fieldset>
  );
}

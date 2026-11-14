import type { Provenance } from "../../api/client";
import styles from "./ProvenanceBadge.module.css";

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "12 Jul 2024" from an ISO date. */
export const formatDate = (iso: string) => DAY.format(new Date(iso));

/** Where a value comes from: kind, source, latest usable observation (D4), gap fill, note. */
export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  const { kind, source, observed_at, interpolated, note } = provenance;
  return (
    <span className={styles.badge} data-kind={kind}>
      <span className={styles.line}>
        <strong className={styles.kind}>{kind}</strong>
        {interpolated && <span className={styles.gap}>Gap-filled</span>}
        <span>
          {source}
          {observed_at &&
            ` · ${interpolated ? "last obs. " : ""}${formatDate(observed_at)}`}
        </span>
      </span>
      {note && <small>{note}</small>}
    </span>
  );
}

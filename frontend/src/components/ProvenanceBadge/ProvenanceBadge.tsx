import type { Measurement, Provenance } from "../../api/client";
import { formatDay } from "../../domain/season";
import styles from "./ProvenanceBadge.module.css";

/** Provenance for a value the contract carries none for (no observation date). */
export const prov = (
  kind: Provenance["kind"],
  source: string,
  note = "",
): Provenance => ({
  kind,
  source,
  observed_at: null,
  interpolated: false,
  note,
});

/** A measurement as text, or a dash for a gap; `signed` adds "+" to gains. */
export const show = (
  m: Measurement | undefined,
  digits: number,
  unit = "",
  signed = false,
) =>
  m?.value == null
    ? "—"
    : `${signed && m.value > 0 ? "+" : ""}${m.value.toFixed(digits)}${unit}`;

/** Where a value comes from: kind, source, latest usable observation (D4), gap fill, note. */
export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  const { kind, source, observed_at, interpolated, note } = provenance;
  return (
    <span className={styles.badge}>
      <span className={styles.line}>
        <strong className="kind-chip" data-kind={kind}>
          {kind}
        </strong>
        {interpolated && <span className={styles.gap}>Gap-filled</span>}
        <span>
          {source}
          {observed_at &&
            ` · ${interpolated ? "last obs. " : ""}${formatDay(observed_at)}`}
          {!observed_at && kind === "Estimated" && " · undated estimate"}
        </span>
      </span>
      {note && <small>{note}</small>}
    </span>
  );
}

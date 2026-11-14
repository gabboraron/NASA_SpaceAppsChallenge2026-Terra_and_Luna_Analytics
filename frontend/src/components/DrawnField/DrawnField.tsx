import type { Season } from "../../api/client";
import type { useField } from "../../hooks/useField";
import { ProvenanceBadge } from "../ProvenanceBadge/ProvenanceBadge";
import { hlsRows, powerRows, type Row } from "./rows";
import styles from "./DrawnField.module.css";

type Props = {
  year: Season;
  field: ReturnType<typeof useField>;
  onClose: () => void;
};

/**
 * Rows of one NASA source. When they share kind, source and date, one badge
 * serves the group and each row keeps only its own note; otherwise each row
 * carries its full badge.
 */
function Rows({ rows }: { rows: Row[] }) {
  const origin = (r: Row) => JSON.stringify({ ...r.m.provenance, note: "" });
  const shared = rows.every((r) => origin(r) === origin(rows[0]));
  const notes = new Set(rows.map((r) => r.m.provenance.note));
  // One note for the whole group (an HLS gap) reads better once, in the badge.
  const oneNote = shared && notes.size === 1;
  return (
    <>
      <dl className={styles.rows}>
        {rows.map(({ label, text, m }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={styles.value}>{text}</dd>
            {!shared ? (
              <dd>
                <ProvenanceBadge provenance={m.provenance} />
              </dd>
            ) : (
              !oneNote && (
                <dd>
                  <small>{m.provenance.note}</small>
                </dd>
              )
            )}
          </div>
        ))}
      </dl>
      {shared && (
        <ProvenanceBadge
          provenance={
            oneNote
              ? rows[0].m.provenance
              : { ...rows[0].m.provenance, note: "" }
          }
        />
      )}
    </>
  );
}

/** Live NASA values for the polygon the user drew; each with its provenance. */
export function DrawnField({ year, field, onClose }: Props) {
  const { power, hls } = field;
  return (
    <section className={styles.card} aria-labelledby="drawn-h">
      <div className={styles.head}>
        <strong id="drawn-h">Your field · {year} season</strong>
        <button type="button" aria-label="Remove drawn field" onClick={onClose}>
          ×
        </button>
      </div>

      <h3>Weather · NASA POWER</h3>
      {power.data ? (
        <Rows rows={powerRows(power.data)} />
      ) : power.error ? (
        <p role="alert">
          Weather request failed. Check that the API is running.
        </p>
      ) : (
        <p role="status">Fetching from NASA…</p>
      )}

      <h3>Latest satellite scene · NASA HLS</h3>
      {hls.data ? (
        <Rows rows={hlsRows(hls.data)} />
      ) : hls.error ? (
        <p role="alert">
          Satellite request failed. Check that the API is running.
        </p>
      ) : (
        <p role="status">
          Fetching from NASA… a first read of a new field can take a minute.
        </p>
      )}
    </section>
  );
}

import type { Provenance, Season } from "../../api/client";
import type { Answer, useField } from "../../hooks/useField";
import { ProvenanceBadge } from "../ProvenanceBadge/ProvenanceBadge";
import { hlsRows, powerRows, type Row } from "./rows";
import styles from "./DrawnField.module.css";

type Props = {
  year: Season;
  field: ReturnType<typeof useField>;
  onClose: () => void;
};

const sameOrigin = (a: Provenance, b: Provenance) =>
  a.kind === b.kind &&
  a.source === b.source &&
  a.observed_at === b.observed_at &&
  a.interpolated === b.interpolated;

/**
 * Rows of one NASA source. When they share kind, source and date, one badge
 * serves the group and each row keeps only its own note (a note shared by every
 * row, such as an HLS gap, shows once in the badge); otherwise each row carries
 * its full badge.
 */
function Rows({ rows }: { rows: Row[] }) {
  const first = rows[0].m.provenance;
  const shared = rows.every((r) => sameOrigin(r.m.provenance, first));
  const oneNote = rows.every((r) => r.m.provenance.note === first.note);
  const own = (p: Provenance) =>
    !shared ? (
      <ProvenanceBadge provenance={p} />
    ) : (
      !oneNote && <small>{p.note}</small>
    );
  return (
    <>
      <dl className={styles.rows}>
        {rows.map(({ label, text, m }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={styles.value}>{text}</dd>
            <dd>{own(m.provenance)}</dd>
          </div>
        ))}
      </dl>
      {shared && (
        <ProvenanceBadge
          provenance={oneNote ? first : { ...first, note: "" }}
        />
      )}
    </>
  );
}

/** One source's heading, then its rows, its failure or its wait message. */
function Source<T>(props: {
  title: string;
  answer: Answer<T>;
  rows: (data: T) => Row[];
  failed: string;
  waiting: string;
}) {
  const { data, error } = props.answer;
  return (
    <>
      <h3>{props.title}</h3>
      {data ? (
        <Rows rows={props.rows(data)} />
      ) : error ? (
        <p role="alert">{props.failed} Check that the API is running.</p>
      ) : (
        <p role="status">{props.waiting}</p>
      )}
    </>
  );
}

/** Live NASA values for the polygon the user drew; each with its provenance. */
export function DrawnField({ year, field, onClose }: Props) {
  return (
    <section className={styles.card} aria-labelledby="drawn-h">
      <div className={styles.head}>
        <strong id="drawn-h">Your field · {year} season</strong>
        <button
          type="button"
          className={styles.close}
          aria-label="Remove drawn field"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3 3 L13 13 M13 3 L3 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <Source
        title="Weather · NASA POWER"
        answer={field.power}
        rows={powerRows}
        failed="Weather request failed."
        waiting="Fetching from NASA…"
      />
      <Source
        title="Latest satellite scene · NASA HLS"
        answer={field.hls}
        rows={hlsRows}
        failed="Satellite request failed."
        waiting="Fetching from NASA… a first read of a new field can take a minute."
      />
    </section>
  );
}

import type {
  Grower,
  Measurement,
  Parcel,
  ParcelWeek,
  Provenance,
  Season,
  SoilMoistureWeek,
} from "../../api/client";
import {
  cropName,
  isHighBloomLowNectar,
  isInterpolated,
  weekLabel,
  weekStateText,
} from "../MapCanvas/layers";
import { useEscape } from "../../hooks/useEscape";
import { ProvenanceBadge, prov } from "../ProvenanceBadge/ProvenanceBadge";
import styles from "./ParcelDetail.module.css";

export type VerifyState = "idle" | "pending" | "error";

// Same source label as the backend's DECLARED_SOURCE.
const DECLARED = "Grower declaration";
const LISTING = prov("Reported", "Grower listing (illustrative)");

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const range = (w: { start: string; end: string } | null | undefined) =>
  w
    ? `${DAY_MONTH.format(new Date(w.start))} – ${DAY_MONTH.format(new Date(w.end))}`
    : "—";

const show = (m: Measurement | undefined, digits: number, unit = "") =>
  m?.value == null ? "—" : `${m.value.toFixed(digits)}${unit}`;

// The 3 km buffer is NATURA_BUFFER_M in the backend's geo.py (plan D15).
const NATURA: Partial<
  Record<
    Parcel["natura_status"],
    { role: string; tone: string; title: string; text: string }
  >
> = {
  inside: {
    role: "alert",
    tone: styles.block,
    title: "Inside a Natura 2000 site",
    text: "Hives cannot be placed on this parcel. Matching lists it as blocked with this reason.",
  },
  buffer_overlap: {
    role: "note",
    tone: styles.warn,
    title: "Natura 2000 site within 3 km",
    text: "Allowed, but bees will forage inside the protected area. Check local rules before placing hives.",
  },
};

type Props = {
  parcel: Parcel;
  grower?: Grower;
  year: Season;
  week: number;
  /** The shown week's row; undefined while the season loads. */
  row?: ParcelWeek;
  smap?: SoilMoistureWeek;
  /** Provenance of the season's bloom estimate (an unverified week's bloom provenance). */
  estimate?: Provenance;
  verified: boolean;
  verifyState: VerifyState;
  onVerify: () => void;
  onPlanMove: () => void;
  onClose: () => void;
};

/** Everything known about one parcel this week; every value carries its provenance. */
export function ParcelDetail({
  parcel,
  grower,
  year,
  week,
  row,
  smap,
  estimate,
  verified,
  verifyState,
  onVerify,
  onPlanMove,
  onClose,
}: Props) {
  useEscape(onClose);

  const natura = NATURA[parcel.natura_status];
  const metrics = [
    {
      label: "NDYI (yellowness)",
      m: row?.ndyi,
      text: show(row?.ndyi, 2),
    },
    { label: "NDVI (greenness)", m: row?.ndvi, text: show(row?.ndvi, 2) },
    {
      label: "Growing degree days",
      m: row?.gdd,
      text: show(row?.gdd, 0, " °C·d"),
    },
    {
      label: "Soil moisture (SMAP cell)",
      m: smap?.percentile,
      text: show(smap?.percentile, 0, "th pct."),
      // Only SMAP can be absent from a loaded season: the parcel has no cell that week.
      gap: prov(
        "Missing",
        "NASA SMAP L4",
        "No SMAP cell for this parcel and week",
      ),
    },
  ];

  return (
    <aside className={styles.panel} aria-labelledby="parcel-h">
      <div className={styles.head}>
        <div>
          <small>Parcel {parcel.id} · Illustrative parcel</small>
          <h2 id="parcel-h">{cropName(parcel.crop)}</h2>
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label="Close parcel details"
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

      {natura && (
        <div role={natura.role} className={`${styles.natura} ${natura.tone}`}>
          <strong>{natura.title}</strong>
          <p>{natura.text}</p>
        </div>
      )}

      <section className={styles.week} data-empty={!row}>
        <small>
          Week {week} · {weekLabel(year, week)} {year}
        </small>
        <strong
          className={row && isHighBloomLowNectar(row) ? styles.highLow : ""}
        >
          {weekStateText(row)}
        </strong>
        {row && (
          <>
            <span className={styles.label}>Bloom</span>
            <ProvenanceBadge provenance={row.bloom_provenance} />
            <span className={styles.label}>Nectar</span>
            <ProvenanceBadge provenance={row.nectar_provenance} />
          </>
        )}
        {row && isInterpolated(row) && (
          <p className={styles.gapNote}>
            Gap-filled week: values are interpolated between satellite scenes,
            not observed.
          </p>
        )}
      </section>

      {row && (
        <section>
          <h3>Satellite and weather</h3>
          <dl className={styles.metrics}>
            {metrics.map(({ label, m, text, gap }) => {
              const badge = m?.provenance ?? gap;
              return (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className={styles.value}>{text}</dd>
                  <dd>{badge && <ProvenanceBadge provenance={badge} />}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      <section>
        <h3>Bloom window</h3>
        <dl className={styles.metrics}>
          <div>
            <dt>Declared by grower</dt>
            <dd className={styles.value}>{range(parcel.declared_bloom)}</dd>
            <dd>
              <ProvenanceBadge
                provenance={
                  parcel.declared_bloom
                    ? prov("Reported", DECLARED)
                    : prov("Missing", DECLARED, "No bloom window declared")
                }
              />
            </dd>
          </div>
          {row && (
            <div>
              <dt>Estimated</dt>
              <dd className={styles.value}>{range(row.estimated_bloom)}</dd>
              <dd>{estimate && <ProvenanceBadge provenance={estimate} />}</dd>
            </div>
          )}
        </dl>
      </section>

      <section>
        <h3>Listing</h3>
        <dl className={styles.listing}>
          <dt>Grower</dt>
          <dd>
            {grower?.name ?? parcel.grower_id}
            {(grower?.synthetic ?? true) && (
              <span className={styles.tag}>Synthetic</span>
            )}
          </dd>
          <dt>Area</dt>
          <dd>{parcel.area_ha.toFixed(1)} ha</dd>
          <dt>Service</dt>
          <dd>{parcel.service_type === "forage" ? "Forage" : "Pollination"}</dd>
          {parcel.requested_colonies !== null && (
            <>
              <dt>Colonies requested</dt>
              <dd>{parcel.requested_colonies}</dd>
            </>
          )}
          <dt>Irrigated</dt>
          <dd>{parcel.irrigated ? "Yes" : "No"}</dd>
        </dl>
        <ProvenanceBadge provenance={LISTING} />
      </section>

      {parcel.natura_status !== "inside" && (
        <>
          <section className={styles.plan}>
            <h3>Plan a move</h3>
            <button type="button" onClick={onPlanMove}>
              Calculate a move here
            </button>
            <small>
              Compares bringing hives here with keeping them at the home apiary.
              Prefilled from the listing and a synthetic beekeeper.
            </small>
          </section>
          <section className={styles.verify}>
            {verified ? (
              <div role="status" className={styles.done}>
                <strong>Bloom confirmed by field photo</strong>
                <span>
                  Simulated. Blooming weeks of {year} now show Observed.
                </span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onVerify}
                  disabled={verifyState === "pending"}
                >
                  {verifyState === "pending"
                    ? "Sending photo…"
                    : "Simulate grower field photo"}
                </button>
                <small>
                  Stands in for a geotagged photo. Marks this parcel&apos;s
                  blooming weeks as Observed. Demo only, resets on restart.
                </small>
                {verifyState === "error" && (
                  <small role="alert" className={styles.error}>
                    The verification failed. Check that the API is running.
                  </small>
                )}
              </>
            )}
          </section>
        </>
      )}
    </aside>
  );
}

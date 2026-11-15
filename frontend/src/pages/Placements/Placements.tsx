import { cancelPlacement, useAccount } from "../../account/session";
import { eur } from "../../components/MoveCalculator/fields";
import { cropName, formatDay as day } from "../../domain/season";
import { ReadingPage } from "../../site/ReadingPage";
import { Link, ROUTES } from "../../site/router";
import page from "../../site/page.module.css";
import styles from "./Placements.module.css";

const SERVICE = { pollination: "Pollination", forage: "Forage" } as const;
const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

/**
 * Where a stay sits on a 1 March – 31 August bar, in percent of its width;
 * only month and day count, so stays of any year line up. Null for bad dates.
 */
export function stayBar(
  start: string,
  end: string,
): { left: number; width: number } | null {
  const offset = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return NaN;
    const y = d.getUTCFullYear();
    return (d.getTime() - Date.UTC(y, 2, 1)) / 86_400_000;
  };
  const days = 184; // 1 March to 31 August inclusive
  const a = Math.max(0, Math.min(days, offset(start)));
  const b = Math.max(0, Math.min(days, offset(end) + 1));
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return { left: (100 * a) / days, width: (100 * (b - a)) / days };
}

/** The beekeeper's placement requests, kept in this browser. */
export function PlacementsPage() {
  const account = useAccount();
  if (!account) return null; // Site shows the sign-in page instead.
  const { placements } = account;
  return (
    <ReadingPage
      kicker="Your season plan"
      title="My placements"
      lead="Parcels you asked to rent for a period. Demo: requests are stored in this browser only; no grower is contacted."
    >
      <div className={`${page.wrap} ${styles.body}`}>
        {placements.length === 0 ? (
          <p className={page.body}>
            No placement requests yet.{" "}
            <Link to={ROUTES.app}>Find a parcel in the explorer</Link> and send
            a placement request there.
          </p>
        ) : (
          <>
            <section className={styles.plan} aria-labelledby="plan-h">
              <h2 id="plan-h">Hives on the move, March to August</h2>
              <div className={styles.planScroll}>
                <div className={styles.planBody}>
                  <div aria-hidden="true" className={styles.months}>
                    <span />
                    {MONTHS.map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                  {placements.map((p) => {
                    const bar = stayBar(p.start, p.end);
                    return (
                      <div key={p.id} className={styles.lane}>
                        <span>
                          {p.parcel_id} · {cropName(p.crop)}
                        </span>
                        <span className={styles.track}>
                          {bar && (
                            <span
                              style={{
                                left: `${bar.left}%`,
                                width: `${bar.width}%`,
                              }}
                            >
                              <span className="sr-only">
                                {day(p.start)} to {day(p.end)}
                              </span>
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Parcel</th>
                    <th scope="col">Crop</th>
                    <th scope="col">Service</th>
                    <th scope="col">Stay</th>
                    <th scope="col" className={styles.num}>
                      Colonies
                    </th>
                    <th scope="col" className={styles.num}>
                      Benefit relative to the alternative
                    </th>
                    <th scope="col">Requested on</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p) => (
                    <tr key={p.id}>
                      <th scope="row" className="mono">
                        {p.parcel_id}
                      </th>
                      <td>{cropName(p.crop)}</td>
                      <td>{SERVICE[p.service_type]}</td>
                      <td>
                        {day(p.start)} – {day(p.end)}
                      </td>
                      <td className={styles.num}>{p.colonies}</td>
                      <td className={styles.num}>
                        {p.benefit_eur === null
                          ? "Not calculated"
                          : eur(p.benefit_eur, true)}
                      </td>
                      <td>{day(p.created_at)}</td>
                      <td>
                        <span className={styles.badge}>Requested · demo</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.cancel}
                          aria-label={`Cancel the request for parcel ${p.parcel_id}`}
                          onClick={() => cancelPlacement(p.id)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {placements.length > 0 && (
          <p className={styles.note}>
            The benefit is the base case of the move calculator at the time of
            the request: an estimate, not a quote.
          </p>
        )}
      </div>
    </ReadingPage>
  );
}

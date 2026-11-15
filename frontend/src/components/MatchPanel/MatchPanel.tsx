import type {
  Beekeeper,
  MatchCard,
  Parcel,
  ParcelWeek,
  Season,
} from "../../api/client";
import type { Matches } from "../../hooks/useMatches";
import { BeekeeperPicker } from "../BeekeeperPicker/BeekeeperPicker";
import { BLOOM_COLORS, weekStateText } from "../MapCanvas/layers";
import { cropName, weekLabel } from "../../domain/season";
import { ProvenanceBadge } from "../ProvenanceBadge/ProvenanceBadge";
import { countText, groupCards, ownWarnings } from "./cards";
import styles from "./MatchPanel.module.css";

type Props = {
  beekeepers: Beekeeper[];
  keeperId: string;
  onKeeper: (id: string) => void;
  year: Season;
  week: number;
  matches: Matches;
  parcels: Parcel[];
  weekRows: Map<string, ParcelWeek>;
  hovered: string;
  onHover: (parcelId: string) => void;
  onSelect: (parcelId: string) => void;
  onPlan: (parcelId: string) => void;
};

const CONFIDENCE = { low: "Low", medium: "Medium", high: "High" } as const;

/** Ranked placements for the selected beekeeper, from GET /matches (WP18). */
export function MatchPanel(props: Props) {
  const { beekeepers, keeperId, year, week, matches } = props;
  const keeper = beekeepers.find((b) => b.id === keeperId);
  const byId = new Map(props.parcels.map((p) => [p.id, p]));
  const { open, blocked, shared } = groupCards(matches.cards ?? []);

  // Hover and focus outline the parcel on the map; the title opens its detail.
  const hover = (id: string) => ({
    "data-hovered": props.hovered === id,
    onMouseEnter: () => props.onHover(id),
    onMouseLeave: () => props.onHover(""),
  });
  const title = (c: MatchCard) => (
    <button
      type="button"
      onClick={() => props.onSelect(c.parcel_id)}
      onFocus={() => props.onHover(c.parcel_id)}
      onBlur={() => props.onHover("")}
    >
      {c.parcel_id} · {cropName(byId.get(c.parcel_id)?.crop ?? "")}
    </button>
  );

  const card = (c: MatchCard) => {
    const parcel = byId.get(c.parcel_id);
    const row = props.weekRows.get(c.parcel_id);
    const warnings = ownWarnings(c, shared);
    const km = c.distance_km.value;
    return (
      <li key={c.parcel_id} className={styles.card} {...hover(c.parcel_id)}>
        <div className={styles.top}>
          <span className={styles.rank} aria-label={`Rank ${c.rank}`}>
            {c.rank}
          </span>
          <div className={styles.title}>
            {title(c)}
            <small>
              Illustrative parcel ·{" "}
              {parcel?.service_type === "forage"
                ? "forage host, no fee"
                : `wants ${parcel?.requested_colonies ?? "?"} colonies${
                    parcel?.fee_eur_per_colony != null
                      ? ` · €${parcel.fee_eur_per_colony} each`
                      : ""
                  }`}
            </small>
          </div>
          <div className={styles.km}>
            <strong>{km === null ? "–" : `${km.toFixed(1)} km`}</strong>
          </div>
        </div>
        <ProvenanceBadge provenance={c.distance_km.provenance} />
        <div className={styles.state}>
          <span>
            <span
              aria-hidden="true"
              className={styles.dot}
              style={{
                background: BLOOM_COLORS[row?.bloom_state ?? "missing"],
              }}
            />
            This week: {weekStateText(row)}
          </span>
          <span>{CONFIDENCE[c.confidence]} confidence</span>
        </div>
        <ul className={styles.lines}>
          {c.reasons.map((r) => (
            <li key={r} data-tone="reason">
              {r}
            </li>
          ))}
          {warnings.map((w) => (
            <li key={w} data-tone="warning">
              {w}
            </li>
          ))}
          {c.missing_items.map((m) => (
            <li key={m} data-tone="missing">
              Missing: {m.charAt(0).toLowerCase() + m.slice(1)}
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={!c.calculator_input}
            onClick={() => props.onPlan(c.parcel_id)}
          >
            Calculate this move
          </button>
          <button type="button" className={styles.quote} disabled>
            Request quote
          </button>
        </div>
      </li>
    );
  };

  return (
    <aside className={styles.panel} aria-labelledby="match-h">
      <div>
        <small>
          {year} · week {week} · {weekLabel(year, week)}
        </small>
        <h2 id="match-h">Where to place hives</h2>
      </div>

      <BeekeeperPicker
        beekeepers={beekeepers}
        value={keeperId}
        onChange={props.onKeeper}
      />

      {matches.error && (
        <div role="alert" className={styles.alert}>
          <strong>
            Could not load matches. Check that the API is running.
          </strong>
          <button type="button" onClick={matches.retry}>
            Try again
          </button>
        </div>
      )}

      {!matches.cards && !matches.error && (
        <div role="status" aria-busy="true" className={styles.loading}>
          <span>Finding placements for {keeperId}…</span>
          <span className={styles.skeleton} />
          <span className={styles.skeleton} />
        </div>
      )}

      {matches.cards && (
        <>
          {shared.map((w) => (
            <p key={w} role="note" className={styles.banner}>
              {w}.
            </p>
          ))}

          {matches.cards.length === 0 ? (
            <p role="status" className={styles.empty}>
              <strong>No parcels match {keeperId}'s goal yet</strong>
              <span>
                No grower lists{" "}
                {keeper?.goal === "forage" ? "forage" : "pollination"} here. Try
                another beekeeper.
              </span>
            </p>
          ) : (
            <section
              aria-labelledby="open-h"
              aria-busy={matches.pending}
              className={styles.list}
              data-pending={matches.pending}
            >
              <div className={styles.listHead}>
                <h3 id="open-h">{countText(open.length)}</h3>
                <span role="status">
                  {matches.pending
                    ? `Updating for week ${week}…`
                    : "Nearest first"}
                </span>
              </div>
              <ol>{open.map(card)}</ol>
            </section>
          )}

          {blocked.length > 0 && (
            <section aria-labelledby="blocked-h" className={styles.list}>
              <h3 id="blocked-h">Not possible ({blocked.length})</h3>
              <ul>
                {blocked.map((c) => (
                  <li
                    key={c.parcel_id}
                    className={styles.blocked}
                    {...hover(c.parcel_id)}
                  >
                    <span className={styles.badge}>Blocked</span>
                    <div>
                      {title(c)}
                      {c.distance_km.value !== null &&
                        ` · ${c.distance_km.value.toFixed(1)} km`}
                      {c.reasons.map((r) => (
                        <span key={r}>{r}</span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className={styles.note}>
            Request quote is off: this demo has no booking.
            {keeper?.synthetic && ` ${keeper.id} is a synthetic beekeeper.`}
          </p>
        </>
      )}
    </aside>
  );
}

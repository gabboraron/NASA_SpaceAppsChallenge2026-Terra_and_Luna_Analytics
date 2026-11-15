import type { MatchCard, Parcel, ParcelWeek, Season } from "../../api/client";
import type { Matches } from "../../hooks/useMatches";
import { BLOOM_COLORS, weekStateText } from "../MapCanvas/layers";
import { HONEYS, cropName, weekLabel } from "../../domain/season";
import { ProvenanceBadge } from "../ProvenanceBadge/ProvenanceBadge";
import { countText, groupCards, ownWarnings } from "./cards";
import styles from "./MatchPanel.module.css";

type Props = {
  /** The signed-in beekeeper's name. */
  name: string;
  /** False until the beekeeper has drawn a home parcel. */
  hasHome: boolean;
  year: Season;
  week: number;
  matches: Matches;
  parcels: Parcel[];
  weekRows: Map<string, ParcelWeek>;
  hovered: string;
  onHover: (parcelId: string) => void;
  onSelect: (parcelId: string) => void;
  onPlan: (parcelId: string) => void;
  /** Chosen honey kind (an id of HONEYS), "" for every bloom. */
  honey: string;
  /** The listed and own parcels that give the chosen honey; all when unset. */
  honeyIds?: ReadonlySet<string>;
  onHoney: (id: string) => void;
  /** First and last week the chosen honey's parcels bloom this season. */
  honeySpan: [number, number] | null;
  onWeek: (week: number) => void;
  /** Parcel ids the beekeeper has already requested. */
  requested: ReadonlySet<string>;
};

const CONFIDENCE = { low: "Low", medium: "Medium", high: "High" } as const;

/** Ranked placements for the signed-in beekeeper, from POST /matches (WP18). */
export function MatchPanel(props: Props) {
  const { year, week, matches, honey } = props;
  const byId = new Map(props.parcels.map((p) => [p.id, p]));
  // Honey kinds some listed parcel can give.
  const crops = new Set(props.parcels.map((p) => p.crop));
  const honeys = HONEYS.filter((h) => h.crops.some((c) => crops.has(c)));
  const chosen = honeys.find((h) => h.id === honey);
  const { open, blocked, shared } = groupCards(
    (matches.cards ?? []).filter(
      (c) => !props.honeyIds || props.honeyIds.has(c.parcel_id),
    ),
  );

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
          <button
            type="button"
            className={styles.quote}
            onClick={() => props.onSelect(c.parcel_id)}
          >
            {props.requested.has(c.parcel_id)
              ? "Requested ✓"
              : "Request placement"}
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
        <h2 id="match-h">Where to place your hives</h2>
        <small>
          For {props.name || "you"}, from your home apiary, with your own costs.
        </small>
      </div>

      {honeys.length > 0 && (
        <fieldset className={styles.honey}>
          <legend>Honey I want to make</legend>
          <div>
            <button
              type="button"
              aria-pressed={!chosen}
              onClick={() => props.onHoney("")}
            >
              Any bloom
            </button>
            {honeys.map((h) => (
              <button
                key={h.id}
                type="button"
                aria-pressed={chosen?.id === h.id}
                onClick={() => props.onHoney(h.id)}
              >
                {h.label}
              </button>
            ))}
          </div>
          {chosen && (
            <p role="status">
              {chosen.crops.map(cropName).join(" and ")} parcels are kept on the
              map; the rest are faded.{" "}
              {props.honeySpan ? (
                <>
                  They bloom in weeks {props.honeySpan[0]}–{props.honeySpan[1]}{" "}
                  of {year} (from {weekLabel(year, props.honeySpan[0])}).{" "}
                  <button
                    type="button"
                    onClick={() => props.onWeek(props.honeySpan![0])}
                  >
                    Go to the first bloom week
                  </button>
                </>
              ) : (
                `No bloom is modelled or declared for them in ${year}.`
              )}
            </p>
          )}
        </fieldset>
      )}

      {!props.hasHome && (
        <p role="status" className={styles.empty}>
          <strong>Draw your own parcel first</strong>
          <span>
            Use “Add my parcel” on the map. Placements are ranked by distance
            from your home apiary, so they appear once it is on the map.
          </span>
        </p>
      )}

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

      {props.hasHome && !matches.cards && !matches.error && (
        <div role="status" aria-busy="true" className={styles.loading}>
          <span>Finding placements for you…</span>
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

          {open.length + blocked.length === 0 ? (
            <p role="status" className={styles.empty}>
              <strong>No listed parcel gives this honey</strong>
              <span>Choose another honey, or any bloom.</span>
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
                    : "Best fit first"}
                </span>
              </div>
              <ol>{open.map(card)}</ol>
            </section>
          )}

          {blocked.length > 0 && (
            <section aria-labelledby="blocked-h" className={styles.list}>
              <h3 id="blocked-h">Not possible this week ({blocked.length})</h3>
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
            Placement requests are a demo: they are stored in this browser only
            and no grower is contacted. Listed parcels are illustrative.
          </p>
        </>
      )}
    </aside>
  );
}

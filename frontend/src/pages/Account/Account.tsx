import { useEffect, useState, type ReactNode } from "react";
import {
  homeParcel,
  removeParcel,
  signOut,
  updateAccount,
  updateParcel,
  useAccount,
  type Account,
  type Costs,
  type OwnParcel,
} from "../../account/session";
import { getCalculatorDefaults, type CostDefaults } from "../../api/client";
import { cropName, OWN_CROPS } from "../../domain/season";
import { ReadingPage } from "../../site/ReadingPage";
import { Link, ROUTES } from "../../site/router";
import page from "../../site/page.module.css";
import styles from "./Account.module.css";

type NumProps = {
  label: string;
  unit?: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  /** Must be above zero. */
  positive?: boolean;
  /** Set: an empty input is allowed and saves `undefined`; shown as the placeholder. */
  fallback?: string;
  /** Line under the input, e.g. where the value comes from. */
  hint?: string;
  /** The beekeeper's own value replaces a default: drawn in blue. */
  mine?: boolean;
  onSave: (value: number | undefined) => void;
};

/** Why `text` cannot be saved, or "" when it can. */
function problem(text: string, p: NumProps): string {
  if (text.trim() === "")
    return p.fallback === undefined ? "Enter a number." : "";
  const n = Number(text);
  const min = p.min ?? 0;
  if (!Number.isFinite(n)) return "Enter a number.";
  if (p.integer && !Number.isInteger(n)) return "Enter a whole number.";
  if (p.positive && n <= 0) return "Enter a number above 0.";
  if (n < min || (p.max !== undefined && n > p.max))
    return p.max === undefined
      ? `Enter ${min} or more.`
      : `Enter ${min} to ${p.max}.`;
  return "";
}

/** A number input that saves each valid change and explains an invalid one. */
function Num(p: NumProps) {
  const [text, setText] = useState(
    p.value === undefined ? "" : String(p.value),
  );
  const error = problem(text, p);
  return (
    <label className={styles.field} data-mine={p.mine}>
      <span>{p.label}</span>
      <span className={styles.box}>
        <input
          type="number"
          inputMode="decimal"
          min={p.positive ? undefined : (p.min ?? 0)}
          max={p.max}
          step={p.step ?? "any"}
          value={text}
          placeholder={p.fallback}
          aria-invalid={error !== ""}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            if (problem(next, p) === "")
              p.onSave(next.trim() === "" ? undefined : Number(next));
          }}
        />
        {p.unit && <span className={styles.unit}>{p.unit}</span>}
      </span>
      {error ? (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      ) : (
        p.hint && <small className={styles.hint}>{p.hint}</small>
      )}
    </label>
  );
}

const COSTS: {
  key: keyof Costs;
  label: string;
  unit: string;
  step?: number;
  integer?: boolean;
  positive?: boolean;
  /** Shown under a default value instead of "Default". */
  note?: string;
}[] = [
  { key: "fuel_price_per_l", label: "Fuel price", unit: "€/L", step: 0.01 },
  {
    key: "vehicle_cost_per_km",
    label: "Vehicle cost",
    unit: "€/km",
    step: 0.01,
  },
  { key: "hourly_labor_cost", label: "Labour rate", unit: "€/h", step: 0.5 },
  {
    key: "average_speed_kmh",
    label: "Average speed",
    unit: "km/h",
    positive: true,
  },
  { key: "loading_hours", label: "Loading time", unit: "h", step: 0.5 },
  {
    key: "legs",
    label: "One-way trips per move",
    unit: "trips",
    step: 1,
    integer: true,
    note: "Default: deliver and collect",
  },
  { key: "extra_feed_cost", label: "Extra feed", unit: "€" },
  {
    key: "other_placement_cost",
    label: "Other placement costs",
    unit: "€",
    note: "e.g. site rent",
  },
];

const GROUPS: { title: string; keys: (keyof Costs)[] }[] = [
  {
    title: "Transport",
    keys: [
      "fuel_price_per_l",
      "vehicle_cost_per_km",
      "average_speed_kmh",
      "legs",
    ],
  },
  {
    title: "Labour and placement",
    keys: [
      "hourly_labor_cost",
      "loading_hours",
      "extra_feed_cost",
      "other_placement_cost",
    ],
  },
];

function Section({
  id,
  title,
  lead,
  action,
  strong,
  children,
}: {
  id: string;
  title: string;
  lead: ReactNode;
  action?: ReactNode;
  /** The section a beekeeper comes here for: drawn with a dark frame. */
  strong?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={styles.sec}
      data-strong={strong}
      aria-labelledby={`${id}-h`}
    >
      <div className={styles.secHead}>
        <div>
          <h2 id={`${id}-h`}>{title}</h2>
          <p>{lead}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type Save = (change: (account: Account) => Account) => void;

function Profile({ account, save }: { account: Account; save: Save }) {
  const set = (patch: Partial<Account>) => save((a) => ({ ...a, ...patch }));
  type NumKey =
    | "colonies"
    | "max_distance_km"
    | "vehicle_l_per_100km"
    | "alternative_contribution_eur";
  // These inputs have no fallback, so Num never saves an empty value.
  const num = (key: NumKey) => (v: number | undefined) => {
    if (v !== undefined) set({ [key]: v });
  };
  const day = (edge: "start" | "end", label: string) => (
    <label className={styles.field}>
      {label}
      <input
        type="date"
        value={account.availability[edge]}
        onChange={(e) => {
          if (e.target.value)
            set({
              availability: { ...account.availability, [edge]: e.target.value },
            });
        }}
      />
    </label>
  );
  return (
    <Section
      id="profile"
      title="Profile"
      lead="Who moves the hives, and how far. Used for every match and calculation."
    >
      <div className={styles.grid}>
        <label className={styles.field}>
          Name
          <input
            type="text"
            autoComplete="name"
            value={account.name}
            aria-invalid={account.name.trim() === ""}
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>
        <Num
          label="Colonies"
          value={account.colonies}
          min={20}
          max={100}
          step={1}
          integer
          onSave={num("colonies")}
        />
        <Num
          label="Max travel distance"
          unit="km"
          value={account.max_distance_km}
          positive
          onSave={num("max_distance_km")}
        />
        <Num
          label="Vehicle fuel use"
          unit="L/100 km"
          value={account.vehicle_l_per_100km}
          step={0.5}
          onSave={num("vehicle_l_per_100km")}
        />
        {day("start", "Available from")}
        {day("end", "Available until")}
        <Num
          label="Contribution if hives stay home"
          unit="€"
          value={account.alternative_contribution_eur}
          min={-100_000}
          onSave={num("alternative_contribution_eur")}
        />
      </div>
      <p className={styles.note}>
        Only the month and day of your availability count; every season uses the
        same dates. The contribution if hives stay home is the alternative each
        move is compared with.
      </p>
    </Section>
  );
}

function MovingCosts({ account, save }: { account: Account; save: Save }) {
  const [defaults, setDefaults] = useState<CostDefaults | null>(null);
  const [failed, setFailed] = useState(false);
  // Remounts the inputs so they show the cleared values.
  const [resets, setResets] = useState(0);
  useEffect(() => {
    let live = true;
    getCalculatorDefaults().then(
      (d) => live && setDefaults(d),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);
  return (
    <Section
      id="costs"
      title="My moving costs"
      strong
      lead="These prefill the move calculator for every parcel; you can still change any of them for a single move there. Leave a field empty to use the marketplace default, shown in grey."
      action={
        <button
          type="button"
          className={styles.button}
          disabled={Object.keys(account.costs).length === 0}
          onClick={() => {
            save((a) => ({ ...a, costs: {} }));
            setResets((n) => n + 1);
          }}
        >
          Reset to defaults
        </button>
      }
    >
      {GROUPS.map((g) => (
        <fieldset key={g.title} className={styles.group}>
          <legend>{g.title}</legend>
          <div className={styles.grid} key={resets}>
            {COSTS.filter((c) => g.keys.includes(c.key)).map((c) => {
              const mine = account.costs[c.key] !== undefined;
              const fallback = defaults ? String(defaults[c.key]) : "";
              return (
                <Num
                  key={c.key}
                  label={c.label}
                  unit={c.unit}
                  step={c.step}
                  integer={c.integer}
                  positive={c.positive}
                  value={account.costs[c.key]}
                  fallback={fallback}
                  mine={mine}
                  hint={
                    mine
                      ? `Yours${fallback ? ` · default ${fallback}` : ""}`
                      : (c.note ?? "Default")
                  }
                  onSave={(v) =>
                    save((a) => {
                      const costs = { ...a.costs };
                      if (v === undefined) delete costs[c.key];
                      else costs[c.key] = v;
                      return { ...a, costs };
                    })
                  }
                />
              );
            })}
          </div>
        </fieldset>
      ))}
      {failed && (
        <p className={styles.note}>
          The marketplace defaults could not be loaded, so they are not shown
          here; empty fields still use them.
        </p>
      )}
      {defaults && <p className={styles.note}>Defaults: {defaults.source}</p>}
    </Section>
  );
}

function ParcelRow({
  parcel,
  home,
  saved,
}: {
  parcel: OwnParcel;
  home: boolean;
  saved: () => void;
}) {
  const [bloom, setBloom] = useState(
    parcel.declared_bloom ?? { start: "", end: "" },
  );
  const patch = (change: Partial<OwnParcel>) => {
    updateParcel(parcel.id, change);
    saved();
  };
  const half = (bloom.start === "") !== (bloom.end === "");
  const reversed = !half && bloom.start > bloom.end;
  const setDay = (edge: "start" | "end", value: string) => {
    const next = { ...bloom, [edge]: value };
    setBloom(next);
    if (!next.start && !next.end) patch({ declared_bloom: null });
    else if (next.start && next.end && next.start <= next.end)
      patch({ declared_bloom: next });
  };
  const crops = OWN_CROPS.includes(parcel.crop)
    ? OWN_CROPS
    : [parcel.crop, ...OWN_CROPS];
  return (
    <li className={styles.parcel} data-home={home}>
      <div className={styles.grid}>
        <label className={styles.field}>
          Name
          <input
            type="text"
            value={parcel.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          What blooms here
          <select
            value={parcel.crop}
            onChange={(e) => patch({ crop: e.target.value })}
          >
            {crops.map((c) => (
              <option key={c} value={c}>
                {cropName(c)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Declared bloom start
          <input
            type="date"
            value={bloom.start}
            aria-invalid={half || reversed}
            onChange={(e) => setDay("start", e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Declared bloom end
          <input
            type="date"
            value={bloom.end}
            aria-invalid={half || reversed}
            onChange={(e) => setDay("end", e.target.value)}
          />
        </label>
      </div>
      {(half || reversed) && (
        <p role="alert" className={styles.error}>
          {half
            ? "Set both bloom dates, or clear both."
            : "The bloom end is before its start."}
        </p>
      )}
      <div className={styles.row}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={parcel.irrigated}
            onChange={(e) => patch({ irrigated: e.target.checked })}
          />
          Irrigated
        </label>
        <label className={styles.check}>
          <input
            type="radio"
            name="home"
            checked={home}
            onChange={() => {
              updateAccount((a) => ({ ...a, home_id: parcel.id }));
              saved();
            }}
          />
          Home apiary
        </label>
        <Link to={ROUTES.app}>Show on map</Link>
        <button
          type="button"
          className={styles.button}
          data-tone="danger"
          onClick={() => {
            if (!window.confirm(`Delete the parcel "${parcel.name}"?`)) return;
            removeParcel(parcel.id);
            saved();
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function Parcels({ account, saved }: { account: Account; saved: () => void }) {
  const home = homeParcel(account);
  return (
    <Section
      id="parcels"
      title="My parcels"
      lead="Apiary sites you drew on the map. Bloom is modelled where each parcel lies; the declared bloom window is optional and is used when the crop has no bloom model. Moves and matches start from the home apiary."
      action={
        <Link to={ROUTES.app} className={styles.button}>
          Draw a parcel on the map
        </Link>
      }
    >
      {account.parcels.length === 0 ? (
        <p className={styles.empty}>
          No parcels yet.{" "}
          <Link to={ROUTES.app}>Draw your first parcel on the map</Link>
        </p>
      ) : (
        <ul className={styles.parcels}>
          {account.parcels.map((p) => (
            <ParcelRow
              key={p.id}
              parcel={p}
              home={p.id === home?.id}
              saved={saved}
            />
          ))}
        </ul>
      )}
    </Section>
  );
}

/** The beekeeper's profile, moving costs and own parcels; saved on every change. */
export function AccountPage() {
  const account = useAccount();
  const [saved, setSaved] = useState(false);
  if (!account) return null; // Site shows the sign-in page instead.
  const save: Save = (change) => {
    updateAccount(change);
    setSaved(true);
  };
  return (
    <ReadingPage
      kicker="Account"
      title={account.name || "Your account"}
      lead="Your profile, moving costs and parcels. Demo account: everything here is stored in this browser only; nothing is sent to a server."
    >
      {/* A fresh form per account, so no input keeps another account's text. */}
      <div className={`${page.wrap} ${styles.body}`} key={account.email}>
        <p role="status" className={styles.status} data-saved={saved}>
          {saved ? "Saved in this browser ✓" : "Changes are saved as you type."}
        </p>
        <div className={styles.layout}>
          <nav aria-label="Account sections" className={styles.side}>
            <a href="#profile">Profile</a>
            <a href="#costs">My moving costs</a>
            <a href="#parcels">
              My parcels <span className="mono">{account.parcels.length}</span>
            </a>
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </nav>
          <div className={styles.sections}>
            <Profile account={account} save={save} />
            <MovingCosts account={account} save={save} />
            <Parcels account={account} saved={() => setSaved(true)} />
          </div>
        </div>
      </div>
    </ReadingPage>
  );
}

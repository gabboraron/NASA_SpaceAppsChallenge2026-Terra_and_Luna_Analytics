import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeatureCollection, Polygon } from "geojson";
import {
  getActors,
  getNatura,
  getParcels,
  getTimeline,
  useMocks,
  verifyParcel,
  type Actors,
  type Natura,
  type Parcel,
  type Season,
  type Timeline,
} from "./api/client";
import { LayerPanel } from "./components/LayerPanel/LayerPanel";
import { MapCanvas } from "./components/MapCanvas/MapCanvas";
import {
  cropName,
  beekeeperCollection,
  centroid,
  foragingRings,
  indexWeeks,
  parcelCollection,
  matchLabels,
  parcelDots,
  smapCollection,
  weekStateText,
  weekSummary,
  type LayerId,
} from "./components/MapCanvas/layers";
import {
  ParcelDetail,
  type VerifyState,
} from "./components/ParcelDetail/ParcelDetail";
import { MatchPanel } from "./components/MatchPanel/MatchPanel";
import { MoveCalculator } from "./components/MoveCalculator/MoveCalculator";
import { TimeSlider } from "./components/TimeSlider/TimeSlider";
import { SEASONS, WEEKS, isSeason } from "./domain/season";
import { useEscape } from "./hooks/useEscape";
import { useMatches } from "./hooks/useMatches";
import { SiteHeader } from "./site/SiteHeader";
import styles from "./App.module.css";

// Week 20 = mid-July, sunflower bloom: the demo's opening view.
const START_WEEK = 20;
const ALL_ON: Record<LayerId, boolean> = {
  parcels: true,
  natura: true,
  smap: true,
  buffers: true,
  beekeepers: true,
  imagery: false,
};

type Sheet = "matches" | "parcel" | "layers";
const SHEETS: { id: Sheet; label: string }[] = [
  { id: "matches", label: "Matches" },
  { id: "parcel", label: "Parcel" },
  { id: "layers", label: "Layers" },
];

/** Optional deep link `?year=2022|2024&week=1..26`; bad values are ignored. */
function linkedView(): { year: Season; week: number } {
  const query = new URLSearchParams(window.location.search);
  const y = Number(query.get("year"));
  const w = Number(query.get("week"));
  return {
    year: isSeason(y) ? y : 2024,
    week: Number.isInteger(w) && w >= 1 && w <= WEEKS ? w : START_WEEK,
  };
}

type Base = { parcels: Parcel[]; natura: Natura; actors: Actors };
type Load<T> = { data?: T; error?: string };

const NO_ROWS = new Map<string, never>();

export function App() {
  const [base, setBase] = useState<Load<Base>>({});
  const [timelines, setTimelines] = useState<
    Partial<Record<Season, Load<Timeline>>>
  >({});
  const [year, setYear] = useState<Season>(() => linkedView().year);
  const [visible, setVisible] = useState(ALL_ON);
  const [selected, setSelected] = useState("");
  const [hovered, setHovered] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [week, setWeek] = useState(() => linkedView().week);
  // Which side panel shows (and the phone tab); kept in step with the selection.
  const [sheet, setSheet] = useState<Sheet>("matches");
  const [layersOpen, setLayersOpen] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [planning, setPlanning] = useState(false);
  const [keeperId, setKeeperId] = useState("B1");
  // Parcels verified in this page session (server state resets on restart, D16).
  const [verifiedIds, setVerifiedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  // `stale` drops a late failure from an effect that has since been replaced.
  useEffect(() => {
    let stale = false;
    Promise.all([getParcels(), getNatura(), getActors()])
      .then(([parcels, natura, actors]) =>
        setBase({ data: { parcels, natura, actors } }),
      )
      .catch(() => {
        if (!stale)
          setBase({
            error: "Could not load parcels. Check that the API is running.",
          });
      });
    return () => {
      stale = true;
    };
  }, [attempt]);

  // Escape closes the tablet layers popover.
  const closeLayers = useCallback(() => setLayersOpen(false), []);
  useEscape(closeLayers);

  const current = timelines[year];
  useEffect(() => {
    if (current?.data) return;
    let stale = false;
    getTimeline(year)
      .then((data) => setTimelines((t) => ({ ...t, [year]: { data } })))
      .catch(() => {
        if (!stale)
          setTimelines((t) => ({
            ...t,
            [year]: {
              error:
                "Could not load the timeline. Check that the API is running.",
            },
          }));
      });
    return () => {
      stale = true;
    };
  }, [year, attempt, current?.data]);

  const timeline = current?.data ?? null;
  const parcels = useMemo(() => base.data?.parcels ?? [], [base.data]);
  const beekeepers = useMemo(
    () => base.data?.actors.beekeepers ?? [],
    [base.data],
  );
  const beekeeper = beekeepers.find((b) => b.id === keeperId) ?? beekeepers[0];
  const activeKeeperId = beekeeper?.id ?? keeperId;
  const matches = useMatches(activeKeeperId, year, week);
  const weeks = useMemo(() => indexWeeks(timeline), [timeline]);
  const weekRows = weeks.get(week) ?? NO_ROWS;
  const smapFc = useMemo(
    () => smapCollection(timeline, week),
    [timeline, week],
  );
  const summary = useMemo(() => weekSummary(weeks), [weeks]);
  const smapIndex = useMemo(
    () =>
      new Map(
        (timeline?.smap_cells ?? []).map((c) => [`${c.cell_id}:${c.week}`, c]),
      ),
    [timeline],
  );

  const layers = useMemo(
    () => ({
      parcels: parcelCollection(parcels),
      dots: parcelDots(parcels),
      natura: (base.data?.natura ?? {
        type: "FeatureCollection",
        features: [],
      }) as FeatureCollection<Polygon>,
    }),
    [base.data, parcels],
  );
  const keeperPins = useMemo(
    () => beekeeperCollection(beekeepers, beekeeper?.id),
    [beekeepers, beekeeper],
  );
  const ranks = useMemo(
    () => matchLabels(matches.cards ?? [], parcels),
    [matches.cards, parcels],
  );
  const selectedParcel = parcels.find((p) => p.id === selected);
  // Verification only rewrites blooming weeks, so a non-blooming week keeps the
  // model's own provenance for the season's bloom estimate.
  const estimate = useMemo(
    () =>
      timeline?.parcel_weeks.find(
        (w) => w.parcel_id === selected && w.bloom_state !== "blooming",
      )?.bloom_provenance,
    [timeline, selected],
  );
  const rings = useMemo(() => {
    const centres: Parameters<typeof foragingRings>[0] = [];
    if (beekeeper) centres.push({ center: beekeeper.home, kind: "beekeeper" });
    if (selectedParcel)
      centres.push({
        center: centroid(selectedParcel.geometry),
        kind: "parcel",
      });
    return foragingRings(centres);
  }, [beekeeper, selectedParcel]);

  const toggle = useCallback(
    (id: LayerId) => setVisible((v) => ({ ...v, [id]: !v[id] })),
    [],
  );
  // Touch has no mouseleave, so selection changes also clear the hover outline.
  const closeDetail = useCallback(() => {
    setSelected("");
    setHovered("");
    setPlanning(false);
    setSheet("matches");
  }, []);
  const closePlan = useCallback(() => setPlanning(false), []);
  const select = useCallback((id: string) => {
    setSelected(id);
    setHovered("");
    setVerifyState("idle");
    setPlanning(false);
    setSheet(id ? "parcel" : "matches");
  }, []);
  // Open the calculator with a beekeeper whose goal fits the parcel's service.
  const planMove = (parcel: Parcel) => {
    if (beekeeper?.goal !== parcel.service_type) {
      const fit = beekeepers.find((b) => b.goal === parcel.service_type);
      if (fit) setKeeperId(fit.id);
    }
    setPlanning(true);
  };
  // A match card's beekeeper already fits the parcel: open the calculator directly.
  const planMatch = (id: string) => {
    select(id);
    setPlanning(true);
  };
  // The server records the photo; refetch this season and drop the other cached one.
  const verify = (id: string) => {
    setVerifyState("pending");
    verifyParcel(id)
      .then(() => getTimeline(year))
      .then((data) => {
        setTimelines({ [year]: { data } });
        setVerifiedIds((ids) => new Set(ids).add(id));
        setVerifyState("idle");
      })
      .catch(() => setVerifyState("error"));
  };
  const retry = () => {
    setBase((b) => (b.error ? {} : b));
    setTimelines((t) => ({ ...t, [year]: undefined }));
    setAttempt((a) => a + 1);
  };

  const info =
    hovered && hovered !== selected
      ? parcels.find((p) => p.id === hovered)
      : undefined;
  const infoWeek = info && weekRows.get(info.id);
  const error = base.error ?? current?.error;
  const selectedRow = selectedParcel && weekRows.get(selectedParcel.id);
  const selectedSmap = selectedRow?.smap_cell_id
    ? smapIndex.get(`${selectedRow.smap_cell_id}:${week}`)
    : undefined;

  return (
    <div className={styles.page}>
      <SiteHeader variant="app">
        <div className={styles.bar}>
          <span className={`${styles.chip} ${styles.demo} mono`}>
            Demo · synthetic actors
          </span>
          {useMocks && <span className={`${styles.chip} mono`}>Mock data</span>}
          <button
            type="button"
            className={styles.layersButton}
            aria-expanded={layersOpen}
            aria-controls="layers-panel"
            onClick={() => setLayersOpen((o) => !o)}
          >
            Layers
          </button>
          <div role="group" aria-label="Season" className={styles.season}>
            {SEASONS.map((y) => (
              <button
                key={y}
                type="button"
                aria-pressed={year === y}
                title={y === 2022 ? "Drought year" : "Comparison year"}
                onClick={() => setYear(y)}
              >
                {y}
                <span className="sr-only">
                  {y === 2022 ? ", drought year" : ", comparison year"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </SiteHeader>
      <main
        className={styles.workspace}
        data-plan={!!selectedParcel && planning}
        data-layers={layersOpen}
        data-sheet={sheet}
      >
        <h1 className="sr-only">Explorer</h1>
        <section className={styles.map} aria-label="Map">
          <MapCanvas
            parcels={layers.parcels}
            parcelDots={layers.dots}
            natura={layers.natura}
            rings={rings}
            beekeepers={keeperPins}
            matchLabels={ranks}
            smap={smapFc}
            weekRows={weekRows}
            visible={visible}
            selected={selected}
            hovered={hovered}
            onSelect={select}
            onHover={setHovered}
          />
          <div className={styles.cards}>
            {error ? (
              <div role="alert" className={`${styles.card} ${styles.alert}`}>
                <strong>{error}</strong>
                <button type="button" onClick={retry}>
                  Try again
                </button>
              </div>
            ) : !current?.data ? (
              <div role="status" className={`${styles.card} ${styles.busy}`}>
                <strong>Fetching the {year} season from NASA…</strong>
                <span>
                  Parcels show as No data until the timeline arrives; a cold
                  cache can take a minute.
                </span>
              </div>
            ) : null}
            {timeline && visible.smap && timeline.smap_cells.length === 0 && (
              <div role="status" className={`${styles.card} ${styles.warn}`}>
                <strong>Soil moisture not available</strong>
                <span>
                  No SMAP cells for {year} yet, so nectar shows as unknown on
                  the drought-sensitive crops.
                </span>
              </div>
            )}
            {info && visible.parcels && (
              <div className={styles.card} aria-live="polite">
                <strong>
                  {cropName(info.crop)} · {info.id}
                </strong>
                <span>{weekStateText(infoWeek)}</span>
                <small>Click for details</small>
              </div>
            )}
          </div>
        </section>
        <div className={styles.week}>
          <TimeSlider
            year={year}
            week={week}
            summary={summary}
            onWeek={setWeek}
          />
        </div>
        <div role="group" aria-label="Panel" className={styles.tabs}>
          {SHEETS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={sheet === t.id}
              onClick={() => setSheet(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div id="layers-panel" className={styles.rail}>
          <LayerPanel visible={visible} onToggle={toggle} />
        </div>
        {/* Keyed by the panel shown, so a new panel starts scrolled to the top. */}
        <div
          key={
            sheet !== "parcel"
              ? "matches"
              : !selectedParcel
                ? "empty"
                : planning
                  ? "plan"
                  : "detail"
          }
          className={styles.side}
        >
          {sheet !== "parcel" ? (
            <MatchPanel
              beekeepers={beekeepers}
              keeperId={activeKeeperId}
              onKeeper={setKeeperId}
              year={year}
              week={week}
              matches={matches}
              parcels={parcels}
              weekRows={weekRows}
              hovered={hovered}
              onHover={setHovered}
              onSelect={select}
              onPlan={planMatch}
            />
          ) : !selectedParcel ? (
            <p className={styles.empty}>
              Select a parcel on the map, or a match, to see its bloom, nectar
              and where each value comes from.
            </p>
          ) : planning ? (
            <MoveCalculator
              parcel={selectedParcel}
              beekeepers={beekeepers}
              keeperId={activeKeeperId}
              onKeeper={setKeeperId}
              year={year}
              week={week}
              onBack={closePlan}
              onClose={closeDetail}
            />
          ) : (
            <ParcelDetail
              parcel={selectedParcel}
              grower={base.data?.actors.growers.find(
                (g) => g.id === selectedParcel.grower_id,
              )}
              year={year}
              week={week}
              row={selectedRow}
              smap={selectedSmap}
              estimate={estimate}
              verified={verifiedIds.has(selectedParcel.id)}
              verifyState={verifyState}
              onVerify={() => verify(selectedParcel.id)}
              onPlanMove={() => planMove(selectedParcel)}
              onClose={closeDetail}
            />
          )}
        </div>
      </main>
    </div>
  );
}

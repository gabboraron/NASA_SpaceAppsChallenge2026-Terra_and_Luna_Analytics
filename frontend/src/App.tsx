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
import { useMatches } from "./hooks/useMatches";
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

type Base = { parcels: Parcel[]; natura: Natura; actors: Actors };
type Load<T> = { data?: T; error?: string };

const NO_ROWS = new Map<string, never>();

export function App() {
  const [base, setBase] = useState<Load<Base>>({});
  const [timelines, setTimelines] = useState<
    Partial<Record<Season, Load<Timeline>>>
  >({});
  const [year, setYear] = useState<Season>(2024);
  const [visible, setVisible] = useState(ALL_ON);
  const [selected, setSelected] = useState("");
  const [hovered, setHovered] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [week, setWeek] = useState(START_WEEK);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [planning, setPlanning] = useState(false);
  const [keeperId, setKeeperId] = useState("B1");
  // Parcels verified in this page session (server state resets on restart, D16).
  const [verifiedIds, setVerifiedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([getParcels(signal), getNatura(signal), getActors(signal)])
      .then(([parcels, natura, actors]) =>
        setBase({ data: { parcels, natura, actors } }),
      )
      .catch(() => {
        if (!signal.aborted)
          setBase({
            error: "Could not load parcels. Check that the API is running.",
          });
      });
    return () => controller.abort();
  }, [attempt]);

  const current = timelines[year];
  useEffect(() => {
    if (current?.data) return;
    const controller = new AbortController();
    getTimeline(year, controller.signal)
      .then((data) => setTimelines((t) => ({ ...t, [year]: { data } })))
      .catch(() => {
        if (!controller.signal.aborted)
          setTimelines((t) => ({
            ...t,
            [year]: {
              error:
                "Could not load the timeline. Check that the API is running.",
            },
          }));
      });
    return () => controller.abort();
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
  const closeDetail = useCallback(() => {
    setSelected("");
    setPlanning(false);
  }, []);
  const closePlan = useCallback(() => setPlanning(false), []);
  const select = useCallback((id: string) => {
    setSelected(id);
    setVerifyState("idle");
    setPlanning(false);
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
    <main className={styles.page}>
      <header>
        <h1>Pollination map</h1>
        <p>
          Where crops bloom, where nectar is short, and where hives must not go
        </p>
        <span className={styles.chips}>
          <span>Illustrative parcels</span>
          <span>Synthetic beekeepers</span>
          {useMocks && <span>Mock data</span>}
        </span>
      </header>
      <div
        className={styles.workspace}
        data-plan={!!selectedParcel && planning}
      >
        <LayerPanel
          year={year}
          visible={visible}
          onYear={setYear}
          onToggle={toggle}
        />
        <section className={styles.panel} aria-label="Map">
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
              <div role="status" className={styles.card}>
                <strong>Fetching the {year} season from NASA…</strong>
                <span>
                  Parcels show as No data until the timeline arrives; a cold
                  cache can take a minute.
                </span>
              </div>
            ) : null}
            {timeline && visible.smap && timeline.smap_cells.length === 0 && (
              <div role="status" className={styles.card}>
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
          <TimeSlider
            year={year}
            week={week}
            summary={summary}
            onWeek={setWeek}
          />
        </section>
        {!selectedParcel && (
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
        )}
        {selectedParcel && planning && (
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
        )}
        {selectedParcel && !planning && (
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
  );
}

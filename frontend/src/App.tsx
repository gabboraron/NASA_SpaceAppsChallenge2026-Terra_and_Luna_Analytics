import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeatureCollection, Polygon } from "geojson";
import {
  getActors,
  getNatura,
  getParcels,
  getTimeline,
  useMocks,
  type Actors,
  type Natura,
  type Parcel,
  type Season,
  type Timeline,
} from "./api/client";
import { LayerPanel } from "./components/LayerPanel/LayerPanel";
import { MapCanvas } from "./components/MapCanvas/MapCanvas";
import {
  BLOOM_LABELS,
  CROP_NAMES,
  NECTAR_LABELS,
  beekeeperCollection,
  centroid,
  foragingRings,
  indexWeeks,
  parcelCollection,
  parcelDots,
  smapCollection,
  weekLabel,
  type LayerId,
} from "./components/MapCanvas/layers";
import styles from "./App.module.css";

// Fixed until the time slider (WP16) drives it; week 20 = mid-July sunflower bloom.
const WEEK = 20;
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
  const beekeeper = base.data?.actors.beekeepers[0];
  const weeks = useMemo(() => indexWeeks(timeline), [timeline]);
  const weekRows = weeks.get(WEEK) ?? NO_ROWS;
  const smapFc = useMemo(() => smapCollection(timeline, WEEK), [timeline]);

  const layers = useMemo(
    () => ({
      parcels: parcelCollection(parcels),
      dots: parcelDots(parcels),
      natura: (base.data?.natura ?? {
        type: "FeatureCollection",
        features: [],
      }) as FeatureCollection<Polygon>,
      beekeepers: beekeeperCollection(base.data?.actors.beekeepers ?? []),
    }),
    [base.data, parcels],
  );
  const selectedParcel = parcels.find((p) => p.id === selected);
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
  const retry = () => {
    setBase((b) => (b.error ? {} : b));
    setTimelines((t) => ({ ...t, [year]: undefined }));
    setAttempt((a) => a + 1);
  };

  const info = parcels.find((p) => p.id === (hovered || selected));
  const infoWeek = info && weekRows.get(info.id);
  const error = base.error ?? current?.error;

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
      <div className={styles.workspace}>
        <LayerPanel
          year={year}
          weekText={`Week ${WEEK} · ${weekLabel(year, WEEK)}`}
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
            beekeepers={layers.beekeepers}
            smap={smapFc}
            weekRows={weekRows}
            visible={visible}
            selected={selected}
            onSelect={setSelected}
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
                  {CROP_NAMES[info.crop] ?? info.crop} · {info.id}
                </strong>
                <span>
                  {infoWeek
                    ? `${BLOOM_LABELS[infoWeek.bloom_state]} · ${NECTAR_LABELS[infoWeek.nectar_state]}`
                    : "No data for this week"}
                </span>
                {infoWeek && (
                  <small>
                    {infoWeek.nectar_state === "low_nectar"
                      ? infoWeek.nectar_provenance.note || "Heuristic"
                      : `${infoWeek.bloom_provenance.kind}: ${infoWeek.bloom_provenance.source}`}
                  </small>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

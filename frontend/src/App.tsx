import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { getParcels, useMocks, type Parcel } from "./api/parcels";
import styles from "./App.module.css";
const region = new maplibregl.LngLatBounds([21.6, 47.7], [22.4, 48.05]);
export function App() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [status, setStatus] = useState("Loading parcels…");
  const [mapError, setMapError] = useState("");
  const [selected, setSelected] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    getParcels(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setParcels(items);
          setStatus(items.length ? "" : "No parcels available.");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setStatus("Could not load parcels. Check the API connection.");
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!container.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        bounds: region,
        fitBoundsOptions: { padding: 32 },
        attributionControl: { compact: true },
      });
    } catch {
      setMapError("The map could not start. Check WebGL support.");
      return;
    }
    map.current = instance;
    instance.addControl(new maplibregl.NavigationControl(), "top-right");
    instance.on("error", () => {
      if (!instance.isStyleLoaded())
        setMapError(
          "Basemap unavailable. Check your connection to OpenFreeMap.",
        );
    });
    instance.on("idle", () => {
      if (instance.isStyleLoaded()) setMapError("");
    });
    return () => {
      map.current = null;
      instance.remove();
    };
  }, []);
  function focusParcel(parcel: Parcel) {
    const bounds = new maplibregl.LngLatBounds();
    for (const [lon, lat] of parcel.geometry.coordinates[0])
      bounds.extend([lon, lat]);
    setSelected(parcel.id);
    map.current?.fitBounds(bounds, { padding: 60, maxZoom: 15 });
  }
  return (
    <main className={styles.page}>
      <header>
        <h1>Pollination map</h1>
        <span>Pilot region</span>
      </header>
      <div className={styles.workspace}>
        <aside>
          <h2>Parcels</h2>
          <p>{useMocks ? "Mock data" : "API data"}</p>
          <div role="status">{status}</div>
          {parcels.map((parcel) => (
            <button
              key={parcel.id}
              aria-pressed={selected === parcel.id}
              onClick={() => focusParcel(parcel)}
            >
              {parcel.crop} · {parcel.id}
              <small>
                {parcel.area_ha} ha
                {parcel.illustrative ? " · Illustrative parcel" : ""}
              </small>
            </button>
          ))}
          {selected && (
            <button
              onClick={() => {
                setSelected("");
                map.current?.fitBounds(region, { padding: 32 });
              }}
            >
              Show region
            </button>
          )}
        </aside>
        <section className={styles.panel} aria-label="Regional map">
          <div className={styles.map} ref={container} />
          {mapError && (
            <p role="alert" className={styles.error}>
              {mapError}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

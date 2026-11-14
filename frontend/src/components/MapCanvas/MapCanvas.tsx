import { useEffect, useRef, useState } from "react";
// Before our module CSS, so our rules win over .maplibregl-map at equal specificity.
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, {
  type ExpressionSpecification,
  type GeoJSONSource,
  type LayerSpecification,
} from "maplibre-gl";
import type { FeatureCollection, Point, Polygon } from "geojson";
import type { ParcelWeek } from "../../api/client";
import {
  BLOOM_COLORS,
  CROP_COLORS,
  DROUGHT,
  INK,
  NATURA,
  OTHER_CROP,
  hatch,
  rgba,
  type LayerId,
} from "./layers";
import styles from "./MapCanvas.module.css";

// Pilot bbox, same as Settings.bbox on the backend.
const REGION = new maplibregl.LngLatBounds([21.6, 47.7], [22.4, 48.05]);
const BASEMAP = "https://tiles.openfreemap.org/styles/liberty";
const IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

const low: ExpressionSpecification = [
  "==",
  ["feature-state", "nectar"],
  "low_nectar",
];
const cropColor: ExpressionSpecification = [
  "match",
  ["get", "crop"],
  ...Object.entries(CROP_COLORS).flat(),
  OTHER_CROP,
] as unknown as ExpressionSpecification; // TS tuple types cannot express a spread of match pairs

const PARCEL_HIT = ["parcels-fill", "parcels-dot"];

const bloomColor: ExpressionSpecification = [
  "match",
  ["coalesce", ["feature-state", "bloom"], "missing"],
  "none",
  BLOOM_COLORS.none,
  "pre_bloom",
  BLOOM_COLORS.pre_bloom,
  "blooming",
  BLOOM_COLORS.blooming,
  "post_bloom",
  BLOOM_COLORS.post_bloom,
  BLOOM_COLORS.missing,
];

const LAYERS: (LayerSpecification & { group: LayerId })[] = [
  {
    group: "imagery",
    id: "imagery",
    type: "raster",
    source: "imagery",
  },
  {
    group: "smap",
    id: "smap-fill",
    type: "fill",
    source: "smap",
    paint: { "fill-color": DROUGHT, "fill-opacity": ["get", "opacity"] },
  },
  {
    group: "smap",
    id: "smap-line",
    type: "line",
    source: "smap",
    paint: { "line-color": DROUGHT, "line-opacity": 0.35, "line-width": 1.5 },
  },
  {
    group: "natura",
    id: "natura-fill",
    type: "fill",
    source: "natura",
    paint: { "fill-pattern": "natura-hatch" },
  },
  {
    group: "natura",
    id: "natura-line",
    type: "line",
    source: "natura",
    paint: { "line-color": NATURA, "line-width": 2.5 },
  },
  {
    group: "buffers",
    id: "rings",
    type: "line",
    source: "rings",
    paint: {
      "line-color": [
        "match",
        ["get", "kind"],
        "parcel",
        CROP_COLORS.sunflower,
        INK,
      ],
      "line-width": ["match", ["get", "km"], 1, 2, 2, 1.6, 1.3],
      "line-opacity": ["match", ["get", "km"], 1, 1, 2, 0.75, 0.55],
      "line-dasharray": [3, 2],
    },
  },
  {
    group: "parcels",
    id: "parcels-fill",
    type: "fill",
    source: "parcels",
    paint: {
      "fill-color": bloomColor,
      "fill-opacity": 0.9,
    },
  },
  {
    group: "parcels",
    id: "parcels-low",
    type: "fill",
    source: "parcels",
    paint: { "fill-pattern": "low-hatch", "fill-opacity": ["case", low, 1, 0] },
  },
  {
    group: "parcels",
    id: "parcels-selected",
    type: "line",
    source: "parcels",
    filter: ["==", ["get", "id"], ""],
    paint: { "line-color": INK, "line-width": 8 },
  },
  {
    group: "parcels",
    id: "parcels-line",
    type: "line",
    source: "parcels",
    paint: {
      "line-color": ["case", low, DROUGHT, cropColor],
      "line-width": ["case", low, 4, 3],
    },
  },
  {
    // Parcels are a few hectares: below zoom 12 they show as dots in the same colours.
    group: "parcels",
    id: "parcels-dot",
    type: "circle",
    source: "parcel-dots",
    maxzoom: 12,
    paint: {
      "circle-radius": 7,
      "circle-color": bloomColor,
      "circle-stroke-color": ["case", low, DROUGHT, cropColor],
      "circle-stroke-width": ["case", low, 3.5, 2.5],
    },
  },
  {
    group: "beekeepers",
    id: "bee-pin",
    type: "circle",
    source: "beekeepers",
    paint: {
      "circle-radius": 9,
      "circle-color": INK,
      "circle-stroke-color": BLOOM_COLORS.blooming,
      "circle-stroke-width": 3,
    },
  },
  {
    group: "beekeepers",
    id: "bee-label",
    type: "symbol",
    source: "beekeepers",
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 13,
      "text-offset": [0, 1.4],
      "text-anchor": "top",
    },
    paint: {
      "text-color": INK,
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  },
];

type Props = {
  parcels: FeatureCollection<Polygon>;
  parcelDots: FeatureCollection<Point>;
  natura: FeatureCollection<Polygon>;
  rings: FeatureCollection<Polygon>;
  beekeepers: FeatureCollection<Point>;
  smap: FeatureCollection<Polygon>;
  /** The shown week's rows by parcel id. */
  weekRows: Map<string, ParcelWeek>;
  visible: Record<LayerId, boolean>;
  selected: string;
  onSelect: (parcelId: string) => void;
  onHover: (parcelId: string) => void;
};

const SOURCES = [
  "smap",
  "natura",
  "rings",
  "parcels",
  "parcel-dots",
  "beekeepers",
];

function useSource(
  m: maplibregl.Map | null,
  id: string,
  data: FeatureCollection,
) {
  useEffect(() => {
    m?.getSource<GeoJSONSource>(id)?.setData(data);
  }, [m, id, data]);
}

/** MapLibre map with all overlay layers; recolours by feature state, never by refetching. */
export function MapCanvas(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!container.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: BASEMAP,
        bounds: REGION,
        fitBoundsOptions: { padding: 32 },
        attributionControl: { compact: true },
      });
    } catch {
      setError("The map could not start. Check WebGL support.");
      return;
    }
    map.current = instance;
    instance.addControl(new maplibregl.NavigationControl(), "top-right");
    instance.addControl(new maplibregl.ScaleControl(), "bottom-left");
    instance.on("error", () => {
      if (!instance.isStyleLoaded())
        setError("Basemap unavailable. Check your connection to OpenFreeMap.");
    });
    instance.on("load", () => {
      instance.addImage("natura-hatch", hatch(10, rgba(NATURA, 150), 2));
      instance.addImage("low-hatch", hatch(8, rgba(DROUGHT), 2));
      instance.addSource("imagery", {
        type: "raster",
        tiles: [IMAGERY],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
      });
      for (const id of SOURCES)
        instance.addSource(id, {
          type: "geojson",
          data: EMPTY,
          promoteId: "id",
        });
      for (const { group, ...layer } of LAYERS)
        instance.addLayer({
          ...layer,
          layout: {
            ...layer.layout,
            visibility: latest.current.visible[group] ? "visible" : "none",
          },
        } as LayerSpecification);
      instance.on("click", PARCEL_HIT, (e) => {
        const id = e.features?.[0]?.properties.id;
        if (typeof id === "string") latest.current.onSelect(id);
      });
      instance.on("mousemove", PARCEL_HIT, (e) => {
        instance.getCanvas().style.cursor = "pointer";
        const id = e.features?.[0]?.properties.id;
        if (typeof id === "string") latest.current.onHover(id);
      });
      instance.on("mouseleave", PARCEL_HIT, () => {
        instance.getCanvas().style.cursor = "";
        latest.current.onHover("");
      });
      setError("");
      setReady(true);
    });
    return () => {
      map.current = null;
      setReady(false);
      instance.remove();
    };
  }, []);

  const m = ready ? map.current : null;
  useSource(m, "parcels", props.parcels);
  useSource(m, "parcel-dots", props.parcelDots);
  useSource(m, "natura", props.natura);
  useSource(m, "rings", props.rings);
  useSource(m, "beekeepers", props.beekeepers);
  useSource(m, "smap", props.smap);

  useEffect(() => {
    if (!m) return;
    for (const source of ["parcels", "parcel-dots"]) {
      m.removeFeatureState({ source });
      for (const [id, w] of props.weekRows)
        m.setFeatureState(
          { source, id },
          { bloom: w.bloom_state, nectar: w.nectar_state },
        );
    }
  }, [m, props.weekRows, props.parcels]);

  useEffect(() => {
    if (!m) return;
    for (const { id, group } of LAYERS)
      m.setLayoutProperty(
        id,
        "visibility",
        props.visible[group] ? "visible" : "none",
      );
  }, [m, props.visible]);

  useEffect(() => {
    m?.setFilter("parcels-selected", ["==", ["get", "id"], props.selected]);
  }, [m, props.selected]);

  return (
    <>
      <div className={styles.map} ref={container} data-testid="map" />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  );
}

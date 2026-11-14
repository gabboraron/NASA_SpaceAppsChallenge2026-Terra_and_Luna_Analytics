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
  HONEY,
  INK,
  NATURA,
  OTHER_CROP,
  PAPER,
  hatch,
  isInterpolated,
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

/** Draw a `width` × `height` px icon on a canvas and return its pixels for `addImage`. */
function drawIcon(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new ImageData(width, height);
  draw(ctx);
  return ctx.getImageData(0, 0, width, height);
}

/** Pointy-top hexagon path centred at (cx, cy) with the given apothem. */
function hexPath(cx: number, cy: number, apothem: number): Path2D {
  const r = (apothem * 2) / Math.sqrt(3);
  const path = new Path2D();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    path.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  path.closePath();
  return path;
}

/** Rank badge: honey hexagon with an ink `border`, `height` px tall. */
function hexagon(height: number, border: number): ImageData {
  const apothem = (height / 2) * (Math.sqrt(3) / 2);
  const width = Math.ceil(apothem * 2);
  return drawIcon(width, height, (ctx) => {
    ctx.fillStyle = INK;
    ctx.fill(hexPath(width / 2, height / 2, apothem));
    ctx.fillStyle = HONEY;
    ctx.fill(hexPath(width / 2, height / 2, apothem - border));
  });
}

/** Beekeeper pin: dark rounded hive box with two honey stripes and a thin paper rim. */
function hive(width: number, height: number, radius: number): ImageData {
  const rim = Math.max(1, Math.round(width / 22));
  const stripe = Math.max(1, height / 13);
  const edge = rim + width * 0.1;
  return drawIcon(width, height, (ctx) => {
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(
      rim,
      rim,
      width - 2 * rim,
      height - 2 * rim,
      radius - rim / 2,
    );
    ctx.fill();
    // Stripes at roughly a third and two thirds of the box, as in the design mark.
    ctx.fillStyle = HONEY;
    for (const f of [0.36, 0.66])
      ctx.fillRect(edge, height * f - stripe / 2, width - 2 * edge, stripe);
  });
}

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
    id: "parcels-hover",
    type: "line",
    source: "parcels",
    filter: ["==", ["get", "id"], ""],
    paint: { "line-color": INK, "line-width": 5, "line-opacity": 0.6 },
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
    // Gap-filled weeks (D4): a white dash over the outline, so it reads as broken.
    group: "parcels",
    id: "parcels-interp",
    type: "line",
    source: "parcels",
    paint: {
      "line-color": "#ffffff",
      "line-width": 2,
      "line-dasharray": [2, 2],
      "line-opacity": [
        "case",
        ["boolean", ["feature-state", "interp"], false],
        1,
        0,
      ],
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
    group: "parcels",
    id: "dots-hover",
    type: "circle",
    source: "parcel-dots",
    maxzoom: 12,
    filter: ["==", ["get", "id"], ""],
    paint: {
      "circle-radius": 12,
      "circle-color": "rgba(0,0,0,0)",
      "circle-stroke-color": INK,
      "circle-stroke-width": 3,
    },
  },
  {
    // The selected beekeeper's ranks, up and right of each parcel (WP18).
    group: "beekeepers",
    id: "match-badge",
    type: "symbol",
    source: "match-labels",
    layout: {
      "icon-image": "rank-hex",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: { "icon-translate": [13, -13] },
  },
  {
    group: "beekeepers",
    id: "match-rank",
    type: "symbol",
    source: "match-labels",
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 12,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": INK, "text-translate": [13, -13] },
  },
  {
    group: "beekeepers",
    id: "bee-pin",
    type: "symbol",
    source: "beekeepers",
    layout: {
      "icon-image": "hive",
      "icon-size": ["case", ["get", "selected"], 1, 0.8],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: { "icon-opacity": ["case", ["get", "selected"], 1, 0.45] },
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
      "text-halo-color": PAPER,
      "text-halo-width": 1.5,
      "text-opacity": ["case", ["get", "selected"], 1, 0.6],
    },
  },
];

type Props = {
  parcels: FeatureCollection<Polygon>;
  parcelDots: FeatureCollection<Point>;
  natura: FeatureCollection<Polygon>;
  rings: FeatureCollection<Polygon>;
  beekeepers: FeatureCollection<Point>;
  matchLabels: FeatureCollection<Point>;
  smap: FeatureCollection<Polygon>;
  /** The shown week's rows by parcel id. */
  weekRows: Map<string, ParcelWeek>;
  visible: Record<LayerId, boolean>;
  selected: string;
  /** Parcel outlined because its card or the parcel itself is hovered. */
  hovered: string;
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
  "match-labels",
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
      // Drawn at 2× for sharp edges on high-density screens.
      instance.addImage("rank-hex", hexagon(52, 3), { pixelRatio: 2 });
      instance.addImage("hive", hive(48, 40, 6), { pixelRatio: 2 });
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
  useSource(m, "match-labels", props.matchLabels);

  useEffect(() => {
    if (!m) return;
    for (const source of ["parcels", "parcel-dots"]) {
      m.removeFeatureState({ source });
      for (const [id, w] of props.weekRows)
        m.setFeatureState(
          { source, id },
          {
            bloom: w.bloom_state,
            nectar: w.nectar_state,
            interp: isInterpolated(w),
          },
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

  useEffect(() => {
    const filter: ExpressionSpecification = [
      "==",
      ["get", "id"],
      props.hovered,
    ];
    m?.setFilter("parcels-hover", filter);
    m?.setFilter("dots-hover", filter);
  }, [m, props.hovered]);

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

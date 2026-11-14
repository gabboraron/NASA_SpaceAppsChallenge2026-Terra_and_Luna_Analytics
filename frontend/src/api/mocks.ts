// Offline fixtures for VITE_USE_MOCKS (the default). Shapes follow the API contract.
import type {
  Actors,
  Beekeeper,
  CalculatorInput,
  CalculatorResult,
  MatchCard,
  Measurement,
  Natura,
  Parcel,
  ParcelWeek,
  Polygon,
  Provenance,
  Season,
  Timeline,
} from "./client";
import { centroid } from "../components/MapCanvas/layers";
import { WEEKS, weekStart } from "../domain/season";

const square = (lon: number, lat: number, d: number): Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [lon, lat],
      [lon + d, lat],
      [lon + d, lat + d],
      [lon, lat + d],
      [lon, lat],
    ],
  ],
});

const parcel = (
  id: string,
  crop: string,
  lon: number,
  lat: number,
  extra: Partial<Parcel> = {},
): Parcel => ({
  id,
  grower_id: "G1",
  crop,
  area_ha: 3,
  illustrative: true,
  service_type: "pollination",
  requested_colonies: 50,
  fee_eur_per_colony: 60,
  declared_bloom: null,
  irrigated: false,
  natura_status: "clear",
  geometry: square(lon, lat, 0.01),
  ...extra,
});

export const parcels: Parcel[] = [
  parcel("P1", "sunflower", 22.12, 47.83, { grower_id: "G3", area_ha: 12.4 }),
  parcel("P2", "apple", 21.95, 47.9, {
    area_ha: 2.3,
    requested_colonies: 20,
    irrigated: true,
    natura_status: "buffer_overlap",
    declared_bloom: { start: "2024-04-22", end: "2024-05-08" },
  }),
  parcel("P3", "black_locust", 21.82, 47.96, {
    grower_id: "G4",
    service_type: "forage",
    requested_colonies: null,
    fee_eur_per_colony: null,
    natura_status: "inside",
  }),
];

export const natura: Natura = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: square(21.8, 47.95, 0.05),
      properties: { site_name: "Example protected area" },
    },
  ],
};

function keeper(
  id: string,
  home: [number, number],
  colonies: number,
  goal: Beekeeper["goal"],
  alternative: number,
): Beekeeper {
  return {
    id,
    name: `Example beekeeper ${id}`,
    synthetic: true,
    home,
    colonies,
    max_distance_km: 250,
    goal,
    availability: { start: "2024-03-01", end: "2024-08-31" },
    vehicle_l_per_100km: 12,
    alternative_contribution_eur: alternative,
  };
}

export const actors: Actors = {
  growers: [
    { id: "G1", name: "Synthetic grower G1 (orchard)", synthetic: true },
    { id: "G3", name: "Synthetic grower G3 (sunflower)", synthetic: true },
    { id: "G4", name: "Synthetic host G4 (forage)", synthetic: true },
  ],
  beekeepers: [
    keeper("B1", [22.1, 47.82], 50, "pollination", 400),
    keeper("B2", [20.33, 46.42], 40, "pollination", 400),
    keeper("B3", [21.86, 47.77], 20, "forage", 0),
  ],
};

const MOCK = "Mock data, not a NASA query";
type Kind = Provenance["kind"];
const prov = (kind: Kind, note = "", interpolated = false): Provenance => ({
  kind,
  source: MOCK,
  observed_at: null,
  interpolated,
  note,
});
const value = (v: number | null, p: Provenance): Measurement => ({
  value: v,
  provenance: v === null ? prov("Missing", "No observation") : p,
});

const verified = new Set<string>();
const PHOTO: Provenance = {
  kind: "Observed",
  source: "Grower field photo (simulated)",
  observed_at: new Date().toISOString().slice(0, 10),
  interpolated: false,
  note: "Simulated in the demo; resets when the page reloads.",
};

/** Mirrors POST /parcels/{id}/verify: later timelines mark blooming weeks Observed. */
export function verify(id: string): Provenance {
  verified.add(id);
  return PHOTO;
}

const BLOOM: Record<string, [number, number]> = {
  sunflower: [18, 22],
  apple: [8, 10],
  black_locust: [11, 12],
};

function week(p: Parcel, w: number, year: Season): ParcelWeek {
  const start = weekStart(year, w);
  const sunflower = p.crop === "sunflower";
  const [from, to] = BLOOM[p.crop] ?? [99, 99];
  const bloom = w < from ? "pre_bloom" : w <= to ? "blooming" : "post_bloom";
  const low = sunflower && bloom === "blooming" && year === 2022;
  // Sunflower: HLS every other week, gap weeks interpolated (as the engine does).
  const gapWeek = sunflower && w % 2 === 1;
  // Latest scene: this week, or the week before for a gap-filled week.
  const scene = new Date(start.getTime() - (gapWeek ? 7 : 0) * 86_400_000);
  const hls: Provenance = {
    ...prov("Estimated", gapWeek ? "Linear between scenes" : "", gapWeek),
    observed_at: scene.toISOString().slice(0, 10),
  };
  const ndyi = sunflower ? Math.max(0, 0.32 - Math.abs(w - 20) * 0.06) : null;
  const bloomProv =
    verified.has(p.id) && bloom === "blooming"
      ? PHOTO
      : sunflower
        ? hls
        : prov("Reported", "Grower-declared window");
  return {
    parcel_id: p.id,
    week: w,
    starts_on: start.toISOString().slice(0, 10),
    bloom_state: bloom,
    bloom_provenance: bloomProv,
    nectar_state: low ? "low_nectar" : sunflower ? "normal" : "unknown",
    nectar_provenance: prov(
      sunflower ? "Estimated" : "Missing",
      low
        ? "Heuristic: SMAP below the 10th percentile"
        : sunflower
          ? "Heuristic"
          : "Not drought-sensitive in the model",
    ),
    estimated_bloom: sunflower
      ? { start: `${year}-07-05`, end: `${year}-08-08` }
      : null,
    ndvi: value(sunflower ? 0.4 + w * 0.015 : null, hls),
    ndyi: value(ndyi, hls),
    gdd: value(Math.max(0, (w - 4) * 55), prov("Estimated", "Base 6 °C")),
    smap_cell_id: sunflower ? "C1" : null,
  };
}

export function timeline(year: Season): Timeline {
  const weeks = Array.from({ length: WEEKS }, (_, i) => i + 1);
  return {
    year,
    parcel_weeks: parcels.flatMap((p) => weeks.map((w) => week(p, w, year))),
    smap_cells: weeks.map((w) => ({
      cell_id: "C1",
      week: w,
      geometry: square(22.05, 47.78, 0.1),
      root_zone_moisture: { value: 0.2, provenance: prov("Observed") },
      percentile: {
        value: year === 2022 ? 9 : 52,
        provenance: prov("Observed"),
      },
    })),
  };
}

// --- matches and calculator (mirror the backend's prefill and calculate) ----

const assumed = prov("Estimated", "Illustrative default");

/** Straight line x 1.3 detour (plan D22), as geo.travel_distance_km. */
function roadKm([lon1, lat1]: number[], [lon2, lat2]: number[]): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h)) * 1.3;
}

function prefill(b: Beekeeper, p: Parcel): CalculatorInput {
  const km = roadKm(b.home, centroid(p.geometry));
  const forage = p.service_type === "forage";
  const wanted = p.requested_colonies ?? b.colonies;
  const input: Omit<CalculatorInput, "provenance"> = {
    service_type: p.service_type,
    colonies: Math.max(20, Math.min(100, wanted, b.colonies)),
    distance_km: km,
    fee_per_colony: forage ? 0 : (p.fee_eur_per_colony ?? 0),
    legs: 4,
    fuel_l_per_100km: b.vehicle_l_per_100km,
    fuel_price_per_l: 1.65,
    vehicle_cost_per_km: 0.3,
    driving_hours: (4 * km) / 60,
    loading_hours: 4,
    hourly_labor_cost: 15,
    extra_feed_cost: 0,
    other_placement_cost: 0,
    honey_margin: 0,
    alternative_contribution: b.alternative_contribution_eur,
    price_uncertainty: 0.2,
    extra_trips_low: 1,
  };
  const provenance = Object.fromEntries(
    Object.keys(input).map((k) => [k, assumed]),
  );
  provenance.distance_km = prov("Estimated", "Straight line x 1.3 detour");
  provenance.driving_hours = prov("Estimated", "Trips x distance at 60 km/h");
  if (forage)
    provenance.honey_margin = prov(
      "Missing",
      "Forage moves earn through honey; enter your margin",
    );
  return { ...input, provenance };
}

/** Mirrors engine/matching.py until WP12: parcels of the beekeeper's goal, nearest first. */
export function matches(
  beekeeperId: string,
  year: Season,
  week: number,
): MatchCard[] {
  const b = actors.beekeepers.find((k) => k.id === beekeeperId);
  if (!b) return [];
  let rank = 0;
  return parcels
    .filter((p) => p.service_type === b.goal)
    .map((p) => ({ p, input: prefill(b, p) }))
    .sort((x, y) => x.input.distance_km - y.input.distance_km)
    .map(({ p, input }) => {
      const blocked = p.natura_status === "inside";
      const km = input.distance_km;
      const warnings = [
        `Preliminary ranking by distance only (${year}, week ${week}); bloom fit, nectar and spray calendars are not scored yet`,
      ];
      if (p.natura_status === "buffer_overlap")
        warnings.push("Natura 2000 site within 3 km");
      if (km > b.max_distance_km)
        warnings.push(`Beyond the beekeeper's ${b.max_distance_km} km limit`);
      return {
        beekeeper_id: b.id,
        parcel_id: p.id,
        rank: blocked ? null : ++rank,
        blocked,
        reasons: blocked
          ? ["Inside a Natura 2000 site: hives cannot be placed"]
          : [`Estimated road distance ${km.toFixed(1)} km`],
        missing_items: blocked ? [] : ["Field confirmation"],
        warnings,
        confidence: "low" as const,
        distance_km: { value: km, provenance: input.provenance!.distance_km },
        calculator_input: blocked ? null : input,
      };
    });
}

/** Mirrors engine/calculator.py (8 % commission on pollination fees only). */
export function calculate(i: CalculatorInput): CalculatorResult {
  const scenario = (factor: number, extraLegs: number) => {
    const legs = i.legs + extraLegs;
    const km = legs * i.distance_km;
    const perLeg = i.legs ? i.driving_hours / i.legs : 0;
    const transport =
      (km * i.fuel_l_per_100km * i.fuel_price_per_l) / 100 +
      km * i.vehicle_cost_per_km +
      legs * perLeg * i.hourly_labor_cost;
    const other =
      i.loading_hours * i.hourly_labor_cost +
      i.extra_feed_cost +
      i.other_placement_cost;
    const revenue = i.colonies * i.fee_per_colony * factor;
    const commission = i.service_type === "pollination" ? 0.08 * revenue : 0;
    const contribution =
      revenue - commission - transport - other + i.honey_margin;
    return {
      revenue,
      commission,
      transport_cost: transport,
      other_costs: other,
      contribution,
      benefit_vs_alternative: contribution - i.alternative_contribution,
    };
  };
  const u = i.price_uncertainty;
  const base = scenario(1, 0);
  const benefit = base.benefit_vs_alternative;
  const eur = Math.abs(benefit).toFixed(2);
  return {
    low: scenario(1 - u, 2 * i.extra_trips_low),
    base,
    high: scenario(1 + u, 0),
    verdict: benefit < 0 ? "do_not_move" : "move",
    message:
      benefit < 0
        ? `Staying at base apiary yields €${eur} more.`
        : `Moving yields €${eur} more than the alternative.`,
  };
}

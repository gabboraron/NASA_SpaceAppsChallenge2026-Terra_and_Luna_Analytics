import type { HlsResponse, Measurement, PowerResponse } from "../../api/client";
import { show } from "../ProvenanceBadge/ProvenanceBadge";

export type Row = { label: string; text: string; m: Measurement };

const row = (
  label: string,
  m: Measurement,
  digits: number,
  unit = "",
  signed = false,
): Row => ({ label, m, text: show(m, digits, unit, signed) });

/** POWER rows of a drawn field; the heat sum is the last day of the series. */
export function powerRows(p: PowerResponse): Row[] {
  const heat: Measurement = {
    value: p.gdd_series.at(-1)?.gdd ?? null,
    provenance: p.gdd_provenance,
  };
  return [
    row("Heat sum (1 Mar on)", heat, 0, " GDD"),
    row("Rain (1 Mar on)", p.precipitation_total_mm, 0, " mm"),
    row("Rain vs 2015–2024", p.precipitation_anomaly_mm, 0, " mm", true),
    row("Bee-flight weather", p.bee_flight_weather_days, 0, " days"),
  ];
}

/** HLS rows of a drawn field. */
export function hlsRows(h: HlsResponse): Row[] {
  return [
    row("NDVI (greenness)", h.ndvi, 2),
    row("NDYI (yellowness)", h.ndyi, 2),
  ];
}

import type { HlsResponse, Measurement, PowerResponse } from "../../api/client";

export type Row = { label: string; text: string; m: Measurement };

const show = (m: Measurement, digits: number, unit: string, signed = false) =>
  m.value == null
    ? "—"
    : `${signed && m.value > 0 ? "+" : ""}${m.value.toFixed(digits)}${unit}`;

/** POWER rows of a drawn field; the heat sum is the last day of the series. */
export function powerRows(p: PowerResponse): Row[] {
  const heat: Measurement = {
    value: p.gdd_series.at(-1)?.gdd ?? null,
    provenance: p.gdd_provenance,
  };
  return [
    { label: "Heat sum (1 Mar on)", text: show(heat, 0, " GDD"), m: heat },
    {
      label: "Rain (1 Mar on)",
      text: show(p.precipitation_total_mm, 0, " mm"),
      m: p.precipitation_total_mm,
    },
    {
      label: "Rain vs 2015–2024",
      text: show(p.precipitation_anomaly_mm, 0, " mm", true),
      m: p.precipitation_anomaly_mm,
    },
    {
      label: "Bee-flight weather",
      text: show(p.bee_flight_weather_days, 0, " days"),
      m: p.bee_flight_weather_days,
    },
  ];
}

/** HLS rows of a drawn field. */
export function hlsRows(h: HlsResponse): Row[] {
  return [
    { label: "NDVI (greenness)", text: show(h.ndvi, 2, ""), m: h.ndvi },
    { label: "NDYI (yellowness)", text: show(h.ndyi, 2, ""), m: h.ndyi },
  ];
}

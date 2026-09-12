import type { DataPoint, HiveSensorDataKey } from "@/types";

export interface ChartViewport {
  start: number;
  span: number;
  min: number;
  max: number;
}

export function sensorValue(point: DataPoint | undefined, key: HiveSensorDataKey): number | null {
  const value = point?.[key];
  return point?.hasData !== false && typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

export function sensorStats(data: DataPoint[], key: HiveSensorDataKey) {
  const values = data.flatMap((point) => {
    const value = sensorValue(point, key);
    return value === null ? [] : [value];
  });
  if (!values.length) return null;
  return {
    avg: values.reduce((total, value) => total + value, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function latestSensorIndex(data: DataPoint[], keys: HiveSensorDataKey[]) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    if (keys.some((key) => sensorValue(data[index], key) !== null)) return index;
  }
  return -1;
}

export function valueDomain(data: DataPoint[], keys: HiveSensorDataKey[], start = 0, end = data.length - 1) {
  const values = data.slice(Math.max(0, Math.floor(start)), Math.ceil(end) + 1).flatMap((point) =>
    keys.flatMap((key) => {
      const value = sensorValue(point, key);
      return value === null ? [] : [value];
    }),
  );
  if (!values.length) return { min: 0, max: 1 };
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const padding = Math.max((highest - lowest) * 0.18, keys.includes("co2") ? 25 : 1);
  const step = 10 ** Math.floor(Math.log10(Math.max(highest - lowest + padding * 2, 0.1))) / 5;
  return {
    min: Math.floor((lowest - padding) / step) * step,
    max: Math.ceil((highest + padding) / step) * step,
  };
}

export function clampViewport(viewport: ChartViewport, count: number): ChartViewport {
  const totalSpan = Math.max(count - 1, 1);
  const span = Math.min(totalSpan, Math.max(Math.min(1, totalSpan), viewport.span));
  return {
    ...viewport,
    start: Math.min(Math.max(0, viewport.start), totalSpan - span),
    span,
    max: Math.max(viewport.min + 0.1, viewport.max),
  };
}

export function initialViewport(data: DataPoint[], keys: HiveSensorDataKey[], showAll = false): ChartViewport {
  const latest = Math.max(0, latestSensorIndex(data, keys));
  const totalSpan = Math.max(1, data.length - 1);
  const span = showAll ? totalSpan : Math.min(totalSpan, 8);
  const start = showAll ? 0 : Math.max(0, Math.min(totalSpan - span, latest - span * 0.8));
  return { start, span, ...valueDomain(data, keys, start, start + span) };
}

export function panViewport(viewport: ChartViewport, dx: number, dy: number, width: number, height: number, count: number) {
  const yOffset = (dy / Math.max(height, 1)) * (viewport.max - viewport.min);
  return clampViewport({
    ...viewport,
    start: viewport.start - (dx / Math.max(width, 1)) * viewport.span,
    min: viewport.min + yOffset,
    max: viewport.max + yOffset,
  }, count);
}

/** Keep the pinch focal point fixed in both the time and value axes. */
export function zoomViewport(viewport: ChartViewport, factor: number, count: number, anchorX = 0.5, anchorY = 0.5) {
  const safeFactor = Math.max(0.1, Math.min(10, factor));
  const span = Math.max(1, Math.min(Math.max(count - 1, 1), viewport.span / safeFactor));
  const range = Math.max(0.1, Math.min(1e8, (viewport.max - viewport.min) / safeFactor));
  const value = viewport.max - anchorY * (viewport.max - viewport.min);
  return clampViewport({
    start: viewport.start + viewport.span * anchorX - span * anchorX,
    span,
    min: value - range * (1 - anchorY),
    max: value + range * anchorY,
  }, count);
}

export function chartSegments(data: DataPoint[], key: HiveSensorDataKey) {
  const segments: { index: number; value: number }[][] = [];
  let segment: { index: number; value: number }[] = [];
  data.forEach((point, index) => {
    const value = sensorValue(point, key);
    if (value === null) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else {
      segment.push({ index, value });
    }
  });
  if (segment.length) segments.push(segment);
  return segments;
}

export function formatSensorValue(value: number | null, key: HiveSensorDataKey) {
  if (value === null) return "—";
  return key.includes("Temperature") ? value.toFixed(1) : String(Math.round(value));
}

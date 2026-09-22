import type { DataPoint, HiveSensorDataKey } from "@/types";

export interface ChartViewport {
  start: number;
  span: number;
  min: number;
  max: number;
}

export interface ChartPoint {
  index: number;
  value: number;
}

export function sensorValue(point: DataPoint | undefined, key: HiveSensorDataKey): number | null {
  const value = point?.[key];
  return point?.hasData !== false && typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

export function sensorStats(data: DataPoint[], key: HiveSensorDataKey) {
  let count = 0;
  let total = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const point of data) {
    const value = sensorValue(point, key);
    if (value === null) continue;
    count += 1;
    total += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return count ? { avg: total / count, min, max } : null;
}

export function latestSensorIndex(data: DataPoint[], keys: HiveSensorDataKey[]) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    if (keys.some((key) => sensorValue(data[index], key) !== null)) return index;
  }
  return -1;
}

// 온도(°C)·습도(%) 센서는 항상 이 고정 범위로 표시합니다.
// 데이터 편차에 따라 y축이 널뛰며 비현실적인 값(예: 300°C)까지 확대되는 것을 막습니다.
const FIXED_DOMAIN_MIN = -20;
const FIXED_DOMAIN_MAX = 100;

export function valueDomain(data: DataPoint[], keys: HiveSensorDataKey[], start = 0, end = data.length - 1) {
  if (keys.some((key) => key.includes("Temperature") || key.includes("Humidity"))) {
    return { min: FIXED_DOMAIN_MIN, max: FIXED_DOMAIN_MAX };
  }
  let lowest = Infinity;
  let highest = -Infinity;
  const last = Math.min(data.length - 1, Math.ceil(end));
  for (let index = Math.max(0, Math.floor(start)); index <= last; index += 1) {
    for (const key of keys) {
      const value = sensorValue(data[index], key);
      if (value === null) continue;
      lowest = Math.min(lowest, value);
      highest = Math.max(highest, value);
    }
  }
  if (lowest === Infinity) return { min: 0, max: 1 };
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
  const span = showAll ? totalSpan : Math.min(totalSpan, 16);
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
  return pinchViewport(viewport, factor, count, anchorX, anchorY, anchorX, anchorY);
}

/** Move the original focal time/value with the fingers as their centroid moves. */
export function pinchViewport(
  viewport: ChartViewport, factor: number, count: number,
  fromX: number, fromY: number, toX: number, toY: number,
) {
  const safeFactor = Math.max(0.1, Math.min(10, factor));
  const span = Math.max(1, Math.min(Math.max(count - 1, 1), viewport.span / safeFactor));
  const range = Math.max(0.1, Math.min(1e8, (viewport.max - viewport.min) / safeFactor));
  const value = viewport.max - fromY * (viewport.max - viewport.min);
  return clampViewport({
    start: viewport.start + viewport.span * fromX - span * toX,
    span,
    min: value - range * (1 - toY),
    max: value + range * toY,
  }, count);
}

/** Velocities use PanResponder's px/ms units; integrate decay independently of frame rate. */
export function momentumStep(
  viewport: ChartViewport, velocityX: number, velocityY: number, elapsedMs: number,
  width: number, height: number, count: number,
) {
  const duration = Math.max(0, elapsedMs);
  const decay = Math.exp(-duration / 240);
  const travel = 240 * (1 - decay);
  const next = panViewport(viewport, velocityX * travel, velocityY * travel, width, height, count);
  const lastStart = Math.max(count - 1, 1) - next.span;
  const hitXBoundary = (velocityX > 0 && next.start <= 0) || (velocityX < 0 && next.start >= lastStart);
  const nextVelocityX = hitXBoundary ? 0 : velocityX * decay;
  const nextVelocityY = velocityY * decay;
  return {
    viewport: next,
    velocityX: nextVelocityX,
    velocityY: nextVelocityY,
    done: Math.abs(nextVelocityX) < 0.02 && Math.abs(nextVelocityY) < 0.02,
  };
}

export function chartSegments(data: DataPoint[], key: HiveSensorDataKey): ChartPoint[][] {
  const segments: ChartPoint[][] = [];
  let segment: ChartPoint[] = [];
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

function lowerBound(points: ChartPoint[], index: number) {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].index < index) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Clip cached segments, retaining boundary interpolation, gaps, and each pixel column's extrema. */
export function visibleChartSegments(
  segments: ChartPoint[][], start: number, end: number, pixelWidth: number,
): ChartPoint[][] {
  if (end < start || !segments.length) return [];
  const columns = Math.max(1, Math.ceil(pixelWidth));
  const span = Math.max(1, end - start);
  let low = 0;
  let high = segments.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const segment = segments[middle];
    if (segment[segment.length - 1].index < start) low = middle + 1;
    else high = middle;
  }
  const visible: ChartPoint[][] = [];
  for (let segmentIndex = low; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex];
    if (segment[0].index > end) break;
    const first = Math.max(0, lowerBound(segment, start) - 1);
    const last = Math.min(segment.length, lowerBound(segment, end) + 1);
    if (last - first <= columns * 2) {
      visible.push(segment.slice(first, last));
      continue;
    }
    const reduced: ChartPoint[] = [segment[first]];
    const append = (point: ChartPoint) => {
      if (reduced[reduced.length - 1].index !== point.index) reduced.push(point);
    };
    let cursor = first;
    while (cursor < last) {
      const column = Math.floor(((segment[cursor].index - start) / span) * columns);
      let minimum = segment[cursor];
      let maximum = minimum;
      cursor += 1;
      while (cursor < last && Math.floor(((segment[cursor].index - start) / span) * columns) === column) {
        const point = segment[cursor];
        if (point.value < minimum.value) minimum = point;
        if (point.value > maximum.value) maximum = point;
        cursor += 1;
      }
      if (minimum.index < maximum.index) {
        append(minimum);
        append(maximum);
      } else {
        append(maximum);
        append(minimum);
      }
    }
    append(segment[last - 1]);
    visible.push(reduced);
  }
  return visible;
}

export function formatSensorValue(value: number | null, key: HiveSensorDataKey) {
  if (value === null) return "—";
  return key.includes("Temperature") ? value.toFixed(1) : String(Math.round(value));
}

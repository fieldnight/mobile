import type { DataPoint, HiveSensorDataKey, Period } from "@/types";

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

/** 가로(시간) 축이 움직일 수 있는 범위. 인덱스 단위이며 데이터 바깥 여백을 포함할 수 있습니다. */
export interface ChartBounds {
  min: number;
  max: number;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const DAILY_HOURS = 24;
const MIN_MONTH_WEEKS = 5;

/**
 * 기간 축소 범위: 기록이 덜 찼어도 기간 전체 칸과 양쪽에 칸 수의 1/4만큼 여백까지 축소할 수 있습니다.
 * 일간 24칸은 양쪽 6시간, 주간 7칸은 2일, 월간 5칸은 1주입니다. 축 글자는 실제 칸에만 씁니다.
 */
export function periodBounds(slotCount: number): ChartBounds {
  const margin = Math.max(1, Math.round(slotCount / 4));
  return { min: -margin, max: slotCount - 1 + margin };
}

export const DAILY_BOUNDS: ChartBounds = periodBounds(DAILY_HOURS);

/** 기존처럼 첫 기록부터 마지막 기록까지만 움직이는 범위 */
export function dataBounds(count: number): ChartBounds {
  return { min: 0, max: Math.max(count - 1, 1) };
}

function toBounds(boundsOrCount: ChartBounds | number): ChartBounds {
  return typeof boundsOrCount === "number" ? dataBounds(boundsOrCount) : boundsOrCount;
}

export function emptyDataPoint(label: string): DataPoint {
  return {
    label,
    internalTemperature: null,
    externalTemperature: null,
    internalHumidity: null,
    externalHumidity: null,
    co2: null,
    peltierDutyPct: null,
    fanHotDutyPct: null,
    fanColdDutyPct: null,
    targetTemperature: null,
    peltierCoolCurrentA: null,
    peltierHeatCurrentA: null,
    peltierMode: null,
    fanState: null,
    internalSensorValid: null,
    externalSensorValid: null,
    hasData: false,
  };
}

function leadingNumber(label: string) {
  return Number(label.match(/\d+/)?.[0]);
}

/**
 * 기간 기록을 전체 칸으로 채웁니다(일간 0~23시, 주간 월~일, 월간 1주차~).
 * 인덱스가 곧 칸 위치가 되어 빠진 칸이 있어도 간격이 맞고, 아직 오지 않은 칸까지 축을 넓힐 수 있습니다.
 */
export function padPeriodSlots(data: DataPoint[], period: Period): DataPoint[] {
  const slotOf = (label: string) => {
    if (period === "일간") return leadingNumber(label);
    if (period === "주간") return WEEKDAYS.findIndex((day) => label.includes(day));
    return leadingNumber(label) - 1;
  };
  const weeks = Math.max(MIN_MONTH_WEEKS, ...data.map((point) => leadingNumber(point.label)).filter(Number.isInteger));
  const slotCount = period === "일간" ? DAILY_HOURS : period === "주간" ? WEEKDAYS.length : weeks;
  const labelOf = (slot: number) => (period === "일간" ? `${slot}시` : period === "주간" ? WEEKDAYS[slot] : `${slot + 1}주차`);

  const bySlot = new Map<number, DataPoint>();
  data.forEach((point) => {
    const slot = slotOf(point.label);
    if (Number.isInteger(slot) && slot >= 0 && slot < slotCount) bySlot.set(slot, point);
  });
  return Array.from({ length: slotCount }, (_, slot) => bySlot.get(slot) ?? emptyDataPoint(labelOf(slot)));
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

export function firstSensorIndex(data: DataPoint[], keys: HiveSensorDataKey[]) {
  return data.findIndex((point) => keys.some((key) => sensorValue(point, key) !== null));
}

/** cursor(소수 인덱스)에서 가장 가까운, 값이 있는 기록의 인덱스. 없으면 -1입니다. */
export function nearestSensorIndex(data: DataPoint[], keys: HiveSensorDataKey[], cursor: number) {
  const hasValue = (index: number) => keys.some((key) => sensorValue(data[index], key) !== null);
  const center = Math.max(0, Math.min(data.length - 1, Math.round(cursor)));
  for (let offset = 0; offset < data.length; offset += 1) {
    const before = center - offset;
    const after = center + offset;
    const beforeOk = before >= 0 && hasValue(before);
    const afterOk = after < data.length && hasValue(after);
    if (beforeOk && afterOk) return Math.abs(cursor - before) <= Math.abs(after - cursor) ? before : after;
    if (beforeOk) return before;
    if (afterOk) return after;
  }
  return -1;
}

/** cursor 위치의 값을 앞뒤 기록 사이에서 선형 보간합니다. 한쪽이 비어 있으면 null입니다. */
export function interpolatedSensorValue(data: DataPoint[], key: HiveSensorDataKey, cursor: number) {
  const low = Math.floor(cursor);
  const high = Math.ceil(cursor);
  const a = sensorValue(data[low], key);
  const b = sensorValue(data[high], key);
  if (a === null || b === null) return null;
  return low === high ? a : a + (b - a) * (cursor - low);
}

// 온도(°C)·습도(%) 센서는 항상 이 고정 범위로 표시합니다.
// 세로 드래그/핀치로도 벗어날 수 없도록 clamp/pan/pinch 전 단계에서 이 값으로 되돌립니다.
export const FIXED_DOMAIN_MIN = -20;
export const FIXED_DOMAIN_MAX = 100;

// 듀티(%) 센서는 항상 0~100 범위로 표시합니다.
const DUTY_PCT_KEYS: HiveSensorDataKey[] = ["peltierDutyPct", "fanHotDutyPct", "fanColdDutyPct"];

export function fixedDomainFor(keys: HiveSensorDataKey[]) {
  if (keys.some((key) => key.includes("Temperature") || key.includes("Humidity"))) {
    return { min: FIXED_DOMAIN_MIN, max: FIXED_DOMAIN_MAX };
  }
  if (keys.some((key) => DUTY_PCT_KEYS.includes(key))) {
    return { min: 0, max: 100 };
  }
  return null;
}

export function valueDomain(data: DataPoint[], keys: HiveSensorDataKey[], start = 0, end = data.length - 1) {
  const fixed = fixedDomainFor(keys);
  if (fixed) return fixed;
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

type FixedDomain = { min: number; max: number } | null;

export function clampViewport(viewport: ChartViewport, boundsOrCount: ChartBounds | number, fixedDomain: FixedDomain = null): ChartViewport {
  const bounds = toBounds(boundsOrCount);
  const totalSpan = Math.max(bounds.max - bounds.min, 1);
  const span = Math.min(totalSpan, Math.max(Math.min(1, totalSpan), viewport.span));
  return {
    ...viewport,
    start: Math.min(Math.max(bounds.min, viewport.start), bounds.max - span),
    span,
    ...(fixedDomain ?? { max: Math.max(viewport.min + 0.1, viewport.max) }),
  };
}

/**
 * 처음 보여줄 범위
 * - showAll: bounds 전체(기간 전체 칸과 양쪽 여백까지, 최대로 축소한 모습)
 * - bounds를 넘긴 기간 보기: 기록이 있는 마지막 칸까지만(최대 16칸)
 * - 그 외: 최근 16칸
 */
export function initialViewport(data: DataPoint[], keys: HiveSensorDataKey[], showAll = false, bounds?: ChartBounds): ChartViewport {
  const latest = Math.max(0, latestSensorIndex(data, keys));
  const range = bounds ?? dataBounds(data.length);
  const totalSpan = Math.max(1, range.max - range.min);
  let start: number;
  let span: number;
  if (showAll) {
    start = range.min;
    span = totalSpan;
  } else if (bounds) {
    span = Math.max(1, Math.min(16, latest));
    start = Math.max(range.min, latest - span);
  } else {
    span = Math.min(totalSpan, 16);
    start = Math.max(0, Math.min(totalSpan - span, latest - span * 0.8));
  }
  return { start, span, ...valueDomain(data, keys, start, start + span) };
}

/** Keep the pinch focal point fixed in both the time and value axes. */
export function zoomViewport(
  viewport: ChartViewport, factor: number, boundsOrCount: ChartBounds | number, anchorX = 0.5, anchorY = 0.5,
  fixedDomain: FixedDomain = null,
) {
  return pinchViewport(viewport, factor, boundsOrCount, anchorX, anchorY, anchorX, anchorY, fixedDomain);
}

/** Move the original focal time/value with the fingers as their centroid moves. */
export function pinchViewport(
  viewport: ChartViewport, factor: number, boundsOrCount: ChartBounds | number,
  fromX: number, fromY: number, toX: number, toY: number,
  fixedDomain: FixedDomain = null,
) {
  const bounds = toBounds(boundsOrCount);
  const safeFactor = Math.max(0.1, Math.min(10, factor));
  const span = Math.max(1, Math.min(Math.max(bounds.max - bounds.min, 1), viewport.span / safeFactor));
  if (fixedDomain) {
    return clampViewport({
      start: viewport.start + viewport.span * fromX - span * toX,
      span,
      min: fixedDomain.min,
      max: fixedDomain.max,
    }, bounds, fixedDomain);
  }
  const range = Math.max(0.1, Math.min(1e8, (viewport.max - viewport.min) / safeFactor));
  const value = viewport.max - fromY * (viewport.max - viewport.min);
  return clampViewport({
    start: viewport.start + viewport.span * fromX - span * toX,
    span,
    min: value - range * (1 - toY),
    max: value + range * toY,
  }, bounds);
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
  if (key.includes("Temperature") || key.includes("Current")) return value.toFixed(1);
  return String(Math.round(value));
}

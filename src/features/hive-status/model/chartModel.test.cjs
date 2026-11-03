const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

const filename = path.join(__dirname, "chartModel.ts");
const source = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const compiled = new Module(filename, module);
compiled._compile(source, filename);
const model = compiled.exports;
const key = "internalTemperature";
const point = (value, label = "00:00") => ({
  label, internalTemperature: value, externalTemperature: null,
  internalHumidity: null, externalHumidity: null, co2: null,
});

test("real zero is retained while missing and non-finite sensors are excluded", () => {
  const data = [point(0), point(18), point(null), point(NaN), point(Infinity)];
  assert.equal(model.sensorValue(data[0], key), 0);
  assert.equal(model.sensorValue(data[2], key), null);
  assert.deepEqual(model.sensorStats(data, key), { avg: 9, min: 0, max: 18 });
  assert.equal(model.sensorStats(data, "co2"), null);
});

test("initial scale includes 0, 18, negative and high measurements with padding", () => {
  const data = [-12, 0, 18, 49].map((value) => point(value));
  const viewport = model.initialViewport(data, [key]);
  assert.ok(viewport.min < -12);
  assert.ok(viewport.max > 49);
  assert.ok(Number.isFinite(viewport.min + viewport.max));
});

test("short weekly data fits its true range instead of reserving 24 time slots", () => {
  const data = Array.from({ length: 7 }, (_, index) => point(18 + index));
  assert.equal(model.initialViewport(data, [key]).span, 6);
});

test("opening the graph shows the last received sample and ignores future empty slots", () => {
  const data = Array.from({ length: 24 }, (_, index) => point(index <= 12 ? 18 : null, `${index}:00`));
  const latest = model.latestSensorIndex(data, [key]);
  const viewport = model.initialViewport(data, [key]);
  assert.equal(latest, 12);
  assert.ok(viewport.start <= latest && viewport.start + viewport.span >= latest);
  assert.ok(viewport.min < 18 && viewport.max > 18);
});

test("sensor-specific gaps break the line instead of implying continuous readings", () => {
  const data = [point(18), point(null), point(0), { ...point(20), hasData: false }, point(22)];
  assert.deepEqual(model.chartSegments(data, key), [
    [{ index: 0, value: 18 }], [{ index: 2, value: 0 }], [{ index: 4, value: 22 }],
  ]);
});

test("pinch zoom preserves its focal time and value away from boundaries", () => {
  const viewport = { start: 5, span: 8, min: 0, max: 40 };
  const next = model.zoomViewport(viewport, 2, 24, 0.25, 0.75);
  assert.equal(next.span, 4);
  assert.equal(next.start + next.span * 0.25, 7);
  assert.equal(next.max - (next.max - next.min) * 0.75, 10);
});

test("single measurement and repeated zoom keep finite usable axes", () => {
  let viewport = model.initialViewport([point(0)], [key]);
  for (let index = 0; index < 100; index += 1) viewport = model.zoomViewport(viewport, 1.4, 1);
  assert.equal(viewport.start, 0);
  assert.equal(viewport.span, 1);
  assert.ok(viewport.max > viewport.min);
  assert.ok(Number.isFinite(viewport.min + viewport.max));
});

test("large histories compute statistics without argument-count limits", () => {
  const data = Array.from({ length: 300000 }, (_, index) => point(index % 100));
  assert.deepEqual(model.sensorStats(data, key), { avg: 49.5, min: 0, max: 99 });
});

test("temperature and humidity domains are fixed to -20..100 regardless of the data range", () => {
  const data = [point(-1000), point(0), point(null), point(20), point(1000)];
  assert.deepEqual(model.valueDomain(data, [key], 1.2, 2.8), { min: -20, max: 100 });
  assert.deepEqual(model.valueDomain(data, ["internalHumidity"]), { min: -20, max: 100 });
  assert.deepEqual(model.valueDomain(data, ["co2"]), { min: 0, max: 1 });
});

test("fixedDomainFor identifies temperature/humidity keys and excludes others", () => {
  assert.deepEqual(model.fixedDomainFor([key]), { min: -20, max: 100 });
  assert.deepEqual(model.fixedDomainFor(["internalHumidity"]), { min: -20, max: 100 });
  assert.equal(model.fixedDomainFor(["co2"]), null);
});

test("duty-percent sensors (peltier/fan) are fixed to 0..100", () => {
  assert.deepEqual(model.fixedDomainFor(["peltierDutyPct"]), { min: 0, max: 100 });
  assert.deepEqual(model.fixedDomainFor(["fanHotDutyPct"]), { min: 0, max: 100 });
  assert.deepEqual(model.fixedDomainFor(["fanColdDutyPct"]), { min: 0, max: 100 });
  assert.equal(model.fixedDomainFor(["peltierCoolCurrentA"]), null);
});

test("formatSensorValue keeps one decimal for temperature/current, rounds the rest", () => {
  assert.equal(model.formatSensorValue(21.456, "internalTemperature"), "21.5");
  assert.equal(model.formatSensorValue(1.234, "peltierCoolCurrentA"), "1.2");
  assert.equal(model.formatSensorValue(63.7, "peltierDutyPct"), "64");
  assert.equal(model.formatSensorValue(null, "peltierDutyPct"), "—");
});

test("pinch zoom on a fixed-domain sensor never changes the value axis", () => {
  const fixed = { min: -20, max: 100 };
  const viewport = { start: 5, span: 8, min: -20, max: 100 };
  const zoomedIn = model.pinchViewport(viewport, 5, 24, 0.5, 0.9, 0.5, 0.1, fixed);
  assert.equal(zoomedIn.min, -20);
  assert.equal(zoomedIn.max, 100);
  const zoomedOut = model.pinchViewport(viewport, 0.2, 24, 0.5, 0.9, 0.5, 0.1, fixed);
  assert.equal(zoomedOut.min, -20);
  assert.equal(zoomedOut.max, 100);
});

test("clampViewport with a fixed domain always returns that exact range", () => {
  const fixed = { min: -20, max: 100 };
  const clamped = model.clampViewport({ start: 0, span: 5, min: 542, max: -210 }, 24, fixed);
  assert.equal(clamped.min, -20);
  assert.equal(clamped.max, 100);
});

const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("a moving pinch centroid carries the original focal time and value with it", () => {
  const viewport = { start: 5, span: 8, min: 0, max: 40 };
  const next = model.pinchViewport(viewport, 2, 24, 0.25, 0.75, 0.65, 0.35);
  closeTo(next.span, 4);
  closeTo(next.start + next.span * 0.65, 7);
  closeTo(next.max - (next.max - next.min) * 0.35, 10);
  assert.deepEqual(viewport, { start: 5, span: 8, min: 0, max: 40 });
});

test("visible segments retain edge neighbours without connecting missing samples", () => {
  const segments = model.chartSegments([0, 1, 2, null, 4, 5, 6].map((value) => point(value)), key);
  assert.deepEqual(model.visibleChartSegments(segments, 1.4, 4.8, 200), [
    [{ index: 1, value: 1 }, { index: 2, value: 2 }],
    [{ index: 4, value: 4 }, { index: 5, value: 5 }],
  ]);
  assert.deepEqual(model.visibleChartSegments(segments, 2.1, 3.9, 200), []);
  assert.deepEqual(model.visibleChartSegments(segments, 20, 30, 200), []);
});

test("pixel reduction retains narrow spikes, endpoints, order, and missing-value gaps", () => {
  const data = Array.from({ length: 10000 }, () => point(0));
  data[3471] = point(200);
  data[3472] = point(-120);
  data[6000] = point(null);
  data[6001] = point(null);
  const source = model.chartSegments(data, key);
  const reduced = model.visibleChartSegments(source, 0, 9999, 100);
  assert.equal(reduced.length, 2);
  assert.equal(reduced[0][0].index, 0);
  assert.equal(reduced[0].at(-1).index, 5999);
  assert.equal(reduced[1][0].index, 6002);
  assert.equal(reduced[1].at(-1).index, 9999);
  assert.ok(reduced[0].some((sample) => sample.index === 3471 && sample.value === 200));
  assert.ok(reduced[0].some((sample) => sample.index === 3472 && sample.value === -120));
  assert.ok(reduced.flat().length <= 208);
  for (const segment of reduced) {
    assert.ok(segment.every((sample, index) => index === 0 || segment[index - 1].index < sample.index));
  }
  assert.equal(source[0].length, 6000);
  assert.equal(source[1].length, 3998);
});

test("daily records are padded to 24 hourly slots so the index equals the hour", () => {
  const padded = model.padPeriodSlots([point(20, "3시"), point(22, "14:00")], "일간");
  assert.equal(padded.length, 24);
  assert.equal(padded[3].internalTemperature, 20);
  assert.equal(padded[14].internalTemperature, 22);
  assert.equal(padded[5].hasData, false);
  assert.equal(padded[23].label, "23시");
});

test("daily view starts at recorded hours but can zoom out to the whole day plus margins", () => {
  const padded = model.padPeriodSlots([point(20, "0시"), point(21, "6시"), point(22, "10시")], "일간");
  const initial = model.initialViewport(padded, [key], false, model.DAILY_BOUNDS);
  assert.equal(initial.start + initial.span, 10);
  let viewport = initial;
  for (let index = 0; index < 20; index += 1) viewport = model.zoomViewport(viewport, 1 / 1.4, model.DAILY_BOUNDS);
  assert.equal(viewport.start, model.DAILY_BOUNDS.min);
  assert.equal(viewport.start + viewport.span, model.DAILY_BOUNDS.max);
  const all = model.initialViewport(padded, [key], true, model.DAILY_BOUNDS);
  // "전체" 버튼은 최대로 축소한 모습(0~23시 + 양쪽 6시간 여백)입니다.
  assert.deepEqual([all.start, all.span], [-6, 35]);
});

test("the cursor snaps readings to the nearest recorded slot and interpolates the dot between slots", () => {
  const data = [point(20), point(null), point(24), point(26)];
  assert.equal(model.nearestSensorIndex(data, [key], 0.9), 0);
  assert.equal(model.nearestSensorIndex(data, [key], 1.6), 2);
  assert.equal(model.interpolatedSensorValue(data, key, 2.5), 25);
  assert.equal(model.interpolatedSensorValue(data, key, 0.5), null);
  assert.equal(model.firstSensorIndex([point(null), point(3)], [key]), 1);
});

test("weekly and monthly records are padded to full slots with quarter-size margins", () => {
  const weekly = model.padPeriodSlots([point(20, "수"), point(22, "월요일")], "주간");
  assert.deepEqual(weekly.map((p) => p.label), ["월요일", "화", "수", "목", "금", "토", "일"]);
  assert.equal(weekly[2].internalTemperature, 20);
  assert.deepEqual(model.periodBounds(weekly.length), { min: -2, max: 8 });

  const monthly = model.padPeriodSlots([point(20, "2주차")], "월간");
  assert.equal(monthly.length, 5);
  assert.equal(monthly[1].internalTemperature, 20);
  assert.equal(model.padPeriodSlots([point(20, "6주차")], "월간").length, 6);
  assert.deepEqual(model.periodBounds(monthly.length), { min: -1, max: 5 });
  assert.deepEqual(model.DAILY_BOUNDS, { min: -6, max: 29 });
});

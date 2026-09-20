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

test("vertical drag moves the value axis and horizontal drag stays in the data range", () => {
  const viewport = { start: 8, span: 8, min: 0, max: 40 };
  const down = model.panViewport(viewport, 0, 50, 200, 200, 24);
  assert.equal(down.min, 10);
  assert.equal(down.max, 50);
  assert.equal(model.panViewport(viewport, 9999, 0, 200, 200, 24).start, 0);
  assert.equal(model.panViewport(viewport, -9999, 0, 200, 200, 24).start, 15);
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

test("large histories compute statistics and domains without argument-count limits", () => {
  const data = Array.from({ length: 300000 }, (_, index) => point(index % 100));
  assert.deepEqual(model.sensorStats(data, key), { avg: 49.5, min: 0, max: 99 });
  const domain = model.valueDomain(data, [key]);
  assert.ok(domain.min < 0 && domain.max > 99);
});

test("the visible domain includes edge interpolation and excludes distant outliers", () => {
  const data = [point(-1000), point(0), point(null), point(20), point(1000)];
  const domain = model.valueDomain(data, [key], 1.2, 2.8);
  assert.ok(domain.min < 0 && domain.min > -100);
  assert.ok(domain.max > 20 && domain.max < 100);
  assert.deepEqual(model.valueDomain(data, ["co2"]), { min: 0, max: 1 });
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

test("two fingers moving together pan without changing the scale", () => {
  const viewport = { start: 5, span: 8, min: 0, max: 40 };
  const pinch = model.pinchViewport(viewport, 1, 24, 0.25, 0.4, 0.45, 0.7);
  const pan = model.panViewport(viewport, 40, 30, 200, 100, 24);
  for (const field of ["start", "span", "min", "max"]) closeTo(pinch[field], pan[field]);
});

test("momentum travels the same distance across different animation frame rates", () => {
  const viewport = { start: 100, span: 30, min: -10, max: 50 };
  const whole = model.momentumStep(viewport, 0.9, -0.4, 32, 360, 240, 500);
  const first = model.momentumStep(viewport, 0.9, -0.4, 16, 360, 240, 500);
  const second = model.momentumStep(first.viewport, first.velocityX, first.velocityY, 16, 360, 240, 500);
  for (const field of ["start", "span", "min", "max"]) closeTo(whole.viewport[field], second.viewport[field]);
  closeTo(whole.velocityX, second.velocityX);
  closeTo(whole.velocityY, second.velocityY);
});

test("momentum stops horizontal motion at either data boundary while vertical motion can continue", () => {
  const viewport = { start: 0.1, span: 8, min: 0, max: 40 };
  const left = model.momentumStep(viewport, 2, 0, 32, 200, 200, 24);
  assert.equal(left.viewport.start, 0);
  assert.equal(left.velocityX, 0);
  assert.equal(left.done, true);
  const right = model.momentumStep({ ...viewport, start: 14.9 }, -2, 0.5, 32, 200, 200, 24);
  assert.equal(right.viewport.start, 15);
  assert.equal(right.velocityX, 0);
  assert.ok(right.velocityY > 0);
  assert.equal(right.done, false);
});

test("momentum eventually settles and cannot scroll a fully visible time axis", () => {
  const viewport = { start: 0, span: 23, min: 0, max: 40 };
  const next = model.momentumStep(viewport, -1, 0, 16, 200, 200, 24);
  assert.equal(next.viewport.start, 0);
  assert.equal(next.done, true);
  const settled = model.momentumStep({ ...viewport, span: 8, start: 7 }, 0.5, 0.5, 5000, 200, 200, 24);
  assert.equal(settled.done, true);
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

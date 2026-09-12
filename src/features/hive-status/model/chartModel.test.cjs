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

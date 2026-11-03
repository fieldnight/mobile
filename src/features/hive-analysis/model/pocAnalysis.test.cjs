const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

const filename = path.join(__dirname, "pocAnalysis.ts");
const source = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const compiled = new Module(filename, module);
compiled._compile(source, filename);
const { analyzePoc } = compiled.exports;

const T0 = Date.UTC(2026, 9, 1, 3, 0, 0);
function sample(i, patch = {}) {
  return {
    t: T0 + i * 10_000,
    internalTemperature: 28, externalTemperature: 30, internalHumidity: 60, externalHumidity: 65,
    internalSensorValid: true, externalSensorValid: true, targetTemperature: 25,
    peltierMode: "COOL", peltierDutyPct: 100, fanHotDutyPct: 100, fanColdDutyPct: 100, fanState: "ACTIVE",
    peltierCoolCurrentA: 900, peltierHeatCurrentA: 20, issues: [], ...patch,
  };
}
const check = (analysis, stage, id) => analysis.stages.find((s) => s.id === stage).checks.find((c) => c.id === id);

test("cooling step toward target passes direction, duty, slope and settle checks", () => {
  // 0~29: 목표 27 유지(OFF), 30부터 목표 25로 낮춤 → COOL, 0.1°C/10초씩 하강
  const samples = [];
  for (let i = 0; i < 30; i += 1) samples.push(sample(i, { targetTemperature: 27, internalTemperature: 27.2, peltierMode: "OFF", peltierDutyPct: 0, fanState: "IDLE", fanHotDutyPct: 0, fanColdDutyPct: 0, peltierCoolCurrentA: 30 }));
  for (let i = 30; i < 60; i += 1) samples.push(sample(i, { internalTemperature: Math.max(25, 27.2 - (i - 29) * 0.1) }));
  for (let i = 60; i < 66; i += 1) samples.push(sample(i, { internalTemperature: 24.9, peltierMode: "OFF", peltierDutyPct: 0, fanState: "POSTRUN", peltierCoolCurrentA: 30 }));
  const a = analyzePoc(samples);
  assert.equal(a.targetChanges.length, 1);
  assert.equal(check(a, "actuation", "mode-direction").status, "pass");
  assert.equal(check(a, "actuation", "peltier-duty").status, "pass");
  assert.equal(check(a, "actuation", "is-cool").status, "pass");
  assert.equal(check(a, "actuation", "postrun").value, "60초");
  assert.equal(check(a, "thermal", "cool-slope").status, "pass");
  assert.ok(a.metrics.coolSlopeCPerMin < 0);
  assert.equal(check(a, "thermal", "settle").status, "pass");
  assert.equal(a.protocol.find((p) => p.id === "cool-step").done, true);
});

test("heating while internal is above target is flagged as wrong direction", () => {
  const samples = Array.from({ length: 30 }, (_, i) => sample(i, { peltierMode: "HEAT", internalTemperature: 28 + (i % 3) * 0.02 }));
  const a = analyzePoc(samples);
  assert.equal(check(a, "actuation", "mode-direction").status, "fail");
  assert.match(a.headline, /모드·출력 변화/);
});

test("peltier running during sensor failure fails the safe-stop check; brownout reset to default target is caught", () => {
  const samples = [
    ...Array.from({ length: 10 }, (_, i) => sample(i, { targetTemperature: 22 })),
    sample(10, { internalSensorValid: false, internalTemperature: null, targetTemperature: 22 }),
    sample(11, { issues: ["BROWNOUT_RESET"], targetTemperature: 25 }),
  ];
  const a = analyzePoc(samples);
  assert.equal(check(a, "actuation", "safe-stop").status, "fail");
  assert.equal(check(a, "command", "target-persist").status, "fail");
  assert.equal(check(a, "data", "hw-issue").status, "fail");
});

test("gaps lower the reception rate and IS voltage without change is flagged", () => {
  const samples = [sample(0), sample(1), sample(30), sample(31, { peltierMode: "OFF", peltierDutyPct: 0, peltierCoolCurrentA: 900, fanState: "POSTRUN" })];
  const a = analyzePoc(samples);
  assert.equal(check(a, "data", "received").status, "fail");
  assert.equal(check(a, "actuation", "is-cool").status, "fail");
});

test("empty input does not throw", () => {
  const a = analyzePoc([]);
  assert.equal(a.sampleCount, 0);
  assert.equal(a.headline, "분석할 기록이 없어요");
});

test("one-minute data without extended fields is flagged as old firmware or missing fields", () => {
  const samples = Array.from({ length: 30 }, (_, i) => ({ ...sample(i * 6), targetTemperature: null, peltierMode: null, fanState: null, peltierDutyPct: null, internalSensorValid: null }));
  const a = analyzePoc(samples);
  const c = check(a, "data", "firmware-fields");
  assert.equal(c.status, "fail");
  assert.match(c.value, /^60초 간격/);
  assert.match(a.headline, /데이터 수집/);
});

test("sharper checks: polarity flip, brownout right after start, condensation and extreme target raise questions", () => {
  const samples = [
    ...Array.from({ length: 6 }, (_, i) => sample(i, { peltierMode: "OFF", peltierDutyPct: 0, fanState: "IDLE", internalTemperature: 20 + i * 0.01, targetTemperature: 16 })),
    sample(6, { targetTemperature: 16, internalTemperature: 20.1, internalHumidity: 92 }),
    sample(7, { targetTemperature: 16, internalTemperature: 20.0, internalHumidity: 92, issues: ["BROWNOUT_RESET"] }),
    sample(8, { targetTemperature: 16, internalTemperature: 19.9, internalHumidity: 92, peltierMode: "HEAT" }),
  ];
  const a = analyzePoc(samples);
  assert.equal(check(a, "actuation", "polarity-flip").status, "fail");
  assert.equal(check(a, "actuation", "inrush").status, "fail");
  assert.equal(check(a, "thermal", "condensation").status, "fail");
  assert.equal(check(a, "thermal", "target-extreme").status, "warn");
  const ids = a.questions.map((q) => q.id);
  for (const id of ["extreme", "condensate", "psu", "dead-time", "hysteresis"]) assert.ok(ids.includes(id), id);
});

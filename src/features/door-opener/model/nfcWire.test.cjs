const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const filename = path.join(__dirname, "nfcWire.ts");
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { encodeNfcCard, NFC_WIRE_MAX_BYTES } = compiled.exports;
const days = { sun: false, mon: true, tue: false, wed: true, thu: false, fri: true, sat: false };
const count = (overrides = {}) => ({
  mode: "count_control", title: "3~12마리 구간 제어", repeat: true,
  countControl: { low: 3, high: 12, repeatDays: days, timeWindowStart: "00:00", timeWindowEnd: "24:00",
    within: { entranceOpen: true, exitOpen: true }, above: { entranceOpen: true, exitOpen: false }, ...overrides },
});

test("all fixed and time cards use a short versioned format without UI text", () => {
  const cases = [
    [{ mode: "open_now" }, "WB2|O"], [{ mode: "close_now" }, "WB2|F"],
    [{ mode: "count_status" }, "WB2|S"],
    [{ mode: "open_at", start: "09:00", repeat: false }, "WB2|A|540|0"],
    [{ mode: "close_at", end: "24:00", repeat: true }, "WB2|Z|1440|1"],
    [{ mode: "window", start: "23:00", end: "24:00", repeat: true }, "WB2|W|1380|1440|1"],
    [{ mode: "alternate_24h", start: "close_first", repeat: true }, "WB2|T|0|1"],
    [{ mode: "alternate_24h", start: "open_first" }, "WB2|T|1|0"],
    [{ mode: "lock_days", start: "3" }, "WB2|L|3"],
  ];
  for (const [card, expected] of cases) assert.equal(encodeNfcCard({ title: "한글|".repeat(40), ...card }), expected);
});

test("COUNT preserves both thresholds, days, full day and each gate state", () => {
  assert.equal(encodeNfcCard(count()), "WB2|C|3|12|42|0|1440|3|1");
  assert.equal(encodeNfcCard(count({ low: 0, high: 99 })), "WB2|C|0|99|42|0|1440|3|1");
  assert.equal(encodeNfcCard(count({ low: 99, high: 99 })), "WB2|C|99|99|42|0|1440|3|1");
  assert.equal(encodeNfcCard(count({ repeatDays: Object.fromEntries(Object.keys(days).map(d => [d, false])),
    timeWindowStart: "09:00", timeWindowEnd: "14:00" })), "WB2|C|3|12|0|540|840|3|1");
});

test("all weekday masks and gate combinations fit a single conservative frame", () => {
  for (let mask = 0; mask <= 127; mask++) for (let within = 0; within < 4; within++) for (let above = 0; above < 4; above++) {
    const state = bits => ({ entranceOpen: !!(bits & 1), exitOpen: !!(bits & 2) });
    const wire = encodeNfcCard(count({ low: 98, high: 99,
      repeatDays: Object.fromEntries(Object.keys(days).map((day, i) => [day, !!(mask & (1 << i))])),
      timeWindowStart: "23:00", timeWindowEnd: "24:00", within: state(within), above: state(above) }));
    assert.equal(wire, `WB2|C|98|99|${mask}|1380|1440|${within}|${above}`);
    assert.ok(Buffer.byteLength(wire, "utf8") <= NFC_WIRE_MAX_BYTES);
  }
});

test("incomplete or invalid cards fail rather than silently executing another mode", () => {
  for (const override of [{ low: -1 }, { high: 100 }, { low: 13 }, { low: 1.5 }, { high: NaN },
    { timeWindowStart: "24:00" }, { timeWindowEnd: "24:30" }, { timeWindowEnd: "00:00" },
    { timeWindowEnd: "09:15" }, { within: { entranceOpen: "true", exitOpen: true } }, { repeatDays: {} }]) {
    assert.throws(() => encodeNfcCard(count(override)));
  }
  assert.throws(() => encodeNfcCard({ mode: "count_control" }));
  assert.throws(() => encodeNfcCard({ mode: "open_at", start: "24:00" }));
  assert.throws(() => encodeNfcCard({ mode: "window", start: "09:00", end: "bad" }));
});

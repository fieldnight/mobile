const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function fixture() {
  const requests = [];
  class Xhr {
    static HEADERS_RECEIVED = 2; static LOADING = 3; static DONE = 4;
    status = 200; readyState = 3; responseText = '';
    constructor() { requests.push(this); }
    open() {} setRequestHeader() {} send() {} abort() {}
    chunk(text) { this.responseText += text; this.onreadystatechange(); }
  }
  const context = { exports: {}, XMLHttpRequest: Xhr, setTimeout, clearTimeout,
    console: { log() {}, error() {} },
    require: () => ({ default: { expoConfig: { extra: { apiUrl: 'https://example.test' } } } }),
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, 'sseClient.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return { ...context.exports, requests };
}
const payload = {
  hiveId: 7, recordedAt: '2026-09-22T12:00:00', internalTemperature: 25,
  internalHumidity: 60, externalTemperature: null, externalHumidity: null, co2: null,
  peltierMode: 'COOL', peltierDutyPct: 0, fanHotDutyPct: 50, fanColdDutyPct: 25,
  fanState: 'ON', targetTemperature: 24, internalSensorValid: true, externalSensorValid: false,
  peltierCoolCurrentA: 0, peltierHeatCurrentA: null,
  hwIssue: 'SENSOR_READ_FAIL', hwIssueTimestamp: 'UNSYNCED_BOOT',
};
test('nullable sensors do not discard hardware state; null and zero remain distinct', () => {
  const event = fixture().parseTelemetry(JSON.stringify(payload));
  for (const [key, value] of Object.entries(payload)) assert.equal(event[key], value);
});
test('invalid sensor flags mask numeric readings without rejecting the event', () => {
  const event = fixture().parseTelemetry(JSON.stringify({ ...payload, internalSensorValid: false }));
  assert.equal(event.internalTemperature, null); assert.equal(event.internalHumidity, null);
  assert.equal(event.peltierDutyPct, 0);
});
test('legacy events still work; malformed identity, readings and flags are rejected', () => {
  const { parseTelemetry } = fixture();
  assert.equal(parseTelemetry(JSON.stringify({ hiveId: 1, recordedAt: payload.recordedAt })).co2, null);
  for (const bad of [null, { ...payload, hiveId: '7' }, { ...payload, peltierDutyPct: '0' },
    { ...payload, internalSensorValid: 'false' }, { ...payload, recordedAt: 'invalid' }]) {
    assert.throws(() => parseTelemetry(JSON.stringify(bad)));
  }
});
test('chunked SSE waits for blank line and shares one connection between subscribers', () => {
  const f = fixture(); const events = [], errors = [];
  const stop = f.subscribeHiveEvents({ accessToken: 'test', onTelemetry: e => events.push(e), onError: e => errors.push(e) });
  const stop2 = f.subscribeHiveEvents({ accessToken: 'test' });
  assert.equal(f.requests.length, 1);
  const xhr = f.requests[0];
  xhr.chunk('event: HIVE_TELEMETRY\r');
  xhr.chunk('\ndata: ' + JSON.stringify(payload) + '\r\n');
  assert.equal(events.length, 0);
  xhr.chunk('\r\n');
  assert.equal(events.length, 1); assert.equal(events[0].hwIssue, 'SENSOR_READ_FAIL');
  assert.equal(errors.length, 0); stop2(); stop();
});

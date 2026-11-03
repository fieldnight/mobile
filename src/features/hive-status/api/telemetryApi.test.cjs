const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const requests = [];
const api = { get: async (url, options) => {
  requests.push({ url, ...options });
  return { data: { data: { period: options.params.period, data: [] } } };
} };
const source = ts.transpileModule(readFileSync(path.join(__dirname, 'telemetryApi.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {}, console: { log() {} }, require(name) {
  if (name === '@/lib/api') return { api };
  throw new Error(`Unexpected dependency ${name}`);
} };
vm.runInNewContext(source, context);
const merge = (response, period = '일간', fallback = []) => JSON.parse(JSON.stringify(context.exports.mergeTelemetryData(fallback, response, period)));
const response = (values) => ({
  data: values.map(([label, internalTemperature, extra]) => ({ label, internalTemperature, ...extra })),
});

test('issues survive null measurements', () => {
  const issue = { code: 'SENSOR_READ_FAIL', timestamp: 'UNSYNCED_BOOT' };
  const data = merge({ data: [{ label: '00:00', internalTemperature: null, internalHumidity: null, issues: [issue] }] });
  assert.deepEqual(data[0].issues, [issue]); assert.equal(data[0].hasData, false);
});

test('midnight zero is retained; absent sensors stay null', () => {
  const data = merge(response([['00:00', 0]]));
  assert.equal(data.length, 1);
  assert.equal(data[0].internalTemperature, 0);
  assert.equal(data[0].externalTemperature, null);
  assert.equal(data[0].co2, null);
  assert.equal(data[0].hasData, true);
});
test('null and non-finite measurements do not become zero', () => {
  const data = merge({ data: [{ label: '00:00', internalTemperature: null, co2: NaN }] });
  assert.equal(data[0].internalTemperature, null);
  assert.equal(data[0].co2, null);
  assert.equal(data[0].hasData, false);
});
test('fallback sensor values never masquerade as received measurements', () => {
  const data = merge(undefined, '일간', [{ label: '00:00', internalTemperature: 25, co2: 400 }]);
  assert.equal(data[0].internalTemperature, null);
  assert.equal(data[0].co2, null);
  assert.equal(data[0].hasData, false);
});
test('weekly values sort in calendar order and retain negative values', () => {
  const data = merge(response([['일', 18], ['월', -2], ['수', 0]]), '주간');
  assert.deepEqual(data.map((point) => point.label), ['월', '수', '일']);
  assert.deepEqual(data.map((point) => point.internalTemperature), [-2, 0, 18]);
});
test('empty server data is empty, without synthetic sensor records', () => {
  assert.deepEqual(merge(undefined), []);
});
test('server label formats normalize to "H시" for daily view', () => {
  const data = merge(response([['0시', 26, { internalHumidity: 55 }]]), '일간');
  assert.equal(data.length, 1);
  assert.equal(data[0].label, '0시');
  assert.equal(data[0].internalTemperature, 26);
  assert.equal(data[0].internalHumidity, 55);
});
test('hardware fields (peltier/fan/target/current) merge through, numeric averaged and status as last value', () => {
  const data = merge({
    data: [{
      label: '00:00',
      internalTemperature: 25,
      peltierDutyPct: 40, fanHotDutyPct: 55, fanColdDutyPct: 30,
      targetTemperature: 34.5, peltierCoolCurrentA: 1.2, peltierHeatCurrentA: 0,
      peltierMode: 'COOL', fanState: 'ON',
      internalSensorValid: true, externalSensorValid: false,
    }],
  });
  assert.equal(data[0].peltierDutyPct, 40);
  assert.equal(data[0].fanHotDutyPct, 55);
  assert.equal(data[0].fanColdDutyPct, 30);
  assert.equal(data[0].targetTemperature, 34.5);
  assert.equal(data[0].peltierCoolCurrentA, 1.2);
  assert.equal(data[0].peltierHeatCurrentA, 0);
  assert.equal(data[0].peltierMode, 'COOL');
  assert.equal(data[0].fanState, 'ON');
  assert.equal(data[0].internalSensorValid, true);
  assert.equal(data[0].externalSensorValid, false);
});
test('hardware status fields default to null when a slot has no data', () => {
  const data = merge(undefined, '일간', [{ label: '00:00', internalTemperature: 25 }]);
  assert.equal(data[0].peltierMode, null);
  assert.equal(data[0].fanState, null);
  assert.equal(data[0].internalSensorValid, null);
  assert.equal(data[0].peltierDutyPct, null);
});

test('hourly history preserves hardware fields, false, zero, precision and issues', () => {
  const issue = { code: 'SENSOR_READ_FAIL', timestamp: 'UNSYNCED_BOOT' };
  const source = { label: '23:55', internalTemperature: 24.123, externalTemperature: 0,
    internalHumidity: 51, externalHumidity: 62, co2: null, peltierMode: 'COOL',
    peltierDutyPct: 40, fanHotDutyPct: 100, fanColdDutyPct: 35, fanState: 'ACTIVE',
    targetTemperature: 25, internalSensorValid: false, externalSensorValid: true,
    peltierCoolCurrentA: null, peltierHeatCurrentA: 0, issues: [issue, issue] };
  const [point] = JSON.parse(JSON.stringify(context.exports.mapHourlyTelemetry({ period: 'HOUR', data: [source] })));
  assert.deepEqual(point, { ...source, issues: [issue], hasData: true });
});

test('hourly missing and non-finite readings stay null without losing status-only records', () => {
  const [point] = context.exports.mapHourlyTelemetry({ data: [{ label: '12:30', peltierMode: 'OFF',
    internalSensorValid: false, peltierCoolCurrentA: NaN, peltierHeatCurrentA: Infinity }] });
  assert.equal(point.label, '12:30');
  assert.equal(point.peltierMode, 'OFF');
  assert.equal(point.internalSensorValid, false);
  assert.equal(point.peltierCoolCurrentA, null);
  assert.equal(point.peltierHeatCurrentA, null);
  assert.equal(point.internalTemperature, null);
  assert.equal(point.hasData, false);
});

test('PR199/200 requests keep the existing endpoint and support TEN_SEC without sensorType', async () => {
  requests.length = 0;
  await context.exports.getHiveTelemetry({ hiveId: 228, period: '일간' });
  await context.exports.getHiveTelemetryHour({ hiveId: 228, from: new Date(2026, 8, 22, 14), interval: 'TEN_SEC' });
  assert.deepEqual(JSON.parse(JSON.stringify(requests)), [
    { url: '/api/v1/hives/228/telemetry', params: { period: 'DAY' } },
    { url: '/api/v1/hives/228/telemetry', params: { period: 'HOUR', from: '2026-09-22T14:00:00', interval: 'TEN_SEC' } },
  ]);
});

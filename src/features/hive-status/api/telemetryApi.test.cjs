const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(readFileSync(path.join(__dirname, 'telemetryApi.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {}, console: { log() {} }, require(name) {
  if (name === '@/lib/api') return { api: new Proxy({}, { get() { throw new Error('Network disabled in test'); } }) };
  throw new Error(`Unexpected dependency ${name}`);
} };
vm.runInNewContext(source, context);
const merge = (responses, period = '일간', fallback = []) => JSON.parse(JSON.stringify(context.exports.mergeTelemetryData(fallback, responses, period)));
const response = (values) => ({ data: values.map(([label, value]) => ({ label, value })) });

test('midnight zero is retained; absent sensors stay null', () => {
  const data = merge({ INTERNAL_TEMPERATURE: response([['00:00', 0]]) });
  assert.equal(data.length, 1);
  assert.equal(data[0].internalTemperature, 0);
  assert.equal(data[0].externalTemperature, null);
  assert.equal(data[0].co2, null);
  assert.equal(data[0].hasData, true);
});
test('null and non-finite measurements do not become zero', () => {
  const data = merge({ INTERNAL_TEMPERATURE: response([['00:00', null]]), CO2: response([['00:00', NaN]]) });
  assert.equal(data[0].internalTemperature, null);
  assert.equal(data[0].co2, null);
  assert.equal(data[0].hasData, false);
});
test('fallback sensor values never masquerade as received measurements', () => {
  const data = merge({}, '일간', [{ label: '00:00', internalTemperature: 25, co2: 400 }]);
  assert.equal(data[0].internalTemperature, null);
  assert.equal(data[0].co2, null);
  assert.equal(data[0].hasData, false);
});
test('weekly values sort in calendar order and retain negative values', () => {
  const data = merge({ INTERNAL_TEMPERATURE: response([['일', 18], ['월', -2], ['수', 0]]) }, '주간');
  assert.deepEqual(data.map((point) => point.label), ['월', '수', '일']);
  assert.deepEqual(data.map((point) => point.internalTemperature), [-2, 0, 18]);
});
test('empty server data is empty, without synthetic sensor records', () => {
  assert.deepEqual(merge({}), []);
});
test('mixed hour label formats across sensors merge into one point instead of splitting the line', () => {
  const data = merge({
    INTERNAL_TEMPERATURE: response([['00:00', 26]]),
    INTERNAL_HUMIDITY: response([['0시', 55]]),
  }, '일간');
  assert.equal(data.length, 1);
  assert.equal(data[0].internalTemperature, 26);
  assert.equal(data[0].internalHumidity, 55);
});

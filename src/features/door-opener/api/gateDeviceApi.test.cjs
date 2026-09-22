const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(api) {
  const context = { exports: {}, console: { log() {}, error() {} }, require: () => ({ api }) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, 'gateDeviceApi.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports;
}
test('gate CRUD uses numeric database IDs and handles empty 204 responses', async () => {
  const calls = [];
  const gate = { gateId: 42, macAddress: 'AA:BB:CC:DD:EE:FF', name: 'gate', isConnected: false,
    region: null, location: null, memo: null, createdAt: '2026-09-21T10:00:00', lastConnectedAt: null };
  const api = load({
    get: async url => { calls.push(['GET', url]); return { data: { data: url.endsWith('/42') ? gate : { totalCount: 1, gates: [gate] } } }; },
    post: async (url, body) => { calls.push(['POST', url, body]); return { data: { data: { gateId: 42 } } }; },
    put: async (url, body) => { calls.push(['PUT', url, body]); return { status: 204, data: '' }; },
    delete: async url => { calls.push(['DELETE', url]); return { status: 204, data: '' }; },
  });
  assert.equal((await api.registerGateDevice({ name: gate.name, macAddress: gate.macAddress })).gateId, 42);
  assert.equal((await api.getGateDeviceList()).gates[0].isConnected, false);
  assert.equal((await api.getGateDeviceDetail(42)).lastConnectedAt, null);
  await api.updateGateDevice(42, { name: 'renamed', memo: '' });
  await api.deleteGateDevice(42);
  assert.deepEqual(calls.map(call => call.slice(0, 2)), [
    ['POST', '/api/v1/gates'], ['GET', '/api/v1/gates'], ['GET', '/api/v1/gates/42'],
    ['PUT', '/api/v1/gates/42'], ['DELETE', '/api/v1/gates/42'],
  ]);
});
test('server mutation failures propagate, rather than reporting local success', async () => {
  const error = { response: { status: 404, data: { code: 'GATE_NOT_FOUND' } } };
  const fail = async () => { throw error; };
  const api = load({ put: fail, delete: fail });
  await assert.rejects(api.updateGateDevice(42, { name: 'renamed' }), e => e === error);
  await assert.rejects(api.deleteGateDevice(42), e => e === error);
});

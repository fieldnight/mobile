const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, 'deviceCardState.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject });
const { normalizeGateMac, gateDisplayName, mergeDeviceCardState: merge, runtimeFromServerCommand } = exportsObject;
const a = 'AA:BB:CC:DD:EE:01', b = 'AA:BB:CC:DD:EE:02';
const record = (deviceId, title, source, confirmedAt) => ({ deviceId, source, confirmedAt,
  runtime: { cardId: title, title, mode: title === 'OFF' ? 'close_now' : 'open_now', status: 'ok', activatedAt: confirmedAt } });

test('registered names match normalized MACs and unknown devices retain their identifier', () => {
  assert.equal(normalizeGateMac(' aa-bb-cc-dd-ee-01 '), a);
  assert.equal(gateDisplayName('aabbccddee01', [{ macAddress: a, name: '딸기 1번' }]), '딸기 1번');
  assert.equal(gateDisplayName(b, [{ macAddress: a, name: '딸기 1번' }]), b);
  assert.equal(normalizeGateMac('unknown'), undefined);
});

test('NFC and online state stay isolated per device and survive a serialized restore', () => {
  let records = merge({}, record(a, 'ON', 'offline', 100));
  assert.equal(records[b], undefined);
  records = merge(records, record(b, 'OFF', 'online', 200));
  records = JSON.parse(JSON.stringify(records));
  assert.equal(records[a].runtime.title, 'ON');
  assert.equal(records[b].runtime.title, 'OFF');
  assert.equal(records[b].source, 'online');
  records = merge(records, record(a.toLowerCase(), 'OFF', 'online', 300));
  assert.equal(Object.keys(records).length, 2);
  assert.equal(records[a].runtime.title, 'OFF');
});

test('old server/cache/migration records cannot replace a newer NFC confirmation', () => {
  const records = merge({}, record(a, 'OFF', 'offline', 300));
  assert.equal(merge(records, record(a, 'ON', 'online', 200)), records);
  assert.equal(merge(records, record(a, 'ON', 'online', 0)), records);
  assert.equal(records[a].source, 'offline');
});

test('failed commands, statistics reads and unidentified devices never replace an applied card', () => {
  const records = merge({}, record(a, 'ON', 'online', 100));
  for (const change of [{ status: 'error' }, { mode: 'count_status' }]) {
    const next = record(a, 'OFF', 'offline', 200);
    Object.assign(next.runtime, change);
    assert.equal(merge(records, next), records);
  }
  assert.equal(merge(records, record('unknown', 'OFF', 'offline', 200)), records);
});

test('confirmed cancellation is distinct from unknown state and affects only its device', () => {
  let records = merge(merge({}, record(a, 'ON', 'offline', 100)), record(b, 'OFF', 'online', 100));
  records = merge(records, { deviceId: a, runtime: null, source: 'online', confirmedAt: 200 });
  assert.equal(records[a].runtime, null);
  assert.equal(records[b].runtime.title, 'OFF');
});

test('server settings retain their original applied timestamp and time window', () => {
  const runtime = runtimeFromServerCommand({ commandId: 'cmd-1', cardType: 'WINDOW', title: '개화',
    appliedAt: '2026-10-28T09:00:00+09:00', payload: { start: '08:00', end: '18:00', repeat: true } }, a);
  assert.equal(runtime.mode, 'window');
  assert.equal(runtime.start, '08:00');
  assert.equal(runtime.end, '18:00');
  assert.equal(runtime.activatedAt, Date.parse('2026-10-28T09:00:00+09:00'));
  assert.equal(runtimeFromServerCommand({ cardType: 'NEW_UNKNOWN', appliedAt: 'bad' }, a), null);
});

test('previous online assignments restore on home/report entry without replacing newer NFC state', async () => {
  let records = merge({}, record(a, 'OFF', 'offline', 300));
  const runtimeExports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, 'doorOpenerRuntime.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: runtimeExports, require: () => ({ default: {} }), console });
  const migrationExports = {};
  const deps = {
    '@/stores/useDoorDeviceState': { useDoorDeviceState: { getState: () => ({ records, confirm: next => { records = merge(records, next); } }) } },
    './gateCardAssignments': { loadGateCardAssignments: async () => ({ on: ['1', '2'], stats: ['3'] }) },
    './gateActionSync': { loadStoredNfcDoorCards: async () => [
      { id: 'on', title: 'ON', mode: 'open_now' }, { id: 'stats', title: '통계', mode: 'count_status' },
    ] },
    './doorOpenerRuntime': runtimeExports,
    './deviceCardState': exportsObject,
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, 'migrateDeviceCards.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: migrationExports, require: id => deps[id], console });
  await migrationExports.migrateDeviceCards([{ id: '1', macAddress: a }, { id: '2', macAddress: b }, { id: '3', macAddress: 'AA:BB:CC:DD:EE:03' }]);
  assert.equal(records[a].runtime.title, 'OFF');
  assert.equal(records[a].source, 'offline');
  assert.equal(records[b].runtime.title, 'ON');
  assert.equal(records[b].source, 'online');
  assert.equal(records[b].confirmedAt, 0);
  assert.equal(Object.keys(records).length, 2);
});

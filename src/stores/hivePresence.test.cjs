const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

// 실제 store 함수에 시계와 저장소만 대체 주입해 네트워크 없이 상태 전이를 검증합니다.
function fixture() {
  let now = 1_800_000_000_000, state, options;
  class Clock extends Date { static now() { return now; } }
  const compile = (file, require) => {
    const context = { exports: {}, require, Date: Clock };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText, context);
    return context.exports;
  };
  const model = compile('hivePresence.ts', () => { throw Error('Unexpected import'); });
  compile('useHiveStore.ts', (name) => {
    if (name === './hivePresence') return model;
    if (name === '@/types') return { initialControls: [] };
    if (name.includes('async-storage')) return { default: {} };
    if (name === 'zustand/middleware') return {
      persist: (creator, config) => { options = config; return creator; }, createJSONStorage: () => ({}),
    };
    if (name === 'zustand') return { create: () => creator => {
      state = creator(update => { const next = typeof update === 'function' ? update(state) : update;
        if (next !== state) state = { ...state, ...next };
      }); return {};
    } };
    throw Error(name);
  });
  state.setHives([{ id: 'a', status: 'offline', temperature: 0, humidity: 0 }]);
  return {
    get state() { return state; }, get hive() { return state.hives[0]; }, get now() { return now; },
    tick: (ms) => { now += ms; }, options,
    telemetry: (at = now, temperature = 18) => state.updateHiveTelemetry('a', {
      internalTemperature: temperature, internalHumidity: 62, externalTemperature: 15,
      externalHumidity: 55, recordedAt: new Date(at).toISOString(),
    }),
    connection: (connected, checkedAt = now) => state.updateConnections([{ id: 'a', connected, checkedAt }]),
  };
}
test('server offline overrides online, keeping measurements labeled as historical', () => {
  const f = fixture(); f.telemetry(); f.tick(1000); f.connection(false);
  assert.equal(f.hive.status, 'offline'); assert.equal(f.hive.temperature, 18);
  assert.match(f.hive.lastUpdate, /마지막 측정값/);
});
test('REST detail offline wins, while a list without status does not erase a fresh connection', () => {
  const f = fixture(); f.telemetry();
  f.state.setHives([{ id: 'a', status: 'offline', name: 'updated' }]);
  assert.equal(f.hive.status, 'online');
  f.tick(1000); f.state.setHives([{ id: 'a', status: 'offline', connectionCheckedAt: f.now }]);
  assert.equal(f.hive.status, 'offline'); assert.equal(f.hive.temperature, 18);
});
test('three minutes without connection evidence expires only the stale hive', () => {
  const f = fixture(); f.telemetry();
  f.state.setHives([f.hive, { id: 'b', status: 'offline', temperature: 0, humidity: 0 }]);
  f.tick(180000);
  f.state.updateHiveTelemetry('b', { internalTemperature: 20, internalHumidity: 60,
    externalTemperature: 15, externalHumidity: 50, recordedAt: new Date(f.now).toISOString() });
  f.state.updateConnections([{ id: 'b', connected: true, checkedAt: f.now }]);
  f.state.refreshPresence();
  assert.equal(f.hive.status, 'offline'); assert.match(f.hive.lastUpdate, /3분 전/);
  assert.equal(f.state.hives[1].status, 'online');
});
test('cached online result cannot undo a later offline result', () => {
  const f = fixture(); f.telemetry(); f.tick(1000); const old = f.now; f.connection(true);
  f.tick(1000); f.connection(false); const state = f.state; f.connection(true, old);
  assert.equal(f.hive.status, 'offline'); assert.equal(f.state, state);
});
test('late telemetry predating offline cannot reconnect; fresh zero can', () => {
  const f = fixture(); const old = f.now; f.telemetry(); f.tick(60000); f.connection(false);
  f.telemetry(old + 1000); assert.equal(f.hive.status, 'offline');
  f.tick(1000); f.telemetry(f.now, 0); assert.equal(f.hive.status, 'online'); assert.equal(f.hive.temperature, 0);
});
test('online connection checks cannot keep stale telemetry online', () => {
  const f = fixture(); f.telemetry(); f.tick(240000); f.connection(true);
  assert.equal(f.hive.status, 'offline'); assert.match(f.hive.lastUpdate, /마지막 측정값 · 4분 전/);
});
test('REST online without any telemetry remains offline', () => {
  const f = fixture(); f.connection(true);
  assert.equal(f.hive.status, 'offline');
  assert.equal(f.hive.lastUpdate, '측정값 수신 대기');
});
test('fresh telemetry arriving after a REST online check restores online', () => {
  const f = fixture(); const measured = f.now; f.tick(2000); f.connection(true);
  f.telemetry(measured);
  assert.equal(f.hive.status, 'online');
});
test('one-minute REST polling cannot extend the three-minute sensor timeout', () => {
  const f = fixture(); f.telemetry();
  for (let minute = 1; minute <= 4; minute++) {
    f.tick(60000); f.connection(true); f.state.refreshPresence();
    assert.equal(f.hive.status, minute < 3 ? 'online' : 'offline');
  }
});
test('rehydration never restores persisted online status', () => {
  const f = fixture(); f.telemetry();
  const restored = f.options.merge({ hives: [f.hive] }, f.state);
  assert.equal(restored.hives[0].status, 'offline'); assert.equal(restored.hives[0].temperature, 18);
});

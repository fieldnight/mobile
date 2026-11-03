const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function loadTs(name) {
  const filename = path.join(__dirname, name + '.ts');
  const compiled = new Module(filename, module);
  compiled.require = id => id === 'react-native'
    ? { NativeModules: {}, Platform: { OS: 'android' } }
    : id.startsWith('./') ? loadTs(id.slice(2)) : require(id);
  compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return compiled.exports;
}
const { parseHceResult, parseHceStats } = loadTs('webeeHce');
const { mergeDoorCounters, mergeDoorBucket } = loadTs('doorStatsMerge');

test('hourly history merges a reboot within the same interval without duplicate additions', () => {
  const bucket = count => ({ start: '202610282200', end: '202610282300', closed: false,
    counts: { entranceIn: count, entranceOut: 0, exitIn: 0, exitOut: 0 } });
  let saved = mergeDoorBucket(undefined, bucket(7), '00000001');
  saved = mergeDoorBucket(saved, bucket(3), '00000002');
  assert.equal(saved.counts.entranceIn, 10);
  saved = mergeDoorBucket(saved, bucket(3), '00000002');
  assert.equal(saved.counts.entranceIn, 10);
});

test('NFC totals survive repeated taps, cache restore and a firmware reboot: 7 + 3 = 10', () => {
  const event = (count, session) => parseHceStats(`ST|BOOT|D=AA:BB:CC:DD:EE:FF|${count},0,0,0|S=${session}`);
  let state = mergeDoorCounters({}, event(7, '00000001'));
  assert.equal(state.bootCounts.entranceIn, 7);
  state = mergeDoorCounters(state, event(7, '00000001'));
  assert.equal(state.bootCounts.entranceIn, 7);
  state = mergeDoorCounters(state, event(3, '00000001')); // stale snapshot in the same session
  state = mergeDoorCounters(state, event(7, '00000001'));
  assert.equal(state.bootCounts.entranceIn, 7);
  state = JSON.parse(JSON.stringify(state));
  state = mergeDoorCounters(state, event(3, '00000002'));
  assert.equal(state.bootCounts.entranceIn, 10);
  state = mergeDoorCounters(state, event(3, '00000002'));
  assert.equal(state.bootCounts.entranceIn, 10);
  state = mergeDoorCounters(state, event(12, '00000003'));
  assert.equal(state.bootCounts.entranceIn, 22); // reset detected even when new count exceeds old
});

test('legacy NFC counters migrate without adding cumulative snapshots twice', () => {
  const legacy = count => parseHceStats(`ST|BOOT|D=AA:BB:CC:DD:EE:FF|${count},0,0,0`);
  let state = mergeDoorCounters({ bootCounts: legacy(7).counts }, legacy(10));
  assert.equal(state.bootCounts.entranceIn, 10);
  state = mergeDoorCounters(state, legacy(3));
  assert.equal(state.bootCounts.entranceIn, 13);
});

test('all four counters accumulate arbitrary counts across 200 sessions and duplicate snapshots', () => {
  const keys = ['entranceIn', 'entranceOut', 'exitIn', 'exitOut'];
  const expected = Object.fromEntries(keys.map(key => [key, 0]));
  let state = {}, seed = 123456;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (let session = 1; session <= 200; session++) {
    const counts = Object.fromEntries(keys.map(key => [key, 0]));
    for (let tap = 0; tap < 12; tap++) {
      for (const key of keys) {
        const added = random() % 1000;
        counts[key] += added;
        expected[key] += added;
      }
      const event = { type: 'boot', raw: '', counts: { ...counts }, sessionId: session.toString(16).toUpperCase().padStart(8, '0') };
      state = mergeDoorCounters(state, event);
      assert.deepEqual(state.bootCounts, expected);
      state = mergeDoorCounters(state, event);
      assert.deepEqual(state.bootCounts, expected);
      state = JSON.parse(JSON.stringify(state));
    }
  }
});
test('applied result preserves command and device identity', () => {
  const result = parseHceResult('OK|open_now|applied|D=AA:BB:CC:DD:EE:FF');
  assert.equal(result.status, 'ok');
  assert.equal(result.command, 'open_now');
  assert.equal(result.deviceId, 'AA:BB:CC:DD:EE:FF');
});
test('applied result preserves passage counts', () => {
  assert.deepEqual(parseHceResult('OK|count_status|applied|C=1,2,3,4').counts,
    { entranceIn: 1, entranceOut: 2, exitIn: 3, exitOut: 4 });
  assert.equal(parseHceResult('ERR|open_now|bad_payload').status, 'error');
});

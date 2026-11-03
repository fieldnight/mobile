const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function load(name) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,name+'.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{exports, require:()=>({})});
 return exports;
}
const m = load('wifiBandDetection');

test('detects common 5GHz naming patterns', () => {
  assert.equal(m.looksLikeFiveGhzSsid('농장_5G'), true);
  assert.equal(m.looksLikeFiveGhzSsid('Farm-5GHz'), true);
  assert.equal(m.looksLikeFiveGhzSsid('MyWifi 5G'), true);
  assert.equal(m.looksLikeFiveGhzSsid('office_5ghz_ext'), true);
});

test('does not flag 2.4GHz or unrelated names', () => {
  assert.equal(m.looksLikeFiveGhzSsid('농장_2.4G'), false);
  assert.equal(m.looksLikeFiveGhzSsid('Farm-Wifi'), false);
  assert.equal(m.looksLikeFiveGhzSsid('iptime5G공유기'), false); // no separator before 5g
  assert.equal(m.looksLikeFiveGhzSsid(''), false);
});

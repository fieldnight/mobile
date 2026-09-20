const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const filename = path.join(__dirname, "nfcStatsFragments.ts");
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { createNfcStatsAssembler } = compiled.exports;
const split = (text, id = "A0") => Array.from({ length: Math.ceil(text.length / 45) }, (_, part) =>
  `SF|${id}|${String(part).padStart(2, "0")}|${(part + 1) * 45 >= text.length ? 1 : 0}|${text.slice(part * 45, (part + 1) * 45)}`);

test("reassembles uint32 max count snapshot across real firmware-sized fragments", () => {
  const text = "ST|BOOT|D=AA:BB:CC:DD:EE:FF|4294967295,4294967295,4294967295,4294967295";
  const fragments = split(text);
  assert.equal(fragments.length, 2);
  const push = createNfcStatsAssembler();
  assert.equal(push(fragments[0]), null);
  assert.equal(push(fragments[0]), null); // transport retry
  assert.equal(push(fragments[1]), text);
  assert.equal(push(fragments[1]), null);
  for (const f of fragments) assert.ok(Buffer.byteLength(f) + 6 + 2 <= 64);
});

test("missing and mismatched fragments cannot create partial statistics", () => {
  const push = createNfcStatsAssembler();
  assert.equal(push("SF|01|01|1|tail"), null);
  assert.equal(push("SF|01|00|0|ST|BOOT|"), null);
  assert.equal(push("SF|02|01|1|invalid"), null);
  assert.equal(push("SF|02|00|1|ST|END|D=AA:BB:CC:DD:EE:FF|0"), "ST|END|D=AA:BB:CC:DD:EE:FF|0");
  assert.equal(push("ST|BEGIN|D=AA:BB:CC:DD:EE:FF"), "ST|BEGIN|D=AA:BB:CC:DD:EE:FF");
});

test("buffer remains bounded when a stream never terminates", () => {
  const push = createNfcStatsAssembler();
  assert.equal(push("SF|01|00|0|" + "a".repeat(45)), null);
  assert.equal(push("SF|01|01|0|" + "b".repeat(45)), null);
  assert.equal(push("SF|01|02|1|" + "c".repeat(45)), null);
  assert.equal(push("SF|02|00|1|ST|BEGIN"), "ST|BEGIN");
});

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function loadTs(name) {
  const filename = path.join(__dirname, name + ".ts");
  const compiled = new Module(filename, module);
  compiled._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return compiled.exports;
}

const { createLoopedItems, resolveLoopIndex, toLoopIndex } = loadTs("nfcCarousel");

test("carousel duplicates only both boundaries", () => {
  assert.deepEqual(createLoopedItems(["A", "B", "C"]), ["C", "A", "B", "C", "A"]);
  assert.deepEqual(createLoopedItems(["A"]), ["A"]);
});

test("carousel wraps backward and forward to matching real cards", () => {
  assert.deepEqual(resolveLoopIndex(0, 3), { logicalIndex: 2, correctedLoopIndex: 3 });
  assert.deepEqual(resolveLoopIndex(4, 3), { logicalIndex: 0, correctedLoopIndex: 1 });
  assert.deepEqual(resolveLoopIndex(2, 3), { logicalIndex: 1, correctedLoopIndex: 2 });
  assert.equal(toLoopIndex(2, 3), 3);
});

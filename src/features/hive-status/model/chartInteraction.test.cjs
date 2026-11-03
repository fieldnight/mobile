const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

function loadTypeScript(name, dependencies = {}) {
  const filename = path.join(__dirname, name);
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const compiled = new Module(filename, module);
  compiled.require = (request) => dependencies[request] ?? require(request);
  compiled._compile(source, filename);
  return compiled.exports;
}

const chartModel = loadTypeScript("chartModel.ts");
const { createChartInteraction } = loadTypeScript("chartInteraction.ts", { "./chartModel": chartModel });
const key = "internalTemperature";
const point = (value, index) => ({
  label: String(index), internalTemperature: value, externalTemperature: null,
  internalHumidity: null, externalHumidity: null, co2: null,
});
const touch = (x, y = 80) => ({ x, y });
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

function harness(overrides = {}) {
  let now = 0;
  let id = 0;
  const frames = new Map();
  const timers = new Map();
  const renders = [];
  const interactions = [];
  const haptics = [];
  const options = {
    data: Array.from({ length: 120 }, (_, index) => point(18 + index * 0.1, index)),
    keys: [key], width: 300, height: 200, reducedMotion: false, ...overrides,
  };
  const controller = createChartInteraction({
    options: () => options,
    render: (snapshot) => renders.push(snapshot),
    interaction: (active) => interactions.push(active),
    haptic: () => haptics.push(now),
    now: () => now,
    requestFrame: (callback) => { frames.set(++id, callback); return id; },
    cancelFrame: (frameId) => frames.delete(frameId),
    setTimer: (callback, delay) => { timers.set(++id, { callback, at: now + delay }); return id; },
    clearTimer: (timerId) => timers.delete(timerId),
  });
  function advance(duration) {
    const target = now + duration;
    while (true) {
      const next = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]);
      now = next[1].at;
      next[1].callback();
    }
    now = target;
  }
  function frame(duration = 16) {
    advance(duration);
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback();
  }
  function settle() {
    let count = 0;
    while (frames.size) {
      assert.ok(count++ < 500, "animation must settle within 500 frames");
      frame();
    }
  }
  return {
    controller, options, advance, frame, settle, frames, timers, renders, interactions, haptics,
    snapshot: () => controller.getSnapshot(),
  };
}

test("touching down immediately enters inspection at the finger, with no wait", () => {
  const h = harness();
  const viewport = h.snapshot().viewport;
  h.controller.start([touch(100)]);
  assert.equal(h.snapshot().mode, "inspect");
  assert.equal(h.snapshot().selectedIndex, Math.round(viewport.start + viewport.span / 3));
  assert.deepEqual(h.snapshot().viewport, viewport);
  assert.deepEqual(h.haptics, [0]);
  assert.equal(h.timers.size, 0);
  h.controller.end();
  assert.equal(h.snapshot().mode, "idle");
  assert.deepEqual(h.interactions, [true, false]);
});

test("dragging freely moves the crosshair to follow the finger without a pan/fling mode", () => {
  const h = harness();
  const { start, span } = h.snapshot().viewport;
  h.controller.start([touch(100)]);
  assert.equal(h.snapshot().selectedIndex, Math.round(start + span * (100 / 300)));
  h.controller.move([touch(140)]);
  assert.equal(h.snapshot().mode, "inspect");
  assert.equal(h.snapshot().selectedIndex, Math.round(start + span * (140 / 300)));
  // x below/above the plot clamps to the viewport's own start/end, not the full dataset.
  h.controller.move([touch(0)]);
  assert.equal(h.snapshot().selectedIndex, Math.round(start));
  h.controller.move([touch(1000)]);
  assert.equal(h.snapshot().selectedIndex, Math.round(start + span));
  // Releasing keeps the viewport untouched: dragging never scrolls or scales the chart.
  const viewportBefore = h.snapshot().viewport;
  h.controller.end();
  assert.deepEqual(h.snapshot().viewport, viewportBefore);
});

test("scrubbing haptics are throttled to the interval and unchanged samples stay quiet", () => {
  const h = harness();
  h.controller.start([touch(100)]);
  assert.deepEqual(h.haptics, [0]);
  h.advance(10);
  h.controller.move([touch(140)]);
  // Still inside the 70ms haptic window since the last one fired at t=0: no extra haptic.
  assert.deepEqual(h.haptics, [0]);
  h.advance(61);
  h.controller.move([touch(200)]);
  assert.deepEqual(h.haptics, [0, 71]);
  h.advance(19);
  h.controller.move([touch(250)]);
  // 90ms since the last real move, but only 19ms since the last haptic at t=71: still throttled.
  assert.deepEqual(h.haptics, [0, 71]);
  h.advance(51);
  h.controller.move([touch(300)]);
  assert.deepEqual(h.haptics, [0, 71, 141]);
  // The index is already pinned at the viewport's right edge, so re-selecting it fires no haptic.
  h.controller.move([touch(1000)]);
  assert.equal(h.snapshot().selectedIndex, h.snapshot().viewport.start + h.snapshot().viewport.span);
  assert.equal(h.haptics.length, 3);
});

test("one to two to one finger transitions keep the selection fixed until every finger lifts", () => {
  const h = harness({ keys: ["co2"] });
  const selectionBefore = h.snapshot().selectedIndex;
  h.controller.start([touch(40)]);
  const beforePinch = h.snapshot().viewport;
  h.controller.start([touch(70), touch(130)]);
  assert.deepEqual(h.snapshot().viewport, beforePinch);
  assert.equal(h.snapshot().mode, "pinch");
  // 첫 손가락이 잠깐 바꾼 선택도 제스처 시작 전 값으로 돌아갑니다.
  assert.equal(h.snapshot().selectedIndex, selectionBefore);
  h.controller.move([touch(60, 90), touch(180, 90)]);
  const pinched = h.snapshot().viewport;
  closeTo(pinched.span, beforePinch.span / 2);
  closeTo(pinched.start + pinched.span * 120 / 300, beforePinch.start + beforePinch.span * 100 / 300);
  closeTo(pinched.max - (pinched.max - pinched.min) * 90 / 200,
    beforePinch.max - (beforePinch.max - beforePinch.min) * 80 / 200);
  // 손가락 하나만 남아도 크로스헤어로 바뀌지 않고 선택도 그대로입니다.
  h.controller.move([touch(180, 90)]);
  assert.deepEqual(h.snapshot().viewport, pinched);
  assert.equal(h.snapshot().mode, "pinch");
  assert.equal(h.snapshot().selectedIndex, selectionBefore);
  h.controller.end();
  assert.equal(h.snapshot().mode, "idle");
  // 다음 제스처의 한 손가락은 다시 바로 값을 읽습니다.
  h.controller.start([touch(150)]);
  assert.equal(h.snapshot().mode, "inspect");
});

test("pinch release snaps the value axis back to the data's own range (co2 has no fixed domain)", () => {
  const h = harness({ keys: ["co2"] });
  h.controller.start([touch(70), touch(130)]);
  h.controller.move([touch(60, 90), touch(180, 90)]);
  h.controller.end();
  h.settle();
  assert.ok(Number.isFinite(h.snapshot().viewport.min + h.snapshot().viewport.max));
});

test("dragging a fixed-domain sensor never changes the value axis while moving or after release", () => {
  const data = Array.from({ length: 120 }, (_, index) => point(index < 110 ? 10 : 40, index));
  const h = harness({ data });
  const initial = h.snapshot().viewport;
  assert.deepEqual({ min: initial.min, max: initial.max }, { min: -20, max: 100 });
  h.controller.start([touch(0)]);
  h.controller.move([touch(400, 85)]);
  const dragged = h.snapshot().viewport;
  assert.equal(dragged.min, initial.min);
  assert.equal(dragged.max, initial.max);
  h.controller.end();
  assert.deepEqual({ min: h.snapshot().viewport.min, max: h.snapshot().viewport.max }, { min: -20, max: 100 });
});

test("pinch zoom on a fixed-domain sensor keeps the value axis fixed and only scales time", () => {
  const h = harness();
  const before = h.snapshot().viewport;
  h.controller.start([touch(100, 50), touch(200, 50)]);
  h.controller.move([touch(80, 50), touch(220, 50)]);
  const pinched = h.snapshot().viewport;
  assert.deepEqual({ min: pinched.min, max: pinched.max }, { min: -20, max: 100 });
  assert.ok(pinched.span < before.span);
  h.controller.end();
  h.settle();
  assert.deepEqual({ min: h.snapshot().viewport.min, max: h.snapshot().viewport.max }, { min: -20, max: 100 });
});

test("reduced motion applies the released domain without an animation frame", () => {
  const h = harness({ keys: ["co2"], reducedMotion: true });
  h.controller.start([touch(70), touch(130)]);
  h.controller.move([touch(60, 90), touch(180, 90)]);
  const dragged = h.snapshot().viewport;
  h.controller.end();
  const released = h.snapshot().viewport;
  assert.equal(released.start, dragged.start);
  assert.deepEqual({ min: released.min, max: released.max },
    chartModel.valueDomain(h.options.data, ["co2"], dragged.start, dragged.start + dragged.span));
  h.settle();
  assert.deepEqual(h.snapshot().viewport, released);
});

test("reset clears any in-progress interaction and jumps straight to idle", () => {
  const h = harness();
  h.controller.start([touch(100)]);
  h.controller.reset(true);
  h.settle();
  assert.equal(h.snapshot().viewport.start, 0);
  assert.equal(h.snapshot().viewport.span, 119);
  h.controller.start([touch(100)]);
  h.controller.reset(false);
  h.settle();
  assert.equal(h.snapshot().mode, "idle");
  assert.equal(h.snapshot().selectedIndex, 119);
  assert.equal(h.timers.size, 0);
});

test("data changes update the latest sample while following recent data", () => {
  const h = harness();
  h.options.data = [...h.options.data, point(40, 120)];
  h.controller.syncData();
  h.settle();
  assert.equal(h.snapshot().selectedIndex, 120);
  assert.equal(h.snapshot().mode, "idle");
  assert.ok(h.snapshot().viewport.start + h.snapshot().viewport.span >= 120);
  assert.equal(h.haptics.length, 0);
});

test("data changes clamp a manually positioned viewport", () => {
  const h = harness();
  h.controller.start([touch(70), touch(130)]);
  h.controller.move([touch(60, 90), touch(180, 90)]);
  h.controller.end();
  h.frame();
  h.options.data = h.options.data.slice(0, 20);
  h.controller.syncData();
  const synced = h.snapshot().viewport;
  assert.ok(synced.start + synced.span <= 19);
  assert.equal(h.snapshot().selectedIndex, Math.min(119, 19));
  h.settle();
  assert.deepEqual(h.snapshot().viewport, synced);
});

test("dispose cancels timers, queued rendering and active scroll lock; resume remains usable", () => {
  const h = harness();
  h.controller.start([touch(100)]);
  assert.equal(h.frames.size, 1);
  h.controller.dispose();
  assert.equal(h.frames.size, 0);
  h.advance(1000);
  h.frame();
  assert.equal(h.haptics.length, 1);
  const rendersBeforeResume = h.renders.length;
  assert.deepEqual(h.interactions, [true, false]);
  h.controller.resume();
  h.controller.syncData();
  h.frame();
  assert.equal(h.renders.length, rendersBeforeResume + 1);
  h.controller.start([touch(40)]);
  h.controller.end();
  assert.equal(h.haptics.length, 2);
});

test("inspection keeps a user selected sample when new telemetry arrives", () => {
  const h = harness();
  h.controller.start([touch(0)]);
  h.controller.end();
  const selected = h.snapshot().selectedIndex;
  h.options.data = [...h.options.data, point(40, 120)];
  h.controller.syncData();
  h.settle();
  assert.equal(h.snapshot().selectedIndex, selected);
});

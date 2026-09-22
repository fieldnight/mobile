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

test("a steady long press enters inspection at the finger without moving the viewport", () => {
  const h = harness();
  const viewport = h.snapshot().viewport;
  h.controller.start([touch(100)]);
  h.advance(239);
  assert.equal(h.snapshot().mode, "idle");
  assert.equal(h.haptics.length, 0);
  h.advance(1);
  assert.equal(h.snapshot().mode, "inspect");
  assert.equal(h.snapshot().selectedIndex, Math.round(viewport.start + viewport.span / 3));
  assert.deepEqual(h.snapshot().viewport, viewport);
  assert.deepEqual(h.haptics, [240]);
  h.controller.end();
  h.settle();
  assert.equal(h.snapshot().mode, "idle");
  assert.deepEqual(h.interactions, [true, false]);
});

test("scrubbing updates every crossed sample while haptics are throttled and unchanged samples stay quiet", () => {
  const h = harness();
  h.controller.start([touch(100)]);
  h.advance(240);
  h.controller.move([touch(101)]);
  assert.deepEqual(h.haptics, [240]);
  h.advance(10);
  h.controller.move([touch(140)]);
  assert.equal(h.snapshot().selectedIndex, 110);
  assert.deepEqual(h.haptics, [240]);
  h.advance(61);
  h.controller.move([touch(200)]);
  assert.equal(h.snapshot().selectedIndex, 114);
  h.advance(19);
  h.controller.move([touch(250)]);
  assert.equal(h.snapshot().selectedIndex, 116);
  h.advance(51);
  h.controller.move([touch(300)]);
  assert.equal(h.snapshot().selectedIndex, 119);
  assert.deepEqual(h.haptics, [240, 311, 381]);
  h.controller.move([touch(1000)]);
  assert.equal(h.snapshot().selectedIndex, 119);
  assert.equal(h.haptics.length, 3);
});

test("a real drag cancels long press and coalesces raw touch updates into one frame", () => {
  const h = harness();
  h.controller.start([touch(40)]);
  for (let index = 1; index <= 20; index += 1) {
    h.advance(1);
    h.controller.move([touch(40 + index * 4)]);
  }
  assert.equal(h.snapshot().mode, "pan");
  assert.equal(h.timers.size, 0);
  assert.equal(h.frames.size, 1);
  assert.equal(h.renders.length, 0);
  h.frame();
  assert.equal(h.renders.length, 1);
  h.advance(300);
  assert.equal(h.snapshot().mode, "pan");
  assert.equal(h.haptics.length, 0);
});

test("small finger jitter still permits long press at the most recent position", () => {
  const h = harness();
  h.controller.start([touch(100)]);
  h.advance(100);
  h.controller.move([touch(103, 82)]);
  assert.equal(h.snapshot().mode, "idle");
  h.advance(140);
  assert.equal(h.snapshot().mode, "inspect");
  assert.equal(h.snapshot().selectedIndex, Math.round(h.snapshot().viewport.start + 103 / 300 * h.snapshot().viewport.span));
});

test("one to two to one finger transitions rebase without jumps or a post-pinch fling", () => {
  const h = harness();
  h.controller.start([touch(40)]);
  h.advance(32);
  h.controller.move([touch(80)]);
  const beforePinch = h.snapshot().viewport;
  h.controller.start([touch(70), touch(130)]);
  assert.deepEqual(h.snapshot().viewport, beforePinch);
  assert.equal(h.snapshot().mode, "pinch");
  h.controller.move([touch(60, 90), touch(180, 90)]);
  const pinched = h.snapshot().viewport;
  closeTo(pinched.span, beforePinch.span / 2);
  closeTo(pinched.start + pinched.span * 120 / 300, beforePinch.start + beforePinch.span * 100 / 300);
  closeTo(pinched.max - (pinched.max - pinched.min) * 90 / 200,
    beforePinch.max - (beforePinch.max - beforePinch.min) * 80 / 200);
  h.controller.move([touch(180, 90)]);
  assert.deepEqual(h.snapshot().viewport, pinched);
  assert.equal(h.snapshot().mode, "pan");
  h.advance(16);
  h.controller.move([touch(210, 110)]);
  const panned = h.snapshot().viewport;
  closeTo(panned.start, pinched.start - pinched.span * 30 / 300);
  closeTo(panned.min, pinched.min + (pinched.max - pinched.min) * 20 / 200);
  h.controller.end();
  h.settle();
  // Releasing always snaps the value axis back to the fixed temperature/humidity domain;
  // only the time axis (start/span) carries over from the pan.
  assert.equal(h.snapshot().viewport.start, panned.start);
  assert.equal(h.snapshot().viewport.span, panned.span);
  assert.deepEqual({ min: h.snapshot().viewport.min, max: h.snapshot().viewport.max }, { min: -20, max: 100 });
  assert.equal(h.haptics.length, 0);
});

test("horizontal dragging keeps the fixed temperature/humidity value axis throughout and after release", () => {
  const data = Array.from({ length: 120 }, (_, index) => point(index < 110 ? 10 : 40, index));
  const h = harness({ data });
  const initial = h.snapshot().viewport;
  assert.deepEqual({ min: initial.min, max: initial.max }, { min: -20, max: 100 });
  h.controller.start([touch(0)]);
  h.advance(32);
  h.controller.move([touch(400, 85)]);
  const dragged = h.snapshot().viewport;
  assert.equal(dragged.min, initial.min);
  assert.equal(dragged.max, initial.max);
  h.advance(100);
  h.controller.end();
  h.settle();
  assert.equal(h.snapshot().viewport.start, dragged.start);
  assert.deepEqual({ min: h.snapshot().viewport.min, max: h.snapshot().viewport.max }, { min: -20, max: 100 });
  assert.equal(h.frames.size, 0);
});

test("a fling keeps moving after release and a new touch stops it immediately", () => {
  const h = harness();
  h.controller.start([touch(40)]);
  h.advance(32);
  h.controller.move([touch(100)]);
  const releasedAt = h.snapshot().viewport.start;
  h.controller.end();
  h.frame();
  assert.ok(h.snapshot().viewport.start < releasedAt);
  const caught = h.snapshot().viewport;
  h.controller.start([touch(120)]);
  h.frame();
  assert.deepEqual(h.snapshot().viewport, caught);
  h.advance(100);
  h.frame();
  assert.deepEqual(h.snapshot().viewport, caught);
  assert.deepEqual(h.interactions, [true, false, true]);
  h.controller.cancel();
});

test("a paused drag does not fling, and releasing a vertical drag snaps back to the fixed value range", () => {
  const h = harness();
  h.controller.start([touch(100, 40)]);
  h.advance(32);
  h.controller.move([touch(101, 110)]);
  const dragged = h.snapshot().viewport;
  h.advance(100);
  h.controller.end();
  h.settle();
  assert.equal(h.snapshot().viewport.start, dragged.start);
  assert.deepEqual({ min: h.snapshot().viewport.min, max: h.snapshot().viewport.max }, { min: -20, max: 100 });
});

test("reduced motion skips momentum and applies the released domain without animation", () => {
  const h = harness({ reducedMotion: true });
  h.controller.start([touch(40)]);
  h.advance(32);
  h.controller.move([touch(180)]);
  const dragged = h.snapshot().viewport;
  h.controller.end();
  const released = h.snapshot().viewport;
  assert.equal(released.start, dragged.start);
  assert.deepEqual({ min: released.min, max: released.max },
    chartModel.valueDomain(h.options.data, [key], dragged.start, dragged.start + dragged.span));
  h.settle();
  assert.deepEqual(h.snapshot().viewport, released);
  assert.equal(h.renders.length, 1);
});

test("reset interrupts a fling and clears any pending long press", () => {
  const h = harness();
  h.controller.start([touch(40)]);
  h.advance(32);
  h.controller.move([touch(100)]);
  h.controller.end();
  h.frame();
  h.controller.reset(true);
  h.settle();
  assert.equal(h.snapshot().viewport.start, 0);
  assert.equal(h.snapshot().viewport.span, 119);
  h.controller.start([touch(100)]);
  h.controller.reset(false);
  h.advance(500);
  h.settle();
  assert.equal(h.snapshot().mode, "idle");
  assert.equal(h.snapshot().selectedIndex, 119);
  assert.equal(h.timers.size, 0);
  assert.equal(h.haptics.length, 0);
});

test("data changes cancel a hold and update the latest sample while following recent data", () => {
  const h = harness();
  h.controller.start([touch(100)]);
  h.options.data = [...h.options.data, point(40, 120)];
  h.controller.syncData();
  h.advance(500);
  h.settle();
  assert.equal(h.snapshot().selectedIndex, 120);
  assert.equal(h.snapshot().mode, "idle");
  assert.ok(h.snapshot().viewport.start + h.snapshot().viewport.span >= 120);
  assert.equal(h.haptics.length, 0);
  assert.deepEqual(h.interactions, [true, false]);
});

test("data changes during a fling stop it and clamp a manually positioned viewport", () => {
  const h = harness();
  h.controller.start([touch(40)]);
  h.advance(32);
  h.controller.move([touch(100)]);
  h.controller.end();
  h.frame();
  h.options.data = h.options.data.slice(0, 20);
  h.controller.syncData();
  const synced = h.snapshot().viewport;
  assert.ok(synced.start + synced.span <= 19);
  assert.equal(h.snapshot().selectedIndex, 19);
  h.settle();
  assert.deepEqual(h.snapshot().viewport, synced);
});

test("dispose cancels timers, queued rendering and active scroll lock; resume remains usable", () => {
  const h = harness();
  h.controller.start([touch(100)]);
  assert.equal(h.frames.size, 1);
  assert.equal(h.timers.size, 1);
  h.controller.dispose();
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
  h.advance(1000);
  h.frame();
  assert.equal(h.renders.length, 0);
  assert.equal(h.haptics.length, 0);
  assert.deepEqual(h.interactions, [true, false]);
  h.controller.resume();
  h.controller.syncData();
  h.frame();
  assert.equal(h.renders.length, 1);
  h.controller.start([touch(40)]);
  h.controller.end();
  h.settle();
  assert.equal(h.haptics.length, 1);
});

test("inspection keeps a user selected sample when new telemetry arrives", () => {
  const h = harness();
  h.controller.start([touch(0)]);
  h.advance(240);
  h.controller.end();
  const selected = h.snapshot().selectedIndex;
  h.options.data = [...h.options.data, point(40, 120)];
  h.controller.syncData();
  h.settle();
  assert.equal(h.snapshot().selectedIndex, selected);
});

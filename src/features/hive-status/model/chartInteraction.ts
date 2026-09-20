import type { DataPoint, HiveSensorDataKey } from "@/types";
import {
  clampViewport, initialViewport, latestSensorIndex, momentumStep, panViewport,
  pinchViewport, valueDomain, zoomViewport, type ChartViewport,
} from "./chartModel";

export interface ChartTouch { x: number; y: number }
export type ChartInteractionMode = "idle" | "pan" | "pinch" | "inspect";
export interface ChartInteractionSnapshot {
  viewport: ChartViewport;
  selectedIndex: number;
  mode: ChartInteractionMode;
}
interface ChartInteractionOptions {
  data: DataPoint[];
  keys: HiveSensorDataKey[];
  width: number;
  height: number;
  reducedMotion: boolean;
}
interface ChartInteractionRuntime {
  options: () => ChartInteractionOptions;
  render: (snapshot: ChartInteractionSnapshot) => void;
  interaction: (active: boolean) => void;
  haptic: () => void;
  now: () => number;
  requestFrame: (callback: () => void) => number;
  cancelFrame: (id: number) => void;
  setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimer: (id: ReturnType<typeof setTimeout>) => void;
}

const HOLD_MS = 240;
const TOUCH_SLOP = 6;
const HAPTIC_INTERVAL_MS = 70;
const centroid = (touches: ChartTouch[]) => ({
  x: (touches[0].x + touches[1].x) / 2,
  y: (touches[0].y + touches[1].y) / 2,
});
const distance = (touches: ChartTouch[]) => Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);

/** Own gesture state outside React so incoming touches never read a stale rendered viewport. */
export function createChartInteraction(runtime: ChartInteractionRuntime) {
  const initial = runtime.options();
  let snapshot: ChartInteractionSnapshot = {
    viewport: initialViewport(initial.data, initial.keys),
    selectedIndex: latestSensorIndex(initial.data, initial.keys),
    mode: "idle",
  };
  let base = snapshot.viewport;
  let origin: ChartTouch = { x: 0, y: 0 };
  let lastTouch = origin;
  let pinchDistance = 1;
  let frame: number | null = null;
  let hold: ReturnType<typeof setTimeout> | null = null;
  let active = false;
  let moved = false;
  let hadPinch = false;
  let followingLatest = true;
  let horizontal = false;
  let velocityX = 0;
  let velocityY = 0;
  let lastMoveAt = 0;
  let lastFrameAt = 0;
  let lastHapticAt = -Infinity;
  let animation: "momentum" | "fit" | null = null;
  let fitFrom = base;
  let fitTarget = base;
  let fitStartedAt = 0;
  let disposed = false;

  function clearHold() {
    if (hold !== null) runtime.clearTimer(hold);
    hold = null;
  }
  function publish() {
    if (frame === null && !disposed) frame = runtime.requestFrame(tick);
  }
  function updateViewport(viewport: ChartViewport) {
    snapshot = { ...snapshot, viewport };
    publish();
  }
  function changeMode(mode: ChartInteractionMode) {
    snapshot = { ...snapshot, mode };
    publish();
  }
  function setActive(next: boolean) {
    if (active === next) return;
    active = next;
    runtime.interaction(next);
  }
  function haptic() {
    const now = runtime.now();
    if (now - lastHapticAt < HAPTIC_INTERVAL_MS) return;
    lastHapticAt = now;
    runtime.haptic();
  }
  function select(x: number, entering = false) {
    const { data, width } = runtime.options();
    if (!data.length) return;
    const { start, span } = snapshot.viewport;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(start + Math.max(0, Math.min(1, x / Math.max(1, width))) * span)));
    if (index !== snapshot.selectedIndex || entering) haptic();
    snapshot = { ...snapshot, selectedIndex: index };
    followingLatest = false;
    publish();
  }
  function fitValues() {
    if (!horizontal) return;
    const { data, keys, reducedMotion } = runtime.options();
    fitFrom = snapshot.viewport;
    fitTarget = { ...fitFrom, ...valueDomain(data, keys, fitFrom.start, fitFrom.start + fitFrom.span) };
    if (reducedMotion) {
      updateViewport(fitTarget);
    } else if (Math.abs(fitTarget.min - fitFrom.min) + Math.abs(fitTarget.max - fitFrom.max) > 0.001) {
      animation = "fit";
      fitStartedAt = runtime.now();
      publish();
    }
  }
  function tick() {
    frame = null;
    if (disposed) return;
    const now = runtime.now();
    const options = runtime.options();
    if (animation === "momentum") {
      const result = momentumStep(snapshot.viewport, velocityX, velocityY, Math.min(40, now - lastFrameAt), options.width, options.height, options.data.length);
      lastFrameAt = now;
      velocityX = result.velocityX;
      velocityY = result.velocityY;
      snapshot = { ...snapshot, viewport: result.viewport };
      if (result.done || options.reducedMotion) {
        animation = null;
        fitValues();
      }
    } else if (animation === "fit") {
      const progress = Math.min(1, (now - fitStartedAt) / 180);
      const eased = 1 - (1 - progress) ** 3;
      snapshot = { ...snapshot, viewport: {
        ...fitTarget,
        min: fitFrom.min + (fitTarget.min - fitFrom.min) * eased,
        max: fitFrom.max + (fitTarget.max - fitFrom.max) * eased,
      } };
      if (progress === 1 || options.reducedMotion) {
        snapshot = { ...snapshot, viewport: fitTarget };
        animation = null;
      }
    }
    runtime.render(snapshot);
    if (animation) publish();
  }
  function stop() {
    clearHold();
    animation = null;
    velocityX = 0;
    velocityY = 0;
  }
  function beginPinch(touches: ChartTouch[]) {
    clearHold();
    base = snapshot.viewport;
    origin = centroid(touches);
    pinchDistance = Math.max(1, distance(touches));
    hadPinch = true;
    horizontal = false;
    followingLatest = false;
    changeMode("pinch");
  }
  function start(touches: ChartTouch[]) {
    if (!touches.length) return;
    if (active) {
      if (touches.length >= 2 && snapshot.mode !== "pinch") beginPinch(touches);
      return;
    }
    stop();
    setActive(true);
    base = snapshot.viewport;
    origin = lastTouch = touches[0];
    lastMoveAt = runtime.now();
    moved = hadPinch = horizontal = false;
    changeMode("idle");
    if (touches.length >= 2) {
      beginPinch(touches);
      return;
    }
    hold = runtime.setTimer(() => {
      hold = null;
      if (!active || moved || hadPinch) return;
      changeMode("inspect");
      select(lastTouch.x, true);
    }, HOLD_MS);
  }
  function move(touches: ChartTouch[]) {
    if (!active || !touches.length) return;
    const { data, width, height } = runtime.options();
    if (touches.length >= 2) {
      if (snapshot.mode !== "pinch") beginPinch(touches);
      const focal = centroid(touches);
      updateViewport(pinchViewport(base, distance(touches) / pinchDistance, data.length,
        origin.x / Math.max(1, width), origin.y / Math.max(1, height),
        focal.x / Math.max(1, width), focal.y / Math.max(1, height)));
      return;
    }
    const touch = touches[0];
    if (snapshot.mode === "pinch") {
      // Rebase immediately when a finger lifts; never reuse two-finger deltas.
      base = snapshot.viewport;
      origin = lastTouch = touch;
      lastMoveAt = runtime.now();
      velocityX = velocityY = 0;
      moved = true;
      changeMode("pan");
      return;
    }
    if (snapshot.mode === "inspect") {
      lastTouch = touch;
      select(touch.x);
      return;
    }
    const dx = touch.x - origin.x;
    const dy = touch.y - origin.y;
    if (!moved && Math.hypot(dx, dy) < TOUCH_SLOP) {
      lastTouch = touch;
      return;
    }
    if (!moved) {
      clearHold();
      moved = true;
      horizontal = !hadPinch && Math.abs(dx) > Math.abs(dy) * 1.6;
      followingLatest = false;
      changeMode("pan");
    }
    const now = runtime.now();
    const elapsed = Math.max(1, now - lastMoveAt);
    const weight = Math.min(1, elapsed / 32);
    velocityX += ((touch.x - lastTouch.x) / elapsed - velocityX) * weight;
    velocityY += ((touch.y - lastTouch.y) / elapsed - velocityY) * weight;
    lastMoveAt = now;
    lastTouch = touch;
    updateViewport(panViewport(base, dx, horizontal ? 0 : dy, width, height, data.length));
  }
  function end() {
    if (!active) return;
    clearHold();
    const mode = snapshot.mode;
    if (!moved && !hadPinch && mode !== "inspect") select(lastTouch.x, true);
    setActive(false);
    changeMode("idle");
    const { reducedMotion } = runtime.options();
    // A paused finger or a lifted pinch must not start an unexpected fling.
    if (mode === "pan" && !hadPinch && !reducedMotion && runtime.now() - lastMoveAt < 90 && Math.hypot(velocityX, horizontal ? 0 : velocityY) > 0.08) {
      velocityX = Math.max(-2.5, Math.min(2.5, velocityX));
      velocityY = horizontal ? 0 : Math.max(-2.5, Math.min(2.5, velocityY));
      animation = "momentum";
      lastFrameAt = runtime.now();
      publish();
    } else if (mode === "pan") {
      fitValues();
    }
  }
  function cancel() {
    stop();
    setActive(false);
    changeMode("idle");
  }
  function reset(all: boolean) {
    cancel();
    const { data, keys } = runtime.options();
    followingLatest = !all;
    snapshot = { viewport: initialViewport(data, keys, all), selectedIndex: latestSensorIndex(data, keys), mode: "idle" };
    publish();
  }
  return {
    start, move, end, cancel, reset,
    getSnapshot: () => snapshot,
    zoom(factor: number) {
      cancel();
      followingLatest = false;
      updateViewport(zoomViewport(snapshot.viewport, factor, runtime.options().data.length));
    },
    syncData() {
      cancel();
      const { data, keys } = runtime.options();
      snapshot = followingLatest
        ? { viewport: initialViewport(data, keys), selectedIndex: latestSensorIndex(data, keys), mode: "idle" }
        : { ...snapshot, viewport: clampViewport(snapshot.viewport, data.length), selectedIndex: Math.min(snapshot.selectedIndex, data.length - 1) };
      publish();
    },
    dispose() {
      stop();
      setActive(false);
      if (frame !== null) runtime.cancelFrame(frame);
      frame = null;
      disposed = true;
    },
    resume() { disposed = false; },
  };
}

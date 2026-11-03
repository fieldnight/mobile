import type { DataPoint, HiveSensorDataKey } from "@/types";
import {
  clampViewport, firstSensorIndex, fixedDomainFor, initialViewport, latestSensorIndex,
  nearestSensorIndex, pinchViewport, valueDomain, zoomViewport, type ChartBounds, type ChartViewport,
} from "./chartModel";

export interface ChartTouch { x: number; y: number }
export type ChartInteractionMode = "idle" | "pinch" | "inspect";
export interface ChartInteractionSnapshot {
  viewport: ChartViewport;
  /** 값을 읽어 보여줄 기록(손가락에서 가장 가까운, 값이 있는 기록) */
  selectedIndex: number;
  /** 손가락 위치 그대로의 소수 인덱스. 세로선·점이 이 위치를 따라 부드럽게 움직입니다. */
  cursor: number;
  mode: ChartInteractionMode;
}
interface ChartInteractionOptions {
  data: DataPoint[];
  keys: HiveSensorDataKey[];
  width: number;
  height: number;
  reducedMotion: boolean;
  /** 가로 축 이동·축소 범위. 없으면 첫 기록~마지막 기록입니다. */
  bounds?: ChartBounds;
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

const HAPTIC_INTERVAL_MS = 70;
const centroid = (touches: ChartTouch[]) => ({
  x: (touches[0].x + touches[1].x) / 2,
  y: (touches[0].y + touches[1].y) / 2,
});
const distance = (touches: ChartTouch[]) => Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);

/** Own gesture state outside React so incoming touches never read a stale rendered viewport. */
export function initialSnapshot({ data, keys, bounds }: Pick<ChartInteractionOptions, "data" | "keys" | "bounds">, showAll = false): ChartInteractionSnapshot {
  const latest = latestSensorIndex(data, keys);
  return { viewport: initialViewport(data, keys, showAll, bounds), selectedIndex: latest, cursor: Math.max(0, latest), mode: "idle" };
}

export function createChartInteraction(runtime: ChartInteractionRuntime) {
  let snapshot: ChartInteractionSnapshot = initialSnapshot(runtime.options());
  let base = snapshot.viewport;
  let origin: ChartTouch = { x: 0, y: 0 };
  let lastTouch = origin;
  let pinchDistance = 1;
  let frame: number | null = null;
  let active = false;
  let followingLatest = true;
  let lastHapticAt = -Infinity;
  let animation: "fit" | null = null;
  let fitFrom = base;
  let fitTarget = base;
  let fitStartedAt = 0;
  let disposed = false;
  // 한 번이라도 두 손가락이 닿은 제스처는 손을 모두 뗄 때까지 확대/축소로만 다룹니다.
  // 그동안 선택(말풍선 값)은 제스처 시작 전 값으로 고정합니다.
  let gesturePinched = false;
  let beforeGesture = { selectedIndex: snapshot.selectedIndex, cursor: snapshot.cursor };

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
    const { data, keys, width } = runtime.options();
    if (!data.length) return;
    const { start, span } = snapshot.viewport;
    const raw = start + Math.max(0, Math.min(1, x / Math.max(1, width))) * span;
    // 세로선은 기록이 있는 구간 안에서만 손가락을 따라갑니다(앞뒤 빈 시간대로는 넘어가지 않음).
    const first = firstSensorIndex(data, keys);
    const last = latestSensorIndex(data, keys);
    const cursor = first < 0 ? Math.max(0, Math.min(data.length - 1, raw)) : Math.max(first, Math.min(last, raw));
    const nearest = nearestSensorIndex(data, keys, cursor);
    const index = nearest < 0 ? Math.round(cursor) : nearest;
    if (index !== snapshot.selectedIndex || entering) haptic();
    snapshot = { ...snapshot, selectedIndex: index, cursor };
    followingLatest = false;
    publish();
  }
  function fitValues() {
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
    if (animation === "fit") {
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
    animation = null;
  }
  function beginPinch(touches: ChartTouch[]) {
    if (!gesturePinched) {
      gesturePinched = true;
      snapshot = { ...snapshot, ...beforeGesture };
    }
    base = snapshot.viewport;
    origin = centroid(touches);
    pinchDistance = Math.max(1, distance(touches));
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
    gesturePinched = false;
    beforeGesture = { selectedIndex: snapshot.selectedIndex, cursor: snapshot.cursor };
    base = snapshot.viewport;
    origin = lastTouch = touches[0];
    if (touches.length >= 2) {
      beginPinch(touches);
      return;
    }
    // 한 손가락 드래그는 바로 크로스헤어(inspect)로 동작합니다. 길게 눌러 기다릴 필요가 없습니다.
    changeMode("inspect");
    select(lastTouch.x, true);
  }
  function move(touches: ChartTouch[]) {
    if (!active || !touches.length) return;
    const { data, keys, width, height } = runtime.options();
    if (touches.length >= 2) {
      if (snapshot.mode !== "pinch") beginPinch(touches);
      const focal = centroid(touches);
      updateViewport(pinchViewport(base, distance(touches) / pinchDistance, runtime.options().bounds ?? data.length,
        origin.x / Math.max(1, width), origin.y / Math.max(1, height),
        focal.x / Math.max(1, width), focal.y / Math.max(1, height), fixedDomainFor(keys)));
      return;
    }
    const touch = touches[0];
    // 확대/축소하다 손가락 하나만 남아도 값이 바뀌지 않게 무시합니다.
    if (gesturePinched) return;
    lastTouch = touch;
    select(touch.x);
  }
  function end() {
    if (!active) return;
    const mode = snapshot.mode;
    gesturePinched = false;
    setActive(false);
    changeMode("idle");
    if (mode === "pinch") fitValues();
  }
  function cancel() {
    stop();
    gesturePinched = false;
    setActive(false);
    changeMode("idle");
  }
  function reset(all: boolean) {
    cancel();
    followingLatest = !all;
    snapshot = initialSnapshot(runtime.options(), all);
    publish();
  }
  return {
    start, move, end, cancel, reset,
    getSnapshot: () => snapshot,
    zoom(factor: number) {
      cancel();
      followingLatest = false;
      const { keys, data, bounds } = runtime.options();
      updateViewport(zoomViewport(snapshot.viewport, factor, bounds ?? data.length, 0.5, 0.5, fixedDomainFor(keys)));
    },
    syncData() {
      cancel();
      const options = runtime.options();
      const { data, keys, bounds } = options;
      const selectedIndex = Math.min(snapshot.selectedIndex, data.length - 1);
      snapshot = followingLatest
        ? initialSnapshot(options)
        : { ...snapshot, viewport: clampViewport(snapshot.viewport, bounds ?? data.length, fixedDomainFor(keys)), selectedIndex, cursor: Math.min(snapshot.cursor, Math.max(0, data.length - 1)) };
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

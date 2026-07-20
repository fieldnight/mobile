import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NfcDoorCardConfig, NfcDoorMode } from "../components/nfcDoorCards";
import type { BeeTrafficCounts, HceResultEvent } from "./webeeHce";

const DOOR_OPENER_RUNTIME_STORAGE_KEY = "ourbee:door-opener-runtime:v1";
const LEGACY_DOOR_OPENER_RUNTIME_STORAGE_KEY = "webee:door-opener-runtime:v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DoorOpenerRuntimeState {
  deviceId?: string;
  cardId: string;
  title: string;
  description?: string;
  detail?: string;
  mode: NfcDoorMode;
  start?: string;
  end?: string;
  repeat: boolean;
  activatedAt: number;
  result: string;
  status: HceResultEvent["status"];
  command?: string;
  counts?: BeeTrafficCounts;
}

export function buildDoorOpenerRuntimeState(
  card: NfcDoorCardConfig,
  event: HceResultEvent,
): DoorOpenerRuntimeState {
  return {
    deviceId: event.deviceId,
    cardId: card.id,
    title: card.title,
    description: card.description,
    detail: card.detail,
    mode: card.mode,
    start: card.start,
    end: card.end,
    repeat: card.repeat ?? false,
    activatedAt: Date.now(),
    result: event.result,
    status: event.status,
    command: event.command,
    counts: event.counts,
  };
}

export async function loadDoorOpenerRuntimeState() {
  try {
    const raw =
      (await AsyncStorage.getItem(DOOR_OPENER_RUNTIME_STORAGE_KEY)) ??
      (await AsyncStorage.getItem(LEGACY_DOOR_OPENER_RUNTIME_STORAGE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DoorOpenerRuntimeState;
    if (!isDoorOpenerRuntimeState(parsed)) return null;
    await saveDoorOpenerRuntimeState(parsed);
    return parsed;
  } catch (error) {
    console.warn("[Door Opener Runtime] 저장된 실행 상태 복구 실패", error);
    return null;
  }
}

export async function saveDoorOpenerRuntimeState(state: DoorOpenerRuntimeState) {
  try {
    await AsyncStorage.setItem(
      DOOR_OPENER_RUNTIME_STORAGE_KEY,
      JSON.stringify({ ...state, version: 1 }),
    );
  } catch (error) {
    console.warn("[Door Opener Runtime] 실행 상태 저장 실패", error);
  }
}

export function isDoorOpenerRuntimeActive(state: DoorOpenerRuntimeState | null) {
  return state?.status === "ok" && state.mode !== "count_status";
}

export function getDoorOpenerRuntimeText(
  state: DoorOpenerRuntimeState | null,
  now = new Date(),
) {
  if (!state || state.status !== "ok") return null;

  switch (state.mode) {
    case "open_at":
      return getSingleScheduleText("열림", state.start, state, now);
    case "close_at":
      return getSingleScheduleText("닫힘", state.end, state, now);
    case "window":
      return getWindowText(state, now);
    case "alternate_24h":
      return getAlternateText(state, now);
    case "lock_days":
      return getLockDaysText(state, now);
    case "activity_boost":
    case "overpollination_guard":
    case "return_limit":
      return `${state.end ?? "0"}마리 기준 적용 중`;
    default:
      return null;
  }
}

function isDoorOpenerRuntimeState(value: unknown): value is DoorOpenerRuntimeState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<DoorOpenerRuntimeState>;
  return (
    typeof state.cardId === "string" &&
    typeof state.title === "string" &&
    typeof state.mode === "string" &&
    typeof state.activatedAt === "number" &&
    typeof state.result === "string" &&
    (state.status === "ok" || state.status === "error" || state.status === "unknown")
  );
}

function getSingleScheduleText(
  actionLabel: "열림" | "닫힘",
  timeText: string | undefined,
  state: DoorOpenerRuntimeState,
  now: Date,
) {
  const time = parseTime(timeText);
  if (!time) return null;

  const activatedAt = new Date(state.activatedAt);
  const target = state.repeat
    ? nextDailyAt(now, time.hour, time.minute)
    : nextDailyAt(activatedAt, time.hour, time.minute);

  if (!state.repeat && now.getTime() >= target.getTime()) {
    return `${formatClock(target)} ${actionLabel} 적용됨`;
  }
  return `${formatRemaining(target, now)} 후 ${actionLabel === "열림" ? "열린다" : "닫힌다"}`;
}

function getWindowText(state: DoorOpenerRuntimeState, now: Date) {
  const start = parseTime(state.start);
  const end = parseTime(state.end);
  if (!start || !end) return null;

  const startToday = atTime(now, start.hour, start.minute);
  let endToday = atTime(now, end.hour, end.minute);
  const overnight = endToday.getTime() <= startToday.getTime();

  if (overnight && now.getTime() >= startToday.getTime()) {
    endToday = new Date(endToday.getTime() + DAY_MS);
  }

  const inWindow = overnight
    ? now.getTime() >= startToday.getTime() || now.getTime() < atTime(now, end.hour, end.minute).getTime()
    : now.getTime() >= startToday.getTime() && now.getTime() < endToday.getTime();

  if (inWindow) {
    const closeAt = now.getTime() < endToday.getTime()
      ? endToday
      : new Date(atTime(now, end.hour, end.minute).getTime() + DAY_MS);
    return `열림 중 · ${formatRemaining(closeAt, now)} 후 닫힌다`;
  }

  const openAt = nextDailyAt(now, start.hour, start.minute);
  return `닫힘 중 · ${formatRemaining(openAt, now)} 후 열린다`;
}

function getAlternateText(state: DoorOpenerRuntimeState, now: Date) {
  const elapsed = Math.max(0, now.getTime() - state.activatedAt);
  const phase = Math.floor(elapsed / DAY_MS);
  const closeFirst = state.start !== "open_first";
  const closed = closeFirst ? phase % 2 === 0 : phase % 2 === 1;
  const nextChange = new Date(state.activatedAt + (phase + 1) * DAY_MS);
  return `${closed ? "닫힘" : "열림"} 중 · ${formatRemaining(nextChange, now)} 후 ${
    closed ? "열린다" : "닫힌다"
  }`;
}

function getLockDaysText(state: DoorOpenerRuntimeState, now: Date) {
  const days = Number(state.start);
  if (!Number.isFinite(days) || days <= 0) return null;

  const unlockAt = new Date(state.activatedAt + Math.floor(days) * DAY_MS);
  if (now.getTime() >= unlockAt.getTime()) return "잠금 기간 종료";
  return `닫힘 중 · ${formatRemaining(unlockAt, now)} 후 열린다`;
}

function parseTime(value: string | undefined) {
  const match = value?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function atTime(base: Date, hour: number, minute: number) {
  const next = new Date(base);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function nextDailyAt(base: Date, hour: number, minute: number) {
  const next = atTime(base, hour, minute);
  if (next.getTime() <= base.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function formatClock(date: Date) {
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${meridiem} ${displayHour}:${minute}`;
}

function formatRemaining(target: Date, now: Date) {
  const diffMinutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60000));
  const days = Math.floor(diffMinutes / (24 * 60));
  const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
  const minutes = diffMinutes % 60;

  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

import { DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from "react-native";
import type { EmitterSubscription } from "react-native";
import type { NfcDoorCardConfig, NfcDoorMode } from "../components/nfcDoorCards";

const HCE_RESULT_EVENT = "WeBeeHceResult";
const HCE_STATS_EVENT = "WeBeeHceStats";
const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const POSITIVE_INT_PATTERN = /^[1-9]\d*$/;

interface WeBeeHceNativeModule {
  setActiveCard(payload: HceCardPayload): Promise<boolean>;
}

export interface HceCardPayload {
  title: string;
  mode: NfcDoorMode;
  start?: string;
  end?: string;
  repeat: boolean;
}

export interface BeeTrafficCounts {
  entranceIn: number;
  entranceOut: number;
  exitIn: number;
  exitOut: number;
}

export interface HceResultEvent {
  result: string;
  status: "ok" | "error" | "unknown";
  command?: string;
  detail?: string;
  counts?: BeeTrafficCounts;
  deviceId?: string;
}

export interface HceStatsBucket {
  deviceId?: string;
  start: string;
  end: string;
  closed: boolean;
  counts: BeeTrafficCounts;
}

export interface HceClimateSample {
  deviceId?: string;
  time: string;
  temperatureC: number;
  humidityPercent: number;
}

export type HceStatsEvent =
  | { raw: string; type: "begin"; deviceId?: string }
  | { raw: string; type: "boot"; deviceId?: string; counts: BeeTrafficCounts }
  | ({ raw: string; type: "bucket" } & HceStatsBucket)
  | ({ raw: string; type: "climate" } & HceClimateSample)
  | { raw: string; type: "end"; deviceId?: string; hourlyActive: boolean }
  | { raw: string; type: "unknown" };

const WeBeeHceModule = NativeModules.WeBeeHceModule as
  | WeBeeHceNativeModule
  | undefined;

function sanitizeTitle(title: string) {
  return title.replace(/\|/g, " ").trim() || "WeBee";
}

function normalizeTime(value: string | undefined, fallback: string) {
  const trimmed = value?.trim() ?? "";
  return HH_MM_PATTERN.test(trimmed) ? trimmed : fallback;
}

function normalizeLockDays(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return POSITIVE_INT_PATTERN.test(trimmed) ? trimmed : "1";
}

function normalizeAlternateStart(value: string | undefined) {
  return value === "open_first" ? "open_first" : "close_first";
}

function normalizeCountTarget(value: string | undefined, fallback: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

export function toHceCardPayload(card: NfcDoorCardConfig): HceCardPayload {
  const title = sanitizeTitle(card.title);
  const repeat = card.repeat ?? false;

  switch (card.mode) {
    case "open_now":
      return { title, mode: "open_now", start: "", end: "", repeat: false };
    case "close_now":
      return { title, mode: "close_now", start: "", end: "", repeat: false };
    case "open_at":
      return {
        title,
        mode: "open_at",
        start: normalizeTime(card.start, "09:00"),
        end: "",
        repeat,
      };
    case "close_at":
      return {
        title,
        mode: "close_at",
        start: "",
        end: normalizeTime(card.end, "18:00"),
        repeat,
      };
    case "window":
      return {
        title,
        mode: "window",
        start: normalizeTime(card.start, "09:00"),
        end: normalizeTime(card.end, "14:00"),
        repeat,
      };
    case "alternate_24h":
      return {
        title,
        mode: "alternate_24h",
        start: normalizeAlternateStart(card.start),
        end: "",
        repeat,
      };
    case "lock_days":
      return {
        title,
        mode: "lock_days",
        start: normalizeLockDays(card.start),
        end: "",
        repeat: false,
      };
    case "count_status":
      return { title, mode: "count_status", start: "", end: "", repeat: false };
    case "activity_boost":
      return {
        title,
        mode: "activity_boost",
        start: normalizeCountTarget(card.start, "exit_out"),
        end: normalizeLockDays(card.end),
        repeat: false,
      };
    case "overpollination_guard":
      return {
        title,
        mode: "overpollination_guard",
        start: normalizeCountTarget(card.start, "exit_out"),
        end: normalizeLockDays(card.end),
        repeat: false,
      };
    case "return_limit":
      return {
        title,
        mode: "return_limit",
        start: normalizeCountTarget(card.start, "entrance_in"),
        end: normalizeLockDays(card.end),
        repeat: false,
      };
  }
}

export function parseHceResult(result: string): HceResultEvent {
  const [prefix, command, ...rest] = result.split("|");
  const detail = rest.join("|");
  const counts = parseTrafficCounts(rest);
  const deviceId = parseDeviceId(rest);

  return {
    result,
    status: prefix === "OK" ? "ok" : prefix === "ERR" ? "error" : "unknown",
    command,
    detail,
    counts,
    deviceId,
  };
}

export function parseHceStats(stats: string): HceStatsEvent {
  const [prefix, kind, ...rest] = stats.split("|");
  if (prefix !== "ST") {
    return { raw: stats, type: "unknown" };
  }

  if (kind === "BOOT") {
    const deviceId = parseDeviceId(rest);
    const counts = parseCountsCsv(rest.find((part) => !part.startsWith("D=")));
    return counts ? { raw: stats, type: "boot", deviceId, counts } : { raw: stats, type: "unknown" };
  }

  if (kind === "BEGIN") {
    return { raw: stats, type: "begin", deviceId: parseDeviceId(rest) };
  }

  if (kind === "B") {
    const deviceId = parseDeviceId(rest);
    const payload = rest.filter((part) => !part.startsWith("D="));
    const [start, end, closedFlag, countsText] = payload;
    const counts = parseCountsCsv(countsText);
    if (!start || !end || !counts) {
      return { raw: stats, type: "unknown" };
    }

    return {
      raw: stats,
      type: "bucket",
      deviceId,
      start,
      end,
      closed: closedFlag === "1",
      counts,
    };
  }

  if (kind === "CL") {
    const deviceId = parseDeviceId(rest);
    const payload = rest.filter((part) => !part.startsWith("D="));
    const [time, temperatureText, humidityText] = payload;
    const temperatureC = Number(temperatureText) / 10;
    const humidityPercent = Number(humidityText) / 10;
    if (!time || !Number.isFinite(temperatureC) || !Number.isFinite(humidityPercent)) {
      return { raw: stats, type: "unknown" };
    }

    return {
      raw: stats,
      type: "climate",
      deviceId,
      time,
      temperatureC,
      humidityPercent,
    };
  }

  if (kind === "END") {
    const deviceId = parseDeviceId(rest);
    const payload = rest.filter((part) => !part.startsWith("D="));
    return {
      raw: stats,
      type: "end",
      deviceId,
      hourlyActive: payload[0] === "1",
    };
  }

  return { raw: stats, type: "unknown" };
}

function parseTrafficCounts(parts: string[]): BeeTrafficCounts | undefined {
  const countPart = parts.find((part) => part.startsWith("C="));
  if (!countPart) return undefined;

  return parseCountsCsv(countPart.slice(2));
}

function parseDeviceId(parts: string[]): string | undefined {
  const devicePart = parts.find((part) => part.startsWith("D="));
  const deviceId = devicePart?.slice(2).trim();
  return deviceId || undefined;
}

function parseCountsCsv(value: string | undefined): BeeTrafficCounts | undefined {
  if (!value) return undefined;

  const [entranceIn, entranceOut, exitIn, exitOut] = value
    .split(",")
    .map((item) => Number(item));

  if ([entranceIn, entranceOut, exitIn, exitOut].some((item) => !Number.isFinite(item))) {
    console.warn("[WeBee HCE] Failed to parse traffic counts", { value });
    return undefined;
  }

  return { entranceIn, entranceOut, exitIn, exitOut };
}

function createHceEmitter() {
  return Platform.OS === "android" && WeBeeHceModule
    ? new NativeEventEmitter(WeBeeHceModule as never)
    : DeviceEventEmitter;
}

export function subscribeHceResult(
  listener: (event: HceResultEvent) => void,
): EmitterSubscription {
  return createHceEmitter().addListener(HCE_RESULT_EVENT, (payload: { result?: string }) => {
    const result = payload?.result ?? "";
    const parsed = parseHceResult(result);

    listener(parsed);
  });
}

export function subscribeHceStats(
  listener: (event: HceStatsEvent) => void,
): EmitterSubscription {
  return createHceEmitter().addListener(HCE_STATS_EVENT, (payload: { stats?: string }) => {
    const stats = payload?.stats ?? "";
    const parsed = parseHceStats(stats);

    listener(parsed);
  });
}

export async function setActiveHceCard(card: NfcDoorCardConfig) {
  const payload = toHceCardPayload(card);

  if (Platform.OS !== "android") {
    console.warn("[WeBee HCE] Android HCE is only available on Android", {
      platform: Platform.OS,
      payload,
    });
    return false;
  }

  if (!WeBeeHceModule?.setActiveCard) {
    console.warn("[WeBee HCE] NativeModules.WeBeeHceModule is unavailable", {
      payload,
    });
    return false;
  }

  try {
    await WeBeeHceModule.setActiveCard(payload);
    return true;
  } catch (error) {
    console.error("[WeBee HCE] active card update failed", { payload, error });
    return false;
  }
}

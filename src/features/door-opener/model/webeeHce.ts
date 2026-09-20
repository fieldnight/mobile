import { DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from "react-native";
import type { EmitterSubscription } from "react-native";
import type { NfcDoorCardConfig, NfcDoorMode } from "../components/nfcDoorCards";

import { encodeNfcCard } from "./nfcWire";
import { createNfcStatsAssembler } from "./nfcStatsFragments";

const HCE_RESULT_EVENT = "WeBeeHceResult";
const HCE_STATS_EVENT = "WeBeeHceStats";

interface WeBeeHceNativeModule {
  getProtocolVersion?(): Promise<number>;
  clearActiveCard?(): Promise<boolean>;
  setActiveCard(payload: HceCardPayload): Promise<boolean>;
}

export type HceNativeMode = NfcDoorMode;

export interface HceCardPayload {
  wirePayload: string;
  title: string;
  mode: HceNativeMode;
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

export function toHceCardPayload(card: NfcDoorCardConfig): HceCardPayload {
  return {
    title: sanitizeTitle(card.title),
    mode: card.mode,
    start: card.start ?? "",
    end: card.end ?? "",
    repeat: card.repeat ?? false,
    wirePayload: encodeNfcCard(card),
  };
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
  const assemble = createNfcStatsAssembler();
  return createHceEmitter().addListener(HCE_STATS_EVENT, (payload: { stats?: string }) => {
    const stats = assemble(payload?.stats ?? "");
    if (stats === null) return;
    const parsed = parseHceStats(stats);

    listener(parsed);
  });
}

export async function clearActiveHceCard() {
  await WeBeeHceModule?.clearActiveCard?.();
}

export async function setActiveHceCard(card: NfcDoorCardConfig) {
  let payload: HceCardPayload;
  try {
    payload = toHceCardPayload(card);
  } catch (error) {
    // A rejected card must not leave another card armed for the next tap.
    await WeBeeHceModule?.clearActiveCard?.();
    throw error;
  }

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

  if (!WeBeeHceModule.getProtocolVersion || await WeBeeHceModule.getProtocolVersion() < 2) {
    throw new Error("새 NFC 형식을 지원하는 앱 업데이트가 필요해요.");
  }
  try {
    await WeBeeHceModule.setActiveCard(payload);
    return true;
  } catch (error) {
    console.error("[WeBee HCE] active card update failed", { payload, error });
    await WeBeeHceModule.clearActiveCard?.();
    throw new Error("NFC 카드 활성화에 실패했어요. 다시 시도해주세요.");
  }
}

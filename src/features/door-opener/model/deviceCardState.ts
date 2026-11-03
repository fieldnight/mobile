import type { DoorOpenerRuntimeState } from "./doorOpenerRuntime";
import type { GateCurrentCommand } from "../api/gateCommandsApi";
import type { GateData } from "@/types/gate-control";
import type { GateOpenState } from "../components/nfcDoorCards";

interface ServerCardPayload {
  start?: string;
  end?: string;
  repeat?: boolean;
  days?: string[];
  countRange?: { low: number; high: number };
  timeWindow?: { start: string; end: string };
  rules?: { within: GateOpenState; above: GateOpenState };
}

export interface DeviceCardState {
  deviceId: string;
  runtime: DoorOpenerRuntimeState | null;
  source: "offline" | "online";
  confirmedAt: number;
}

export function normalizeGateMac(value?: string): string | undefined {
  const compact = value?.trim().replace(/[:-]/g, "").toUpperCase();
  return compact && /^[0-9A-F]{12}$/.test(compact)
    ? compact.match(/.{2}/g)!.join(":") : undefined;
}

export function gateDisplayName(deviceId: string, gates: GateData[]) {
  const mac = normalizeGateMac(deviceId);
  return (mac && gates.find(gate => normalizeGateMac(gate.macAddress) === mac)?.name.trim()) || deviceId;
}

/** Reject stale server results and failed/query-only NFC cards. */
export function mergeDeviceCardState(records: Record<string, DeviceCardState>, next: DeviceCardState) {
  const mac = normalizeGateMac(next.deviceId);
  if (!mac || !Number.isFinite(next.confirmedAt) || next.confirmedAt < 0 ||
      (next.runtime && (next.runtime.status !== "ok" || next.runtime.mode === "count_status"))) return records;
  const current = records[mac];
  if (current && current.confirmedAt > next.confirmedAt) return records;
  return { ...records, [mac]: { ...next, deviceId: mac,
    runtime: next.runtime ? { ...next.runtime, deviceId: mac } : null } };
}

export function runtimeFromServerCommand(command: GateCurrentCommand, deviceId: string): DoorOpenerRuntimeState | null {
  const modes = { OPEN_NOW: "open_now", CLOSE_NOW: "close_now", OPEN_AT: "open_at", CLOSE_AT: "close_at",
    WINDOW: "window", ALTERNATE_24H: "alternate_24h", COUNT_CONTROL: "count_control" } as const;
  const mode = modes[command.cardType as keyof typeof modes];
  const activatedAt = Date.parse(command.appliedAt);
  if (!mode || !Number.isFinite(activatedAt)) return null;
  const payload = command.payload as ServerCardPayload | null;
  const control = payload && mode === "count_control" && payload.countRange && payload.timeWindow && payload.rules
    ? { low: payload.countRange.low, high: payload.countRange.high,
      timeWindowStart: payload.timeWindow.start, timeWindowEnd: payload.timeWindow.end,
      within: payload.rules.within, above: payload.rules.above,
      repeatDays: Object.fromEntries(["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map(day =>
        [day, Array.isArray(payload.days) && payload.days.includes(day)])) } : undefined;
  return { deviceId, cardId: `online:${command.commandId}`, title: command.title, mode,
    start: payload?.start, end: payload?.end, repeat: !!payload?.repeat || !!control?.repeatDays && Object.values(control.repeatDays).some(Boolean),
    countControl: control as DoorOpenerRuntimeState["countControl"],
    activatedAt, status: "ok", result: `online:${command.commandId}`, command: mode };
}

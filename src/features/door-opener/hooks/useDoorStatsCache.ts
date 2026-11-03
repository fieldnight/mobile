import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BeeTrafficCounts, HceClimateSample } from "../model/webeeHce";
import type { DoorOpenerRuntimeState } from "../model/doorOpenerRuntime";
import { normalizeGateMac } from "../model/deviceCardState";
import { useDoorDeviceState } from "@/stores/useDoorDeviceState";
import { useGateStore } from "@/stores/useGateStore";
import { migrateDeviceCards } from "../model/migrateDeviceCards";

export interface CachedDoorSummary {
  deviceId: string;
  bootCounts?: BeeTrafficCounts;
  climateSamples: HceClimateSample[];
  lastUpdatedAt?: number;
  runtimeState?: DoorOpenerRuntimeState;
}

/** Refresh on returning from NFC/report screens, using the same saved snapshots. */
export function useDoorStatsCache() {
  const gates = useGateStore(state => state.gates);
  const [devices, setDevices] = useState<Record<string, CachedDoorSummary>>({});
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    void migrateDeviceCards(gates);
    void AsyncStorage.getItem("ourbee:door-opener-stats-cache:v2").then(raw => {
      if (!raw || cancelled) return;
      const cached = JSON.parse(raw);
      const next: Record<string, CachedDoorSummary> = {};
      for (const device of Object.values(cached.devices ?? {}) as Array<CachedDoorSummary & { isMock?: boolean }>) {
        const mac = normalizeGateMac(device.deviceId);
        if (!mac || device.isMock) continue;
        next[mac] = device;
        if (device.runtimeState) useDoorDeviceState.getState().confirm({ deviceId: mac,
          runtime: device.runtimeState, source: "offline", confirmedAt: device.runtimeState.activatedAt });
      }
      setDevices(next);
    }).catch(error => console.warn("[Door Summary] 기록 복구 실패", error));
    return () => { cancelled = true; };
  }, [gates]));
  return devices;
}

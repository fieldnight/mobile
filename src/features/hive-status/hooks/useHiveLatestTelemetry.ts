import { useEffect, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { useHiveStore } from "@/stores/useHiveStore";
import type { HiveTelemetry } from "@/types/hive-telemetry";
import { getHiveTelemetryHour, type HiveTelemetryPoint } from "../api/telemetryApi";

export const HIVE_LATEST_TELEMETRY_QUERY_KEY = "hive-latest-telemetry";
// 실시간 연결 대신 이 주기로 마지막 측정값을 조회합니다. 앱이 백그라운드면 조회하지 않습니다.
const REFRESH_MS = 60_000;

function hasReading(point: HiveTelemetryPoint) {
  return point.internalTemperature != null || point.externalTemperature != null;
}

/** "14:05", "14:05:30" 같은 label을 조회한 시간대 날짜에 붙여 측정 시각으로 만듭니다. */
function toRecordedAt(hourStart: Date, label: string) {
  const match = label.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const date = new Date(hourStart);
  if (match) date.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
  return date.toISOString();
}

function toTelemetry(point: HiveTelemetryPoint, recordedAt: string): HiveTelemetry {
  return {
    internalTemperature: point.internalSensorValid === false ? null : point.internalTemperature,
    internalHumidity: point.internalSensorValid === false ? null : point.internalHumidity,
    externalTemperature: point.externalSensorValid === false ? null : point.externalTemperature,
    externalHumidity: point.externalSensorValid === false ? null : point.externalHumidity,
    co2: point.co2,
    peltierMode: point.peltierMode,
    peltierDutyPct: point.peltierDutyPct,
    fanHotDutyPct: point.fanHotDutyPct,
    fanColdDutyPct: point.fanColdDutyPct,
    fanState: point.fanState,
    targetTemperature: point.targetTemperature,
    internalSensorValid: point.internalSensorValid,
    externalSensorValid: point.externalSensorValid,
    peltierCoolCurrentA: point.peltierCoolCurrentA,
    peltierHeatCurrentA: point.peltierHeatCurrentA,
    recordedAt,
  };
}

/** 현재 시간대(없으면 직전 시간대)의 1분 기록에서 마지막 측정값을 찾습니다. */
export async function getHiveLatestTelemetry(hiveId: string): Promise<HiveTelemetry | null> {
  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);

  for (let back = 0; back < 2; back += 1) {
    const from = new Date(hourStart.getTime() - back * 3_600_000);
    const response = await getHiveTelemetryHour({ hiveId, from, interval: "ONE_MIN" });
    const latest = [...response.data].reverse().find(hasReading);
    if (latest) return toTelemetry(latest, toRecordedAt(from, latest.label));
  }
  return null;
}

/**
 * 벌통마다 마지막 측정값을 주기적으로 조회해 공용 벌통 store에 반영합니다.
 * 오래된 측정값이면 store의 연결 판단(3분 기준)에 따라 오프라인으로 표시됩니다.
 */
export function useHiveLatestTelemetrySync(hiveIds: string[]) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const updateHiveTelemetry = useHiveStore((state) => state.updateHiveTelemetry);
  const appliedRef = useRef(new Map<string, number>());

  const results = useQueries({
    queries: hiveIds.map((hiveId) => ({
      queryKey: [HIVE_LATEST_TELEMETRY_QUERY_KEY, hiveId],
      queryFn: () => getHiveLatestTelemetry(hiveId),
      enabled: isAuthenticated && hiveId !== "",
      refetchInterval: REFRESH_MS,
      staleTime: REFRESH_MS / 2,
      retry: 1,
    })),
  });

  // 새로 받은 응답만 한 번씩 반영합니다. 매 렌더마다 store를 갱신하면 렌더가 반복됩니다.
  useEffect(() => {
    hiveIds.forEach((hiveId, index) => {
      const result = results[index];
      if (!result?.data || appliedRef.current.get(hiveId) === result.dataUpdatedAt) return;
      appliedRef.current.set(hiveId, result.dataUpdatedAt);
      updateHiveTelemetry(hiveId, result.data);
    });
  }, [hiveIds, results, updateHiveTelemetry]);

  return results;
}

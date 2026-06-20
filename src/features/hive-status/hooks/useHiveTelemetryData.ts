import { useQuery } from "@tanstack/react-query";
import type { DataPoint, Period } from "@/types";
import {
  getHiveTelemetry,
  type HiveTelemetryResponse,
  type HiveTelemetrySensorType,
  mergeTelemetryData,
} from "../api/telemetryApi";

interface UseHiveTelemetryDataParams {
  hiveId: string;
  period: Period;
  fallbackData: DataPoint[];
}

const HIVE_TELEMETRY_QUERY_KEY = "hive-telemetry";
const SENSOR_TYPES: HiveTelemetrySensorType[] = [
  "INTERNAL_TEMPERATURE",
  "INTERNAL_HUMIDITY",
  "CO2",
];

function getSettledValue(
  result: PromiseSettledResult<HiveTelemetryResponse>,
) {
  return result.status === "fulfilled" ? result.value : undefined;
}

/**
 * 벌통 통계 화면용 센서 데이터 hook.
 * API가 센서별로 나뉘어 있어 온도/습도/CO2를 병렬 조회한 뒤 차트 데이터로 합친다.
 */
export function useHiveTelemetryData({
  hiveId,
  period,
  fallbackData,
}: UseHiveTelemetryDataParams) {
  return useQuery({
    queryKey: [HIVE_TELEMETRY_QUERY_KEY, hiveId, period],
    enabled: hiveId !== "",
    retry: 1,
    queryFn: async () => {
      console.log("[Hive Telemetry Hook] 센서 데이터 병렬 조회 시작", {
        hiveId,
        period,
        sensors: SENSOR_TYPES,
      });

      const results = await Promise.allSettled([
        getHiveTelemetry({
          hiveId,
          period,
          sensorType: "INTERNAL_TEMPERATURE",
        }),
        getHiveTelemetry({
          hiveId,
          period,
          sensorType: "INTERNAL_HUMIDITY",
        }),
        getHiveTelemetry({
          hiveId,
          period,
          sensorType: "CO2",
        }),
      ]);

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error("[Hive Telemetry Hook] 센서 일부 조회 실패", {
            hiveId,
            period,
            sensorType: SENSOR_TYPES[index],
            reason: result.reason,
          });
        }
      });

      const merged = mergeTelemetryData(
        fallbackData,
        getSettledValue(results[0]),
        getSettledValue(results[1]),
        getSettledValue(results[2]),
      );

      console.log("[Hive Telemetry Hook] 센서 데이터 화면 반영 준비", {
        hiveId,
        period,
        count: merged.length,
      });

      return merged;
    },
  });
}

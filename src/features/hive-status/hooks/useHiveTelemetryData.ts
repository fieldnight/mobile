import { useQuery } from "@tanstack/react-query";
import type { DataPoint, Period } from "@/types";
import {
  getHiveTelemetry,
  HIVE_TELEMETRY_SENSORS,
  mergeTelemetryData,
  type HiveTelemetryResponse,
  type HiveTelemetrySensorType,
} from "../api/telemetryApi";

interface UseHiveTelemetryDataParams {
  hiveId: string;
  period: Period;
  fallbackData: DataPoint[];
}

const HIVE_TELEMETRY_QUERY_KEY = "hive-telemetry";

/**
 * 벌통 통계 화면의 센서 데이터 hook.
 * 내부 온도, 외부 온도, 내부 습도, 외부 습도, CO2를 병렬 조회한 뒤
 * 서버 응답의 label/value를 차트/표 데이터로 합칩니다.
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
        sensors: HIVE_TELEMETRY_SENSORS.map((sensor) => sensor.sensorType),
      });

      const results = await Promise.allSettled(
        HIVE_TELEMETRY_SENSORS.map(({ sensorType }) =>
          getHiveTelemetry({ hiveId, period, sensorType }),
        ),
      );

      const responses: Partial<Record<HiveTelemetrySensorType, HiveTelemetryResponse>> = {};

      results.forEach((result, index) => {
        const sensorType = HIVE_TELEMETRY_SENSORS[index].sensorType;

        if (result.status === "fulfilled") {
          responses[sensorType] = result.value;
          return;
        }

        console.error("[Hive Telemetry Hook] 센서별 조회 실패", {
          hiveId,
          period,
          sensorType,
          reason: result.reason,
        });
      });

      const merged = mergeTelemetryData(fallbackData, responses, period);

      console.log("[Hive Telemetry Hook] 센서 데이터 화면 반영 준비", {
        hiveId,
        period,
        count: merged.length,
      });

      return merged;
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import type { DataPoint, Period } from "@/types";
import { getHiveTelemetry, mergeTelemetryData } from "../api/telemetryApi";

interface UseHiveTelemetryDataParams {
  hiveId: string;
  period: Period;
  fallbackData: DataPoint[];
}

const HIVE_TELEMETRY_QUERY_KEY = "hive-telemetry";

/**
 * 벌통 통계 화면의 센서 데이터 hook.
 * 전체 센서 필드를 한 번에 조회한 뒤 서버 응답의 label을 기준으로 차트/표 데이터로 합칩니다.
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
    refetchInterval: period === "일간" ? 60_000 : false,
    queryFn: async () => {
      console.log("[Hive Telemetry Hook] 센서 데이터 조회 시작", {
        hiveId,
        period,
      });

      const response = await getHiveTelemetry({ hiveId, period });
      const merged = mergeTelemetryData(fallbackData, response, period);

      console.log("[Hive Telemetry Hook] 센서 데이터 화면 반영 준비", {
        hiveId,
        period,
        count: merged.length,
      });

      return merged;
    },
  });
}

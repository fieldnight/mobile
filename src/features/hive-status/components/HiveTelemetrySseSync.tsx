import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useHiveTelemetrySse,
  type HiveTelemetryEvent,
} from "@/features/hive-control/hooks";
import { useHiveStore } from "@/stores/useHiveStore";

/**
 * 앱이 로그인된 동안 센서 SSE를 구독하고 공용 벌통 상태와 통계 캐시를 동기화합니다.
 */
export function HiveTelemetrySseSync() {
  const queryClient = useQueryClient();
  const updateHiveTelemetry = useHiveStore(
    (state) => state.updateHiveTelemetry,
  );

  const handleTelemetry = useCallback(
    (event: HiveTelemetryEvent) => {
      const hiveId = String(event.hiveId);

      updateHiveTelemetry(hiveId, {
        internalTemperature: event.internalTemperature,
        internalHumidity: event.internalHumidity,
        externalTemperature: event.externalTemperature,
        externalHumidity: event.externalHumidity,
      });

      // 열려 있는 통계 화면만 최신 집계값을 다시 조회합니다.
      queryClient.invalidateQueries({
        queryKey: ["hive-telemetry", hiveId],
        refetchType: "active",
      });
    },
    [queryClient, updateHiveTelemetry],
  );

  useHiveTelemetrySse({ enabled: true, onTelemetry: handleTelemetry });

  return null;
}

import { useCallback, useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useHiveConnectionStatuses } from "@/features/hive/hooks";
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
  const hives = useHiveStore((state) => state.hives);
  const ids = useMemo(() => hives.map((hive) => hive.id), [hives]);
  useHiveConnectionStatuses(ids);
  useEffect(() => {
    const refresh = () => useHiveStore.getState().refreshPresence();
    refresh();
    // 로컬 시간 표시만 갱신하며 네트워크 요청은 하지 않습니다.
    const timer = setInterval(refresh, 15_000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
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
        recordedAt: event.recordedAt,
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

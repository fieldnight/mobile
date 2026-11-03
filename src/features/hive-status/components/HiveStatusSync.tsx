import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useHiveConnectionStatuses } from "@/features/hive/hooks";
import { useHiveStore } from "@/stores/useHiveStore";
import { useHiveLatestTelemetrySync } from "../hooks/useHiveLatestTelemetry";

/**
 * 로그인된 동안 벌통 연결 상태와 마지막 측정값을 1분마다 조회해 공용 store에 반영합니다.
 * 실시간(SSE) 연결은 계속 열어두지 않고, 실시간 센서 화면과 목표 온도 적용 중에만 엽니다.
 */
export function HiveStatusSync() {
  const hives = useHiveStore((state) => state.hives);
  const ids = useMemo(() => hives.map((hive) => hive.id), [hives]);
  useHiveConnectionStatuses(ids);
  useHiveLatestTelemetrySync(ids);

  useEffect(() => {
    const refresh = () => useHiveStore.getState().refreshPresence();
    refresh();
    // 로컬 시간 표시만 갱신하며 네트워크 요청은 하지 않습니다.
    const timer = setInterval(refresh, 15_000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  return null;
}

import type { HiveData } from "@/types/hive-control";

// 1분 전송에서 일시적인 지연을 허용합니다. 이 시간은 네트워크 조회 주기가 아닙니다.
export const HIVE_STALE_MS = 3 * 60_000;

export function refreshPresence(hive: HiveData, now = Date.now()): HiveData {
  // 실시간 연결을 상시 유지하지 않으므로, 측정값 수신 시각과
  // 서버의 연결 확인(장치가 연결돼 있다고 응답한 시각) 중 최근 것을 온라인 근거로 씁니다.
  const serverProof = hive.serverConnected ? hive.connectionCheckedAt ?? 0 : 0;
  const lastProof = Math.max(hive.telemetryReceivedAt ?? 0, serverProof);
  const status = !lastProof || now - lastProof >= HIVE_STALE_MS ? "offline" : hive.status;
  const measuredAt = hive.measuredAt;
  const age = measuredAt == null ? Infinity : Math.max(0, now - measuredAt);
  const ageLabel = age < 60_000 ? "방금" : `${Math.floor(age / 60_000)}분 전`;
  const lastUpdate = measuredAt == null ? "측정값 수신 대기" :
    status === "offline" || age >= HIVE_STALE_MS ? `마지막 측정값 · ${ageLabel}` : ageLabel;
  return status === hive.status && lastUpdate === hive.lastUpdate ? hive : { ...hive, status, lastUpdate };
}

/** 서버 상태를 우선하고 센서 값만 보존합니다. 목록에 상태가 없으면 기존 확인 결과를 유지합니다. */
export function mergeHive(previous: HiveData | undefined, incoming: HiveData): HiveData {
  const hasServerStatus = incoming.connectionCheckedAt != null;
  if (!previous) {
    return refreshPresence({ ...incoming, serverConnected: hasServerStatus ? incoming.status === "online" : undefined });
  }
  return refreshPresence({
    ...incoming,
    status: hasServerStatus ? incoming.status : previous.status,
    connectionCheckedAt: hasServerStatus ? incoming.connectionCheckedAt : previous.connectionCheckedAt,
    serverConnected: hasServerStatus ? incoming.status === "online" : previous.serverConnected,
    disconnectedAt: hasServerStatus && incoming.status === "offline"
      ? incoming.connectionCheckedAt : previous.disconnectedAt,
    temperature: previous.temperature,
    humidity: previous.humidity,
    externalTemperature: previous.externalTemperature,
    externalHumidity: previous.externalHumidity,
    telemetry: previous.telemetry,
    measuredAt: previous.measuredAt,
    telemetryReceivedAt: previous.telemetryReceivedAt,
  });
}

import type { HiveData } from "@/types/hive-control";

// 1분 전송에서 일시적인 지연을 허용합니다. 이 시간은 네트워크 조회 주기가 아닙니다.
export const HIVE_STALE_MS = 3 * 60_000;

export function refreshPresence(hive: HiveData, now = Date.now()): HiveData {
  // REST 조회 성공은 앱이 센서를 실시간으로 받고 있다는 증거가 아닙니다.
  // 벌통별 실제 수신 기록만 온라인 표시를 유지할 수 있습니다.
  const lastProof = hive.telemetryReceivedAt ?? 0;
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
  if (!previous) return refreshPresence(incoming);
  const hasServerStatus = incoming.connectionCheckedAt != null;
  return refreshPresence({
    ...incoming,
    status: hasServerStatus ? incoming.status : previous.status,
    connectionCheckedAt: hasServerStatus ? incoming.connectionCheckedAt : previous.connectionCheckedAt,
    disconnectedAt: hasServerStatus && incoming.status === "offline"
      ? incoming.connectionCheckedAt : previous.disconnectedAt,
    temperature: previous.temperature,
    humidity: previous.humidity,
    externalTemperature: previous.externalTemperature,
    externalHumidity: previous.externalHumidity,
    measuredAt: previous.measuredAt,
    telemetryReceivedAt: previous.telemetryReceivedAt,
  });
}

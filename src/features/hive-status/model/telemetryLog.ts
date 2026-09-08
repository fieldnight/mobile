import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HiveTelemetryEvent } from "@/features/hive-control/hooks";

const TELEMETRY_LOG_STORAGE_KEY = "ourbee:hive-telemetry-log:v1";
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export interface HiveTelemetryLogRecord {
  recordedAt: string;
  internalTemperature: number;
  internalHumidity: number;
  externalTemperature: number;
  externalHumidity: number;
}

type TelemetryLogByHive = Record<string, HiveTelemetryLogRecord[]>;

let cache: TelemetryLogByHive | null = null;
let loadPromise: Promise<TelemetryLogByHive> | null = null;
// append 호출이 겹쳐도 서로 덮어쓰지 않도록 저장 작업을 순서대로 처리하는 큐입니다.
let writeQueue: Promise<void> = Promise.resolve();

function pruneOldRecords(records: HiveTelemetryLogRecord[]) {
  const cutoff = Date.now() - RETENTION_MS;
  return records.filter((record) => {
    const time = new Date(record.recordedAt).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });
}

async function loadLog(): Promise<TelemetryLogByHive> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(TELEMETRY_LOG_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as TelemetryLogByHive) : {};
      cache = parsed;
      return parsed;
    } catch (error) {
      console.warn("[Hive Telemetry Log] 저장된 로그 복구 실패", error);
      cache = {};
      return cache;
    }
  })();

  return loadPromise;
}

async function persistLog(next: TelemetryLogByHive) {
  cache = next;
  try {
    await AsyncStorage.setItem(TELEMETRY_LOG_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("[Hive Telemetry Log] 로그 저장 실패", error);
  }
}

/**
 * SSE로 수신한 텔레메트리 1건을 벌통별 7일 로그에 추가하고, 7일이 지난 기록은 정리합니다.
 * 짧은 간격으로 연달아 호출돼도 유실 없이 순서대로 반영되도록 큐에 태워 실행합니다.
 */
export function appendHiveTelemetryLog(event: HiveTelemetryEvent) {
  writeQueue = writeQueue.then(async () => {
    const log = await loadLog();
    const hiveId = String(event.hiveId);
    const nextRecords = pruneOldRecords([
      ...(log[hiveId] ?? []),
      {
        recordedAt: event.recordedAt,
        internalTemperature: event.internalTemperature,
        internalHumidity: event.internalHumidity,
        externalTemperature: event.externalTemperature,
        externalHumidity: event.externalHumidity,
      },
    ]);

    await persistLog({ ...log, [hiveId]: nextRecords });
  });

  return writeQueue;
}

/** 특정 벌통의 최근 7일 이내 로그를 오래된 순으로 반환합니다. */
export async function getHiveTelemetryLog(
  hiveId: string,
): Promise<HiveTelemetryLogRecord[]> {
  const log = await loadLog();
  const records = pruneOldRecords(log[hiveId] ?? []);
  return [...records].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
}

function dateKeyOf(recordedAt: string) {
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 저장된 로그 중 실제로 데이터가 있는 날짜(yyyy-MM-dd)를 최신순으로 반환합니다. */
export function listAvailableDateKeys(records: HiveTelemetryLogRecord[]) {
  const keys = new Set(records.map((record) => dateKeyOf(record.recordedAt)).filter(Boolean));
  return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
}

/** 특정 날짜(yyyy-MM-dd)의 특정 시간대(0~23시) 레코드만 골라 오래된 순으로 반환합니다. */
export function filterTelemetryLogByDateAndHour(
  records: HiveTelemetryLogRecord[],
  dateKey: string,
  hour: number,
) {
  return records.filter((record) => {
    const date = new Date(record.recordedAt);
    if (Number.isNaN(date.getTime())) return false;
    return dateKeyOf(record.recordedAt) === dateKey && date.getHours() === hour;
  });
}

export type TelemetryIntervalMinutes = 1 | 5 | 10;

/**
 * 원본 1분 간격 로그를 지정한 간격(분)으로 묶어, 각 구간의 마지막 값을 대표값으로 반환합니다.
 * 1분 선택 시에는 원본을 그대로 최신순으로 반환합니다.
 */
export function bucketizeTelemetryLog(
  records: HiveTelemetryLogRecord[],
  intervalMinutes: TelemetryIntervalMinutes,
): HiveTelemetryLogRecord[] {
  if (intervalMinutes <= 1 || records.length === 0) {
    return [...records].reverse();
  }

  const bucketMs = intervalMinutes * 60 * 1000;
  const buckets = new Map<number, HiveTelemetryLogRecord>();

  records.forEach((record) => {
    const time = new Date(record.recordedAt).getTime();
    if (!Number.isFinite(time)) return;
    const bucketKey = Math.floor(time / bucketMs) * bucketMs;
    buckets.set(bucketKey, record);
  });

  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, record]) => record);
}

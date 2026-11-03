import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getHiveTelemetryHour,
  mapHourlyTelemetry,
  type HiveTelemetryInterval,
} from "../api/telemetryApi";
import type { DataPoint } from "@/types";

export type HiveTelemetryHourRecord = DataPoint;

interface UseHiveTelemetryHourDataParams {
  hiveId: string;
  from: Date;
  interval: HiveTelemetryInterval;
}

export const HIVE_TELEMETRY_HOUR_QUERY_KEY = "hive-telemetry-hour";

// 미리 받아 둘 간격. 10초 간격은 기록이 많아 사용자가 고를 때만 받습니다.
const PREFETCH_INTERVALS: HiveTelemetryInterval[] = ["ONE_MIN", "FIVE_MIN", "TEN_MIN"];
const PREFETCH_DELAY_MS = 800;
const STORAGE_PREFIX = "webee-hive-hour:";
const STORAGE_INDEX_KEY = "webee-hive-hour-index";
// 휴대폰에 남겨둘 시간대 기록 수. 10초 간격 1시간은 수백 행이라 너무 많이 쌓지 않습니다.
const STORAGE_MAX_ENTRIES = 48;
const HOUR_MS = 3_600_000;

interface StoredHour {
  savedAt: number;
  /** 그 시간대가 끝난 뒤 받은 기록이면 더 바뀌지 않으므로 다시 받지 않습니다. */
  complete: boolean;
  data: DataPoint[];
}

const hourKey = (from: Date) => from.toISOString().slice(0, 13);
export const hiveTelemetryHourQueryKey = (hiveId: string, from: Date, interval: HiveTelemetryInterval) =>
  [HIVE_TELEMETRY_HOUR_QUERY_KEY, hiveId, hourKey(from), interval] as const;
const storageKeyOf = (hiveId: string, from: Date, interval: HiveTelemetryInterval) =>
  `${STORAGE_PREFIX}${hiveId}:${hourKey(from)}:${interval}`;

async function readStored(key: string): Promise<StoredHour | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredHour) : null;
  } catch {
    return null;
  }
}

async function writeStored(key: string, value: StoredHour) {
  try {
    const rawIndex = await AsyncStorage.getItem(STORAGE_INDEX_KEY);
    const index = (rawIndex ? (JSON.parse(rawIndex) as string[]) : []).filter((item) => item !== key);
    index.push(key);
    const expired = index.splice(0, Math.max(0, index.length - STORAGE_MAX_ENTRIES));
    await AsyncStorage.multiSet([
      [key, JSON.stringify(value)],
      [STORAGE_INDEX_KEY, JSON.stringify(index)],
    ]);
    if (expired.length) await AsyncStorage.multiRemove(expired);
  } catch {
    // 저장 실패는 화면 표시와 무관하므로 무시합니다.
  }
}

/** 한 시간대 기록을 가져옵니다. 이미 끝난 시간대를 휴대폰에 저장해 두었으면 네트워크 없이 바로 씁니다. */
export async function fetchHiveTelemetryHour(hiveId: string, from: Date, interval: HiveTelemetryInterval): Promise<DataPoint[]> {
  const storageKey = storageKeyOf(hiveId, from, interval);
  const stored = await readStored(storageKey);
  if (stored?.complete) return stored.data;

  const data = mapHourlyTelemetry(await getHiveTelemetryHour({ hiveId, from, interval }));
  const complete = Date.now() >= from.getTime() + HOUR_MS + 60_000;
  void writeStored(storageKey, { savedAt: Date.now(), complete, data });
  return data;
}

/**
 * 실시간 확인 화면의 시간대별 센서 데이터 hook.
 * - 간격·시간대를 바꾸는 동안 이전 표를 그대로 보여주고, 새 기록이 오면 바꿉니다(keepPreviousData).
 * - 휴대폰에 저장된 기록이 있으면 먼저 보여준 뒤 최신 기록으로 교체합니다.
 * - 한 간격을 받은 뒤 같은 시간대의 다른 간격을 미리 받아 두어, 간격 전환이 바로 보이게 합니다.
 */
export function useHiveTelemetryHourData({ hiveId, from, interval }: UseHiveTelemetryHourDataParams) {
  const queryClient = useQueryClient();
  const queryKey = hiveTelemetryHourQueryKey(hiveId, from, interval);
  const isPastHour = Date.now() >= from.getTime() + HOUR_MS + 60_000;

  const query = useQuery({
    queryKey,
    enabled: hiveId !== "",
    retry: 1,
    keepPreviousData: true,
    // 끝난 시간대는 바뀌지 않습니다. 현재 시간대는 실시간 연결이 새 값을 받을 때 다시 조회합니다.
    staleTime: isPastHour ? Infinity : 30_000,
    queryFn: () => fetchHiveTelemetryHour(hiveId, from, interval),
  });

  // 메모리에 기록이 없으면 휴대폰에 저장된 기록을 먼저 채워 넣어 로딩 없이 보여줍니다.
  useEffect(() => {
    if (!hiveId || queryClient.getQueryData(queryKey)) return;
    let cancelled = false;
    void readStored(storageKeyOf(hiveId, from, interval)).then((stored) => {
      if (cancelled || !stored || queryClient.getQueryData(queryKey)) return;
      queryClient.setQueryData(queryKey, stored.data, { updatedAt: stored.complete ? Date.now() : stored.savedAt });
    });
    return () => {
      cancelled = true;
    };
    // queryKey는 아래 값들로만 만들어집니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiveId, from.getTime(), interval, queryClient]);

  // 지금 간격을 받은 뒤 같은 시간대의 나머지 간격을 차례로 미리 받아 둡니다.
  useEffect(() => {
    if (!hiveId || !query.isSuccess || query.isPreviousData) return;
    let cancelled = false;
    // 화면 조작이 끝나고 잠시 뒤에 시작해, 미리 받기가 버튼 반응을 막지 않게 합니다.
    const timer = setTimeout(() => requestIdleCallback(() => void prefetch()), PREFETCH_DELAY_MS);
    const prefetch = async () => {
      for (const other of PREFETCH_INTERVALS) {
        if (cancelled || other === interval) continue;
        await queryClient.prefetchQuery({
          queryKey: hiveTelemetryHourQueryKey(hiveId, from, other),
          queryFn: () => fetchHiveTelemetryHour(hiveId, from, other),
          staleTime: isPastHour ? Infinity : 30_000,
        });
      }
    };
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiveId, from.getTime(), interval, query.isSuccess, query.isPreviousData, queryClient]);

  return query;
}

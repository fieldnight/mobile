import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchHiveTelemetryHour, hiveTelemetryHourQueryKey } from "@/features/hive-status";
import type { DataPoint } from "@/types";
import type { TelemetrySample } from "../model/pocAnalysis";

const HOUR_MS = 3_600_000;

/** "HH:mm:ss" label을 조회한 시간대 날짜에 붙여 측정 시각(ms)으로 만듭니다. */
function labelTime(hourStart: Date, label: string) {
  const match = label.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const date = new Date(hourStart);
  date.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
  return date.getTime();
}

function toSample(hourStart: Date, point: DataPoint): TelemetrySample | null {
  const t = labelTime(hourStart, point.label);
  if (t == null || !point.hasData) return null;
  return {
    t,
    internalTemperature: point.internalTemperature,
    externalTemperature: point.externalTemperature,
    internalHumidity: point.internalHumidity,
    externalHumidity: point.externalHumidity,
    internalSensorValid: point.internalSensorValid ?? null,
    externalSensorValid: point.externalSensorValid ?? null,
    targetTemperature: point.targetTemperature,
    peltierMode: point.peltierMode ?? null,
    peltierDutyPct: point.peltierDutyPct,
    fanHotDutyPct: point.fanHotDutyPct,
    fanColdDutyPct: point.fanColdDutyPct,
    fanState: point.fanState ?? null,
    peltierCoolCurrentA: point.peltierCoolCurrentA,
    peltierHeatCurrentA: point.peltierHeatCurrentA,
    issues: (point.issues ?? []).map((issue) => issue.code),
  };
}

/**
 * 최근 N시간의 10초 기록을 모아 분석용 표본으로 만듭니다.
 * 시간대별 조회는 실시간 확인 화면과 같은 캐시·휴대폰 저장을 쓰므로, 이미 본 시간대는 바로 열립니다.
 */
export function useAnalysisSamples(hiveId: string, hours: number) {
  // 분석 기준 시각은 화면을 열거나 기간을 바꿀 때 고정합니다. 매 렌더마다 바뀌면 조회가 반복됩니다.
  const [anchor, setAnchor] = useState(() => Date.now());
  const hourStarts = useMemo(() => {
    const current = new Date(anchor);
    current.setMinutes(0, 0, 0);
    return Array.from({ length: hours }, (_, index) => new Date(current.getTime() - (hours - 1 - index) * HOUR_MS));
  }, [anchor, hours]);

  const results = useQueries({
    queries: hourStarts.map((from) => ({
      queryKey: hiveTelemetryHourQueryKey(hiveId, from, "TEN_SEC"),
      queryFn: () => fetchHiveTelemetryHour(hiveId, from, "TEN_SEC"),
      enabled: hiveId !== "",
      retry: 1,
      staleTime: Date.now() >= from.getTime() + HOUR_MS + 60_000 ? Infinity : 30_000,
    })),
  });

  const loaded = results.filter((result) => result.data).length;
  const dataStamp = results.map((result) => result.dataUpdatedAt).join(",");
  const samples = useMemo(
    () => hourStarts.flatMap((from, index) => (results[index]?.data ?? []).map((point) => toSample(from, point)).filter((s): s is TelemetrySample => s != null)),
    // dataStamp가 바뀔 때만 다시 만듭니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hourStarts, dataStamp],
  );

  return {
    samples,
    from: hourStarts[0]?.getTime() ?? anchor,
    to: Math.min(Date.now(), anchor),
    loadedHours: loaded,
    totalHours: hours,
    loading: results.some((result) => result.isLoading),
    error: results.some((result) => result.isError),
    refresh: () => setAnchor(Date.now()),
  };
}

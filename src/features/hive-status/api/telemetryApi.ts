import { api } from "@/lib/api";
import type { DataPoint, Period } from "@/types";
import type { HiveHardwareIssue } from "@/types/hive-telemetry";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export type HiveTelemetryPeriod = "HOUR" | "DAY" | "WEEK" | "MONTH";
export type HiveTelemetryInterval = "TEN_SEC" | "ONE_MIN" | "FIVE_MIN" | "TEN_MIN";

export interface HiveTelemetryPoint {
  label: string;
  internalTemperature: number | null;
  externalTemperature: number | null;
  internalHumidity: number | null;
  externalHumidity: number | null;
  co2: number | null;
  peltierMode: string | null;
  peltierDutyPct: number | null;
  fanHotDutyPct: number | null;
  fanColdDutyPct: number | null;
  fanState: string | null;
  targetTemperature: number | null;
  internalSensorValid: boolean | null;
  externalSensorValid: boolean | null;
  peltierCoolCurrentA: number | null;
  peltierHeatCurrentA: number | null;
  issues?: HiveHardwareIssue[];
}

export interface HiveTelemetryResponse {
  period: HiveTelemetryPeriod;
  data: HiveTelemetryPoint[];
}

const PERIOD_TO_API: Record<Period, HiveTelemetryPeriod> = {
  일간: "DAY",
  주간: "WEEK",
  월간: "MONTH",
};

interface GetHiveTelemetryParams {
  hiveId: string | number;
  period: Period;
}

export async function getHiveTelemetry({
  hiveId,
  period,
}: GetHiveTelemetryParams): Promise<HiveTelemetryResponse> {
  const apiPeriod = PERIOD_TO_API[period];

  console.log("[Hive Telemetry API] 센서 데이터 조회 요청", {
    hiveId,
    endpoint: `/api/v1/hives/${hiveId}/telemetry`,
    period: apiPeriod,
  });

  try {
    const res = await api.get<ApiResponse<HiveTelemetryResponse>>(
      `/api/v1/hives/${hiveId}/telemetry`,
      {
        params: {
          period: apiPeriod,
        },
      },
    );

    console.log("[Hive Telemetry API] 센서 데이터 조회 성공", {
      hiveId,
      period: res.data.data.period,
      count: res.data.data.data.length,
      sample: res.data.data.data[0],
    });

    return res.data.data;
  } catch (error) {
    console.error("[Hive Telemetry API] 센서 데이터 조회 실패", {
      hiveId,
      period: apiPeriod,
      error,
    });
    throw error;
  }
}

/** 로컬 Date를 서버가 기대하는 타임존 없는 ISO-8601(yyyy-MM-ddTHH:mm:ss) 문자열로 변환합니다. */
function toLocalIsoString(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

interface GetHiveTelemetryHourParams {
  hiveId: string | number;
  from: Date;
  interval: HiveTelemetryInterval;
}

/** 특정 날짜의 특정 시(0~23시) 구간을 10초/1분/5분/10분 간격으로 집계한 센서 데이터를 조회합니다. */
export async function getHiveTelemetryHour({
  hiveId,
  from,
  interval,
}: GetHiveTelemetryHourParams): Promise<HiveTelemetryResponse> {
  const fromParam = toLocalIsoString(from);

  console.log("[Hive Telemetry API] 시간대별 센서 데이터 조회 요청", {
    hiveId,
    endpoint: `/api/v1/hives/${hiveId}/telemetry`,
    period: "HOUR",
    from: fromParam,
    interval,
  });

  try {
    const res = await api.get<ApiResponse<HiveTelemetryResponse>>(
      `/api/v1/hives/${hiveId}/telemetry`,
      {
        params: {
          period: "HOUR",
          from: fromParam,
          interval,
        },
      },
    );

    console.log("[Hive Telemetry API] 시간대별 센서 데이터 조회 성공", {
      hiveId,
      count: res.data.data.data.length,
      sample: res.data.data.data[0],
    });

    return res.data.data;
  } catch (error) {
    console.error("[Hive Telemetry API] 시간대별 센서 데이터 조회 실패", {
      hiveId,
      from: fromParam,
      interval,
      error,
    });
    throw error;
  }
}

/** 같은 오류가 slot마다 반복될 수 있으므로 코드와 원본 시각으로 중복을 제거합니다. */
export function collectTelemetryIssues(
  response: HiveTelemetryResponse | undefined,
  normalizeLabel: (label: string) => string = (label) => label,
): Map<string, HiveHardwareIssue[]> {
  const slots = new Map<string, Map<string, HiveHardwareIssue>>();
  response?.data.forEach((point) => {
    const label = normalizeLabel(point.label);
    const issues = slots.get(label) ?? new Map<string, HiveHardwareIssue>();
    (point.issues ?? []).forEach((issue) => {
      issues.set(JSON.stringify([issue.code, issue.timestamp]), issue);
    });
    slots.set(label, issues);
  });
  return new Map([...slots].map(([label, issues]) => [label, [...issues.values()]]));
}

function emptyPoint(label: string): DataPoint {
  return {
    label,
    internalTemperature: null,
    externalTemperature: null,
    internalHumidity: null,
    externalHumidity: null,
    co2: null,
    peltierDutyPct: null,
    fanHotDutyPct: null,
    fanColdDutyPct: null,
    targetTemperature: null,
    peltierCoolCurrentA: null,
    peltierHeatCurrentA: null,
    peltierMode: null,
    fanState: null,
    internalSensorValid: null,
    externalSensorValid: null,
    hasData: false,
  };
}

const NUMERIC_SENSOR_KEYS = [
  "internalTemperature",
  "externalTemperature",
  "internalHumidity",
  "externalHumidity",
  "co2",
  "peltierDutyPct",
  "fanHotDutyPct",
  "fanColdDutyPct",
  "targetTemperature",
  "peltierCoolCurrentA",
  "peltierHeatCurrentA",
] as const;

/** 시간대별 조회는 서버 집계값과 시각을 그대로 보존한다. 미수신은 0으로 바꾸지 않는다. */
export function mapHourlyTelemetry(response: HiveTelemetryResponse): DataPoint[] {
  const issues = collectTelemetryIssues(response);
  return response.data.map((source) => {
    const point = emptyPoint(source.label);
    for (const key of NUMERIC_SENSOR_KEYS) {
      const value = source[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        point[key] = value;
        point.hasData = true;
      }
    }
    point.peltierMode = source.peltierMode ?? null;
    point.fanState = source.fanState ?? null;
    point.internalSensorValid = source.internalSensorValid ?? null;
    point.externalSensorValid = source.externalSensorValid ?? null;
    point.issues = issues.get(source.label) ?? [];
    return point;
  });
}

const WEEKDAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * "14:00", "14시" 등 다양한 시간 label 형식에서 앞쪽 시(0~23)만 뽑습니다.
 * 뒤에 붙는 ":00"의 00까지 숫자로 잡아버리면(예: "14:00" -> 1400) 안 되므로
 * 문자열 맨 앞의 연속된 숫자만 사용합니다.
 */
function hourOf(label: string) {
  const match = label.match(/\d+/);
  return match ? parseInt(match[0], 10) : NaN;
}

/**
 * 일간 label을 "HH시"로 정규화합니다.
 * 서버 응답 형식이 "14:00" / "14시" 등으로 달라질 수 있어 합치기 전에 통일합니다.
 */
function normalizeDailyLabel(label: string) {
  const hour = hourOf(label);
  return Number.isFinite(hour) ? `${hour}시` : label;
}

/**
 * period별 label을 00시/월요일/1주차 순으로 정렬하기 위한 비교 함수를 만듭니다.
 * 서버가 응답을 보내는 순서(예: 현재 시각부터 최근순)에 의존하지 않기 위함입니다.
 */
function compareLabels(period: Period) {
  if (period === "일간") {
    return (a: string, b: string) => (hourOf(a) || 0) - (hourOf(b) || 0);
  }

  if (period === "주간") {
    return (a: string, b: string) => {
      const indexOf = (label: string) =>
        WEEKDAY_ORDER.findIndex((day) => label.includes(day));
      return indexOf(a) - indexOf(b);
    };
  }

  // 월간: "1주차", "2주차" 등 맨 앞 숫자로 정렬합니다.
  return (a: string, b: string) => (hourOf(a) || 0) - (hourOf(b) || 0);
}

/**
 * 서버 telemetry 응답을 화면용 DataPoint 배열로 변환합니다.
 * labels는 서버 응답 순서와 무관하게 period 기준으로 정렬해 00시부터 차례대로 보여줍니다.
 * fallback은 빈 시간대 label에만 사용하고, 미수신 값은 null로 유지합니다.
 */
export function mergeTelemetryData(
  fallback: DataPoint[],
  response: HiveTelemetryResponse | undefined,
  period: Period,
): DataPoint[] {
  const normalizeLabel = period === "일간" ? normalizeDailyLabel : undefined;
  const issues = collectTelemetryIssues(response, normalizeLabel);
  const pointMap = new Map(
    response?.data.map((point) => [
      normalizeLabel ? normalizeLabel(point.label) : point.label,
      point,
    ]) ?? [],
  );

  let labels = Array.from(
    new Set([
      ...fallback.map((point) => (normalizeLabel ? normalizeLabel(point.label) : point.label)),
      ...pointMap.keys(),
    ]),
  ).sort(compareLabels(period));

  // 일간은 아직 지나지 않은 미래 시간대를 빼고, 00시부터 현재 시각까지만 보여줍니다.
  if (period === "일간") {
    const currentHour = new Date().getHours();
    labels = labels.filter((label) => {
      const hour = hourOf(label);
      return Number.isFinite(hour) && hour >= 0 && hour <= currentHour;
    });
  }

  const merged = labels.map((label) => {
    const point = emptyPoint(label);
    point.issues = issues.get(label) ?? [];

    const source = pointMap.get(label);
    NUMERIC_SENSOR_KEYS.forEach((key) => {
      const value = source?.[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        point[key] = Math.round(value * 10) / 10;
        point.hasData = true;
      }
    });
    point.peltierMode = source?.peltierMode ?? null;
    point.fanState = source?.fanState ?? null;
    point.internalSensorValid = source?.internalSensorValid ?? null;
    point.externalSensorValid = source?.externalSensorValid ?? null;

    return point;
  });

  console.log("[Hive Telemetry API] 센서 데이터 병합 완료", {
    mergedCount: merged.length,
    count: pointMap.size,
  });

  return merged;
}

import { api } from "@/lib/api";
import type { DataPoint, HiveSensorDataKey, Period } from "@/types";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export type HiveTelemetryPeriod = "HOUR" | "DAY" | "WEEK" | "MONTH";
export type HiveTelemetryInterval = "ONE_MIN" | "FIVE_MIN" | "TEN_MIN";
export type HiveTelemetrySensorType =
  | "INTERNAL_TEMPERATURE"
  | "EXTERNAL_TEMPERATURE"
  | "INTERNAL_HUMIDITY"
  | "EXTERNAL_HUMIDITY"
  | "CO2";

export interface HiveTelemetryPoint {
  label: string;
  value: number | null;
}

export interface HiveTelemetryResponse {
  sensorType: HiveTelemetrySensorType;
  period: HiveTelemetryPeriod;
  data: HiveTelemetryPoint[];
}

export const HIVE_TELEMETRY_SENSORS: Array<{
  sensorType: HiveTelemetrySensorType;
  dataKey: HiveSensorDataKey;
}> = [
  { sensorType: "INTERNAL_TEMPERATURE", dataKey: "internalTemperature" },
  { sensorType: "EXTERNAL_TEMPERATURE", dataKey: "externalTemperature" },
  { sensorType: "INTERNAL_HUMIDITY", dataKey: "internalHumidity" },
  { sensorType: "EXTERNAL_HUMIDITY", dataKey: "externalHumidity" },
  { sensorType: "CO2", dataKey: "co2" },
];

const PERIOD_TO_API: Record<Period, HiveTelemetryPeriod> = {
  일간: "DAY",
  주간: "WEEK",
  월간: "MONTH",
};

interface GetHiveTelemetryParams {
  hiveId: string | number;
  period: Period;
  sensorType: HiveTelemetrySensorType;
}

export async function getHiveTelemetry({
  hiveId,
  period,
  sensorType,
}: GetHiveTelemetryParams): Promise<HiveTelemetryResponse> {
  const apiPeriod = PERIOD_TO_API[period];

  console.log("[Hive Telemetry API] 센서 데이터 조회 요청", {
    hiveId,
    endpoint: `/api/v1/hives/${hiveId}/telemetry`,
    period: apiPeriod,
    sensorType,
  });

  try {
    const res = await api.get<ApiResponse<HiveTelemetryResponse>>(
      `/api/v1/hives/${hiveId}/telemetry`,
      {
        params: {
          period: apiPeriod,
          sensorType,
        },
      },
    );

    console.log("[Hive Telemetry API] 센서 데이터 조회 성공", {
      hiveId,
      period: res.data.data.period,
      sensorType: res.data.data.sensorType,
      count: res.data.data.data.length,
      sample: res.data.data.data[0],
    });

    return res.data.data;
  } catch (error) {
    console.error("[Hive Telemetry API] 센서 데이터 조회 실패", {
      hiveId,
      period: apiPeriod,
      sensorType,
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
  sensorType: HiveTelemetrySensorType;
  from: Date;
  interval: HiveTelemetryInterval;
}

/** 특정 날짜의 특정 시(0~23시) 구간을 1/5/10분 간격으로 집계한 센서 데이터를 조회합니다. */
export async function getHiveTelemetryHour({
  hiveId,
  sensorType,
  from,
  interval,
}: GetHiveTelemetryHourParams): Promise<HiveTelemetryResponse> {
  const fromParam = toLocalIsoString(from);

  console.log("[Hive Telemetry API] 시간대별 센서 데이터 조회 요청", {
    hiveId,
    endpoint: `/api/v1/hives/${hiveId}/telemetry`,
    period: "HOUR",
    sensorType,
    from: fromParam,
    interval,
  });

  try {
    const res = await api.get<ApiResponse<HiveTelemetryResponse>>(
      `/api/v1/hives/${hiveId}/telemetry`,
      {
        params: {
          period: "HOUR",
          sensorType,
          from: fromParam,
          interval,
        },
      },
    );

    console.log("[Hive Telemetry API] 시간대별 센서 데이터 조회 성공", {
      hiveId,
      sensorType: res.data.data.sensorType,
      count: res.data.data.data.length,
      sample: res.data.data.data[0],
    });

    return res.data.data;
  } catch (error) {
    console.error("[Hive Telemetry API] 시간대별 센서 데이터 조회 실패", {
      hiveId,
      sensorType,
      from: fromParam,
      interval,
      error,
    });
    throw error;
  }
}

function toPointMap(response?: HiveTelemetryResponse) {
  return new Map(response?.data.map((point) => [point.label, point.value]) ?? []);
}

function emptyPoint(label: string): DataPoint {
  return {
    label,
    internalTemperature: null,
    externalTemperature: null,
    internalHumidity: null,
    externalHumidity: null,
    co2: null,
    hasData: false,
  };
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
 * 센서별로 따로 내려오는 telemetry 응답을 화면용 DataPoint 배열로 합칩니다.
 * 서버의 label은 x축, value는 해당 센서의 y축 값으로 그대로 사용합니다.
 * labels는 서버 응답 순서와 무관하게 period 기준으로 정렬해 00시부터 차례대로 보여줍니다.
 * fallback은 빈 시간대 label에만 사용하고, 미수신 센서 값은 null로 유지합니다.
 */
export function mergeTelemetryData(
  fallback: DataPoint[],
  responses: Partial<Record<HiveTelemetrySensorType, HiveTelemetryResponse>>,
  period: Period,
): DataPoint[] {
  const responseMaps = Object.fromEntries(
    HIVE_TELEMETRY_SENSORS.map(({ sensorType }) => [
      sensorType,
      toPointMap(responses[sensorType]),
    ]),
  ) as Record<HiveTelemetrySensorType, Map<string, number | null>>;
  let labels = Array.from(
    new Set([
      ...fallback.map((point) => point.label),
      ...HIVE_TELEMETRY_SENSORS.flatMap(({ sensorType }) => [
        ...responseMaps[sensorType].keys(),
      ]),
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

    HIVE_TELEMETRY_SENSORS.forEach(({ sensorType, dataKey }) => {
      const value = responseMaps[sensorType].get(label);
      if (typeof value === "number" && Number.isFinite(value)) {
        point[dataKey] = Math.round(value * 10) / 10;
        point.hasData = true;
      }
    });

    return point;
  });

  console.log("[Hive Telemetry API] 센서 데이터 병합 완료", {
    mergedCount: merged.length,
    counts: Object.fromEntries(
      HIVE_TELEMETRY_SENSORS.map(({ sensorType }) => [
        sensorType,
        responseMaps[sensorType].size,
      ]),
    ),
  });

  return merged;
}

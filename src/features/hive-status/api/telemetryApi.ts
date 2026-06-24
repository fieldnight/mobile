import { api } from "@/lib/api";
import type { DataPoint, HiveSensorDataKey, Period } from "@/types";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export type HiveTelemetryPeriod = "DAY" | "WEEK" | "MONTH";
export type HiveTelemetrySensorType =
  | "INTERNAL_TEMPERATURE"
  | "EXTERNAL_TEMPERATURE"
  | "INTERNAL_HUMIDITY"
  | "EXTERNAL_HUMIDITY"
  | "CO2";

export interface HiveTelemetryPoint {
  label: string;
  value: number;
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

    if (String(res.data.code) !== "200") {
      throw new Error(res.data.message || "센서 데이터를 조회하지 못했습니다.");
    }

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

function toPointMap(response?: HiveTelemetryResponse) {
  return new Map(response?.data.map((point) => [point.label, point.value]) ?? []);
}

function emptyPoint(label: string): DataPoint {
  return {
    label,
    internalTemperature: 0,
    externalTemperature: 0,
    internalHumidity: 0,
    externalHumidity: 0,
    co2: 0,
    hasData: false,
  };
}

/**
 * 센서별로 따로 내려오는 telemetry 응답을 화면용 DataPoint 배열로 합칩니다.
 * 서버의 label은 x축, value는 해당 센서의 y축 값으로 그대로 사용합니다.
 */
export function mergeTelemetryData(
  fallback: DataPoint[],
  responses: Partial<Record<HiveTelemetrySensorType, HiveTelemetryResponse>>,
): DataPoint[] {
  const responseMaps = Object.fromEntries(
    HIVE_TELEMETRY_SENSORS.map(({ sensorType }) => [
      sensorType,
      toPointMap(responses[sensorType]),
    ]),
  ) as Record<HiveTelemetrySensorType, Map<string, number>>;

  const hasAnyApiData = HIVE_TELEMETRY_SENSORS.some(
    ({ sensorType }) => responseMaps[sensorType].size > 0,
  );

  if (!hasAnyApiData) {
    console.log("[Hive Telemetry API] 센서 데이터 없음, mock fallback 사용", {
      fallbackCount: fallback.length,
    });
    return fallback;
  }

  const fallbackMap = new Map(fallback.map((point) => [point.label, point]));
  const labels = Array.from(
    new Set([
      ...fallback.map((point) => point.label),
      ...HIVE_TELEMETRY_SENSORS.flatMap(({ sensorType }) => [
        ...responseMaps[sensorType].keys(),
      ]),
    ]),
  );

  const merged = labels.map((label) => {
    const fallbackPoint = fallbackMap.get(label) ?? emptyPoint(label);
    const point: DataPoint = {
      label,
      internalTemperature:
        responseMaps.INTERNAL_TEMPERATURE.get(label) ??
        fallbackPoint.internalTemperature,
      externalTemperature:
        responseMaps.EXTERNAL_TEMPERATURE.get(label) ??
        fallbackPoint.externalTemperature,
      internalHumidity:
        responseMaps.INTERNAL_HUMIDITY.get(label) ?? fallbackPoint.internalHumidity,
      externalHumidity:
        responseMaps.EXTERNAL_HUMIDITY.get(label) ?? fallbackPoint.externalHumidity,
      co2: responseMaps.CO2.get(label) ?? fallbackPoint.co2,
      hasData: HIVE_TELEMETRY_SENSORS.some(({ sensorType }) =>
        responseMaps[sensorType].has(label),
      )
        ? true
        : fallbackPoint.hasData,
    };

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

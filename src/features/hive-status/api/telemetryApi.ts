import { api } from "@/lib/api";
import type { DataPoint, Period } from "@/types";

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

  console.log("[Hive Telemetry API] 센서 데이터 요청", {
    hiveId,
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

    console.log("[Hive Telemetry API] 센서 데이터 응답", {
      hiveId,
      period: apiPeriod,
      sensorType,
      count: res.data.data.data.length,
    });

    return res.data.data;
  } catch (error) {
    console.error("[Hive Telemetry API] 센서 데이터 요청 실패", {
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

/**
 * 센서별로 분리된 응답을 기존 차트/표가 사용하는 DataPoint 구조로 합친다.
 * 아직 API에 없는 메탄 값은 기존 mock fallback을 유지해 표 레이아웃을 깨지 않는다.
 */
export function mergeTelemetryData(
  fallback: DataPoint[],
  temperature?: HiveTelemetryResponse,
  humidity?: HiveTelemetryResponse,
  co2?: HiveTelemetryResponse,
): DataPoint[] {
  const tempMap = toPointMap(temperature);
  const humidityMap = toPointMap(humidity);
  const co2Map = toPointMap(co2);

  if (!tempMap.size && !humidityMap.size && !co2Map.size) {
    console.log("[Hive Telemetry API] 센서 데이터 없음, mock fallback 사용", {
      fallbackCount: fallback.length,
    });
    return fallback;
  }

  const fallbackMap = new Map(fallback.map((point) => [point.label, point]));
  const labels = Array.from(
    new Set([
      ...fallback.map((point) => point.label),
      ...tempMap.keys(),
      ...humidityMap.keys(),
      ...co2Map.keys(),
    ]),
  );

  const merged = labels.map((label) => {
    const fallbackPoint = fallbackMap.get(label);
    return {
      label,
      temp: tempMap.get(label) ?? fallbackPoint?.temp ?? 0,
      humidity: humidityMap.get(label) ?? fallbackPoint?.humidity ?? 0,
      methane: fallbackPoint?.methane ?? 0,
      co2: co2Map.get(label) ?? fallbackPoint?.co2 ?? 0,
      hasData:
        tempMap.has(label) || humidityMap.has(label) || co2Map.has(label)
          ? true
          : fallbackPoint?.hasData,
    };
  });

  console.log("[Hive Telemetry API] 센서 데이터 병합 완료", {
    mergedCount: merged.length,
    temperatureCount: tempMap.size,
    humidityCount: humidityMap.size,
    co2Count: co2Map.size,
  });

  return merged;
}

import { useQuery } from "@tanstack/react-query";
import {
  getHiveTelemetryHour,
  HIVE_TELEMETRY_SENSORS,
  type HiveTelemetryInterval,
  type HiveTelemetryResponse,
  type HiveTelemetrySensorType,
} from "../api/telemetryApi";

export interface HiveTelemetryHourRecord {
  label: string;
  internalTemperature: number | null;
  internalHumidity: number | null;
  externalTemperature: number | null;
  externalHumidity: number | null;
}

interface UseHiveTelemetryHourDataParams {
  hiveId: string;
  from: Date;
  interval: HiveTelemetryInterval;
}

export const HIVE_TELEMETRY_HOUR_QUERY_KEY = "hive-telemetry-hour";

function toPointMap(response?: HiveTelemetryResponse) {
  return new Map(response?.data.map((point) => [point.label, point.value]) ?? []);
}

/**
 * 실시간 확인 화면의 시간대별 센서 데이터 hook.
 * 선택한 날짜의 특정 1시간 구간을 1/5/10분 간격으로 집계해 내부/외부 온습도를 병렬 조회합니다.
 */
export function useHiveTelemetryHourData({
  hiveId,
  from,
  interval,
}: UseHiveTelemetryHourDataParams) {
  const fromKey = from.toISOString().slice(0, 13); // 시(hour) 단위까지만 key에 반영

  return useQuery({
    queryKey: [HIVE_TELEMETRY_HOUR_QUERY_KEY, hiveId, fromKey, interval],
    enabled: hiveId !== "",
    retry: 1,
    queryFn: async (): Promise<HiveTelemetryHourRecord[]> => {
      const sensors = HIVE_TELEMETRY_SENSORS.filter(
        (sensor) => sensor.dataKey !== "co2",
      );

      console.log("[Hive Telemetry Hour Hook] 센서 데이터 병렬 조회 시작", {
        hiveId,
        from: from.toISOString(),
        interval,
        sensors: sensors.map((sensor) => sensor.sensorType),
      });

      const results = await Promise.allSettled(
        sensors.map(({ sensorType }) =>
          getHiveTelemetryHour({ hiveId, sensorType, from, interval }),
        ),
      );

      const responses: Partial<Record<HiveTelemetrySensorType, HiveTelemetryResponse>> = {};

      results.forEach((result, index) => {
        const sensorType = sensors[index].sensorType;

        if (result.status === "fulfilled") {
          responses[sensorType] = result.value;
          return;
        }

        console.error("[Hive Telemetry Hour Hook] 센서별 조회 실패", {
          hiveId,
          sensorType,
          reason: result.reason,
        });
      });

      const maps = {
        internalTemperature: toPointMap(responses.INTERNAL_TEMPERATURE),
        internalHumidity: toPointMap(responses.INTERNAL_HUMIDITY),
        externalTemperature: toPointMap(responses.EXTERNAL_TEMPERATURE),
        externalHumidity: toPointMap(responses.EXTERNAL_HUMIDITY),
      };

      const labels = Array.from(
        new Set([
          ...maps.internalTemperature.keys(),
          ...maps.internalHumidity.keys(),
          ...maps.externalTemperature.keys(),
          ...maps.externalHumidity.keys(),
        ]),
      ).sort();

      const merged = labels.map((label) => ({
        label,
        internalTemperature: maps.internalTemperature.get(label) ?? null,
        internalHumidity: maps.internalHumidity.get(label) ?? null,
        externalTemperature: maps.externalTemperature.get(label) ?? null,
        externalHumidity: maps.externalHumidity.get(label) ?? null,
      }));

      console.log("[Hive Telemetry Hour Hook] 센서 데이터 화면 반영 준비", {
        hiveId,
        from: from.toISOString(),
        interval,
        count: merged.length,
      });

      return merged;
    },
  });
}

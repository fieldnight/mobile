/**
 * 벌통 센서 mock 데이터
 * - telemetry API가 비어 있거나 실패한 센서가 있을 때 화면 형태를 유지하기 위한 fallback입니다.
 * - 실제 연동 시에는 /api/v1/hives/{hiveId}/telemetry 응답의 label/value가 우선 사용됩니다.
 */
import type { DataPoint, Period } from "@/types";

type HiveId = "1" | "2" | "3";

function point(
  label: string,
  internalTemperature: number,
  externalTemperature: number,
  internalHumidity: number,
  externalHumidity: number,
  co2: number,
  hasData = true,
): DataPoint {
  return {
    label,
    internalTemperature,
    externalTemperature,
    internalHumidity,
    externalHumidity,
    co2,
    hasData,
  };
}

const WEEKLY_AND_MONTHLY: Record<HiveId, Pick<Record<Period, DataPoint[]>, "주간" | "월간">> = {
  "1": {
    주간: [
      point("월", 34.0, 22.0, 60, 48, 430),
      point("화", 34.2, 22.4, 58, 47, 425),
      point("수", 33.8, 21.8, 62, 50, 445),
      point("목", 35.1, 23.2, 55, 46, 460),
      point("금", 34.7, 22.9, 57, 47, 450),
      point("토", 34.3, 22.5, 61, 49, 435),
      point("일", 34.5, 22.7, 62, 50, 440),
    ],
    월간: [
      point("1주", 33.5, 21.5, 62, 50, 430),
      point("2주", 34.2, 22.3, 58, 47, 445),
      point("3주", 34.8, 22.9, 56, 46, 455),
      point("4주", 34.5, 22.6, 60, 49, 440),
    ],
  },
  "2": {
    주간: [
      point("월", 33.5, 21.6, 57, 45, 410),
      point("화", 33.8, 21.9, 55, 44, 415),
      point("수", 33.2, 21.2, 59, 48, 425),
      point("목", 34.5, 22.7, 52, 43, 440),
      point("금", 34.1, 22.4, 54, 44, 430),
      point("토", 33.7, 22.0, 58, 47, 420),
      point("일", 33.8, 22.1, 58, 47, 418),
    ],
    월간: [
      point("1주", 33.0, 21.0, 59, 48, 415),
      point("2주", 33.6, 21.7, 55, 44, 425),
      point("3주", 34.2, 22.3, 53, 43, 440),
      point("4주", 33.8, 21.9, 57, 46, 420),
    ],
  },
  "3": {
    주간: [
      point("월", 32.0, 20.8, 63, 52, 400),
      point("화", 31.5, 20.4, 65, 54, 390),
      point("수", 31.8, 20.7, 64, 53, 395),
      point("목", 32.2, 21.0, 61, 50, 410),
      point("금", 31.9, 20.8, 62, 51, 400),
      point("토", 31.3, 20.2, 66, 55, 385),
      point("일", 0, 0, 0, 0, 0, false),
    ],
    월간: [
      point("1주", 31.5, 20.3, 65, 54, 390),
      point("2주", 32.0, 20.8, 63, 52, 400),
      point("3주", 31.8, 20.6, 64, 53, 395),
      point("4주", 31.0, 20.0, 66, 55, 385),
    ],
  },
};

const HIVE_DAILY_CONFIG: Record<
  HiveId,
  {
    internalTempBase: number;
    externalTempBase: number;
    internalHumidityBase: number;
    externalHumidityBase: number;
    offlineFrom?: number;
  }
> = {
  "1": {
    internalTempBase: 34.5,
    externalTempBase: 22.5,
    internalHumidityBase: 59,
    externalHumidityBase: 48,
  },
  "2": {
    internalTempBase: 33.8,
    externalTempBase: 21.8,
    internalHumidityBase: 56,
    externalHumidityBase: 45,
  },
  "3": {
    internalTempBase: 31.8,
    externalTempBase: 20.6,
    internalHumidityBase: 63,
    externalHumidityBase: 52,
    offlineFrom: 20,
  },
};

function currentLocalHour() {
  return new Date().getHours();
}

function toHiveId(hiveId: string): HiveId {
  return hiveId === "2" || hiveId === "3" ? hiveId : "1";
}

function makeHourlyData(hiveId: HiveId): DataPoint[] {
  const currentHour = currentLocalHour();
  const config = HIVE_DAILY_CONFIG[hiveId];

  return Array.from({ length: 24 }, (_, hour) => {
    const label = `${String(hour).padStart(2, "0")}:00`;

    if (hour > currentHour) {
      return point(label, 0, 0, 0, 0, 0, false);
    }

    const offline = config.offlineFrom !== undefined && hour >= config.offlineFrom;
    const angle = ((hour - 4) / 24) * Math.PI * 2;

    if (offline) {
      return point(label, 0, 0, 0, 0, 0, false);
    }

    return point(
      label,
      Number((config.internalTempBase + Math.sin(angle) * 1.5).toFixed(1)),
      Number((config.externalTempBase + Math.sin(angle) * 2.2).toFixed(1)),
      Math.round(config.internalHumidityBase - Math.sin(angle) * 6),
      Math.round(config.externalHumidityBase - Math.sin(angle) * 8),
      Math.round(435 + Math.sin(angle) * 35),
    );
  });
}

export function getHivePeriodData(hiveId: string, period: Period): DataPoint[] {
  const normalizedHiveId = toHiveId(hiveId);

  if (period === "일간") {
    return makeHourlyData(normalizedHiveId);
  }

  return WEEKLY_AND_MONTHLY[normalizedHiveId][period] ?? WEEKLY_AND_MONTHLY["1"].주간;
}

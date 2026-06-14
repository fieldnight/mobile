/**
 * 벌통 센서 mock 데이터
 * - 일간 데이터는 00시부터 23시까지 정각 기준 24개 슬롯만 생성합니다.
 * - 현재 기기 시간 이후 슬롯은 hasData:false 로 두어 x축은 유지하되 점/값은 그리지 않습니다.
 * - 이 파일은 화면에서 조회할 때마다 일간 데이터를 새로 계산합니다.
 */
import type { DataPoint, Period } from "@/types";

type HiveId = "1" | "2" | "3";

const WEEKLY_AND_MONTHLY: Record<HiveId, Pick<Record<Period, DataPoint[]>, "주간" | "월간">> = {
  "1": {
    주간: [
      { label: "월", temp: 34.0, humidity: 60, methane: 0.9, co2: 430 },
      { label: "화", temp: 34.2, humidity: 58, methane: 0.8, co2: 425 },
      { label: "수", temp: 33.8, humidity: 62, methane: 1.0, co2: 445 },
      { label: "목", temp: 35.1, humidity: 55, methane: 1.1, co2: 460 },
      { label: "금", temp: 34.7, humidity: 57, methane: 1.0, co2: 450 },
      { label: "토", temp: 34.3, humidity: 61, methane: 0.9, co2: 435 },
      { label: "일", temp: 34.5, humidity: 62, methane: 0.9, co2: 440 },
    ],
    월간: [
      { label: "1주", temp: 33.5, humidity: 62, methane: 0.9, co2: 430 },
      { label: "2주", temp: 34.2, humidity: 58, methane: 1.0, co2: 445 },
      { label: "3주", temp: 34.8, humidity: 56, methane: 1.1, co2: 455 },
      { label: "4주", temp: 34.5, humidity: 60, methane: 0.9, co2: 440 },
    ],
  },
  "2": {
    주간: [
      { label: "월", temp: 33.5, humidity: 57, methane: 0.7, co2: 410 },
      { label: "화", temp: 33.8, humidity: 55, methane: 0.7, co2: 415 },
      { label: "수", temp: 33.2, humidity: 59, methane: 0.8, co2: 425 },
      { label: "목", temp: 34.5, humidity: 52, methane: 0.9, co2: 440 },
      { label: "금", temp: 34.1, humidity: 54, methane: 0.8, co2: 430 },
      { label: "토", temp: 33.7, humidity: 58, methane: 0.7, co2: 420 },
      { label: "일", temp: 33.8, humidity: 58, methane: 0.7, co2: 418 },
    ],
    월간: [
      { label: "1주", temp: 33.0, humidity: 59, methane: 0.7, co2: 415 },
      { label: "2주", temp: 33.6, humidity: 55, methane: 0.8, co2: 425 },
      { label: "3주", temp: 34.2, humidity: 53, methane: 0.9, co2: 440 },
      { label: "4주", temp: 33.8, humidity: 57, methane: 0.7, co2: 420 },
    ],
  },
  "3": {
    주간: [
      { label: "월", temp: 32.0, humidity: 63, methane: 0.6, co2: 400 },
      { label: "화", temp: 31.5, humidity: 65, methane: 0.5, co2: 390 },
      { label: "수", temp: 31.8, humidity: 64, methane: 0.6, co2: 395 },
      { label: "목", temp: 32.2, humidity: 61, methane: 0.7, co2: 410 },
      { label: "금", temp: 31.9, humidity: 62, methane: 0.6, co2: 400 },
      { label: "토", temp: 31.3, humidity: 66, methane: 0.5, co2: 385 },
      { label: "일", temp: 0, humidity: 0, methane: 0, co2: 0, hasData: false },
    ],
    월간: [
      { label: "1주", temp: 31.5, humidity: 65, methane: 0.5, co2: 390 },
      { label: "2주", temp: 32.0, humidity: 63, methane: 0.6, co2: 400 },
      { label: "3주", temp: 31.8, humidity: 64, methane: 0.6, co2: 395 },
      { label: "4주", temp: 31.0, humidity: 66, methane: 0.5, co2: 385 },
    ],
  },
};

const HIVE_DAILY_CONFIG: Record<
  HiveId,
  {
    tempBase: number;
    tempAmp: number;
    humidityBase: number;
    humidityAmp: number;
    offlineFrom?: number;
  }
> = {
  "1": { tempBase: 34.5, tempAmp: 1.5, humidityBase: 59, humidityAmp: 6 },
  "2": { tempBase: 33.8, tempAmp: 1.4, humidityBase: 56, humidityAmp: 5 },
  "3": {
    tempBase: 31.8,
    tempAmp: 1.2,
    humidityBase: 63,
    humidityAmp: 4,
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
    const label = `${String(hour).padStart(2, "0")}시`;

    if (hour > currentHour) {
      return {
        label,
        temp: 0,
        humidity: 0,
        methane: 0,
        co2: 0,
        hasData: false,
      };
    }

    const offline = config.offlineFrom !== undefined && hour >= config.offlineFrom;
    const angle = ((hour - 4) / 24) * Math.PI * 2;

    return {
      label,
      temp: offline
        ? 0
        : Number((config.tempBase + Math.sin(angle) * config.tempAmp).toFixed(1)),
      humidity: offline
        ? 0
        : Math.round(config.humidityBase - Math.sin(angle) * config.humidityAmp),
      methane: offline ? 0 : Number((0.8 + Math.sin(angle) * 0.2).toFixed(1)),
      co2: offline ? 0 : Math.round(435 + Math.sin(angle) * 35),
      hasData: !offline,
    };
  });
}

export function getHivePeriodData(hiveId: string, period: Period): DataPoint[] {
  const normalizedHiveId = toHiveId(hiveId);

  if (period === "일간") {
    return makeHourlyData(normalizedHiveId);
  }

  return WEEKLY_AND_MONTHLY[normalizedHiveId][period] ?? WEEKLY_AND_MONTHLY["1"].주간;
}

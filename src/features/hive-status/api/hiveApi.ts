/**
 * 벌통 센서 데이터 (Mock)
 * - hiveDataMap[hiveId][period] 로 접근
 * - 실제 연동 시 이 파일의 fetch 로직만 교체하면 됨
 * - 오프라인 벌통(id: "3")의 현재·일 마지막 값은 0으로 처리
 */

import type { DataPoint, Period } from "@/types";

export const hiveDataMap: Record<string, Record<Period, DataPoint[]>> = {
  "1": {
    일간: [
      { label: "00시", temp: 33.2, humidity: 58, methane: 0.8, co2: 420 },
      { label: "04시", temp: 32.8, humidity: 60, methane: 0.7, co2: 415 },
      { label: "08시", temp: 34.1, humidity: 62, methane: 1.0, co2: 450 },
      { label: "12시", temp: 35.5, humidity: 55, methane: 1.2, co2: 480 },
      { label: "16시", temp: 35.8, humidity: 53, methane: 1.1, co2: 470 },
      { label: "20시", temp: 34.5, humidity: 59, methane: 0.9, co2: 440 },
      { label: "현재", temp: 34.5, humidity: 62, methane: 0.9, co2: 435 },
    ],
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
    일간: [
      { label: "00시", temp: 32.5, humidity: 55, methane: 0.6, co2: 400 },
      { label: "04시", temp: 32.1, humidity: 57, methane: 0.5, co2: 395 },
      { label: "08시", temp: 33.4, humidity: 60, methane: 0.8, co2: 430 },
      { label: "12시", temp: 34.8, humidity: 52, methane: 1.0, co2: 460 },
      { label: "16시", temp: 35.2, humidity: 50, methane: 0.9, co2: 455 },
      { label: "20시", temp: 34.0, humidity: 56, methane: 0.7, co2: 420 },
      { label: "현재", temp: 33.8, humidity: 58, methane: 0.7, co2: 415 },
    ],
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
    일간: [
      { label: "00시", temp: 31.0, humidity: 65, methane: 0.5, co2: 380 },
      { label: "04시", temp: 30.5, humidity: 67, methane: 0.4, co2: 375 },
      { label: "08시", temp: 31.8, humidity: 64, methane: 0.6, co2: 400 },
      { label: "12시", temp: 32.5, humidity: 60, methane: 0.7, co2: 420 },
      { label: "16시", temp: 32.8, humidity: 58, methane: 0.7, co2: 415 },
      { label: "20시", temp: 31.5, humidity: 63, methane: 0.5, co2: 390 },
      { label: "현재", temp: 0, humidity: 0, methane: 0, co2: 0 },
    ],
    주간: [
      { label: "월", temp: 32.0, humidity: 63, methane: 0.6, co2: 400 },
      { label: "화", temp: 31.5, humidity: 65, methane: 0.5, co2: 390 },
      { label: "수", temp: 31.8, humidity: 64, methane: 0.6, co2: 395 },
      { label: "목", temp: 32.2, humidity: 61, methane: 0.7, co2: 410 },
      { label: "금", temp: 31.9, humidity: 62, methane: 0.6, co2: 400 },
      { label: "토", temp: 31.3, humidity: 66, methane: 0.5, co2: 385 },
      { label: "일", temp: 0, humidity: 0, methane: 0, co2: 0 },
    ],
    월간: [
      { label: "1주", temp: 31.5, humidity: 65, methane: 0.5, co2: 390 },
      { label: "2주", temp: 32.0, humidity: 63, methane: 0.6, co2: 400 },
      { label: "3주", temp: 31.8, humidity: 64, methane: 0.6, co2: 395 },
      { label: "4주", temp: 31.0, humidity: 66, methane: 0.5, co2: 385 },
    ],
  },
};

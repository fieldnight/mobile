/**
 * 벌통 통계 화면 타입
 * - Period: 일간 | 주간 | 월간
 * - DataPoint: 서버 telemetry 응답의 label/value를 센서별 컬럼으로 합친 차트 데이터
 */

import type { Feather } from "@expo/vector-icons";

export type Period = "일간" | "주간" | "월간";

export type HiveSensorDataKey =
  | "internalTemperature"
  | "externalTemperature"
  | "internalHumidity"
  | "externalHumidity"
  | "co2";

export interface DataPoint {
  label: string;
  internalTemperature: number;
  externalTemperature: number;
  internalHumidity: number;
  externalHumidity: number;
  co2: number;
  hasData?: boolean;
}

export interface WeatherCondition {
  condition: string;
  icon: string;
  iconColor: string;
}

export interface TodayWeatherData extends WeatherCondition {
  temperature: number | null;
  humidity: number | null;
  high: number | null;
  low: number | null;
}

export interface WeatherDay extends WeatherCondition {
  day: string;
  date: string;
  icon: keyof typeof Feather.glyphMap;
  high: number | null;
  low: number | null;
  humidity: number | null;
}

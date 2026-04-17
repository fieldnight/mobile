/**
 * 벌통 통계 페이지 날씨 데이터 타입
 * - Period           : 일간 | 주간 | 월간
 * - DataPoint        : 벌통 센서 데이터 포인트 (온도·습도·메탄·CO₂)
 * - WeatherCondition : 날씨 상태 공통 (condition, icon, iconColor)
 * - TodayWeatherData : 오늘 날씨 (WeatherCondition 확장)
 * - WeatherDay       : 주간 날씨 1일치
 */

import type { Feather } from "@expo/vector-icons";

export type Period = "일간" | "주간" | "월간";

export interface DataPoint {
  label: string;
  temp: number;
  humidity: number;
  methane: number;
  co2: number;
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

/**
 * KMA(기상청) 날씨 데이터 fetch 훅
 * - 오늘 날씨(fetchTodayDirect)와 주간 날씨(fetchWeeklyDirect)를 병렬 요청
 * - Promise.allSettled로 한쪽 실패 시에도 나머지 데이터 유지
 * - 언마운트 시 cancelled 플래그로 불필요한 setState 방지
 */
import { useState, useEffect } from "react";
import { fetchTodayDirect, fetchWeeklyDirect } from "../api/weatherApi";
import type { TodayWeatherData, WeatherDay } from "@/types";

interface UseKmaWeatherResult {
  todayWeather: TodayWeatherData | null;
  weeklyWeather: WeatherDay[];
  loading: boolean;
  errorMsg: string | null;
}

export function useMakeWeather(stn: number): UseKmaWeatherResult {
  const [todayWeather, setTodayWeather] = useState<TodayWeatherData | null>(
    null,
  );
  const [weeklyWeather, setWeeklyWeather] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [today, weekly] = await Promise.allSettled([
          fetchTodayDirect(stn),
          fetchWeeklyDirect(stn),
        ]);

        if (cancelled) return;

        if (today.status === "fulfilled" && today.value) {
          setTodayWeather(today.value);
        } else if (today.status === "rejected") {
          setErrorMsg(today.reason?.message ?? "날씨 오류");
        }

        if (weekly.status === "fulfilled" && weekly.value.length) {
          setWeeklyWeather(weekly.value);
        }
      } catch (err: any) {
        if (!cancelled) setErrorMsg(err.message ?? "날씨 오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [stn]);

  return { todayWeather, weeklyWeather, loading, errorMsg };
}

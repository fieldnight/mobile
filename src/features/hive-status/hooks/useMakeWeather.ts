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
          setErrorMsg(
            today.reason?.message ?? "날씨 정보를 불러오지 못했습니다.",
          );
        }

        if (weekly.status === "fulfilled" && weekly.value.length) {
          setWeeklyWeather(weekly.value);
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err.message ?? "날씨 정보를 불러오지 못했습니다.");
        }
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

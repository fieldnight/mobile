import { useQuery } from "@tanstack/react-query";
import { useWeatherRegion } from "@/features/hive-status/hooks/useWeatherRegion";
import { fetchTodayDirect, fetchTodayHourlyTemperatures, getKstNow } from "@/features/hive-status/api/weatherApi";

/** 메인 리포트의 지역 기온 요약과 오늘 시간별 관측값을 병렬 조회합니다. */
export function useReportWeather() {
  const { stn, regionName } = useWeatherRegion();
  const date = getKstNow().toISOString().slice(0, 10);
  const query = useQuery({
    queryKey: ["hive-home-weather", stn, date],
    queryFn: () => fetchTodayDirect(stn),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 1,
  });
  const hourly = useQuery({
    queryKey: ["hive-home-weather-hourly", stn, date],
    queryFn: () => fetchTodayHourlyTemperatures(stn),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 1,
  });
  return { ...query, regionName, hourly };
}

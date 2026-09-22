/**
 * 기상청 API Hub (apihub.kma.go.kr) 호출 유틸
 * - fetchTodayDirect  : 현재 시각 기준 최근 3시간 관측값 + 당일 최고·최저 기온
 * - fetchWeeklyDirect : 최근 7일 일별 기상 데이터
 * - parseCondition    : 운량·강수량 → 날씨 상태·아이콘 변환
 * - 응답은 CSV 텍스트이며 공백 split으로 필드 파싱
 */
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEATHER_REGION_KEY, KMA_REGIONS } from "@/constants";

export function useWeatherRegion() {
  const [stn, setStn] = useState(108);
  const [regionName, setRegionName] = useState("서울");

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(WEATHER_REGION_KEY).then((val) => {
        if (!val) return;
        const parsed = JSON.parse(val);
        setStn(parsed.stn);
        setRegionName(
          parsed.name ??
            KMA_REGIONS.find((r) => r.stn === parsed.stn)?.name ??
            "서울",
        );
      });
    }, []),
  );

  return { stn, regionName };
}

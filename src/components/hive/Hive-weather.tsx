/**
 * 벌통 통계 페이지 날씨 UI 컴포넌트 (PeriodCard 내부에 삽입)
 * - TodayWeather  : 오늘 기상 요약 (기온 최고·최저, 습도)
 * - WeeklyWeather : 주간 날씨 토글 목록 + 기온 범위 바
 * - MonthlyWeather: 기상청 월간 페이지 외부 링크
 * - WeatherSection: 위 세 컴포넌트를 period 값에 따라 조건부 렌더링
 */

import { useState } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C } from "@/constants/hive-colors";
import { PretendardFont } from "@/components/PretendardFont";
import type { Period, TodayWeatherData, WeatherDay } from "@/types";

// ─── Today ─────────────────────────────────────────────────────────────────────

function TodayWeather({ data }: { data: TodayWeatherData }) {
  return (
    <View className="flex-row items-center justify-between py-0.5">
      <View className="flex-row items-center gap-2.5">
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 15, color: "#191F28" }}
        >
          {data.condition}
        </PretendardFont>
        <View className="flex-row items-baseline">
          {data.high != null && data.low != null ? (
            <>
              <PretendardFont
                weight="bold"
                style={{ fontSize: 16, color: "#191F28" }}
              >
                {data.high}°
              </PretendardFont>
              <PretendardFont
                style={{ fontSize: 13, color: "#B0B8C1", marginHorizontal: 2 }}
              >
                /
              </PretendardFont>
              <PretendardFont
                weight="medium"
                style={{ fontSize: 15, color: "#B0B8C1" }}
              >
                {data.low}°
              </PretendardFont>
            </>
          ) : (
            <PretendardFont
              weight="bold"
              style={{ fontSize: 16, color: "#191F28" }}
            >
              {data.temperature != null ? `${data.temperature}°` : "-"}
            </PretendardFont>
          )}
        </View>
      </View>
      <View className="flex-row items-center gap-1">
        <PretendardFont style={{ fontSize: 13, color: "#B0B8C1" }}>
          습도
        </PretendardFont>
        <PretendardFont style={{ fontSize: 14, color: "#8B95A1" }}>
          {data.humidity != null ? `${data.humidity}%` : "-"}
        </PretendardFont>
      </View>
    </View>
  );
}

// ─── Weekly ────────────────────────────────────────────────────────────────────

function WeeklyWeather({ days }: { days: WeatherDay[] }) {
  const [expanded, setExpanded] = useState(false);

  const allLows = days.filter((d) => d.low != null).map((d) => d.low!);
  const allHighs = days.filter((d) => d.high != null).map((d) => d.high!);
  const globalMin = allLows.length ? Math.min(...allLows) : 0;
  const globalMax = allHighs.length ? Math.max(...allHighs) : 30;
  const range = globalMax - globalMin || 1;

  const uniqueIcons = days
    .reduce<{ icon: string; iconColor: string }[]>((acc, w) => {
      if (!acc.find((a) => a.icon === w.icon))
        acc.push({ icon: w.icon, iconColor: w.iconColor });
      return acc;
    }, [])
    .slice(0, 3);

  const dateRange = days.length
    ? `${days[0].date} ~ ${days[days.length - 1].date}`
    : "-";

  return (
    <>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web")
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded((v) => !v);
        }}
        className="flex-row items-center justify-between py-0.5"
        data-testid="button-weekly-weather-toggle"
      >
        <View className="flex-row items-center gap-2.5">
          <View className="flex-row items-center">
            {uniqueIcons.map((w, i) => (
              <Feather
                key={i}
                name={w.icon as any}
                size={16}
                color={w.iconColor}
                style={i > 0 ? { marginLeft: -4 } : undefined}
              />
            ))}
          </View>
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 14, color: "#191F28" }}
          >
            주간 날씨
          </PretendardFont>
          <PretendardFont style={{ fontSize: 13, color: "#8B95A1" }}>
            {dateRange}
          </PretendardFont>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={C.ter}
        />
      </Pressable>

      {expanded && (
        <>
          <View className="h-px bg-[#E5E8EB] mt-3 mb-1" />
          <View>
            {days.map((w, i) => (
              <View key={i}>
                <View className="flex-row items-center py-[7px] gap-3">
                  <PretendardFont
                    weight="semibold"
                    style={{
                      fontSize: 14,
                      color: "#191F28",
                      width: 26,
                      textAlign: "center",
                    }}
                  >
                    {w.day}
                  </PretendardFont>
                  <Feather name={w.icon} size={20} color={w.iconColor} />
                  <PretendardFont
                    style={{
                      fontSize: 14,
                      color: "#B0B8C1",
                      width: 44,
                      textAlign: "right",
                    }}
                  >
                    {w.low != null ? `${w.low}°` : "-"}
                  </PretendardFont>
                  {/* Temp range bar */}
                  <View className="flex-1 h-1 bg-[#E5E8EB] rounded-sm overflow-hidden relative">
                    <View
                      className="absolute top-0 bottom-0 bg-[#FF9100] rounded-sm"
                      style={{
                        left: `${w.low != null ? ((w.low - globalMin) / range) * 100 : 0}%`,
                        right: `${w.high != null ? 100 - ((w.high - globalMin) / range) * 100 : 0}%`,
                      }}
                    />
                  </View>
                  <PretendardFont
                    weight="semibold"
                    style={{ fontSize: 14, color: "#191F28", width: 44 }}
                  >
                    {w.high != null ? `${w.high}°` : "-"}
                  </PretendardFont>
                </View>
                {i < days.length - 1 && (
                  <View className="h-px bg-[#E5E8EB] opacity-50" />
                )}
              </View>
            ))}
          </View>
        </>
      )}
    </>
  );
}

// ─── Monthly ───────────────────────────────────────────────────────────────────

function MonthlyWeather({ stn }: { stn: number }) {
  const now = new Date();
  const url = `https://www.weather.go.kr/w/obs-climate/land/past-obs/obs-by-day.do?stn=${stn}&yy=${now.getFullYear()}&mm=${String(now.getMonth() + 1).padStart(2, "0")}`;
  return (
    <Pressable
      className="flex-row items-center justify-between py-0.5"
      data-testid="button-monthly-weather"
      onPress={() => Linking.openURL(url)}
    >
      <View className="flex-row items-center gap-2.5">
        <View className="flex-row items-center">
          <Feather name="sun" size={18} color="#FFB300" />
          <Feather
            name="cloud"
            size={18}
            color="#90A4AE"
            style={{ marginLeft: -6 }}
          />
          <Feather
            name="cloud-rain"
            size={18}
            color="#64B5F6"
            style={{ marginLeft: -6 }}
          />
        </View>
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 15, color: "#191F28" }}
        >
          월간 날씨
        </PretendardFont>
      </View>
      <View className="flex-row items-center gap-1">
        <PretendardFont style={{ fontSize: 14, color: "#3182F6" }}>
          보러 가기
        </PretendardFont>
        <Feather name="chevron-right" size={16} color={C.primary} />
      </View>
    </Pressable>
  );
}

// ─── Status views ─────────────────────────────────────────────────────────────

function WeatherLoading() {
  return (
    <View className="flex-row items-center justify-center py-2 gap-2">
      <ActivityIndicator size="small" color={C.primary} />
      <PretendardFont style={{ fontSize: 13, color: "#8B95A1" }}>
        날씨 불러오는 중...
      </PretendardFont>
    </View>
  );
}

function WeatherError({ msg }: { msg: string }) {
  return (
    <View className="flex-row items-center justify-center py-2 gap-2">
      <Feather name="alert-circle" size={14} color={C.warning} />
      <PretendardFont style={{ fontSize: 13, color: "#8B95A1" }}>
        {msg}
      </PretendardFont>
    </View>
  );
}

function WeatherEmpty({ text }: { text: string }) {
  return (
    <PretendardFont
      style={{ fontSize: 13, color: "#8B95A1", textAlign: "center" }}
    >
      {text}
    </PretendardFont>
  );
}

// ─── WeatherSection (main export) ─────────────────────────────────────────────

interface WeatherSectionProps {
  period: Period;
  stn: number;
  regionName: string;
  loading: boolean;
  errorMsg: string | null;
  todayWeather: TodayWeatherData | null;
  weeklyWeather: WeatherDay[];
}

export function WeatherSection({
  period,
  stn,
  regionName,
  loading,
  errorMsg,
  todayWeather,
  weeklyWeather,
}: WeatherSectionProps) {
  return (
    <>
      {period === "일간" &&
        (loading ? (
          <WeatherLoading />
        ) : errorMsg ? (
          <WeatherError msg={errorMsg} />
        ) : todayWeather ? (
          <TodayWeather data={todayWeather} />
        ) : (
          <WeatherEmpty text="날씨 정보를 불러올 수 없습니다" />
        ))}
      {period === "주간" &&
        (loading ? (
          <WeatherLoading />
        ) : errorMsg ? (
          <WeatherError msg={errorMsg} />
        ) : weeklyWeather.length ? (
          <WeeklyWeather days={weeklyWeather} />
        ) : (
          <WeatherEmpty text="주간 날씨 정보를 불러올 수 없습니다" />
        ))}
      {period === "월간" && <MonthlyWeather stn={stn} />}
    </>
  );
}

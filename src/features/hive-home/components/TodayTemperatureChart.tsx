import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { PretendardFont } from "@/components/PretendardFont";
import { getKstNow } from "@/features/hive-status/api/weatherApi";
import { sensorValue } from "@/features/hive-status/model/chartModel";
import type { DataPoint } from "@/types";
import { useReportWeather } from "../hooks/useReportWeather";
import { COMFORT_MAX, COMFORT_MIN, T } from "../theme";

const CHART_H = 156;
const REGION_COLOR = "#C78636";
const TOP = 18;
const BOTTOM = CHART_H - 12;
const LEFT = 30;

type HourPoint = { hour: number; value: number };

/**
 * 오늘 내부 온도와 설정 지역 기온 비교 그래프
 * - 같은 시간·온도 축에 내부 온도(진한 선)와 지역 시간별 기온(주황 선)을 겹칩니다.
 * - 초록 띠는 권장 온도, 주황 점선은 지역 오늘 최저·최고입니다. 범례에 지역 지금 기온을 함께 씁니다.
 */
export function TodayTemperatureChart({ data, loading, error }: { data: DataPoint[]; loading: boolean; error: boolean }) {
  const weather = useReportWeather();
  const [width, setWidth] = useState(0);

  const points: HourPoint[] = data
    .map((point) => ({ hour: Number.parseInt(point.label, 10), value: sensorValue(point, "internalTemperature") }))
    .filter((point): point is HourPoint => point.value != null && point.hour >= 0 && point.hour <= 23)
    .sort((a, b) => a.hour - b.hour);
  const regional: HourPoint[] = (weather.hourly.data ?? [])
    .filter((point): point is { hour: number; temperature: number } => point.temperature !== null)
    .map((point) => ({ hour: point.hour, value: point.temperature }));

  if (loading && weather.hourly.isLoading) {
    return <View className="items-center justify-center" style={{ height: CHART_H + 40 }}><ActivityIndicator color={T.inkSoft} /></View>;
  }
  if (!points.length && !regional.length) {
    return (
      <View className="items-center justify-center" style={{ height: CHART_H + 40 }}>
        <PretendardFont style={{ fontSize: 13.5, color: T.muted }}>{error ? "기록을 불러오지 못했어요" : "오늘 쌓인 기록이 아직 없어요"}</PretendardFont>
      </View>
    );
  }

  const range = [COMFORT_MIN, COMFORT_MAX, ...points.map((p) => p.value), ...regional.map((p) => p.value), weather.data?.low, weather.data?.high]
    .filter((value): value is number => value != null && Number.isFinite(value));
  const lo = Math.floor(Math.min(...range) - 2);
  const hi = Math.ceil(Math.max(...range) + 2);
  const lastHour = Math.max(1, getKstNow().getUTCHours(), ...points.map((p) => p.hour), ...regional.map((p) => p.hour));
  const x = (hour: number) => LEFT + (hour / lastHour) * Math.max(0, width - LEFT - 4);
  const y = (value: number) => BOTTOM - ((value - lo) / (hi - lo)) * (BOTTOM - TOP);
  // 한 시간 이상 비면 선을 끊어 없는 기록을 이어 그리지 않습니다.
  const path = (series: HourPoint[]) => series.map((p, i) =>
    `${i && series[i - 1].hour === p.hour - 1 ? "L" : "M"} ${x(p.hour)} ${y(p.value)}`).join(" ");
  const series = [{ key: "internal", points, color: T.ink }, { key: "regional", points: regional, color: REGION_COLOR }];
  const extrema = [
    { label: "지역 최저", value: weather.data?.low },
    { label: "지역 최고", value: weather.data?.high },
  ].filter((p): p is { label: string; value: number } => p.value != null && Number.isFinite(p.value));
  const regionLabel = weather.data?.temperature != null
    ? `${weather.regionName} 지금 ${weather.data.temperature.toFixed(1)}°`
    : `${weather.regionName} 기온`;

  return (
    <View>
      <View className="flex-row flex-wrap gap-3">
        {[
          { label: "내부", color: T.ink, band: false },
          { label: regionLabel, color: REGION_COLOR, band: false },
          { label: `권장 ${COMFORT_MIN}~${COMFORT_MAX}°`, color: T.goodSoft, band: true },
        ].map((item) => (
          <View key={item.label} className="flex-row items-center gap-1.5">
            <View className="w-[13px] rounded-sm" style={{ height: item.band ? 9 : 3, backgroundColor: item.color }} />
            <PretendardFont style={{ fontSize: 12, color: T.inkSoft }}>{item.label}</PretendardFont>
          </View>
        ))}
      </View>

      <View
        accessible
        accessibilityLabel={`오늘 내부 온도와 ${weather.regionName} 시간별 기온 비교 그래프`}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        className="mt-3"
        style={{ height: CHART_H }}
      >
        {width > 0 ? (
          <Svg width={width} height={CHART_H}>
            <Rect x={LEFT} y={y(COMFORT_MAX)} width={Math.max(0, width - LEFT)} height={y(COMFORT_MIN) - y(COMFORT_MAX)} fill={T.goodSoft} />
            {[lo, Math.round((lo + hi) / 2), hi].map((value) => (
              <SvgText key={value} x={LEFT - 6} y={y(value) + 3} textAnchor="end" fontSize={11} fill={T.muted}>{value}°</SvgText>
            ))}
            {extrema.map((p) => (
              <Line key={p.label} x1={LEFT} x2={width} y1={y(p.value)} y2={y(p.value)} stroke={REGION_COLOR} strokeOpacity={0.3} strokeDasharray="3 4" />
            ))}
            {series.map((item) => (
              <Path key={item.key} d={path(item.points)} stroke={item.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill="none" />
            ))}
            {/* 앞뒤가 끊긴 외딴 기록은 선으로 안 보이므로 점으로 표시합니다. */}
            {series.flatMap((item) => item.points
              .filter((p, i) => item.points[i - 1]?.hour !== p.hour - 1 && item.points[i + 1]?.hour !== p.hour + 1)
              .map((p) => <Circle key={`${item.key}-${p.hour}`} cx={x(p.hour)} cy={y(p.value)} r={3} fill={item.color} />))}
            {extrema.filter((p, i, all) => i === 0 || Math.abs(p.value - all[0].value) > (hi - lo) * 0.12).map((p) => (
              <SvgText key={p.label} x={width - 3} y={y(p.value) - 5} textAnchor="end" fontSize={11} fill={REGION_COLOR}>{p.label} {p.value.toFixed(1)}°</SvgText>
            ))}
          </Svg>
        ) : null}
      </View>
      <View className="flex-row justify-between mt-1.5" style={{ paddingLeft: LEFT }}>
        <PretendardFont style={{ fontSize: 12, color: T.muted }}>0시</PretendardFont>
        <PretendardFont style={{ fontSize: 12, color: T.muted }}>{lastHour}시</PretendardFont>
      </View>
      {weather.hourly.isError || !regional.length ? (
        <PretendardFont style={{ marginTop: 6, fontSize: 12, color: T.muted }}>
          {weather.hourly.isLoading ? "지역 기온 기록을 불러오고 있어요" : weather.hourly.isError ? "지역 기온 기록을 불러오지 못했어요" : "오늘 지역 기온 기록이 아직 없어요"}
        </PretendardFont>
      ) : null}
    </View>
  );
}

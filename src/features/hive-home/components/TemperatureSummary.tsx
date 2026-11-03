import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import type { DataPoint } from "@/types";
import { COMFORT_MAX, COMFORT_MIN, T } from "../theme";

interface Summary {
  count: number;
  comfortRatio: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  humidityAvg: number | null;
}

/** 기록에서 내부 온도 요약과 권장 구간(24~27°C) 비율을 계산합니다. */
export function summarizeTemperature(data: DataPoint[]): Summary {
  const temps = data.map((point) => point.internalTemperature).filter((value): value is number => value != null && Number.isFinite(value));
  const hums = data.map((point) => point.internalHumidity).filter((value): value is number => value != null && Number.isFinite(value));
  const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
  return {
    count: temps.length,
    comfortRatio: temps.length ? temps.filter((value) => value >= COMFORT_MIN && value <= COMFORT_MAX).length / temps.length : 0,
    avg: mean(temps),
    min: temps.length ? Math.min(...temps) : null,
    max: temps.length ? Math.max(...temps) : null,
    humidityAvg: mean(hums),
  };
}

/**
 * 내부 온도 요약 블록(압축형) — 리포트 화면과 스마트벌통 화면이 같은 모양을 씁니다.
 * - 한 줄: 권장 온도 유지 비율 % + 측정 구간 수
 * - children(예: 오늘 그래프)이 있으면 그 사이에 넣습니다.
 * - 한 줄: 평균·최저·최고 온도와 평균 습도
 */
export function TemperatureSummary({ data, periodLabel, loading, children }: {
  data: DataPoint[]; periodLabel: string; loading: boolean; children?: ReactNode;
}) {
  const summary = summarizeTemperature(data);

  if (loading) {
    return <View className="h-[88px] items-center justify-center"><ActivityIndicator color={T.inkSoft} /></View>;
  }
  if (!summary.count) {
    return (
      <View>
        <View className="pt-4 pb-1 items-center">
          <PretendardFont style={{ fontSize: 13, color: T.muted }}>{periodLabel} 기록이 아직 없어요</PretendardFont>
        </View>
        {children}
      </View>
    );
  }

  const percent = Math.round(summary.comfortRatio * 100);
  const tone = percent >= 70 ? T.good : percent >= 40 ? "#B45309" : T.hot;

  return (
    <View className="mt-3.5">
      <View className="flex-row items-baseline justify-between gap-2">
        <View className="flex-row items-baseline gap-1.5">
          <PretendardFont style={{ fontSize: 13, color: T.inkSoft }}>권장 {COMFORT_MIN}~{COMFORT_MAX}°C 유지</PretendardFont>
          <PretendardFont
            weight="bold"
            accessibilityLabel={`권장 온도 유지 비율 ${percent}퍼센트`}
            style={{ fontSize: 20, color: tone, fontVariant: ["tabular-nums"] }}
          >
            {percent}
            <PretendardFont weight="medium" style={{ fontSize: 13, color: T.muted }}>%</PretendardFont>
          </PretendardFont>
        </View>
        <PretendardFont style={{ fontSize: 12, color: T.muted }}>측정 {summary.count}구간</PretendardFont>
      </View>

      {children}

      <View className="flex-row mt-3">
        {[
          { label: "평균", value: summary.avg, unit: "°" },
          { label: "최저", value: summary.min, unit: "°" },
          { label: "최고", value: summary.max, unit: "°" },
          { label: "평균 습도", value: summary.humidityAvg, unit: "%", digits: 0 },
        ].map((item, index) => (
          <View key={item.label} className="flex-1 items-center" style={{ borderLeftWidth: index ? 1 : 0, borderLeftColor: T.line }}>
            <PretendardFont style={{ fontSize: 12, color: T.muted }}>{item.label}</PretendardFont>
            <PretendardFont weight="semibold" style={{ marginTop: 2, fontSize: 15, color: T.ink, fontVariant: ["tabular-nums"] }}>
              {item.value == null ? "–" : `${item.value.toFixed(item.digits ?? 1)}${item.unit}`}
            </PretendardFont>
          </View>
        ))}
      </View>
    </View>
  );
}

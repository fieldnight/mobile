/**
 * 벌통 통계 차트 묶음
 * - chart 모드: 온도/습도 차트를 각각 보여줍니다.
 * - combined 모드: 온도와 습도를 한 통합 차트에 겹쳐 보여줍니다.
 * - 데이터 레이블은 SVG 밖 절대위치로 렌더링해 PretendardFont를 적용합니다.
 */
import { useCallback, useEffect, useRef } from "react";
import {
  Dimensions,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { MiniChart } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { Spacing } from "@/constants/hive-stats";
import { C } from "@/constants/hive-colors";
import type { DataPoint } from "@/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const LEFT_AXIS_WIDTH = 40;
const RIGHT_CHART_MARGIN = 16;
const VIEWPORT_CHART_WIDTH =
  SCREEN_WIDTH - Spacing.lg * 4 - LEFT_AXIS_WIDTH - RIGHT_CHART_MARGIN;
const CHART_HEIGHT = 190;
const CHART_PADDING_H = 24;
const CHART_PADDING_V = 32;
const HOUR_SLOT_WIDTH = 50;
const USABLE_HEIGHT = CHART_HEIGHT - CHART_PADDING_V;
const LABEL_HEIGHT = 18;

const CHART_CONFIGS = [
  {
    key: "temp" as const,
    label: "온도",
    color: C.chartTemp,
    unit: "°",
    minVal: 30,
    maxVal: 38,
  },
  {
    key: "humidity" as const,
    label: "습도",
    color: C.primary,      // 습도 색 primary로 변경
    unit: "%",
    minVal: 40,
    maxVal: 80,
  },
];

function chartWidthFor(data: DataPoint[]) {
  const totalSlots = Math.max(data.length, 24);
  return Math.max(VIEWPORT_CHART_WIDTH, totalSlots * HOUR_SLOT_WIDTH);
}

function statLine(data: DataPoint[], key: "temp" | "humidity") {
  const values = data.filter((d) => d.hasData !== false).map((d) => d[key]);
  if (!values.length) return { avg: "-", min: "-", max: "-" };

  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return {
    avg: key === "temp" ? avg.toFixed(1) : Math.round(avg),
    min: key === "temp" ? Math.min(...values).toFixed(1) : Math.min(...values),
    max: key === "temp" ? Math.max(...values).toFixed(1) : Math.max(...values),
  };
}

function buildChartPoints(
  data: DataPoint[],
  key: "temp" | "humidity",
  minVal: number,
  maxVal: number,
  chartWidth: number,
) {
  const range = Math.max(maxVal - minVal, 1);
  const totalSlots = Math.max(data.length, 24);
  const usableWidth = chartWidth - CHART_PADDING_H;
  const step = totalSlots > 1 ? usableWidth / (totalSlots - 1) : 0;

  return data.map((point, index) => {
    const x = CHART_PADDING_H / 2 + step * index;
    const y =
      CHART_PADDING_V / 2 + USABLE_HEIGHT * (1 - (point[key] - minVal) / range);
    return { x, y, value: point[key], label: point.label, hasData: point.hasData !== false };
  });
}

function buildPath(points: { x: number; y: number; hasData?: boolean }[]) {
  const active = points.filter((p) => p.hasData !== false);
  if (!active.length) return "";
  return active.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function buildAreaPath(points: { x: number; y: number; hasData?: boolean }[]) {
  const active = points.filter((p) => p.hasData !== false);
  if (!active.length) return "";
  const bottom = CHART_PADDING_V / 2 + USABLE_HEIGHT;
  return [
    `M ${active[0].x} ${bottom}`,
    `L ${active[0].x} ${active[0].y}`,
    ...active.slice(1).map((p) => `L ${p.x} ${p.y}`),
    `L ${active[active.length - 1].x} ${bottom}`,
    "Z",
  ].join(" ");
}

function chartGuideTop(percent: number) {
  return CHART_PADDING_V / 2 + (percent / 100) * USABLE_HEIGHT;
}

function hourLabel(label: string) {
  return label.replace("시", "").replace("??", "");
}

/** 통합차트: 온도+습도를 한 차트에 겹쳐 표시, SVG 밖 절대위치 레이블로 PretendardFont 적용 */
function CombinedChart({ data }: { data: DataPoint[] }) {
  const chartWidth = chartWidthFor(data);
  const tempConfig = CHART_CONFIGS[0];
  const humConfig = CHART_CONFIGS[1];
  const tempPoints = buildChartPoints(data, "temp", tempConfig.minVal, tempConfig.maxVal, chartWidth);
  const humPoints = buildChartPoints(data, "humidity", humConfig.minVal, humConfig.maxVal, chartWidth);
  const latest = [...data].reverse().find((p) => p.hasData !== false) ?? data[0];

  const activeTempPoints = tempPoints.filter((p) => p.hasData);
  const activeHumPoints = humPoints.filter((p) => p.hasData);

  return (
    <View>
      {/* 범례 + 최신값 */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-4">
          {CHART_CONFIGS.map((config) => (
            <View key={config.key} className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.color }} />
              <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
                {config.label}
              </PretendardFont>
            </View>
          ))}
        </View>

        <View className="flex-row items-center gap-4">
          <View className="items-end">
            <PretendardFont style={{ fontSize: 12, color: C.sec }}>온도</PretendardFont>
            <PretendardFont weight="bold" style={{ fontSize: 16, color: C.chartTemp }}>
              {latest.temp.toFixed(1)}°C
            </PretendardFont>
          </View>
          <View className="items-end">
            <PretendardFont style={{ fontSize: 12, color: C.sec }}>습도</PretendardFont>
            <PretendardFont weight="bold" style={{ fontSize: 16, color: C.primary }}>
              {latest.humidity}%
            </PretendardFont>
          </View>
        </View>
      </View>

      <View className="mb-3 flex-row" style={{ height: CHART_HEIGHT + 38 }}>
        {/* y축 레이블 */}
        <View className="items-end justify-between pb-9 pr-2" style={{ width: LEFT_AXIS_WIDTH }}>
          {["100%", "75%", "50%", "25%", "0%"].map((label) => (
            <PretendardFont key={label} weight="semibold" style={{ fontSize: 13, color: C.sec }}>
              {label}
            </PretendardFont>
          ))}
        </View>

        {/* 가로 자유 슬라이딩 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={{ width: VIEWPORT_CHART_WIDTH }}
          contentContainerStyle={{ width: chartWidth }}
        >
          <View style={{ width: chartWidth }}>
            <View className="relative" style={{ width: chartWidth, height: CHART_HEIGHT }}>
              {/* 배경 가이드 라인 */}
              {[0, 25, 50, 75, 100].map((percent) => (
                <View
                  key={percent}
                  className="absolute left-0 h-px"
                  style={{
                    top: chartGuideTop(percent),
                    width: chartWidth,
                    backgroundColor: C.border,
                    opacity: 0.5,
                  }}
                />
              ))}

              <Svg width={chartWidth} height={CHART_HEIGHT}>
                <Path d={buildAreaPath(tempPoints)} fill={`${C.chartTemp}18`} />
                <Path d={buildAreaPath(humPoints)} fill={`${C.primary}12`} />
                <Path d={buildPath(tempPoints)} fill="none" stroke={C.chartTemp} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                <Path d={buildPath(humPoints)} fill="none" stroke={C.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                {activeTempPoints.map((p, i) => (
                  <Circle key={`tc-${i}`} cx={p.x} cy={p.y} r={4} fill={C.white} stroke={C.chartTemp} strokeWidth={2.5} />
                ))}
                {activeHumPoints.map((p, i) => (
                  <Circle key={`hc-${i}`} cx={p.x} cy={p.y} r={4} fill={C.white} stroke={C.primary} strokeWidth={2.5} />
                ))}
              </Svg>

              {/* 온도 데이터 레이블 — 절대위치 PretendardFont */}
              {activeTempPoints.map((p, i) => (
                <PretendardFont
                  key={`tl-${i}`}
                  weight="bold"
                  style={{
                    position: "absolute",
                    fontSize: 12,
                    color: C.chartTemp,
                    left: p.x - HOUR_SLOT_WIDTH / 2,
                    top: p.y - LABEL_HEIGHT - 4,
                    width: HOUR_SLOT_WIDTH,
                    textAlign: "center",
                  }}
                >
                  {`${p.value.toFixed(1)}°`}
                </PretendardFont>
              ))}

              {/* 습도 데이터 레이블 — 절대위치 PretendardFont */}
              {activeHumPoints.map((p, i) => (
                <PretendardFont
                  key={`hl-${i}`}
                  weight="bold"
                  style={{
                    position: "absolute",
                    fontSize: 12,
                    color: C.primary,
                    left: p.x - HOUR_SLOT_WIDTH / 2,
                    top: p.y + 8,
                    width: HOUR_SLOT_WIDTH,
                    textAlign: "center",
                  }}
                >
                  {`${p.value}%`}
                </PretendardFont>
              ))}
            </View>

            {/* x축 시간 레이블 */}
            <View className="mt-2 flex-row" style={{ width: chartWidth }}>
              {data.map((point, index) => (
                <PretendardFont
                  key={`${point.label}-${index}`}
                  weight="semibold"
                  style={{ width: HOUR_SLOT_WIDTH, fontSize: 12, color: C.sec, textAlign: "center" }}
                >
                  {hourLabel(point.label)}
                </PretendardFont>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/** 현재 시각에 해당하는 데이터 인덱스를 찾아, 차트 중앙에 오도록 x 오프셋을 계산 */
function calcInitialScrollX(data: DataPoint[]): number {
  if (!data.length) return 0;
  const currentHour = new Date().getHours();
  // data[i].label 형태: "0시", "1시", ... 혹은 숫자 문자열
  const idx = data.findIndex((d) => {
    const h = parseInt(d.label.replace(/\D/g, ""), 10);
    return h === currentHour;
  });
  const targetIdx = idx >= 0 ? idx : data.length - 1;
  // 현재 시각 슬롯을 뷰포트 중앙에 배치
  const centerOffset = targetIdx * HOUR_SLOT_WIDTH - VIEWPORT_CHART_WIDTH / 2 + HOUR_SLOT_WIDTH / 2;
  return Math.max(0, centerOffset);
}

export function ChartCards({
  data,
  viewMode = "chart",
}: {
  data: DataPoint[];
  viewMode?: "chart" | "combined";
}) {
  const tempScrollRef = useRef<ScrollView | null>(null);
  const humidityScrollRef = useRef<ScrollView | null>(null);
  const syncingRef = useRef(false);

  // 진입 시 현재 시각 위치로 자동 스크롤 (양쪽 차트 동시)
  useEffect(() => {
    if (!data.length) return;
    const x = calcInitialScrollX(data);
    // ScrollView가 마운트 완료된 직후 실행되도록 한 프레임 지연
    const timer = setTimeout(() => {
      tempScrollRef.current?.scrollTo({ x, animated: true });
      humidityScrollRef.current?.scrollTo({ x, animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  // 온도·습도 차트 가로 스크롤 위치 동기화
  const syncScroll = useCallback(
    (
      targetRef: React.RefObject<ScrollView | null>,
      event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      targetRef.current?.scrollTo({ x: event.nativeEvent.contentOffset.x, animated: false });
      requestAnimationFrame(() => { syncingRef.current = false; });
    },
    [],
  );

  if (viewMode === "combined") {
    return <CombinedChart data={data} />;
  }

  return (
    <>
      {CHART_CONFIGS.map((config, index) => {
        const { avg, min, max } = statLine(data, config.key);
        return (
          <View key={config.key}>
            {index > 0 && <View className="my-3 h-px" style={{ backgroundColor: C.border }} />}

            {/* 차트 제목 + 평균/최저/최고 */}
            <View className="mb-2.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} />
                <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
                  {config.label}
                </PretendardFont>
              </View>
              <View className="flex-row items-center gap-4">
                {[
                  { label: "평균", value: `${avg}${config.unit}` },
                  { label: "최저", value: `${min}${config.unit}` },
                  { label: "최고", value: `${max}${config.unit}` },
                ].map((item) => (
                  <View key={item.label} className="items-center">
                    <PretendardFont style={{ fontSize: 12, color: C.sec }}>
                      {item.label}
                    </PretendardFont>
                    <PretendardFont weight="bold" style={{ fontSize: 15, color: C.text }}>
                      {item.value}
                    </PretendardFont>
                  </View>
                ))}
              </View>
            </View>

            {/* 개별 차트 — scrollRef로 온도↔습도 스크롤 동기화 */}
            <MiniChart
              data={data}
              dataKey={config.key}
              unit={config.unit}
              color={config.color}
              minVal={config.minVal}
              maxVal={config.maxVal}
              scrollRef={config.key === "temp" ? tempScrollRef : humidityScrollRef}
              onScroll={(event) =>
                syncScroll(
                  config.key === "temp" ? humidityScrollRef : tempScrollRef,
                  event,
                )
              }
            />
          </View>
        );
      })}
    </>
  );
}

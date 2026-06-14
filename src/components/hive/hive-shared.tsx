/**
 * 벌통 통계 공통 UI
 * - Card: 통계/제어 화면에서 재사용하는 흰색 카드 컨테이너입니다.
 * - MiniChart: 온도·습도 단일 차트. 데이터 레이블을 SVG 밖 절대위치로 렌더링해 PretendardFont를 적용합니다.
 */
import React from "react";
import {
  Dimensions,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PretendardFont } from "@/components/PretendardFont";
import { Spacing } from "@/constants/hive-stats";
import { C } from "@/constants/hive-colors";
import type { DataPoint } from "../../types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const LEFT_AXIS_WIDTH = 40;
const RIGHT_CHART_MARGIN = 16;
const VIEWPORT_CHART_WIDTH =
  SCREEN_WIDTH - Spacing.lg * 4 - LEFT_AXIS_WIDTH - RIGHT_CHART_MARGIN;
const CHART_HEIGHT = 160;
const CHART_PADDING_H = 24;
const CHART_PADDING_V = 28;
const HOUR_SLOT_WIDTH = 50;
const USABLE_HEIGHT = CHART_HEIGHT - CHART_PADDING_V;
const LABEL_HEIGHT = 18;

export function Card({
  children,
  delay = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: ViewStyle;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(300).springify()}
      className={className}
      style={[
        {
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          padding: 15,
          borderWidth: 1,
          borderColor: "rgba(0, 0, 0, 0.04)",
          shadowColor: "#64748B",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function chartWidthFor(data: DataPoint[]) {
  const totalSlots = Math.max(data.length, 24);
  return Math.max(VIEWPORT_CHART_WIDTH, totalSlots * HOUR_SLOT_WIDTH);
}

function buildPoints(
  data: DataPoint[],
  dataKey: "temp" | "humidity",
  minVal: number,
  maxVal: number,
  chartWidth: number,
) {
  const range = Math.max(maxVal - minVal, 1);
  const totalSlots = Math.max(data.length, 24);
  const usableWidth = chartWidth - CHART_PADDING_H;
  const step = totalSlots > 1 ? usableWidth / (totalSlots - 1) : 0;

  return data.map((point, index) => {
    const value = point[dataKey];
    const x = CHART_PADDING_H / 2 + step * index;
    const y =
      CHART_PADDING_V / 2 + USABLE_HEIGHT * (1 - (value - minVal) / range);

    return {
      x,
      y,
      value,
      label: point.label,
      hasData: point.hasData !== false,
    };
  });
}

function buildAreaPath(points: { x: number; y: number; hasData?: boolean }[]) {
  const active = points.filter((p) => p.hasData !== false);
  if (!active.length) return "";

  const bottom = CHART_PADDING_V / 2 + USABLE_HEIGHT;
  return [
    `M ${active[0].x} ${bottom}`,
    `L ${active[0].x} ${active[0].y}`,
    ...active.slice(1).map((point) => `L ${point.x} ${point.y}`),
    `L ${active[active.length - 1].x} ${bottom}`,
    "Z",
  ].join(" ");
}

function buildLinePath(points: { x: number; y: number; hasData?: boolean }[]) {
  const active = points.filter((p) => p.hasData !== false);
  if (!active.length) return "";

  return active
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function hourLabel(label: string) {
  return label.replace("시", "").replace("??", "");
}

export function MiniChart({
  data,
  dataKey,
  unit,
  minVal,
  maxVal,
  color,
  scrollRef,
  onScroll,
}: {
  data: DataPoint[];
  dataKey: "temp" | "humidity";
  unit: string;
  minVal: number;
  maxVal: number;
  color?: string;
  scrollRef?: React.RefObject<ScrollView | null>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const chartWidth = chartWidthFor(data);
  const points = buildPoints(data, dataKey, minVal, maxVal, chartWidth);
  const linePath = buildLinePath(points);
  const areaPath = buildAreaPath(points);
  const midVal = ((maxVal + minVal) / 2).toFixed(0);
  const lineColor = color ?? C.sec;
  const activePoints = points.filter((p) => p.hasData);

  return (
    <View className="mb-3 flex-row" style={{ height: CHART_HEIGHT + 38 }}>
      {/* y축 레이블 — SVG 밖 PretendardFont */}
      <View className="items-end justify-between pb-9 pr-2" style={{ width: LEFT_AXIS_WIDTH }}>
        {[maxVal, midVal, minVal].map((value) => (
          <PretendardFont
            key={String(value)}
            weight="semibold"
            style={{ fontSize: 13, color: C.sec }}
          >
            {value}{unit}
          </PretendardFont>
        ))}
      </View>

      {/* 가로 자유 슬라이딩 차트 */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        onScroll={onScroll}
        style={{ width: VIEWPORT_CHART_WIDTH }}
        contentContainerStyle={{ width: chartWidth }}
      >
        <View style={{ width: chartWidth }}>
          {/* 배경 가이드 라인 + 꺾은선·면적 SVG */}
          <View className="relative" style={{ width: chartWidth, height: CHART_HEIGHT }}>
            {[0, 25, 50, 75, 100].map((percent) => (
              <View
                key={percent}
                className="absolute left-0 h-px"
                style={{
                  top: (percent / 100) * CHART_HEIGHT,
                  width: chartWidth,
                  backgroundColor: C.border,
                  opacity: 0.5,
                }}
              />
            ))}

            <Svg width={chartWidth} height={CHART_HEIGHT}>
              <Path d={areaPath} fill={`${lineColor}18`} />
              <Path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {activePoints.map((point, index) => (
                <Circle
                  key={`pt-${dataKey}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill={C.white}
                  stroke={lineColor}
                  strokeWidth={2.5}
                />
              ))}
            </Svg>

            {/* 데이터 값 레이블 — SVG 밖 절대위치로 PretendardFont 적용 */}
            {activePoints.map((point, index) => (
              <PretendardFont
                key={`lbl-${dataKey}-${index}`}
                weight="bold"
                style={{
                  position: "absolute",
                  fontSize: 12,
                  color: lineColor,
                  left: point.x - HOUR_SLOT_WIDTH / 2,
                  top: point.y - LABEL_HEIGHT - 4,
                  width: HOUR_SLOT_WIDTH,
                  textAlign: "center",
                }}
              >
                {dataKey === "temp"
                  ? `${point.value.toFixed(1)}${unit}`
                  : `${point.value}${unit}`}
              </PretendardFont>
            ))}
          </View>

          {/* x축 시간 레이블 */}
          <View className="mt-2 flex-row" style={{ width: chartWidth }}>
            {data.map((point, index) => (
              <PretendardFont
                key={`${point.label}-${index}`}
                weight="semibold"
                style={{
                  width: HOUR_SLOT_WIDTH,
                  fontSize: 12,
                  color: C.sec,
                  textAlign: "center",
                }}
              >
                {hourLabel(point.label)}
              </PretendardFont>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

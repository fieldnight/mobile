/**
 * 벌통 통계 UI 기본 단위
 * - Card       : FadeInDown 애니메이션이 포함된 흰색 라운드 카드
 * - MiniChart  : 막대 그래프 차트 (온도·습도 공용)
 */

import React from "react";
import { View, type ViewStyle, Dimensions } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Text as SvgText,
} from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Spacing } from "@/constants/hive-stats";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { DataPoint } from "../../types";

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  delay = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: import("react-native").ViewStyle;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify()}
      className={className}
      style={[
        {
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          padding: 16,
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

// ─── MiniChart ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const LEFT_AXIS_WIDTH = 9;
const RIGHT_CHART_MARGIN = 16;
const CHART_PADDING = 40;
const CHART_WIDTH =
  SCREEN_WIDTH - Spacing.lg * 4 - LEFT_AXIS_WIDTH - RIGHT_CHART_MARGIN;
const CHART_HEIGHT = 160;
const CHART_PADDING_H = 24;
const CHART_PADDING_V = 24;
const USABLE_WIDTH = CHART_WIDTH - CHART_PADDING_H;
const USABLE_HEIGHT = CHART_HEIGHT - CHART_PADDING_V;

function buildPoints(
  data: DataPoint[],
  dataKey: "temp" | "humidity",
  minVal: number,
  maxVal: number,
) {
  const range = Math.max(maxVal - minVal, 1);
  const step = data.length > 1 ? USABLE_WIDTH / (data.length - 1) : 0;

  return data.map((point, index) => {
    const value = point[dataKey];
    const x = CHART_PADDING_H / 2 + step * index;
    const y =
      CHART_PADDING_V / 2 + USABLE_HEIGHT * (1 - (value - minVal) / range);

    return { x, y, value };
  });
}

function buildAreaPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  const start = points[0];
  const end = points[points.length - 1];
  const bottom = CHART_PADDING_V / 2 + USABLE_HEIGHT;

  const path = [`M ${start.x} ${bottom}`, `L ${start.x} ${start.y}`];
  points.slice(1).forEach((point) => {
    path.push(`L ${point.x} ${point.y}`);
  });
  path.push(`L ${end.x} ${bottom}`, "Z");

  return path.join(" ");
}

function buildLinePath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function MiniChart({
  data,
  dataKey,
  color,
  unit,
  minVal,
  maxVal,
}: {
  data: DataPoint[];
  dataKey: "temp" | "humidity";
  color: string;
  unit: string;
  minVal: number;
  maxVal: number;
}) {
  const points = buildPoints(data, dataKey, minVal, maxVal);
  const linePath = buildLinePath(points);
  const areaPath = buildAreaPath(points);
  const midVal = ((maxVal + minVal) / 2).toFixed(0);

  return (
    <View className="flex-row mb-3" style={{ height: CHART_HEIGHT }}>
      <View className="w-9 justify-between items-end pr-1.5 pb-5">
        {[maxVal, midVal, minVal].map((v) => (
          <PretendardFont
            key={String(v)}
            style={{ fontSize: 11, color: "#B0B8C1" }}
          >
            {v}
            {unit}
          </PretendardFont>
        ))}
      </View>

      <View className="flex-1 relative">
        {[0, 25, 50, 75, 100].map((percent) => (
          <View
            key={percent}
            className="absolute left-0 right-0 h-px"
            style={{
              top: (percent / 100) * CHART_HEIGHT,
              backgroundColor: C.border,
              opacity: 0.35,
            }}
          />
        ))}

        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient
              id={`${dataKey}-gradient`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill={`url(#${dataKey}-gradient)`} />
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.flatMap((point, index) => [
            <Circle
              key={`point-${dataKey}-${index}`}
              cx={point.x}
              cy={point.y}
              r={3}
              fill={C.white}
              stroke={color}
              strokeWidth={2}
            />,
            <SvgText
              key={`label-${dataKey}-${index}`}
              x={point.x}
              y={point.y - 10}
              fontSize="10"
              fill={color}
              textAnchor="middle"
              fontWeight="600"
            >
              {dataKey === "temp"
                ? `${point.value.toFixed(1)}${unit}`
                : `${point.value}${unit}`}
            </SvgText>,
          ])}
        </Svg>

        <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
          <View className="flex-row justify-between">
            {data.map((point, i) => (
              <PretendardFont
                key={i}
                style={{ fontSize: 10, color: "#B0B8C1" }}
              >
                {point.label}
              </PretendardFont>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

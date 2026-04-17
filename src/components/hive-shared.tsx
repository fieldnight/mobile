/**
 * 벌통 통계 UI 기본 단위
 * - ThemedText : 기본 텍스트 색상이 적용된 Text 래퍼
 * - Card       : FadeInDown 애니메이션이 포함된 흰색 라운드 카드
 * - MiniChart  : 막대 그래프 차트 (온도·습도 공용)
 */

import React from "react";
import {
  Text,
  View,
  type TextProps,
  type ViewStyle,
  Dimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Spacing } from "@/constants/hive-stats";
import type { DataPoint } from "../types";

// ─── ThemedText ───────────────────────────────────────────────────────────────

export function ThemedText({
  className,
  style,
  ...props
}: TextProps & { className?: string }) {
  return (
    <Text
      className={`text-[#191F28] ${className ?? ""}`}
      style={style}
      {...props}
    />
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify()}
      className={`bg-white rounded-2xl p-4 ${className ?? ""}`}
    >
      {children}
    </Animated.View>
  );
}

// ─── MiniChart ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_PADDING = 40;
const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 4;
const CHART_HEIGHT = 160;
const BAR_MAX_H = CHART_HEIGHT - 40;

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
  const range = maxVal - minVal;
  const barWidth = Math.min(
    32,
    (CHART_WIDTH - CHART_PADDING) / data.length - 8,
  );
  const midVal = ((maxVal + minVal) / 2).toFixed(0);

  return (
    <View className="flex-row mb-3" style={{ height: CHART_HEIGHT }}>
      {/* Y-axis labels */}
      <View className="w-9 justify-between items-end pr-1.5 pb-5">
        {[maxVal, midVal, minVal].map((v) => (
          <ThemedText key={String(v)} className="text-[11px] text-[#B0B8C1]">
            {v}
            {unit}
          </ThemedText>
        ))}
      </View>

      {/* Chart area */}
      <View className="flex-1 relative">
        {/* Grid lines */}
        {(["0%", "50%", "100%"] as const).map((top) => (
          <View
            key={top}
            className="absolute left-0 right-0 h-px bg-[#E5E8EB] opacity-50"
            style={{ top }}
          />
        ))}

        {/* Bars */}
        <View className="flex-1 flex-row items-end justify-around pb-5">
          {data.map((point, i) => {
            const value = point[dataKey];
            const height = Math.max(4, ((value - minVal) / range) * BAR_MAX_H);

            return (
              <View key={i} className="items-center gap-1">
                <View className="min-w-[30px] items-center">
                  <ThemedText
                    className="text-[11px] font-semibold"
                    style={{ color }}
                  >
                    {dataKey === "temp" ? value.toFixed(1) : value}
                  </ThemedText>
                </View>
                <View
                  style={{
                    height,
                    width: barWidth,
                    backgroundColor: color,
                    opacity: 0.75,
                    borderRadius: barWidth / 4,
                  }}
                />
                <ThemedText className="text-[11px] text-[#B0B8C1] absolute -bottom-4">
                  {point.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

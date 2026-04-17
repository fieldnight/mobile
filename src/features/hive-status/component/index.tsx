/**
 * 벌통 통계 전용 UI 컴포넌트
 * - HiveSelector : 벌통 선택 칩 + 현재 온도·습도 표시
 * - PeriodCard   : 일간·주간·월간 탭 (하위에 WeatherSection을 children으로 주입)
 * - ChartCards   : 온도·습도 막대 차트 카드 (CHART_CONFIGS 배열로 확장 가능)
 * - DataTable    : 온도·습도·메탄·CO₂ 수치 테이블 (표로 보기 모드)
 */

import React from "react";
import { View, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Colors, HIVES } from "@/constants/hive-stats";
import { ThemedText, Card, MiniChart } from "@/components/hive-shared";
import type { DataPoint, Period } from "@/types";

// ─── Hive Selector ─────────────────────────────────────────────────────────────

interface HiveSelectorProps {
  selectedHive: string;
  onSelect: (id: string) => void;
  currentTemp: number;
  currentHumidity: number;
}

export function HiveSelector({
  selectedHive,
  onSelect,
  currentTemp,
  currentHumidity,
}: HiveSelectorProps) {
  return (
    <Card delay={0}>
      <View className="flex-row gap-2">
        {HIVES.map((hive) => (
          <Pressable
            key={hive.id}
            onPress={() => {
              if (Platform.OS !== "web")
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(hive.id);
            }}
            className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-[10px] ${
              selectedHive === hive.id ? "bg-[#3182F6]" : "bg-[#F4F5F7]"
            }`}
            data-testid={`button-hive-${hive.id}`}
          >
            <ThemedText
              className={`text-sm ${
                selectedHive === hive.id
                  ? "font-semibold text-white"
                  : "font-medium text-[#8B95A1]"
              }`}
            >
              {hive.name}
            </ThemedText>
            {hive.status === "offline" && (
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    selectedHive === hive.id ? "#FFCDD2" : "#F44336",
                }}
              />
            )}
          </Pressable>
        ))}
      </View>

      <View className="h-px bg-[#E5E8EB] my-3" />

      <View className="flex-row items-center justify-center">
        {[
          { label: "온도", value: `${currentTemp}°C` },
          { label: "습도", value: `${currentHumidity}%` },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <View className="w-px h-5 bg-[#E5E8EB]" />}
            <View className="flex-1 flex-row items-center justify-center gap-1.5 py-1">
              <ThemedText className="text-sm text-[#8B95A1]">
                {item.label}
              </ThemedText>
              <ThemedText className="text-[17px] font-bold text-[#191F28]">
                {item.value}
              </ThemedText>
            </View>
          </React.Fragment>
        ))}
      </View>
    </Card>
  );
}

// ─── Period Card ───────────────────────────────────────────────────────────────

const PERIODS: Period[] = ["일간", "주간", "월간"];

interface PeriodCardProps {
  period: Period;
  onSelect: (p: Period) => void;
  children: React.ReactNode;
}

export function PeriodCard({ period, onSelect, children }: PeriodCardProps) {
  return (
    <Card delay={25}>
      <View className="flex-row bg-[#F4F5F7] rounded-[10px] p-[3px]">
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            onPress={() => {
              if (Platform.OS !== "web")
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(p);
            }}
            className={`flex-1 items-center py-2.5 rounded-lg ${period === p ? "bg-white" : ""}`}
            data-testid={`button-period-${p}`}
          >
            <ThemedText
              className={`text-sm ${
                period === p
                  ? "font-semibold text-[#191F28]"
                  : "font-medium text-[#8B95A1]"
              }`}
            >
              {p}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      {children}
    </Card>
  );
}

// ─── Chart Cards ──────────────────────────────────────────────────────────────

const CHART_CONFIGS = [
  {
    key: "temp" as const,
    label: "온도",
    color: "#D4A017",
    unit: "°",
    minVal: 30,
    maxVal: 38,
    delay: 100,
  },
  {
    key: "humidity" as const,
    label: "습도",
    color: "#C68A00",
    unit: "%",
    minVal: 40,
    maxVal: 80,
    delay: 200,
  },
];

function statLine(data: DataPoint[], key: "temp" | "humidity") {
  const values = data.map((d) => d[key]);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return {
    avg: key === "temp" ? avg.toFixed(1) : Math.round(avg),
    min: key === "temp" ? Math.min(...values).toFixed(1) : Math.min(...values),
    max: key === "temp" ? Math.max(...values).toFixed(1) : Math.max(...values),
  };
}

export function ChartCards({ data }: { data: DataPoint[] }) {
  return (
    <>
      {CHART_CONFIGS.map((cfg) => {
        const { avg, min, max } = statLine(data, cfg.key);
        return (
          <Card key={cfg.key} delay={cfg.delay}>
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center gap-1.5">
                <View
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cfg.color }}
                />
                <ThemedText className="text-base font-semibold text-[#191F28]">
                  {cfg.label}
                </ThemedText>
              </View>
              <View className="flex-row items-center gap-2">
                {[
                  { lbl: "평균", val: `${avg}${cfg.unit}`, color: cfg.color },
                  { lbl: "최저", val: `${min}${cfg.unit}` },
                  { lbl: "최고", val: `${max}${cfg.unit}` },
                ].map(({ lbl, val, color }) => (
                  <ThemedText key={lbl} className="text-[12px] text-[#B0B8C1]">
                    {lbl}{" "}
                    <ThemedText
                      className="text-[13px] font-semibold text-[#8B95A1]"
                      style={color ? { color } : undefined}
                    >
                      {val}
                    </ThemedText>
                  </ThemedText>
                ))}
              </View>
            </View>
            <MiniChart
              data={data}
              dataKey={cfg.key}
              color={cfg.color}
              unit={cfg.unit}
              minVal={cfg.minVal}
              maxVal={cfg.maxVal}
            />
          </Card>
        );
      })}
    </>
  );
}

// ─── Data Table ───────────────────────────────────────────────────────────────

const TABLE_COLS = [
  {
    key: "temp" as const,
    label: "온도",
    unit: "°C",
    color: "#D4A017",
    format: (v: number) => v.toFixed(1),
  },
  {
    key: "humidity" as const,
    label: "습도",
    unit: "%",
    color: "#C68A00",
    format: (v: number) => String(v),
  },
  {
    key: "methane" as const,
    label: "메탄",
    unit: "ppm",
    color: Colors.warning,
    format: (v: number) => v.toFixed(1),
  },
  {
    key: "co2" as const,
    label: "CO₂",
    unit: "ppm",
    color: "#78909C",
    format: (v: number) => String(v),
  },
] as const;

interface DataTableProps {
  data: DataPoint[];
  period: Period;
}

export function DataTable({ data, period }: DataTableProps) {
  const periodLabel =
    period === "일간" ? "시간" : period === "주간" ? "요일" : "주차";

  return (
    <Card delay={100}>
      {/* Header */}
      <View className="flex-row border-b-[1.5px] border-[#191F28] pb-2">
        <View className="w-[64px] pl-0.5">
          <ThemedText className="text-[13px] font-bold text-[#191F28]">
            {periodLabel}
          </ThemedText>
        </View>
        {TABLE_COLS.map((col) => (
          <View key={col.key} className="flex-1 items-center">
            <ThemedText
              className="text-[13px] font-bold"
              style={{ color: col.color }}
            >
              {col.label}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Unit row */}
      <View className="flex-row border-b border-[#E5E8EB] pb-1">
        <View className="w-[64px]" />
        {TABLE_COLS.map((col) => (
          <View key={col.key} className="flex-1 items-center py-2">
            <ThemedText className="text-[10px] font-medium text-[#B0B8C1]">
              {col.unit}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Data rows */}
      {data.map((point, i) => (
        <View
          key={i}
          className={`flex-row border-b border-[#E5E8EB] ${i % 2 === 0 ? "bg-[#F8F9FA]" : ""}`}
        >
          <View className="w-[64px] py-2 pl-0.5 justify-center">
            <ThemedText className="text-sm font-semibold text-[#191F28]">
              {point.label}
            </ThemedText>
          </View>
          {TABLE_COLS.map((col) => (
            <View
              key={col.key}
              className="flex-1 py-2 px-0.5 items-center justify-center"
            >
              <ThemedText className="text-sm text-[#8B95A1]">
                {col.format(point[col.key] as number)}
              </ThemedText>
            </View>
          ))}
        </View>
      ))}
    </Card>
  );
}

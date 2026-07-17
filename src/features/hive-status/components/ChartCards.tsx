/**
 * 벌통 센서 차트 묶음
 * - chart 모드: 5개 센서를 개별 차트로 표시합니다.
 * - combined 모드: 같은 x축 label을 기준으로 5개 센서의 최신값 요약과 통합 라인을 표시합니다.
 */
import { Fragment, useCallback, useEffect, useRef } from "react";
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
import type { DataPoint, HiveSensorDataKey } from "@/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const LEFT_AXIS_WIDTH = 40;
const RIGHT_CHART_MARGIN = 16;
const VIEWPORT_CHART_WIDTH =
  SCREEN_WIDTH - Spacing.lg * 4 - LEFT_AXIS_WIDTH - RIGHT_CHART_MARGIN;
const CHART_HEIGHT = 190;
const CHART_PADDING_H = 24;
const CHART_PADDING_V = 32;
const HOUR_SLOT_WIDTH = 50;
const COMBINED_SLOT_WIDTH = 58;
const USABLE_HEIGHT = CHART_HEIGHT - CHART_PADDING_V;

const CHART_CONFIGS: Array<{
  key: HiveSensorDataKey;
  label: string;
  color: string;
  unit: string;
  minVal: number;
  maxVal: number;
  muted?: boolean;
}> = [
  {
    key: "internalTemperature",
    label: "내부 온도",
    color: C.chartTemp,
    unit: "°C",
    minVal: 25,
    maxVal: 40,
  },
  {
    key: "externalTemperature",
    label: "외부 온도",
    color: "#A78B7A",
    unit: "°C",
    minVal: -10,
    maxVal: 40,
    muted: true,
  },
  {
    key: "internalHumidity",
    label: "내부 습도",
    color: C.primary,
    unit: "%",
    minVal: 20,
    maxVal: 90,
  },
  {
    key: "externalHumidity",
    label: "외부 습도",
    color: "#7C93A8",
    unit: "%",
    minVal: 20,
    maxVal: 100,
    muted: true,
  },
  {
    key: "co2",
    label: "CO2",
    color: C.success,
    unit: "ppm",
    minVal: 300,
    maxVal: 1000,
  },
];

function chartWidthFor(data: DataPoint[], slotWidth = HOUR_SLOT_WIDTH) {
  const totalSlots = Math.max(data.length, 24);
  return Math.max(VIEWPORT_CHART_WIDTH, totalSlots * slotWidth);
}

function statLine(data: DataPoint[], key: HiveSensorDataKey) {
  const values = data.filter((d) => d.hasData !== false).map((d) => d[key]);
  if (!values.length) return { avg: "-", min: "-", max: "-" };

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const isTemperature = key.includes("Temperature");

  return {
    avg: isTemperature ? avg.toFixed(1) : Math.round(avg),
    min: isTemperature ? Math.min(...values).toFixed(1) : Math.min(...values),
    max: isTemperature ? Math.max(...values).toFixed(1) : Math.max(...values),
  };
}

function buildChartPoints(
  data: DataPoint[],
  key: HiveSensorDataKey,
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
  const active = points.filter((point) => point.hasData !== false);
  if (!active.length) return "";
  return active.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function hourLabel(label: string) {
  return label.replace(":00", "");
}

function CombinedChart({ data }: { data: DataPoint[] }) {
  const chartWidth = chartWidthFor(data, COMBINED_SLOT_WIDTH);
  const latest = [...data].reverse().find((point) => point.hasData !== false) ?? data[0];

  return (
    <View>
      <View className="mb-3 flex-row flex-wrap gap-x-4 gap-y-2">
        {CHART_CONFIGS.map((config) => (
          <View key={config.key} className="flex-row items-center gap-2">
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: config.color,
                opacity: config.muted ? 0.65 : 1,
              }}
            />
            <PretendardFont
              weight="bold"
              style={{ fontSize: 13, color: config.muted ? C.textAlt : C.text }}
            >
              {config.label}
            </PretendardFont>
            <PretendardFont
              weight="bold"
              style={{ fontSize: 13, color: config.color, opacity: config.muted ? 0.78 : 1 }}
            >
              {latest ? `${latest[config.key]}${config.unit}` : "-"}
            </PretendardFont>
          </View>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={{ width: VIEWPORT_CHART_WIDTH + LEFT_AXIS_WIDTH }}
        contentContainerStyle={{ width: chartWidth }}
      >
        <View style={{ width: chartWidth }}>
          <View className="relative" style={{ width: chartWidth, height: CHART_HEIGHT }}>
            {[0, 25, 50, 75, 100].map((percent) => (
              <View
                key={percent}
                className="absolute left-0 h-px"
                style={{
                  top: CHART_PADDING_V / 2 + (percent / 100) * USABLE_HEIGHT,
                  width: chartWidth,
                  backgroundColor: C.border,
                  opacity: 0.5,
                }}
              />
            ))}

            <Svg width={chartWidth} height={CHART_HEIGHT}>
              {CHART_CONFIGS.map((config) => {
                const points = buildChartPoints(
                  data,
                  config.key,
                  config.minVal,
                  config.maxVal,
                  chartWidth,
                );
                const activePoints = points.filter((point) => point.hasData);

                return (
                  <Fragment key={config.key}>
                    <Path
                      d={buildPath(points)}
                      fill="none"
                      stroke={config.color}
                      strokeWidth={config.muted ? 1.5 : 2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={config.muted ? 0.58 : 1}
                    />
                    {activePoints.map((point, index) => (
                      <Circle
                        key={`${config.key}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={config.muted ? 2.4 : 3.4}
                        fill={C.white}
                        stroke={config.color}
                        strokeWidth={config.muted ? 1.4 : 2}
                        opacity={config.muted ? 0.62 : 1}
                      />
                    ))}
                  </Fragment>
                );
              })}
            </Svg>
          </View>

          <View className="mt-2 flex-row" style={{ width: chartWidth }}>
            {data.map((point, index) => (
              <CombinedValueBox
                key={`${point.label}-values-${index}`}
                point={point}
              />
            ))}
          </View>

          <View className="mt-2 flex-row" style={{ width: chartWidth }}>
            {data.map((point, index) => (
              <PretendardFont
                key={`${point.label}-${index}`}
                weight="semibold"
                style={{
                  width: COMBINED_SLOT_WIDTH,
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

function CombinedValueBox({ point }: { point: DataPoint }) {
  return (
    <View
      className="overflow-hidden rounded-md border bg-white"
      style={{
        width: COMBINED_SLOT_WIDTH,
        borderColor: C.border,
        opacity: point.hasData === false ? 0.45 : 1,
      }}
    >
      {CHART_CONFIGS.map((config, index) => (
        <View
          key={`${point.label}-${config.key}`}
          className="items-center justify-center px-1"
          style={{
            height: 16,
            backgroundColor: index % 2 === 0 ? C.white : C.bgAlt,
          }}
        >
          <PretendardFont
            weight="bold"
            style={{
              fontSize: 10,
              color: config.color,
              opacity: config.muted ? 0.78 : 1,
            }}
          >
            {point.hasData === false ? "-" : `${point[config.key]}${config.unit}`}
          </PretendardFont>
        </View>
      ))}
    </View>
  );
}

function calcInitialScrollX(data: DataPoint[]): number {
  if (!data.length) return 0;
  const currentHour = new Date().getHours();
  const index = data.findIndex((point) => Number(point.label.slice(0, 2)) === currentHour);
  const targetIndex = index >= 0 ? index : data.length - 1;
  return Math.max(
    0,
    targetIndex * HOUR_SLOT_WIDTH - VIEWPORT_CHART_WIDTH / 2 + HOUR_SLOT_WIDTH / 2,
  );
}

export function ChartCards({
  data,
  viewMode = "chart",
}: {
  data: DataPoint[];
  viewMode?: "chart" | "combined";
}) {
  const scrollRefs = useRef<Record<HiveSensorDataKey, ScrollView | null>>({
    internalTemperature: null,
    externalTemperature: null,
    internalHumidity: null,
    externalHumidity: null,
    co2: null,
  });
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!data.length) return;
    const x = calcInitialScrollX(data);
    const timer = setTimeout(() => {
      Object.values(scrollRefs.current).forEach((ref) => ref?.scrollTo({ x, animated: true }));
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  const syncScroll = useCallback(
    (sourceKey: HiveSensorDataKey, event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (syncingRef.current) return;

      syncingRef.current = true;
      const x = event.nativeEvent.contentOffset.x;
      Object.entries(scrollRefs.current).forEach(([key, ref]) => {
        if (key !== sourceKey) {
          ref?.scrollTo({ x, animated: false });
        }
      });
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    },
    [],
  );

  if (!data.length) {
    return (
      <View className="items-center py-6">
        <PretendardFont style={{ fontSize: 13, color: C.sec }}>
          표시할 센서 데이터가 없습니다.
        </PretendardFont>
      </View>
    );
  }

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

            <MiniChart
              data={data}
              dataKey={config.key}
              unit={config.unit}
              color={config.color}
              minVal={config.minVal}
              maxVal={config.maxVal}
              scrollRef={(ref) => {
                scrollRefs.current[config.key] = ref;
              }}
              onScroll={(event) => syncScroll(config.key, event)}
            />
          </View>
        );
      })}
    </>
  );
}

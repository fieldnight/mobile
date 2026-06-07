import { View, Dimensions } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Text as SvgText,
} from "react-native-svg";
import { Card, MiniChart } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import type { DataPoint } from "@/types";
import { Spacing } from "@/constants/hive-stats";
import { C } from "@/constants/hive-colors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const LEFT_AXIS_WIDTH = 9;
const RIGHT_CHART_MARGIN = 16;
const CHART_WIDTH =
  SCREEN_WIDTH - Spacing.lg * 4 - LEFT_AXIS_WIDTH - RIGHT_CHART_MARGIN;
const CHART_HEIGHT = 180;
const CHART_PADDING_H = 24;
const CHART_PADDING_V = 28;
const USABLE_WIDTH = CHART_WIDTH - CHART_PADDING_H;
const USABLE_HEIGHT = CHART_HEIGHT - CHART_PADDING_V;

const CHART_CONFIGS = [
  {
    key: "temp" as const,
    label: "온도",
    color: C.chartTemp,
    unit: "°",
    minVal: 30,
    maxVal: 38,
    delay: 100,
  },
  {
    key: "humidity" as const,
    label: "습도",
    color: C.chartHumidity,
    unit: "%",
    minVal: 40,
    maxVal: 80,
    delay: 200,
  },
];

function statLine(data: DataPoint[], key: "temp" | "humidity") {
  const values = data.map((d) => d[key]);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
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
) {
  const range = Math.max(maxVal - minVal, 1);
  const step = data.length > 1 ? USABLE_WIDTH / (data.length - 1) : 0;
  return data.map((point, index) => {
    const x = CHART_PADDING_H / 2 + step * index;
    const y =
      CHART_PADDING_V / 2 + USABLE_HEIGHT * (1 - (point[key] - minVal) / range);
    return { x, y, value: point[key], label: point.label };
  });
}

function buildPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  const bottom = CHART_PADDING_V / 2 + USABLE_HEIGHT;
  return [
    `M ${points[0].x} ${bottom}`,
    `L ${points[0].x} ${points[0].y}`,
    ...points.slice(1).map((point) => `L ${point.x} ${point.y}`),
    `L ${points[points.length - 1].x} ${bottom}`,
    "Z",
  ].join(" ");
}

function CombinedChart({ data }: { data: DataPoint[] }) {
  const tempConfig = CHART_CONFIGS[0];
  const humConfig = CHART_CONFIGS[1];
  const tempPoints = buildChartPoints(
    data,
    "temp",
    tempConfig.minVal,
    tempConfig.maxVal,
  );
  const humPoints = buildChartPoints(
    data,
    "humidity",
    humConfig.minVal,
    humConfig.maxVal,
  );
  const latest = data[data.length - 1];

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center gap-2">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tempConfig.color }}
            />
            <PretendardFont
              weight="bold"
              style={{ fontSize: 14, color: C.text }}
            >
              온도
            </PretendardFont>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: humConfig.color }}
            />
            <PretendardFont
              weight="bold"
              style={{ fontSize: 14, color: C.text }}
            >
              습도
            </PretendardFont>
          </View>
        </View>
        <View className="flex-row items-center gap-4">
          <View className="items-end">
            <PretendardFont style={{ fontSize: 11, color: C.sec }}>
              온도
            </PretendardFont>
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 13, color: tempConfig.color }}
            >
              {latest.temp.toFixed(1)}°C
            </PretendardFont>
          </View>
          <View className="items-end">
            <PretendardFont style={{ fontSize: 11, color: C.sec }}>
              습도
            </PretendardFont>
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 13, color: humConfig.color }}
            >
              {latest.humidity}%
            </PretendardFont>
          </View>
        </View>
      </View>

      <View className="flex-row mb-3" style={{ height: CHART_HEIGHT }}>
        <View className="w-9 justify-between items-end pr-1.5 pb-5">
          {["100%", "75%", "50%", "25%", "0%"].map((label) => (
            <PretendardFont
              key={label}
              style={{ fontSize: 11, color: "#B0B8C1" }}
            >
              {label}
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
                id="combined-temp-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop
                  offset="0%"
                  stopColor={tempConfig.color}
                  stopOpacity={0.24}
                />
                <Stop
                  offset="100%"
                  stopColor={tempConfig.color}
                  stopOpacity={0}
                />
              </LinearGradient>
              <LinearGradient
                id="combined-hum-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop
                  offset="0%"
                  stopColor={humConfig.color}
                  stopOpacity={0.24}
                />
                <Stop
                  offset="100%"
                  stopColor={humConfig.color}
                  stopOpacity={0}
                />
              </LinearGradient>
            </Defs>
            <Path
              d={buildAreaPath(tempPoints)}
              fill="url(#combined-temp-gradient)"
            />
            <Path
              d={buildAreaPath(humPoints)}
              fill="url(#combined-hum-gradient)"
            />
            <Path
              d={buildPath(tempPoints)}
              fill="none"
              stroke={tempConfig.color}
              strokeWidth={2}
            />
            <Path
              d={buildPath(humPoints)}
              fill="none"
              stroke={humConfig.color}
              strokeWidth={2}
            />
            {tempPoints.flatMap((point, index) => [
              <Circle
                key={`temp-${index}`}
                cx={point.x}
                cy={point.y}
                r={3}
                fill={C.white}
                stroke={tempConfig.color}
                strokeWidth={2}
              />,
              <SvgText
                key={`temp-label-${index}`}
                x={point.x}
                y={point.y - 10}
                fontSize="10"
                fill={tempConfig.color}
                textAnchor="middle"
                fontWeight="600"
              >
                {`${point.value.toFixed(1)}°`}
              </SvgText>,
            ])}
            {humPoints.flatMap((point, index) => [
              <Circle
                key={`hum-${index}`}
                cx={point.x}
                cy={point.y}
                r={3}
                fill={C.white}
                stroke={humConfig.color}
                strokeWidth={2}
              />,
              <SvgText
                key={`hum-label-${index}`}
                x={point.x}
                y={point.y + 16}
                fontSize="10"
                fill={humConfig.color}
                textAnchor="middle"
                fontWeight="600"
              >
                {`${point.value}%`}
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
    </View>
  );
}

export function ChartCards({
  data,
  viewMode = "chart",
}: {
  data: DataPoint[];
  viewMode?: "chart" | "combined";
}) {
  if (viewMode === "combined") {
    return <CombinedChart data={data} />;
  }

  return (
    <>
      {CHART_CONFIGS.map((cfg, idx) => {
        const { avg, min, max } = statLine(data, cfg.key);
        return (
          <View key={cfg.key}>
            {idx > 0 && <View className="h-px bg-[#F4F6F7] my-2" />}
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center gap-2">
                <View
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cfg.color }}
                />
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 16, color: C.text }}
                >
                  {cfg.label}
                </PretendardFont>
              </View>
              <View className="flex-row items-center gap-3">
                {[
                  { lbl: "평균", val: `${avg}${cfg.unit}`, highlight: true },
                  { lbl: "최저", val: `${min}${cfg.unit}`, highlight: false },
                  { lbl: "최고", val: `${max}${cfg.unit}`, highlight: false },
                ].map(({ lbl, val, highlight }) => (
                  <View key={lbl} className="items-center">
                    <PretendardFont style={{ fontSize: 11, color: C.ter }}>
                      {lbl}
                    </PretendardFont>
                    <PretendardFont
                      weight="semibold"
                      style={{
                        fontSize: 13,
                        color: highlight ? cfg.color : C.text,
                      }}
                    >
                      {val}
                    </PretendardFont>
                  </View>
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
          </View>
        );
      })}
    </>
  );
}

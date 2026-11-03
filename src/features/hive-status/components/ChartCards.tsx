/**
 * 센서 그래프
 * - 주식 차트처럼 손가락을 대고 움직이면 세로선·점·말풍선이 따라옵니다.
 * - 일간·주간·월간 모두 기간 전체 칸으로 채워 기록이 덜 찼어도 기간 전체와 양쪽 여백까지 축소해 볼 수 있습니다.
 */
import { memo, useEffect, useId, useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { DataPoint, HiveSensorDataKey, Period } from "@/types";
import {
  chartSegments, formatSensorValue, interpolatedSensorValue, latestSensorIndex, padPeriodSlots, periodBounds,
  sensorStats, sensorValue, visibleChartSegments, type ChartBounds, type ChartPoint,
} from "../model/chartModel";
import { useChartInteraction } from "../hooks/useChartInteraction";

const PAD_X = 8;
const PAD_Y = 16;
const TICK_COUNT = 7;
const TOOLTIP_W = 184;
const TOOLTIP_TOP = 6;
interface SensorConfig { key: HiveSensorDataKey; label: string; color: string; unit: string; dashed?: boolean }
interface PreparedSensor extends SensorConfig {
  segments: ChartPoint[][];
  stats: ReturnType<typeof sensorStats>;
}
// 통합(combined) 보기는 값 범위가 같은 온도·습도 센서만 한 그래프에 겹쳐 보여줍니다.
const COMBINED_SENSOR_CONFIGS: SensorConfig[] = [
  { key: "internalTemperature", label: "내부 온도", color: C.chartTemp, unit: "°C" },
  { key: "externalTemperature", label: "기계 온도", color: "#64748B", unit: "°C", dashed: true },
  { key: "internalHumidity", label: "내부 습도", color: C.chartHumidity, unit: "%" },
  { key: "externalHumidity", label: "기계 습도", color: "#64748B", unit: "%", dashed: true },
];

// 차트(개별) 보기에는 값 범위가 서로 다른 나머지 센서도 각각 한 그래프씩 추가합니다.
const SENSOR_CONFIGS: SensorConfig[] = [
  ...COMBINED_SENSOR_CONFIGS,
  { key: "co2", label: "CO2", color: "#8B5CF6", unit: "ppm" },
  { key: "targetTemperature", label: "목표 온도", color: C.hive2, unit: "°C" },
  { key: "peltierDutyPct", label: "펠티어 출력", color: C.hive3, unit: "%" },
  { key: "fanHotDutyPct", label: "고온측 팬", color: C.hive4, unit: "%" },
  { key: "fanColdDutyPct", label: "저온측 팬", color: "#0EA5E9", unit: "%", dashed: true },
  // 값은 암페어가 아니라 냉방·난방측 IS 핀 ADC 전압(mV)입니다.
  { key: "peltierCoolCurrentA", label: "냉각측 IS", color: "#0EA5E9", unit: "mV" },
  { key: "peltierHeatCurrentA", label: "가열측 IS", color: "#EF4444", unit: "mV" },
];

function axisValue(value: number, range: number) {
  const rounded = range < 2 ? value.toFixed(2) : range < 20 ? value.toFixed(1) : String(Math.round(value));
  return Number(rounded) === 0 ? "0" : rounded;
}

function ChartButton({ label, icon, onPress }: {
  label: string; icon?: keyof typeof Feather.glyphMap; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.button, { opacity: pressed ? 0.55 : 1 }]}>
    {icon ? <Feather name={icon} size={18} color={C.textAlt} /> :
      <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.textAlt }}>{label}</PretendardFont>}
  </Pressable>;
}

// Selection changes update the readings and crosshair without rebuilding chart geometry.
const SensorLines = memo(function SensorLines({ sensors, start, span, min, max, width, height, gradientId }: {
  sensors: PreparedSensor[]; start: number; span: number; min: number; max: number;
  width: number; height: number; gradientId: string;
}) {
  const x = (index: number) => PAD_X + ((index - start) / span) * (width - PAD_X * 2);
  const y = (value: number) => PAD_Y + ((max - value) / (max - min)) * (height - PAD_Y * 2);
  return <G>
    {sensors.map((sensor, sensorIndex) => <G key={sensor.key}>
      {visibleChartSegments(sensor.segments, start, start + span, width - PAD_X * 2).map((segment, segmentIndex) => {
        if (!segment.length) return null;
        const path = segment.map((point, index) => `${index ? "L" : "M"}${x(point.index).toFixed(2)},${y(point.value).toFixed(2)}`).join(" ");
        const bottom = height - PAD_Y;
        const area = `${path} L${x(segment[segment.length - 1].index).toFixed(2)},${bottom} L${x(segment[0].index).toFixed(2)},${bottom} Z`;
        return <G key={segmentIndex}>
          {sensorIndex === 0 && segment.length > 1 ? <Path d={area} fill={`url(#${gradientId})`} /> : null}
          <Path d={path} stroke={sensor.color} strokeWidth={2.25} fill="none" strokeLinecap="round"
            strokeLinejoin="round" strokeDasharray={sensor.dashed ? "5 4" : undefined} />
          {span <= 10 || segment.length === 1 ? segment.map((point) =>
            <Circle key={point.index} cx={x(point.index)} cy={y(point.value)} r={5} fill={sensor.color} />) : null}
        </G>;
      })}
    </G>)}
  </G>;
});

/** 선과 이름만 보여주는 한 줄 범례. 값은 그래프 위 말풍선에서 봅니다. */
function SensorLegend({ sensors }: { sensors: SensorConfig[] }) {
  return <View style={styles.legend}>
    {sensors.map((sensor) => <View key={sensor.key} style={[styles.inline, { gap: 5 }]}>
      <View style={{ width: 12, borderTopWidth: 2, borderTopColor: sensor.color, borderStyle: sensor.dashed ? "dashed" : "solid" }} />
      <PretendardFont style={{ fontSize: 12, color: C.textAlt }}>{sensor.label}</PretendardFont>
    </View>)}
  </View>;
}

/**
 * 세로선 위에 뜨는 말풍선
 * - 손가락에서 가장 가까운 기록의 시각과 각 지표 값을 보여줍니다.
 * - 항상 그래프 맨 위, 세로선 가운데에 붙어 따라갑니다(위아래·좌우로 뒤집히지 않음).
 *   그래프 양끝에서는 화면 밖으로 나가지 않게 안쪽에 멈춥니다.
 */
function ChartTooltip({ point, sensors, cursorX, plotWidth }: {
  point: DataPoint; sensors: SensorConfig[]; cursorX: number; plotWidth: number;
}) {
  const [width, setWidth] = useState(TOOLTIP_W);
  const left = Math.max(0, Math.min(plotWidth - width, cursorX - width / 2));
  return <View pointerEvents="none" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    style={[styles.tooltip, { left, top: TOOLTIP_TOP }]}>
    <PretendardFont weight="bold" style={{ fontSize: 15, color: C.white }}>{point.label}</PretendardFont>
    {sensors.map((sensor) => {
      const value = sensorValue(point, sensor.key);
      return <View key={sensor.key} style={[styles.inline, { gap: 8, marginTop: 6 }]}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sensor.color }} />
        <PretendardFont style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{sensor.label}</PretendardFont>
        <PretendardFont weight="semibold" style={{ fontSize: 15, color: C.white, fontVariant: ["tabular-nums"] }}>
          {value === null ? "미수신" : `${formatSensorValue(value, sensor.key)}${sensor.unit}`}
        </PretendardFont>
      </View>;
    })}
  </View>;
}

/**
 * 주식 차트처럼 손가락을 따라 읽는 그래프
 * - 한 손가락: 누른 채 좌우로 움직이면 세로선과 점이 선을 따라 부드럽게 이동하고, 말풍선 값이 바뀝니다.
 * - 두 손가락: 확대/축소. bounds가 있으면(일간) 기록이 덜 찼어도 그 범위까지 축소됩니다.
 */
function InteractiveChart({ data, sensors, bounds, onInteractionChange, onExpand, expanded = false }: {
  data: DataPoint[]; sensors: SensorConfig[]; bounds?: ChartBounds; onInteractionChange?: (active: boolean) => void;
  onExpand?: () => void; expanded?: boolean;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSingleSensor = sensors.length === 1;
  const height = expanded
    ? Math.max(140, window.height - insets.top - insets.bottom - 160)
    : isSingleSensor
      ? Math.max(150, Math.min(205, window.height * 0.215))
      : Math.max(300, Math.min(410, window.height * 0.43));
  const plotHeight = height - PAD_Y * 2;
  const [plotWidth, setPlotWidth] = useState(240);
  const keys = useMemo(() => sensors.map((sensor) => sensor.key), [sensors]);
  const prepared = useMemo(() => sensors.map((sensor) => ({
    ...sensor, stats: sensorStats(data, sensor.key), segments: chartSegments(data, sensor.key),
  })), [data, sensors]);
  const latestIndex = useMemo(() => latestSensorIndex(data, keys), [data, keys]);
  const { viewport, selectedIndex, cursor, mode, panHandlers, resetView, zoom, cancel } = useChartInteraction({
    data, keys, width: Math.max(1, plotWidth - PAD_X * 2), height: plotHeight,
    paddingX: PAD_X, paddingY: PAD_Y, bounds, onInteractionChange,
  });
  const id = useId().replace(/:/g, "");
  const clipId = `sensor-plot-${id}`;
  const gradientId = `sensor-area-${id}`;
  const selected = data[selectedIndex];
  const x = (index: number) => PAD_X + ((index - viewport.start) / viewport.span) * (plotWidth - PAD_X * 2);
  const y = (value: number) => PAD_Y + ((viewport.max - value) / (viewport.max - viewport.min)) * plotHeight;
  const ticks = Array.from({ length: TICK_COUNT }, (_, index) => viewport.max - (index / (TICK_COUNT - 1)) * (viewport.max - viewport.min));
  const tickCount = plotWidth < 260 ? 3 : 4;
  const timeTicks = [...new Set(Array.from({ length: tickCount }, (_, index) =>
    Math.max(0, Math.min(data.length - 1, Math.round(viewport.start + (index / (tickCount - 1)) * viewport.span))),
  ))];
  // 확대/축소 중에는 세로선·점·말풍선을 숨겨 값이 흔들려 보이지 않게 합니다.
  const inspecting = mode !== "pinch" && cursor >= viewport.start && cursor <= viewport.start + viewport.span;
  const cursorX = x(cursor);
  // 선 위의 점: 앞뒤 기록 사이를 보간해 세로선과 함께 미끄러지듯 움직입니다. 보간할 수 없으면 가까운 기록 위치에 둡니다.
  const dots = sensors.flatMap((sensor) => {
    const smooth = interpolatedSensorValue(data, sensor.key, cursor);
    const value = smooth ?? sensorValue(selected, sensor.key);
    if (value === null) return [];
    return [{ sensor, cx: smooth !== null ? cursorX : x(selectedIndex), cy: y(value) }];
  });

  return <View style={styles.chart}>
    <View style={[styles.selectionHeader, { minHeight: onExpand ? 44 : 32 }]}>
      <SensorLegend sensors={sensors} />
      {onExpand ? <ChartButton label="그래프 크게 보기" icon="maximize-2" onPress={() => { cancel(); onExpand(); }} /> : null}
    </View>
    {latestIndex < 0 ? <View style={[styles.empty, { minHeight: height }]}>
      <Feather name="activity" size={23} color={C.sec} />
      <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.textAlt, marginTop: 10 }}>표시할 측정값이 없어요</PretendardFont>
      <PretendardFont style={{ fontSize: 12, color: C.textAlt, marginTop: 6 }}>데이터를 받으면 그래프가 나타나요.</PretendardFont>
    </View> : <>
      <View style={styles.plotRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View {...panHandlers} testID={`sensor-chart-${sensors[0].key}`}
            accessibilityRole="adjustable"
            accessibilityLabel={`${sensors.map((sensor) => sensor.label).join(", ")} 그래프. 손가락을 대고 좌우로 움직이면 시점별 값을 확인하고, 두 손가락으로 확대하거나 축소합니다.`}
            accessibilityValue={selected ? { text: `${selected.label} ${sensors.map((sensor) => `${sensor.label} ${formatSensorValue(sensorValue(selected, sensor.key), sensor.key)}`).join(", ")}` } : undefined}
            accessibilityActions={[{ name: "increment", label: "확대" }, { name: "decrement", label: "축소" }]}
            onAccessibilityAction={(event) => zoom(event.nativeEvent.actionName === "increment" ? 1.4 : 1 / 1.4)}
            onLayout={(event) => setPlotWidth(Math.max(40, event.nativeEvent.layout.width))}
            style={[{ height, overflow: "hidden", backgroundColor: C.bgAlt, borderRadius: 8 }, Platform.OS === "web" && ({ touchAction: "none", userSelect: "none", cursor: "crosshair" } as object)]}>
            <Svg width={plotWidth} height={height} pointerEvents="none">
              <Defs>
                <ClipPath id={clipId}><Rect x={0} y={0} width={plotWidth} height={height} /></ClipPath>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={sensors[0].color} stopOpacity={0.14} />
                  <Stop offset="1" stopColor={sensors[0].color} stopOpacity={0.01} />
                </LinearGradient>
              </Defs>
              {ticks.map((tick, index) => <Line key={index} x1={0} x2={plotWidth} y1={y(tick)} y2={y(tick)}
                stroke={C.border} strokeOpacity={0.7} strokeWidth={0.75} />)}
              {timeTicks.map((index) => <Line key={index} x1={x(index)} x2={x(index)} y1={PAD_Y} y2={height - PAD_Y}
                stroke={C.border} strokeOpacity={0.45} strokeWidth={0.75} strokeDasharray="2 5" />)}
              <G clipPath={`url(#${clipId})`}>
                <SensorLines sensors={prepared} start={viewport.start} span={viewport.span} min={viewport.min} max={viewport.max}
                  width={plotWidth} height={height} gradientId={gradientId} />
                {inspecting ? <G>
                  <Line x1={cursorX} x2={cursorX} y1={0} y2={height} stroke="#64748B" strokeWidth={1} />
                  {dots.map((dot) => <G key={dot.sensor.key}>
                    <Circle cx={dot.cx} cy={dot.cy} r={9} fill={dot.sensor.color} fillOpacity={0.13} />
                    <Circle cx={dot.cx} cy={dot.cy} r={4} fill={C.white} stroke={dot.sensor.color} strokeWidth={2} />
                  </G>)}
                </G> : null}
              </G>
            </Svg>
            {inspecting && selected ? (
              <ChartTooltip point={selected} sensors={sensors} cursorX={cursorX} plotWidth={plotWidth} />
            ) : null}
          </View>
          <View style={styles.timeAxis}>
            {timeTicks.map((index) => <PretendardFont key={index} numberOfLines={1}
              style={{ position: "absolute", top: 5, left: Math.max(0, Math.min(plotWidth - 66, x(index) - 33)), width: 66, textAlign: "center", color: C.textAlt, fontSize: 11 }}>
              {data[index]?.label}
            </PretendardFont>)}
          </View>
        </View>
        <View pointerEvents="none" style={{ width: 42, height }}>
          {ticks.map((tick, index) => <PretendardFont key={index}
            style={{ position: "absolute", top: PAD_Y + (index / (TICK_COUNT - 1)) * plotHeight - 7, left: 5, fontSize: 11, color: C.textAlt }}>
            {axisValue(tick, viewport.max - viewport.min)}
          </PretendardFont>)}
        </View>
      </View>
      <View style={styles.controls}>
        <View style={styles.inline}>
          <ChartButton label="전체" onPress={() => resetView(true)} />
          <ChartButton label="최근" onPress={() => resetView(false)} />
        </View>
        <PretendardFont numberOfLines={1} style={{ fontSize: 12, color: C.sec, flexShrink: 1 }}>손가락을 대고 좌우로 움직여 값 확인</PretendardFont>
      </View>
    </>}
  </View>;
}

export function ChartCards({ data, viewMode = "chart", period = "일간", onInteractionChange, resetKey = 0 }: {
  data: DataPoint[]; viewMode?: "chart" | "combined"; period?: Period;
  onInteractionChange?: (active: boolean) => void; resetKey?: number;
}) {
  const singleSensors = useMemo(() => SENSOR_CONFIGS.map((sensor) => [sensor]), []);
  const chartData = useMemo(() => padPeriodSlots(data, period), [data, period]);
  const bounds = useMemo(() => periodBounds(chartData.length), [chartData.length]);
  const [expandedSensors, setExpandedSensors] = useState<SensorConfig[] | null>(null);
  const insets = useSafeAreaInsets();
  useEffect(() => { setExpandedSensors(null); }, [period, viewMode, resetKey]);
  if (!data.length) return <View style={styles.empty}><PretendardFont style={{ fontSize: 14, color: C.textAlt }}>표시할 센서 데이터가 없습니다.</PretendardFont></View>;
  return <View>
    {viewMode === "combined" ? (
      <InteractiveChart key={`${period}-${resetKey}`} data={chartData} sensors={COMBINED_SENSOR_CONFIGS} bounds={bounds} onInteractionChange={onInteractionChange}
        onExpand={() => setExpandedSensors(COMBINED_SENSOR_CONFIGS)} />
    ) : singleSensors.map((sensors, index) => <View key={`${period}-${sensors[0].key}-${resetKey}`} style={index > 0 ? styles.divider : undefined}>
      <InteractiveChart data={chartData} sensors={sensors} bounds={bounds} onInteractionChange={onInteractionChange} onExpand={() => setExpandedSensors(sensors)} />
    </View>)}
    {expandedSensors ? <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setExpandedSensors(null)}>
      <View style={[styles.modal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.modalHeader}>
          <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
            {expandedSensors.length === 1 ? expandedSensors[0].label : "벌통 비교 그래프"}
          </PretendardFont>
          <ChartButton label="크게 보기 닫기" icon="x" onPress={() => setExpandedSensors(null)} />
        </View>
        <InteractiveChart data={chartData} sensors={expandedSensors} bounds={bounds} expanded onInteractionChange={onInteractionChange} />
      </View>
    </Modal> : null}
  </View>;
}

const styles = StyleSheet.create({
  chart: { paddingVertical: 4 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  selectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  legend: { flex: 1, flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 },
  tooltip: {
    position: "absolute", width: TOOLTIP_W, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: "rgba(25,31,40,0.92)",
  },
  button: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  plotRow: { flexDirection: "row", marginHorizontal: -4, marginTop: 8 },
  timeAxis: { height: 28 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  empty: { alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 30, backgroundColor: C.bgAlt, borderRadius: 12, marginTop: 12 },
  divider: { marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  modal: { flex: 1, backgroundColor: C.white, paddingHorizontal: 14 },
  modalHeader: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

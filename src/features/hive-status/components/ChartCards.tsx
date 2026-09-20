/** Sensor charts with a movable time/value viewport and sensor-specific missing values. */
import { memo, useEffect, useId, useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { DataPoint, HiveSensorDataKey, Period } from "@/types";
import {
  chartSegments, formatSensorValue, latestSensorIndex, sensorStats, sensorValue,
  visibleChartSegments, type ChartPoint,
} from "../model/chartModel";
import { useChartInteraction } from "../hooks/useChartInteraction";

const PAD_X = 8;
const PAD_Y = 16;
const TICK_COUNT = 7;
interface SensorConfig { key: HiveSensorDataKey; label: string; color: string; unit: string; dashed?: boolean }
interface PreparedSensor extends SensorConfig {
  segments: ChartPoint[][];
  stats: ReturnType<typeof sensorStats>;
}
const SENSOR_CONFIGS: SensorConfig[] = [
  { key: "internalTemperature", label: "내부 온도", color: C.chartTemp, unit: "°C" },
  { key: "externalTemperature", label: "외부 온도", color: "#64748B", unit: "°C", dashed: true },
  { key: "internalHumidity", label: "내부 습도", color: C.chartHumidity, unit: "%" },
  { key: "externalHumidity", label: "외부 습도", color: "#64748B", unit: "%", dashed: true },
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
            <Circle key={point.index} cx={x(point.index)} cy={y(point.value)} r={2.5} fill={sensor.color} />) : null}
        </G>;
      })}
    </G>)}
  </G>;
});

const SensorReadings = memo(function SensorReadings({ sensors, selected }: {
  sensors: PreparedSensor[]; selected: DataPoint | undefined;
}) {
  const [statsPopupKey, setStatsPopupKey] = useState<HiveSensorDataKey | null>(null);
  return <View style={styles.readings}>
    {sensors.map((sensor, index) => {
      const value = sensorValue(selected, sensor.key);
      const stats = sensor.stats;
      return <View key={sensor.key} style={styles.reading}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${sensor.label} 기간 평균, 최저, 최고 보기`}
          onPressIn={() => setStatsPopupKey(sensor.key)} onPressOut={() => setStatsPopupKey(null)}
          style={{ minHeight: 48 }}>
          <View style={[styles.inline, { gap: 4 }]}>
            <View style={{ width: 8, borderTopWidth: 2, borderTopColor: sensor.color, borderStyle: sensor.dashed ? "dashed" : "solid" }} />
            <PretendardFont weight="medium" numberOfLines={1} style={{ fontSize: 11, color: C.textAlt, flexShrink: 1 }}>{sensor.label}</PretendardFont>
          </View>
          <View style={[styles.inline, { alignItems: "baseline", marginTop: 2, gap: 2 }]}>
            <PretendardFont weight="bold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
              style={{ fontSize: sensors.length === 1 ? 28 : 22, color: value === null ? C.sec : sensor.color, flexShrink: 1 }}>
              {formatSensorValue(value, sensor.key)}
            </PretendardFont>
            <PretendardFont style={{ fontSize: 10, color: C.textAlt }}>{value === null ? "미수신" : sensor.unit}</PretendardFont>
          </View>
          {statsPopupKey === sensor.key ? <View style={[styles.statsPopup, index >= sensors.length / 2 ? { right: 0 } : { left: 0 }]}>
            <PretendardFont style={{ fontSize: 11, color: C.white, lineHeight: 16 }}>
              {stats ? `평균 ${formatSensorValue(stats.avg, sensor.key)}${sensor.unit}\n최저 ${formatSensorValue(stats.min, sensor.key)} · 최고 ${formatSensorValue(stats.max, sensor.key)}` : "이 기간에 측정값이 없어요"}
            </PretendardFont>
          </View> : null}
        </Pressable>
      </View>;
    })}
  </View>;
});

function InteractiveChart({ data, sensors, onInteractionChange, onExpand, expanded = false }: {
  data: DataPoint[]; sensors: SensorConfig[]; onInteractionChange?: (active: boolean) => void;
  onExpand?: () => void; expanded?: boolean;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const height = expanded
    ? Math.max(140, window.height - insets.top - insets.bottom - 218)
    : Math.max(300, Math.min(410, window.height * 0.43));
  const plotHeight = height - PAD_Y * 2;
  const [plotWidth, setPlotWidth] = useState(240);
  const keys = useMemo(() => sensors.map((sensor) => sensor.key), [sensors]);
  const prepared = useMemo(() => sensors.map((sensor) => ({
    ...sensor, stats: sensorStats(data, sensor.key), segments: chartSegments(data, sensor.key),
  })), [data, sensors]);
  const latestIndex = useMemo(() => latestSensorIndex(data, keys), [data, keys]);
  const { viewport, selectedIndex, mode, panHandlers, resetView, zoom, cancel } = useChartInteraction({
    data, keys, width: Math.max(1, plotWidth - PAD_X * 2), height: plotHeight,
    paddingX: PAD_X, paddingY: PAD_Y, onInteractionChange,
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
  const inspecting = selectedIndex >= viewport.start && selectedIndex <= viewport.start + viewport.span;
  const focusSensor = sensors.find((sensor) => sensorValue(selected, sensor.key) !== null);
  const focusValue = focusSensor ? sensorValue(selected, focusSensor.key) : null;
  const valueTagVisible = inspecting && focusValue !== null && focusValue >= viewport.min && focusValue <= viewport.max;

  return <View style={styles.chart}>
    <View style={[styles.selectionHeader, { minHeight: onExpand ? 44 : 32 }]}>
      <PretendardFont weight="medium" numberOfLines={1} style={styles.caption}>
        {selected ? `${selectedIndex === latestIndex ? "최근" : "선택"} · ${selected.label}` : "수신된 데이터 없음"}
      </PretendardFont>
      {onExpand ? <ChartButton label="그래프 크게 보기" icon="maximize-2" onPress={() => { cancel(); onExpand(); }} /> : null}
    </View>
    <SensorReadings sensors={prepared} selected={selected} />
    {latestIndex < 0 ? <View style={[styles.empty, { minHeight: height }]}>
      <Feather name="activity" size={23} color={C.sec} />
      <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.textAlt, marginTop: 10 }}>표시할 측정값이 없어요</PretendardFont>
      <PretendardFont style={{ fontSize: 12, color: C.textAlt, marginTop: 6 }}>데이터를 받으면 그래프가 나타나요.</PretendardFont>
    </View> : <>
      <View style={styles.plotRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View {...panHandlers} testID={`sensor-chart-${sensors[0].key}`}
            accessibilityRole="adjustable"
            accessibilityLabel={`${sensors.map((sensor) => sensor.label).join(", ")} 그래프. 드래그로 이동하고 두 손가락으로 확대하거나 축소합니다. 길게 누른 채 움직이면 시점별 값을 확인합니다.`}
            accessibilityActions={[{ name: "increment", label: "확대" }, { name: "decrement", label: "축소" }]}
            onAccessibilityAction={(event) => zoom(event.nativeEvent.actionName === "increment" ? 1.4 : 1 / 1.4)}
            onLayout={(event) => setPlotWidth(Math.max(40, event.nativeEvent.layout.width))}
            style={[{ height, overflow: "hidden", backgroundColor: C.bgAlt, borderRadius: 8 }, Platform.OS === "web" && ({ touchAction: "none", userSelect: "none", cursor: mode === "pan" ? "grabbing" : "crosshair" } as object)]}>
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
                  <Line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={0} y2={height} stroke="#64748B" strokeWidth={1} strokeDasharray="3 4" />
                  {valueTagVisible && focusValue !== null ? <Line x1={0} x2={plotWidth} y1={y(focusValue)} y2={y(focusValue)}
                    stroke={focusSensor?.color} strokeOpacity={0.65} strokeWidth={1} strokeDasharray="3 4" /> : null}
                  {sensors.map((sensor) => {
                    const value = sensorValue(selected, sensor.key);
                    if (value === null) return null;
                    return <G key={sensor.key}>
                      <Circle cx={x(selectedIndex)} cy={y(value)} r={9} fill={sensor.color} fillOpacity={0.13} />
                      <Circle cx={x(selectedIndex)} cy={y(value)} r={4} fill={C.white} stroke={sensor.color} strokeWidth={2} />
                    </G>;
                  })}
                </G> : null}
              </G>
            </Svg>
          </View>
          <View style={styles.timeAxis}>
            {timeTicks.map((index) => <PretendardFont key={index} numberOfLines={1}
              style={{ position: "absolute", top: 5, left: Math.max(0, Math.min(plotWidth - 66, x(index) - 33)), width: 66, textAlign: "center", color: C.textAlt, fontSize: 10 }}>
              {data[index]?.label}
            </PretendardFont>)}
            {inspecting && selected ? <View pointerEvents="none"
              style={[styles.timeTag, { left: Math.max(0, Math.min(plotWidth - 84, x(selectedIndex) - 42)) }]}>
              <PretendardFont weight="medium" numberOfLines={1} style={{ color: C.white, fontSize: 10, textAlign: "center" }}>{selected.label}</PretendardFont>
            </View> : null}
          </View>
        </View>
        <View pointerEvents="none" style={{ width: 42, height }}>
          {ticks.map((tick, index) => <PretendardFont key={index}
            style={{ position: "absolute", top: PAD_Y + (index / (TICK_COUNT - 1)) * plotHeight - 7, left: 5, fontSize: 10, color: C.textAlt }}>
            {axisValue(tick, viewport.max - viewport.min)}
          </PretendardFont>)}
          {valueTagVisible && focusValue !== null && focusSensor ? <View
            style={[styles.valueTag, { top: Math.max(0, Math.min(height - 22, y(focusValue) - 11)), backgroundColor: focusSensor.color }]}>
            <PretendardFont weight="semibold" numberOfLines={1} adjustsFontSizeToFit
              style={{ color: C.white, fontSize: 10, textAlign: "center" }}>
              {formatSensorValue(focusValue, focusSensor.key)}
            </PretendardFont>
          </View> : null}
        </View>
      </View>
      <View style={styles.controls}>
        <View style={styles.inline}>
          <ChartButton label="전체" onPress={() => resetView(true)} />
          <ChartButton label="최근" onPress={() => resetView(false)} />
        </View>
        <PretendardFont numberOfLines={1} style={{ fontSize: 10, color: C.sec, flexShrink: 1 }}>탭하거나 드래그해 값 확인</PretendardFont>
      </View>
    </>}
  </View>;
}

export function ChartCards({ data, viewMode = "chart", period = "일간", onInteractionChange, resetKey = 0 }: {
  data: DataPoint[]; viewMode?: "chart" | "combined"; period?: Period;
  onInteractionChange?: (active: boolean) => void; resetKey?: number;
}) {
  const singleSensors = useMemo(() => SENSOR_CONFIGS.map((sensor) => [sensor]), []);
  const [expandedSensors, setExpandedSensors] = useState<SensorConfig[] | null>(null);
  const insets = useSafeAreaInsets();
  useEffect(() => { setExpandedSensors(null); }, [period, viewMode, resetKey]);
  if (!data.length) return <View style={styles.empty}><PretendardFont style={{ fontSize: 14, color: C.textAlt }}>표시할 센서 데이터가 없습니다.</PretendardFont></View>;
  return <View>
    {viewMode === "combined" ? (
      <InteractiveChart key={`${period}-${resetKey}`} data={data} sensors={SENSOR_CONFIGS} onInteractionChange={onInteractionChange}
        onExpand={() => setExpandedSensors(SENSOR_CONFIGS)} />
    ) : singleSensors.map((sensors, index) => <View key={`${period}-${sensors[0].key}-${resetKey}`} style={index > 0 ? styles.divider : undefined}>
      <InteractiveChart data={data} sensors={sensors} onInteractionChange={onInteractionChange} onExpand={() => setExpandedSensors(sensors)} />
    </View>)}
    {expandedSensors ? <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setExpandedSensors(null)}>
      <View style={[styles.modal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.modalHeader}>
          <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
            {expandedSensors.length === 1 ? expandedSensors[0].label : "벌통 비교 그래프"}
          </PretendardFont>
          <ChartButton label="크게 보기 닫기" icon="x" onPress={() => setExpandedSensors(null)} />
        </View>
        <InteractiveChart data={data} sensors={expandedSensors} expanded onInteractionChange={onInteractionChange} />
      </View>
    </Modal> : null}
  </View>;
}

const styles = StyleSheet.create({
  chart: { paddingVertical: 4 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  selectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  caption: { fontSize: 11, color: C.textAlt, flex: 1 },
  readings: { flexDirection: "row", gap: 4, zIndex: 2 },
  reading: { flex: 1, minWidth: 64 },
  statsPopup: {
    position: "absolute", bottom: "100%", marginBottom: 6, zIndex: 10,
    backgroundColor: "rgba(25,31,40,0.94)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    minWidth: 150,
  },
  button: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  plotRow: { flexDirection: "row", marginHorizontal: -4, marginTop: 8 },
  timeAxis: { height: 28 },
  timeTag: { position: "absolute", top: 1, width: 84, minHeight: 22, justifyContent: "center", paddingHorizontal: 4, borderRadius: 4, backgroundColor: C.text },
  valueTag: { position: "absolute", left: 1, right: 0, height: 22, justifyContent: "center", paddingHorizontal: 2, borderRadius: 3 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  empty: { alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 30, backgroundColor: C.bgAlt, borderRadius: 12, marginTop: 12 },
  divider: { marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  modal: { flex: 1, backgroundColor: C.white, paddingHorizontal: 14 },
  modalHeader: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

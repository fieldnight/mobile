/** Sensor charts with a movable time/value viewport and sensor-specific missing values. */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect } from "react-native-svg";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { DataPoint, HiveSensorDataKey, Period } from "@/types";
import {
  chartSegments, clampViewport, formatSensorValue, initialViewport,
  latestSensorIndex, panViewport, sensorStats, sensorValue, valueDomain, zoomViewport,
  type ChartViewport,
} from "../model/chartModel";

const HEIGHT = 212;
const PAD_X = 10;
const PAD_Y = 16;
const PLOT_HEIGHT = HEIGHT - PAD_Y * 2;
interface SensorConfig { key: HiveSensorDataKey; label: string; color: string; unit: string; dashed?: boolean }
const SENSOR_CONFIGS: SensorConfig[] = [
  { key: "internalTemperature", label: "내부 온도", color: C.chartTemp, unit: "°C" },
  { key: "externalTemperature", label: "외부 온도", color: "#64748B", unit: "°C", dashed: true },
  { key: "internalHumidity", label: "내부 습도", color: C.chartHumidity, unit: "%" },
  { key: "externalHumidity", label: "외부 습도", color: "#64748B", unit: "%", dashed: true },
];
function touchDistance(event: GestureResponderEvent) {
  const touches = event.nativeEvent.touches ?? [];
  return touches.length < 2 ? 0 : Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}
function axisValue(value: number, range: number) {
  const rounded = range < 2 ? value.toFixed(2) : range < 20 ? value.toFixed(1) : String(Math.round(value));
  return Number(rounded) === 0 ? "0" : rounded;
}
function ChartButton({ label, icon, onPress, disabled = false, active = false }: {
  label: string; icon?: keyof typeof Feather.glyphMap; onPress: () => void; disabled?: boolean; active?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, active && styles.activeButton, { opacity: disabled ? 0.3 : pressed ? 0.65 : 1 }]}>
    {icon ? <Feather name={icon} size={17} color={C.textAlt} /> :
      <PretendardFont weight="semibold" style={{ fontSize: 12, color: active ? "#9A3412" : C.textAlt }}>{label}</PretendardFont>}
  </Pressable>;
}
function InteractiveChart({ data, sensors, onInteractionChange }: {
  data: DataPoint[]; sensors: SensorConfig[]; onInteractionChange?: (active: boolean) => void;
}) {
  const keys = useMemo(() => sensors.map((sensor) => sensor.key), [sensors]);
  const latestIndex = latestSensorIndex(data, keys);
  const [viewport, setViewport] = useState(() => initialViewport(data, keys));
  const [selectedIndex, setSelectedIndex] = useState(() => latestSensorIndex(data, keys));
  const [plotWidth, setPlotWidth] = useState(240);
  const manuallyMoved = useRef(false);
  const frame = useRef<number | null>(null);
  const pendingViewport = useRef<ChartViewport | null>(null);
  const current = useRef({ viewport, data, keys, plotWidth, onInteractionChange });
  current.current = { viewport, data, keys, plotWidth, onInteractionChange };
  const session = useRef({ viewport, distance: 0, dx: 0, dy: 0, pinch: false, anchorX: 0.5, anchorY: 0.5 });
  const clipId = `sensor-plot-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    if (!manuallyMoved.current) {
      setViewport(initialViewport(data, keys));
      setSelectedIndex(latestSensorIndex(data, keys));
    } else {
      setViewport((value) => clampViewport(value, data.length));
      setSelectedIndex((value) => Math.min(value, data.length - 1));
    }
  }, [data, keys]);
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    current.current.onInteractionChange?.(false);
  }, []);
  const pendingRescale = useRef(false);
  const queueViewport = (next: ChartViewport, rescale = false) => {
    pendingViewport.current = next;
    pendingRescale.current = pendingRescale.current || rescale;
    current.current.viewport = next;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const state = current.current;
      if (pendingViewport.current) {
        // Rescaling the value axis is costly, so it only runs once per animation
        // frame instead of on every raw touch-move event for a smoother drag.
        const next = pendingRescale.current
          ? { ...pendingViewport.current, ...valueDomain(state.data, state.keys, pendingViewport.current.start, pendingViewport.current.start + pendingViewport.current.span) }
          : pendingViewport.current;
        setViewport(next);
      }
      pendingViewport.current = null;
      pendingRescale.current = false;
    });
  };
  const finishGesture = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const state = current.current;
    if (pendingViewport.current) {
      const next = pendingRescale.current
        ? { ...pendingViewport.current, ...valueDomain(state.data, state.keys, pendingViewport.current.start, pendingViewport.current.start + pendingViewport.current.span) }
        : pendingViewport.current;
      setViewport(next);
    }
    pendingViewport.current = null;
    pendingRescale.current = false;
    current.current.onInteractionChange?.(false);
  };
  // One responder per chart: gesture callbacks read fresh values from refs.
  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      const state = current.current;
      const distance = touchDistance(event);
      session.current = { viewport: state.viewport, distance, dx: 0, dy: 0, pinch: distance > 0, anchorX: 0.5, anchorY: 0.5 };
      state.onInteractionChange?.(true);
    },
    onPanResponderMove: (event, gesture) => {
      const state = current.current;
      const distance = touchDistance(event);
      const base = session.current;
      if (distance > 0) {
        if (!base.distance) {
          const touches = event.nativeEvent.touches;
          base.viewport = state.viewport;
          base.distance = distance;
          base.pinch = true;
          base.anchorX = Math.max(0, Math.min(1, ((touches[0].locationX + touches[1].locationX) / 2 - PAD_X) / Math.max(1, state.plotWidth - PAD_X * 2)));
          base.anchorY = Math.max(0, Math.min(1, ((touches[0].locationY + touches[1].locationY) / 2 - PAD_Y) / PLOT_HEIGHT));
        }
        manuallyMoved.current = true;
        queueViewport(zoomViewport(base.viewport, distance / base.distance, state.data.length, base.anchorX, base.anchorY));
      } else if (base.distance) {
        base.viewport = state.viewport;
        base.distance = 0;
        base.dx = gesture.dx;
        base.dy = gesture.dy;
      } else if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5) {
        manuallyMoved.current = true;
        const dx = gesture.dx - base.dx;
        const dy = gesture.dy - base.dy;
        const next = panViewport(base.viewport, dx, dy, state.plotWidth - PAD_X * 2, PLOT_HEIGHT, state.data.length);
        // While moving through time, keep that interval's values in view (rescaled once per frame, not per touch event).
        queueViewport(next, Math.abs(dx) > Math.abs(dy) * 2);
      }
    },
    onPanResponderRelease: (event, gesture) => {
      if (!session.current.pinch && Math.abs(gesture.dx) + Math.abs(gesture.dy) < 8) {
        const state = current.current;
        const fraction = (event.nativeEvent.locationX - PAD_X) / Math.max(1, state.plotWidth - PAD_X * 2);
        const index = Math.round(state.viewport.start + fraction * state.viewport.span);
        setSelectedIndex(Math.max(0, Math.min(state.data.length - 1, index)));
      }
      finishGesture();
    },
    onPanResponderTerminate: finishGesture,
  }));
  const resetView = (all: boolean) => {
    manuallyMoved.current = all;
    setViewport(initialViewport(data, keys, all));
    setSelectedIndex(latestIndex);
  };
  const zoom = (factor: number) => {
    manuallyMoved.current = true;
    setViewport((value) => zoomViewport(value, factor, data.length));
  };
  const [statsPopupKey, setStatsPopupKey] = useState<HiveSensorDataKey | null>(null);
  const selected = data[selectedIndex];
  const x = (index: number) => PAD_X + ((index - viewport.start) / viewport.span) * (plotWidth - PAD_X * 2);
  const y = (value: number) => PAD_Y + ((viewport.max - value) / (viewport.max - viewport.min)) * PLOT_HEIGHT;
  const ticks = Array.from({ length: 5 }, (_, index) => viewport.max - (index / 4) * (viewport.max - viewport.min));
  const tickCount = plotWidth < 260 ? 3 : 4;
  const timeTicks = [...new Set(Array.from({ length: tickCount }, (_, index) =>
    Math.max(0, Math.min(data.length - 1, Math.round(viewport.start + (index / (tickCount - 1)) * viewport.span))),
  ))];
  const selectedVisible = selectedIndex >= viewport.start && selectedIndex <= viewport.start + viewport.span;
  return <View style={styles.chart}>
    <View style={styles.selectionHeader}>
      <PretendardFont weight="semibold" style={styles.caption}>
        {selected ? `${selectedIndex === latestIndex ? "최근 데이터" : "선택한 시점"} · ${selected.label}` : "수신된 데이터 없음"}
      </PretendardFont>
    </View>
    <View style={styles.readings}>
      {sensors.map((sensor) => {
        const value = sensorValue(selected, sensor.key);
        const stats = sensorStats(data, sensor.key);
        const popupVisible = statsPopupKey === sensor.key;
        return <View key={sensor.key} style={styles.reading}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${sensor.label} 기간 평균, 최저, 최고 보기`}
            onPressIn={() => setStatsPopupKey(sensor.key)}
            onPressOut={() => setStatsPopupKey(null)}
          >
            <View style={styles.inline}>
              <View style={{ width: 12, borderTopWidth: 2, borderTopColor: sensor.color, borderStyle: sensor.dashed ? "dashed" : "solid" }} />
              <PretendardFont weight="semibold" numberOfLines={1} style={{ fontSize: 12, color: C.textAlt }}>{sensor.label}</PretendardFont>
            </View>
            <View style={[styles.inline, { alignItems: "baseline", marginTop: 2 }]}>
              <PretendardFont weight="bold" numberOfLines={1} style={{ fontSize: 19, color: value === null ? C.sec : sensor.color }}>{formatSensorValue(value, sensor.key)}</PretendardFont>
              <PretendardFont style={{ fontSize: 11, color: C.textAlt }}>{value === null ? "미수신" : sensor.unit}</PretendardFont>
            </View>
            {popupVisible ? <View style={styles.statsPopup}>
              <PretendardFont style={{ fontSize: 11, color: C.white, lineHeight: 16 }}>
                {stats ? `평균 ${formatSensorValue(stats.avg, sensor.key)}${sensor.unit}\n최저 ${formatSensorValue(stats.min, sensor.key)} · 최고 ${formatSensorValue(stats.max, sensor.key)}` : "이 기간에 측정값이 없어요"}
              </PretendardFont>
            </View> : null}
          </Pressable>
        </View>;
      })}
    </View>
    {latestIndex < 0 ? <View style={styles.empty}>
      <Feather name="activity" size={23} color={C.sec} />
      <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.textAlt, marginTop: 10 }}>표시할 측정값이 없어요</PretendardFont>
      <PretendardFont style={{ fontSize: 12, color: C.textAlt, marginTop: 6 }}>데이터를 받으면 그래프가 나타나요.</PretendardFont>
    </View> : <>
      <View style={{ flexDirection: "row", marginTop: 16 }}>
        <View style={{ width: 44, height: HEIGHT }}>
          {ticks.map((tick, index) => <PretendardFont key={index} style={{ position: "absolute", top: PAD_Y + (index / 4) * PLOT_HEIGHT - 8, right: 7, fontSize: 10, color: C.textAlt }}>
            {axisValue(tick, viewport.max - viewport.min)}
          </PretendardFont>)}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View {...responder.panHandlers} testID={`sensor-chart-${sensors[0].key}`}
            accessibilityRole="adjustable"
            accessibilityLabel={`${sensors.map((sensor) => sensor.label).join(", ")} 그래프. 드래그로 이동하고 두 손가락으로 확대하거나 축소합니다.`}
            accessibilityActions={[{ name: "increment", label: "확대" }, { name: "decrement", label: "축소" }]}
            onAccessibilityAction={(event) => zoom(event.nativeEvent.actionName === "increment" ? 1.4 : 1 / 1.4)}
            onLayout={(event) => setPlotWidth(Math.max(40, event.nativeEvent.layout.width))}
            style={[{ height: HEIGHT, overflow: "hidden", backgroundColor: C.bgAlt, borderRadius: 8 }, Platform.OS === "web" && ({ touchAction: "none", userSelect: "none", cursor: "grab" } as object)]}>
            <Svg width={plotWidth} height={HEIGHT} pointerEvents="none">
              <Defs><ClipPath id={clipId}><Rect x={0} y={0} width={plotWidth} height={HEIGHT} /></ClipPath></Defs>
              {ticks.map((tick, index) => <Line key={index} x1={0} x2={plotWidth} y1={y(tick)} y2={y(tick)} stroke={C.border} strokeDasharray={index === 4 ? undefined : "3 4"} />)}
              <G clipPath={`url(#${clipId})`}>
                {selectedVisible && <Line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={0} y2={HEIGHT} stroke="#94A3B8" strokeDasharray="4 4" />}
                {sensors.map((sensor) => <G key={sensor.key}>
                  {chartSegments(data, sensor.key).map((segment, segmentIndex) => {
                    const visible = segment.filter((point) => point.index >= Math.floor(viewport.start) && point.index <= Math.ceil(viewport.start + viewport.span));
                    if (!visible.length) return null;
                    const path = visible.map((point, index) => `${index ? "L" : "M"}${x(point.index).toFixed(2)},${y(point.value).toFixed(2)}`).join(" ");
                    return <G key={segmentIndex}>
                      <Path d={path} stroke={sensor.color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={sensor.dashed ? "5 4" : undefined} />
                      {visible.map((point) => <Circle key={point.index} cx={x(point.index)} cy={y(point.value)} r={point.index === selectedIndex ? 7 : visible.length <= 12 ? 4.2 : 0} fill={point.index === selectedIndex ? C.white : sensor.color} stroke={sensor.color} strokeWidth={2.5} />)}
                    </G>;
                  })}
                </G>)}
              </G>
            </Svg>
          </View>
          <View style={{ height: 30, marginTop: 8 }}>
            {timeTicks.map((index) => <PretendardFont key={index} numberOfLines={1} style={{ position: "absolute", left: Math.max(0, Math.min(plotWidth - 62, x(index) - 31)), width: 62, textAlign: "center", color: C.textAlt, fontSize: 11 }}>{data[index]?.label}</PretendardFont>)}
          </View>
        </View>
      </View>
      <View style={styles.controls}>
        <View style={styles.inline}>
          <ChartButton label="전체" onPress={() => resetView(true)} />
          <ChartButton label="최근" active onPress={() => resetView(false)} />
        </View>
      </View>
    </>}
  </View>;
}
export function ChartCards({ data, viewMode = "chart", period = "일간", onInteractionChange, resetKey = 0 }: {
  data: DataPoint[]; viewMode?: "chart" | "combined"; period?: Period;
  onInteractionChange?: (active: boolean) => void; resetKey?: number;
}) {
  const singleSensors = useMemo(() => SENSOR_CONFIGS.map((sensor) => [sensor]), []);
  if (!data.length) return <View style={styles.empty}><PretendardFont style={{ fontSize: 14, color: C.textAlt }}>표시할 센서 데이터가 없습니다.</PretendardFont></View>;
  return <View>
    {viewMode === "combined" ? (
      <InteractiveChart key={`${period}-${resetKey}`} data={data} sensors={SENSOR_CONFIGS} onInteractionChange={onInteractionChange} />
    ) : singleSensors.map((sensors, index) => <View key={`${period}-${sensors[0].key}-${resetKey}`} style={index > 0 ? styles.divider : undefined}>
      <InteractiveChart data={data} sensors={sensors} onInteractionChange={onInteractionChange} />
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  chart: { paddingVertical: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  selectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  caption: { fontSize: 12, color: C.textAlt, flex: 1 },
  readings: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reading: { flex: 1, minWidth: 74 },
  statsPopup: {
    position: "absolute", bottom: "100%", left: 0, marginBottom: 6, zIndex: 10,
    backgroundColor: "rgba(25,31,40,0.92)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    minWidth: 150,
  },
  button: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, backgroundColor: C.white },
  activeButton: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  empty: { alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 30, backgroundColor: C.bgAlt, borderRadius: 12, marginTop: 12 },
  divider: { marginTop: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
});

import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useGateStore } from "@/stores/useGateStore";
import type { Period } from "@/types";
import type { GateData } from "@/types/gate-control";
import {
  isGateNotFoundError,
  type GateBeeCountPoint,
  type GateTelemetryPoint,
} from "../api";
import { useGateDeviceBeeCount, useGateDeviceTelemetry } from "../hooks";
import { AddGateSheet } from "./AddGateSheet";

const TRACK_BG = "#EEF2F6";
const PERIODS: Period[] = ["일간", "주간", "월간"];
const CHART_W = 280;
const CHART_H = 150;
const CHART_PAD_X = 16;
const CHART_PAD_Y = 22;

function triggerHaptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * 개폐기 하드웨어 리포트 섹션 (리포트 탭)
 * - 기존 NFC/HCE 기반 DoorStatsPanel(로컬 deviceId + 실시간 이벤트)과는 별개로,
 *   서버에 등록된 gateId 기준 REST 리포트(GET .../telemetry, GET .../bee-count)를 보여줍니다.
 * - 목록 조회 API가 없어 개폐기 후보는 useGateStore(로컬 등록 목록)에서 가져옵니다.
 */
export function GateReportSection({ delay = 0 }: { delay?: number }) {
  const gates = useGateStore((state) => state.gates);
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("일간");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addGateVisible, setAddGateVisible] = useState(false);

  const selectedGate =
    gates.find((gate) => gate.id === selectedGateId) ?? gates[0] ?? null;

  const telemetryQuery = useGateDeviceTelemetry({
    gateId: selectedGate?.id ?? "",
    period,
  });
  const beeCountQuery = useGateDeviceBeeCount({
    gateId: selectedGate?.id ?? "",
    period,
  });

  if (gates.length === 0) {
    return (
      <Card delay={delay} style={{ padding: 14 }}>
        <EmptyGatesNotice onAddPress={() => setAddGateVisible(true)} />
        <AddGateSheet visible={addGateVisible} onClose={() => setAddGateVisible(false)} />
      </Card>
    );
  }

  return (
    <Card delay={delay} style={{ padding: 14 }}>
      <PretendardFont weight="bold" style={{ fontSize: 15, color: C.text }}>
        개폐기 리포트
      </PretendardFont>

      {gates.length > 1 ? (
        <GatePicker
          gates={gates}
          selectedGate={selectedGate}
          dropdownOpen={dropdownOpen}
          onToggleDropdown={() => setDropdownOpen((value) => !value)}
          onSelectGate={(gate) => {
            setSelectedGateId(gate.id);
            setDropdownOpen(false);
          }}
        />
      ) : (
        <PretendardFont
          weight="semibold"
          style={{ marginTop: 6, fontSize: 13, color: C.sec }}
        >
          {selectedGate?.name}
        </PretendardFont>
      )}

      <PeriodRow period={period} onSelect={setPeriod} />

      <GateNotFoundOrContent
        isNotFound={
          isGateNotFoundError(telemetryQuery.error) ||
          isGateNotFoundError(beeCountQuery.error)
        }
      >
        <ReportChartBlock
          title="온도"
          unit="℃"
          color="#F08A5D"
          points={telemetryQuery.data?.temperature}
          isLoading={telemetryQuery.isLoading}
        />
        <ReportChartBlock
          title="습도"
          unit="%"
          color="#3E92CC"
          points={telemetryQuery.data?.humidity}
          isLoading={telemetryQuery.isLoading}
        />
        <BeeCountChartBlock
          points={beeCountQuery.data?.data}
          isLoading={beeCountQuery.isLoading}
        />
      </GateNotFoundOrContent>
    </Card>
  );
}

function EmptyGatesNotice({ onAddPress }: { onAddPress: () => void }) {
  return (
    <View
      className="flex-row items-center justify-between rounded-2xl px-4 py-3.5"
      style={{ backgroundColor: TRACK_BG }}
    >
      <View style={{ flex: 1 }}>
        <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
          리포트를 보려면 개폐기를 먼저 등록하세요
        </PretendardFont>
        <PretendardFont
          weight="medium"
          style={{ marginTop: 2, fontSize: 12, lineHeight: 17, color: C.sec }}
        >
          등록한 개폐기의 온습도와 벌 출입 기록을 확인할 수 있어요.
        </PretendardFont>
      </View>
      <Pressable
        onPress={onAddPress}
        className="items-center justify-center rounded-xl active:opacity-80"
        style={{ height: 36, paddingHorizontal: 14, backgroundColor: C.gatePrimary }}
      >
        <PretendardFont weight="bold" style={{ fontSize: 13, color: C.white }}>
          개폐기 등록하기
        </PretendardFont>
      </Pressable>
    </View>
  );
}

function GatePicker({
  gates,
  selectedGate,
  dropdownOpen,
  onToggleDropdown,
  onSelectGate,
}: {
  gates: GateData[];
  selectedGate: GateData | null;
  dropdownOpen: boolean;
  onToggleDropdown: () => void;
  onSelectGate: (gate: GateData) => void;
}) {
  return (
    <View className="mt-3">
      <Pressable
        onPress={onToggleDropdown}
        className="flex-row items-center justify-between rounded-2xl active:opacity-75"
        style={{ height: 40, paddingHorizontal: 14, backgroundColor: C.infoBg }}
      >
        <PretendardFont
          weight="semibold"
          numberOfLines={1}
          style={{ fontSize: 13.5, color: C.gatePrimary, flexShrink: 1 }}
        >
          {selectedGate?.name ?? "개폐기 선택"}
        </PretendardFont>
        <Feather
          name={dropdownOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={C.gatePrimary}
        />
      </Pressable>

      {dropdownOpen ? (
        <View className="mt-2 overflow-hidden rounded-2xl" style={{ backgroundColor: TRACK_BG }}>
          {gates.map((gate, index) => (
            <Pressable
              key={gate.id}
              onPress={() => onSelectGate(gate)}
              className="flex-row items-center justify-between px-4 py-3.5 active:opacity-70"
              style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: C.border }}
            >
              <PretendardFont weight="bold" numberOfLines={1} style={{ fontSize: 14, color: C.text }}>
                {gate.name}
              </PretendardFont>
              {gate.id === selectedGate?.id ? (
                <Feather name="check" size={16} color={C.gatePrimary} />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PeriodRow({
  period,
  onSelect,
}: {
  period: Period;
  onSelect: (period: Period) => void;
}) {
  return (
    <View
      className="mt-3 flex-row rounded-2xl"
      style={{ padding: 3, backgroundColor: TRACK_BG }}
    >
      {PERIODS.map((item) => {
        const active = item === period;
        return (
          <Pressable
            key={item}
            onPress={() => {
              triggerHaptic();
              onSelect(item);
            }}
            className="flex-1 items-center justify-center rounded-xl active:opacity-75"
            style={{
              height: 34,
              backgroundColor: active ? C.white : "transparent",
              shadowColor: active ? C.shadow : "transparent",
              shadowOpacity: active ? 0.06 : 0,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
              elevation: active ? 1 : 0,
            }}
          >
            <PretendardFont
              weight={active ? "bold" : "semibold"}
              style={{ fontSize: 13, color: active ? C.gatePrimary : C.sec }}
            >
              {item}
            </PretendardFont>
          </Pressable>
        );
      })}
    </View>
  );
}

function GateNotFoundOrContent({
  isNotFound,
  children,
}: {
  isNotFound: boolean;
  children: React.ReactNode;
}) {
  if (isNotFound) {
    return (
      <View
        className="mt-3 flex-row items-start gap-2 rounded-2xl px-3.5 py-3"
        style={{ backgroundColor: "#FFF1F2" }}
      >
        <Feather name="alert-circle" size={17} color={C.error} />
        <PretendardFont style={{ flex: 1, fontSize: 13, lineHeight: 19, color: C.error }}>
          이 개폐기 정보를 찾을 수 없어요. 다시 등록해주세요.
        </PretendardFont>
      </View>
    );
  }

  return <>{children}</>;
}

function getChartBounds(values: number[]) {
  const safeValues = values.filter(Number.isFinite);
  const rawMin = safeValues.length ? Math.min(...safeValues) : 0;
  const rawMax = safeValues.length ? Math.max(...safeValues) : 1;
  const range = Math.max(rawMax - rawMin, 1);
  const padding = range * 0.14;
  return { min: rawMin - padding, max: rawMax + padding };
}

function getChartX(index: number, total: number) {
  if (total <= 1) return CHART_W / 2;
  const width = CHART_W - CHART_PAD_X * 2;
  return CHART_PAD_X + (width / (total - 1)) * index;
}

function getChartY(value: number, bounds: { min: number; max: number }) {
  const height = CHART_H - CHART_PAD_Y * 2;
  const ratio = (value - bounds.min) / Math.max(bounds.max - bounds.min, 1);
  return CHART_H - CHART_PAD_Y - height * ratio;
}

function ReportChartBlock({
  title,
  unit,
  color,
  points,
  isLoading,
}: {
  title: string;
  unit: string;
  color: string;
  points?: GateTelemetryPoint[];
  isLoading: boolean;
}) {
  return (
    <View className="mt-4">
      <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
        {title}
      </PretendardFont>
      {isLoading ? (
        <LoadingPlaceholder />
      ) : (
        <SensorChart points={points ?? []} unit={unit} color={color} />
      )}
    </View>
  );
}

function LoadingPlaceholder() {
  return (
    <View
      className="mt-2 items-center justify-center rounded-2xl"
      style={{ height: 120, backgroundColor: TRACK_BG }}
    >
      <PretendardFont weight="medium" style={{ fontSize: 13, color: C.sec }}>
        불러오는 중...
      </PretendardFont>
    </View>
  );
}

function NoDataPlaceholder() {
  return (
    <View
      className="mt-2 items-center justify-center rounded-2xl px-4"
      style={{ height: 120, backgroundColor: TRACK_BG }}
    >
      <PretendardFont
        weight="medium"
        style={{ fontSize: 12.5, lineHeight: 18, color: C.sec, textAlign: "center" }}
      >
        아직 수집된 데이터가 없어요.{"\n"}개폐기가 온라인 상태가 되면 자동으로 표시돼요.
      </PretendardFont>
    </View>
  );
}

/** 온도/습도 단일 시리즈 라인 차트. value가 null인 지점은 건너뜁니다. */
function SensorChart({
  points,
  unit,
  color,
}: {
  points: GateTelemetryPoint[];
  unit: string;
  color: string;
}) {
  const validPoints = points.filter(
    (point): point is { label: string; value: number } => point.value !== null,
  );

  if (points.length === 0 || validPoints.length === 0) {
    return <NoDataPlaceholder />;
  }

  const bounds = getChartBounds(validPoints.map((point) => point.value));
  const chartPoints = validPoints.map((point) => {
    const index = points.indexOf(point);
    return { x: getChartX(index, points.length), y: getChartY(point.value, bounds), point };
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
      <View style={{ width: CHART_W, height: CHART_H }}>
        <Svg width={CHART_W} height={CHART_H}>
          {[0, 1, 2].map((lineIndex) => {
            const y = CHART_PAD_Y + ((CHART_H - CHART_PAD_Y * 2) / 2) * lineIndex;
            return (
              <Line
                key={lineIndex}
                x1={CHART_PAD_X}
                y1={y}
                x2={CHART_W - CHART_PAD_X}
                y2={y}
                stroke="rgba(25,31,40,0.08)"
                strokeWidth={1}
              />
            );
          })}
          <Polyline
            points={chartPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chartPoints.map((p, index) => (
            <Circle
              key={index}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={color}
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={1.2}
            />
          ))}
        </Svg>
      </View>
    </ScrollView>
  );
}

const BEE_COUNT_SERIES: Array<{
  key: keyof Omit<GateBeeCountPoint, "label">;
  label: string;
  color: string;
}> = [
  { key: "entranceIn", label: "입구 진입", color: "#1B9C79" },
  { key: "entranceOut", label: "입구 진출", color: "#B8860B" },
  { key: "exitIn", label: "출구 진입", color: "#3E92CC" },
  { key: "exitOut", label: "출구 진출", color: "#F08A5D" },
];

function BeeCountChartBlock({
  points,
  isLoading,
}: {
  points?: GateBeeCountPoint[];
  isLoading: boolean;
}) {
  return (
    <View className="mt-4">
      <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
        벌 출입 카운트
      </PretendardFont>
      {isLoading ? <LoadingPlaceholder /> : <BeeCountChart points={points ?? []} />}
    </View>
  );
}

function BeeCountChart({ points }: { points: GateBeeCountPoint[] }) {
  const hasAnyData = points.some((point) =>
    BEE_COUNT_SERIES.some((series) => point[series.key] !== null),
  );

  const visibleSeries = useMemo(() => {
    return BEE_COUNT_SERIES.map((series) => ({
      ...series,
      chartPoints: points
        .map((point, index) => ({ index, value: point[series.key] }))
        .filter(
          (entry): entry is { index: number; value: number } => entry.value !== null,
        ),
    })).filter((series) => series.chartPoints.length > 0);
  }, [points]);

  if (points.length === 0 || !hasAnyData) {
    return <NoDataPlaceholder />;
  }

  const bounds = getChartBounds(
    visibleSeries.flatMap((series) => series.chartPoints.map((p) => p.value)),
  );

  return (
    <View>
      <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
        {visibleSeries.map((series) => (
          <View key={series.key} className="flex-row items-center">
            <View
              className="mr-1.5 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.textAlt }}>
              {series.label}
            </PretendardFont>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
        <View style={{ width: CHART_W, height: CHART_H }}>
          <Svg width={CHART_W} height={CHART_H}>
            {[0, 1, 2].map((lineIndex) => {
              const y = CHART_PAD_Y + ((CHART_H - CHART_PAD_Y * 2) / 2) * lineIndex;
              return (
                <Line
                  key={lineIndex}
                  x1={CHART_PAD_X}
                  y1={y}
                  x2={CHART_W - CHART_PAD_X}
                  y2={y}
                  stroke="rgba(25,31,40,0.08)"
                  strokeWidth={1}
                />
              );
            })}
            {visibleSeries.map((series) => {
              const chartPoints = series.chartPoints.map((entry) => ({
                x: getChartX(entry.index, points.length),
                y: getChartY(entry.value, bounds),
              }));
              return (
                <Polyline
                  key={series.key}
                  points={chartPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </Svg>
        </View>
      </ScrollView>
    </View>
  );
}

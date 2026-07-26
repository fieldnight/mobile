import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PanResponder, Pressable, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Card } from "@/components/hive/hive-shared";
import { BoxColor as C } from "@/types";
import type { HiveControlState, HiveData } from "@/types/hive-control";
import { HiveDropdown } from "./HiveDropdown";

const TEMP_MIN = 16;
const TEMP_MAX = 36;
const BEST_TEMP_MIN = 24;
const BEST_TEMP_MAX = 27;
const TEMP_STEP = 0.5;
const THUMB_SIZE = 30;

const OPERATING_MODES = [
  { id: "normal", icon: "sun" as const, label: "일반 모드", temp: 25.5, vent: 45 },
  { id: "saving", icon: "moon" as const, label: "절전 모드", temp: 23, vent: 25 },
  { id: "brood", icon: "heart" as const, label: "유충 육성 모드", temp: 34, vent: 30 },
  { id: "spray", icon: "shield" as const, label: "방제 보호 모드", temp: 24, vent: 15 },
] as const;

type OperatingModeId = (typeof OPERATING_MODES)[number]["id"];

interface HiveControlSectionProps {
  hives: HiveData[];
  current: HiveControlState;
  controlHive: string;
  onToggleTemperature: () => void;
  onToggleVentilation: () => void;
  onToggleTemperatureAuto: () => void;
  onToggleVentilationAuto: () => void;
  onSelectHive: (id: string) => void;
}

export function HiveControlSection({
  hives,
  current,
  controlHive,
  onToggleTemperature,
  onToggleVentilation,
  onToggleTemperatureAuto,
  onToggleVentilationAuto,
  onSelectHive,
}: HiveControlSectionProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mode, setMode] = useState<OperatingModeId>("normal");
  const [targetTemp, setTargetTemp] = useState<number>(OPERATING_MODES[0].temp);
  const [ventStrength, setVentStrength] = useState<number>(OPERATING_MODES[0].vent);
  const selectedHive = hives.find((hive) => hive.id === controlHive);
  const tempAuto = current.controls.find((control) => control.id === "heating")?.enabled ?? false;
  const ventAuto = current.controls.find((control) => control.id === "ventilation")?.enabled ?? false;
  const tempOn = current.heaterOn || current.coolerOn;
  const ventOn = current.ventOn;

  const applyMode = (nextMode: OperatingModeId) => {
    const next = OPERATING_MODES.find((item) => item.id === nextMode);
    if (!next) return;
    setMode(nextMode);
    setTargetTemp(next.temp);
    setVentStrength(next.vent);
  };

  return (
    <Card
      style={{
        borderRadius: 24,
        backgroundColor: "rgba(255, 255, 255, 0.72)",
        elevation: 0,
        marginHorizontal: -14,
        padding: 14,
      }}
    >
      <View className="mb-2.5 flex-row items-center justify-between">
        <PretendardFont weight="bold" className="text-[22px]" style={{ color: C.text }}>
          제어 설정
        </PretendardFont>
        <View className="relative">
          <Pressable
            onPress={() => setDropdownOpen((prev) => !prev)}
            className="flex-row items-center gap-1.5 rounded-[14px] border bg-white px-3 py-2"
            style={{ borderColor: C.border }}
          >
            <PretendardFont className="text-[14px]" style={{ color: C.text }}>
              {selectedHive?.name ?? "벌통 선택"}
            </PretendardFont>
            <Feather name="chevron-down" size={16} color={C.sec} />
          </Pressable>
          {dropdownOpen ? (
            <HiveDropdown
              hives={hives}
              selectedId={controlHive === "all" ? "" : controlHive}
              onSelect={(id) => {
                setDropdownOpen(false);
                onSelectHive(id);
              }}
              onClose={() => setDropdownOpen(false)}
              testPrefix="control"
            />
          ) : null}
        </View>
      </View>

      <View className="mb-2">
        <View className="mb-1.5 flex-row items-center justify-between">
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
            운영 모드
          </PretendardFont>
          <Pressable onPress={() => applyMode("normal")} hitSlop={8}>
            <PretendardFont weight="semibold" style={{ fontSize: 11.5, color: C.ter }}>
              초기화
            </PretendardFont>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingRight: 6 }}
        >
          {OPERATING_MODES.map((item) => {
            const active = item.id === mode;
            return (
              <Pressable
                key={item.id}
                onPress={() => applyMode(item.id)}
                className="flex-row items-center gap-1.5 rounded-xl border px-2.5 py-1.5 active:opacity-75"
                style={{
                  minWidth: 104,
                  borderColor: active ? C.text : C.border,
                  backgroundColor: active ? C.text : C.white,
                }}
              >
                <Feather name={item.icon} size={13} color={active ? C.white : C.primary} />
                <PretendardFont
                  weight="bold"
                  numberOfLines={1}
                  style={{ fontSize: 11.5, color: active ? C.white : C.text }}
                >
                  {item.label}
                </PretendardFont>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ControlPanel
        caption="수정벌 활동 적정 온도 24~27°C · 0.5°C 단위"
        active={tempOn}
        auto={tempAuto}
        onTogglePower={onToggleTemperature}
        onToggleAuto={onToggleTemperatureAuto}
      >
        <TemperatureSlider value={targetTemp} onChange={setTargetTemp} />
      </ControlPanel>

      <ControlPanel
        caption="환기 세기 0~100% · 벌통 내부 공기 흐름 조절"
        active={ventOn}
        auto={ventAuto}
        onTogglePower={onToggleVentilation}
        onToggleAuto={onToggleVentilationAuto}
      >
        <StrengthSlider value={ventStrength} onChange={setVentStrength} />
      </ControlPanel>
    </Card>
  );
}

function ControlPanel({
  caption,
  active,
  auto,
  onTogglePower,
  onToggleAuto,
  children,
}: {
  caption: string;
  active: boolean;
  auto: boolean;
  onTogglePower: () => void;
  onToggleAuto: () => void;
  children: ReactNode;
}) {
  return (
    <View
      className="mb-2 rounded-[18px]"
      style={{
        minHeight: 104,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: active ? C.white : "rgba(255,255,255,0.9)",
        borderWidth: 1,
        borderColor: active ? "rgba(15, 118, 110, 0.22)" : "rgba(15, 23, 42, 0.08)",
      }}
    >
      <View className="mb-1 flex-row items-center">
        <View className="flex-row gap-1.5">
          <PanelButton icon="power" label="전원" active={active} onPress={onTogglePower} />
          <PanelButton icon="zap" label="AUTO" active={auto} onPress={onToggleAuto} />
        </View>
      </View>

      {children}

      <View className="mt-0.5">
        <PretendardFont
          weight="semibold"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontSize: 10.5, color: C.sec }}
        >
          {caption}
        </PretendardFont>
      </View>
    </View>
  );
}

function PanelButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="flex-row items-center justify-center gap-1.5 rounded-xl border px-2 active:opacity-75"
      style={{
        minWidth: 62,
        height: 32,
        borderColor: active ? C.text : C.border,
        backgroundColor: active ? C.white : C.bgAlt,
      }}
    >
      <View
        className="h-5 w-5 items-center justify-center rounded-full"
        style={{ backgroundColor: active ? C.text : "#E2E8F0" }}
      >
        <Feather name={icon} size={11} color={active ? C.white : C.ter} />
      </View>
      <PretendardFont weight="bold" style={{ fontSize: 11, color: active ? C.text : C.ter }}>
        {label}
      </PretendardFont>
    </Pressable>
  );
}

function TemperatureSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const toValue = (ratio: number) => {
    const raw = TEMP_MIN + ratio * (TEMP_MAX - TEMP_MIN);
    return Math.max(TEMP_MIN, Math.min(TEMP_MAX, Math.round(raw / TEMP_STEP) * TEMP_STEP));
  };

  return (
    <SegmentSlider
      valueRatio={(value - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)}
      onRatioChange={(ratio) => onChange(toValue(ratio))}
      minLabel={`${TEMP_MIN}°`}
      valueLabel={`${value.toFixed(1)}°C`}
      goodStart={(BEST_TEMP_MIN - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)}
      goodEnd={(BEST_TEMP_MAX - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)}
    />
  );
}

function StrengthSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <SegmentSlider
      valueRatio={value / 100}
      onRatioChange={(ratio) => onChange(Math.max(0, Math.min(100, Math.round(ratio * 100))))}
      minLabel="0%"
      valueLabel={`${value}%`}
      goodStart={0.25}
      goodEnd={0.6}
    />
  );
}

function SegmentSlider({
  valueRatio,
  onRatioChange,
  minLabel,
  valueLabel,
  goodStart,
  goodEnd,
}: {
  valueRatio: number;
  onRatioChange: (ratio: number) => void;
  minLabel: string;
  valueLabel: string;
  goodStart: number;
  goodEnd: number;
}) {
  const [sliderWidth, setSliderWidth] = useState(200);
  const latestRatioRef = useRef(valueRatio);
  latestRatioRef.current = valueRatio;
  const onRatioChangeRef = useRef(onRatioChange);
  onRatioChangeRef.current = onRatioChange;
  const startRatioRef = useRef(valueRatio);
  const travel = Math.max(1, sliderWidth - THUMB_SIZE);
  const thumbLeft = Math.max(0, Math.min(travel, valueRatio * travel));
  const activeWidth = thumbLeft + THUMB_SIZE / 2;
  const goodLeft = goodStart * sliderWidth;
  const goodWidth = (goodEnd - goodStart) * sliderWidth;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 1 || Math.abs(gesture.dy) > 1,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const nextRatio = Math.max(
            0,
            Math.min(1, (event.nativeEvent.locationX - THUMB_SIZE / 2) / travel),
          );
          startRatioRef.current = nextRatio;
          onRatioChangeRef.current(nextRatio);
        },
        onPanResponderMove: (_, gesture) => {
          const nextRatio = startRatioRef.current + gesture.dx / travel;
          onRatioChangeRef.current(Math.max(0, Math.min(1, nextRatio)));
        },
      }),
    [travel],
  );

  return (
    <View className="flex-row items-center gap-1.5">
      <PretendardFont weight="bold" style={{ width: 25, fontSize: 10.5, color: C.sec }}>
        {minLabel}
      </PretendardFont>

      {/* Thumb보다 넓은 track 전체를 잡게 해 현장 장갑 터치에서도 덜 뻑뻑하게 만듭니다. */}
      <View
        {...panResponder.panHandlers}
        className="h-11 flex-1 justify-center"
        onLayout={(event) => {
          const nextWidth = Math.max(1, event.nativeEvent.layout.width);
          setSliderWidth((previous) => (Math.abs(previous - nextWidth) < 1 ? previous : nextWidth));
        }}
      >
        <View className="h-2.5 rounded-full" style={{ backgroundColor: C.bgAlt }} />
        <View
          className="absolute h-2.5 rounded-full"
          style={{
            left: goodLeft,
            width: goodWidth,
            backgroundColor: "rgba(34, 197, 94, 0.24)",
          }}
        />
        <View
          className="absolute h-2.5 rounded-full"
          style={{ width: activeWidth, backgroundColor: "rgba(15, 118, 110, 0.5)" }}
        />
        <View
          pointerEvents="none"
          className="absolute items-center justify-center rounded-full bg-white"
          style={{
            left: thumbLeft,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderWidth: 2.5,
            borderColor: C.success,
            shadowColor: C.shadow,
            shadowOpacity: 0.22,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
          }}
        >
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: C.success }} />
        </View>
      </View>

      <PretendardFont
        weight="bold"
        style={{
          width: 54,
          textAlign: "right",
          fontSize: 16,
          color: C.text,
        }}
      >
        {valueLabel}
      </PretendardFont>
    </View>
  );
}

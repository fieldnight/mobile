import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { Card } from "@/components/hive/hive-shared";
import { BoxColor as C } from "@/types";
import { useHiveControlSettings, useHiveControlSse, useRequestManualControl } from "../hooks";
import type { ControlResultEvent, ManualControlRequest } from "../api";

const THUMB_SIZE = 30;
const SSE_TIMEOUT_MS = 15000;

const OPERATING_MODES = [
  {
    id: "saving",
    icon: "moon" as const,
    label: "절전 모드",
    temperature: 24,
    humidity: 58,
  },
  {
    id: "ai",
    icon: "cpu" as const,
    label: "AI 모드",
    temperature: 25,
    humidity: 62,
  },
  {
    id: "breeding",
    icon: "heart" as const,
    label: "사육 모드",
    temperature: 26,
    humidity: 65,
  },
  {
    id: "normal",
    icon: "sun" as const,
    label: "일반 모드",
    temperature: 25,
    humidity: 60,
  },
] as const;

type OperatingModeId = (typeof OPERATING_MODES)[number]["id"];

interface HiveControlSectionProps {
  controlHive: string;
}

type SettingKind = "temperature" | "humidity";

export function HiveControlSection({ controlHive }: HiveControlSectionProps) {
  const { show: showToast } = useAppToast();
  const { data: controlSettings } = useHiveControlSettings(controlHive || undefined);
  const { mutate: mutateManualControl } = useRequestManualControl();

  const [targetTemperature, setTargetTemperature] = useState(25);
  const [targetHumidity, setTargetHumidity] = useState(62);
  const [mode, setMode] = useState<OperatingModeId | null>("ai");
  const [pending, setPending] = useState<Record<SettingKind, boolean>>({
    temperature: false,
    humidity: false,
  });
  const timers = useRef<Partial<Record<SettingKind, ReturnType<typeof setTimeout>>>>(
    {},
  );
  // 벌통별로 서버 값을 한 번만 초기화하기 위한 ref
  const initializedHiveRef = useRef<string>("");

  useEffect(
    () => () => {
      Object.values(timers.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    },
    [],
  );

  // 서버에서 가져온 목표값으로 초기화 (벌통이 바뀔 때마다)
  useEffect(() => {
    if (!controlSettings || initializedHiveRef.current === controlHive) return;
    initializedHiveRef.current = controlHive;

    const tempEntry = controlSettings.controls.find((c) => c.type === "TEMPERATURE");
    const humEntry = controlSettings.controls.find((c) => c.type === "HUMIDITY");
    if (tempEntry?.targetValue != null) setTargetTemperature(tempEntry.targetValue);
    if (humEntry?.targetValue != null) setTargetHumidity(humEntry.targetValue);
  }, [controlSettings, controlHive]);

  const handleSseResult = useCallback(
    (event: ControlResultEvent) => {
      // 해당 필드가 있으면 타이머 해제 후 반영
      if (event.targetTemperature != null) {
        clearTimeout(timers.current.temperature);
        delete timers.current.temperature;
        setPending((c) => ({ ...c, temperature: false }));
        if (event.success) setTargetTemperature(event.targetTemperature!);
      }
      if (event.targetHumidity != null) {
        clearTimeout(timers.current.humidity);
        delete timers.current.humidity;
        setPending((c) => ({ ...c, humidity: false }));
        if (event.success) setTargetHumidity(event.targetHumidity!);
      }
      // 필드가 없으면 (실패 응답 등) 모두 해제
      if (event.targetTemperature == null && event.targetHumidity == null) {
        clearTimeout(timers.current.temperature);
        clearTimeout(timers.current.humidity);
        delete timers.current.temperature;
        delete timers.current.humidity;
        setPending({ temperature: false, humidity: false });
      }

      if (event.success) {
        showToast("반영되었습니다!", "success");
      } else {
        showToast(event.message ?? "제어 명령이 실패했어요", "error");
      }
    },
    [showToast],
  );

  useHiveControlSse({
    enabled: !!controlHive,
    onResult: handleSseResult,
  });

  const applySetting = (kind: SettingKind) => {
    if (pending[kind] || !controlHive) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPending((current) => ({ ...current, [kind]: true }));

    const body: ManualControlRequest =
      kind === "temperature" ? { targetTemperature } : { targetHumidity };

    mutateManualControl(
      { hiveId: controlHive, body },
      {
        onError: () => {
          clearTimeout(timers.current[kind]);
          delete timers.current[kind];
          setPending((current) => ({ ...current, [kind]: false }));
          showToast("제어 명령 전송에 실패했어요", "error");
        },
      },
    );

    // SSE 응답이 없을 경우 타임아웃
    timers.current[kind] = setTimeout(() => {
      delete timers.current[kind];
      setPending((current) => {
        if (!current[kind]) return current;
        return { ...current, [kind]: false };
      });
      showToast("벌통 응답 시간이 초과됐어요", "error");
    }, SSE_TIMEOUT_MS);
  };

  const applyMode = (nextMode: OperatingModeId) => {
    const next = OPERATING_MODES.find((item) => item.id === nextMode);
    if (!next) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(nextMode);
    setTargetTemperature(next.temperature);
    setTargetHumidity(next.humidity);
    showToast(`${next.label}로 설정했어요`, "success");
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
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 19, color: C.textAlt }}
          >
            온도 · 습도 설정
          </PretendardFont>
          <PretendardFont
            weight="regular"
            className="mt-1"
            style={{ fontSize: 12.5, color: C.sec }}
          >
            값을 놓으면 잠시 후 자동으로 반영돼요
          </PretendardFont>
        </View>
      </View>

      <View className="mb-3">
        <View className="mb-2 flex-row items-center justify-between">
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 14, color: C.textAlt }}
          >
            운영 모드
          </PretendardFont>
          <PretendardFont
            weight="regular"
            style={{ fontSize: 11, color: C.ter }}
          >
            모드를 고르면 권장값이 적용돼요
          </PretendardFont>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingRight: 6 }}
        >
          {OPERATING_MODES.map((item) => {
            const active = item.id === mode;
            return (
              <Pressable
                key={item.id}
                onPress={() => applyMode(item.id)}
                className="flex-row items-center rounded-xl px-3 py-2 active:opacity-75"
                style={{
                  gap: 6,
                  minWidth: 104,
                  borderWidth: 1,
                  borderColor: active
                    ? "rgba(105, 180, 213, 0.85)"
                    : "rgba(15, 23, 42, 0.07)",
                  backgroundColor: active
                    ? "rgba(105, 180, 213, 0.16)"
                    : "rgba(255,255,255,0.7)",
                }}
              >
                <Feather
                  name={item.icon}
                  size={14}
                  color={active ? C.primary : C.ter}
                />
                <PretendardFont
                  weight={active ? "bold" : "medium"}
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    color: active ? C.primary : C.sec,
                  }}
                >
                  {item.label}
                </PretendardFont>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <SettingCard
        label="목표 온도"
        helper="16~36°C · 수정벌 권장 구간 24~27°C"
        value={targetTemperature}
        valueLabel={`${targetTemperature.toFixed(1)}°C`}
        min={16}
        max={36}
        step={0.5}
        optimalMin={24}
        optimalMax={27}
        disabled={pending.temperature}
        onChange={(value) => {
          setMode(null);
          setTargetTemperature(value);
        }}
        onSlidingComplete={() => applySetting("temperature")}
      />

      <SettingCard
        label="목표 습도"
        helper="40~90% · 권장 구간 50~70%"
        value={targetHumidity}
        valueLabel={`${targetHumidity}%`}
        min={40}
        max={90}
        step={1}
        optimalMin={50}
        optimalMax={70}
        disabled={pending.humidity}
        onChange={(value) => {
          setMode(null);
          setTargetHumidity(value);
        }}
        onSlidingComplete={() => applySetting("humidity")}
      />
    </Card>
  );
}

function SettingCard({
  label,
  helper,
  value,
  valueLabel,
  min,
  max,
  step,
  optimalMin,
  optimalMax,
  disabled,
  onChange,
  onSlidingComplete,
}: {
  label: string;
  helper: string;
  value: number;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  optimalMin: number;
  optimalMax: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onSlidingComplete: () => void;
}) {
  return (
    <View
      className="mb-2.5 rounded-[18px] px-3 py-3"
      style={{
        backgroundColor: "rgba(255,255,255,0.82)",
        borderWidth: 1,
        borderColor: "rgba(15, 23, 42, 0.06)",
        opacity: disabled ? 0.56 : 1,
      }}
    >
      <View className="mb-1 flex-row items-center justify-between">
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 14, color: C.textAlt }}
        >
          {label}
        </PretendardFont>
        {disabled ? (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color={C.primary} />
            <PretendardFont
              weight="medium"
              className="ml-1.5"
              style={{ fontSize: 12, color: C.sec }}
            >
              반영 중...
            </PretendardFont>
          </View>
        ) : null}
      </View>

      <SegmentSlider
        value={value}
        min={min}
        max={max}
        step={step}
        valueLabel={valueLabel}
        optimalMin={optimalMin}
        optimalMax={optimalMax}
        disabled={disabled}
        onChange={onChange}
        onSlidingComplete={onSlidingComplete}
      />

      <PretendardFont
        weight="regular"
        className="mt-1"
        style={{ fontSize: 10.5, color: C.ter }}
      >
        {helper}
      </PretendardFont>
    </View>
  );
}

function SegmentSlider({
  value,
  min,
  max,
  step,
  valueLabel,
  optimalMin,
  optimalMax,
  disabled,
  onChange,
  onSlidingComplete,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  optimalMin: number;
  optimalMax: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onSlidingComplete: () => void;
}) {
  const [sliderWidth, setSliderWidth] = useState(200);
  const onChangeRef = useRef(onChange);
  const onSlidingCompleteRef = useRef(onSlidingComplete);
  const startRatioRef = useRef(0);
  const changedRef = useRef(false);
  onChangeRef.current = onChange;
  onSlidingCompleteRef.current = onSlidingComplete;

  const range = max - min;
  const valueRatio = Math.max(0, Math.min(1, (value - min) / range));
  const travel = Math.max(1, sliderWidth - THUMB_SIZE);
  const thumbLeft = Math.max(0, Math.min(travel, valueRatio * travel));
  const activeWidth = thumbLeft + THUMB_SIZE / 2;
  const goodLeft = ((optimalMin - min) / range) * sliderWidth;
  const goodWidth = ((optimalMax - optimalMin) / range) * sliderWidth;

  const updateFromRatio = (ratio: number) => {
    const boundedRatio = Math.max(0, Math.min(1, ratio));
    const raw = min + boundedRatio * range;
    const next = Math.max(
      min,
      Math.min(max, Math.round(raw / step) * step),
    );
    changedRef.current = true;
    onChangeRef.current(next);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && (Math.abs(gesture.dx) > 1 || Math.abs(gesture.dy) > 1),
        onMoveShouldSetPanResponderCapture: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          if (disabled) return;
          changedRef.current = false;
          const nextRatio = Math.max(
            0,
            Math.min(1, (event.nativeEvent.locationX - THUMB_SIZE / 2) / travel),
          );
          startRatioRef.current = nextRatio;
          updateFromRatio(nextRatio);
        },
        onPanResponderMove: (_, gesture) => {
          if (disabled) return;
          updateFromRatio(startRatioRef.current + gesture.dx / travel);
        },
        onPanResponderRelease: () => {
          if (!disabled && changedRef.current) {
            onSlidingCompleteRef.current();
          }
        },
        onPanResponderTerminate: () => {
          if (!disabled && changedRef.current) {
            onSlidingCompleteRef.current();
          }
        },
      }),
    [disabled, max, min, range, step, travel],
  );

  return (
    <View className="flex-row items-center gap-2">
      <PretendardFont
        weight="regular"
        style={{ width: 30, fontSize: 10, color: C.ter }}
      >
        {min}
      </PretendardFont>

      <View
        {...panResponder.panHandlers}
        className="h-11 flex-1 justify-center"
        onLayout={(event) => {
          const nextWidth = Math.max(1, event.nativeEvent.layout.width);
          setSliderWidth((previous) =>
            Math.abs(previous - nextWidth) < 1 ? previous : nextWidth,
          );
        }}
      >
        <View className="h-2.5 rounded-full" style={{ backgroundColor: C.bgAlt }} />
        <View
          className="absolute h-2.5 rounded-full"
          style={{
            left: goodLeft,
            width: goodWidth,
            backgroundColor: "rgba(34, 197, 94, 0.22)",
          }}
        />
        <View
          className="absolute h-2.5 rounded-full"
          style={{
            width: activeWidth,
            backgroundColor: "rgba(105, 180, 213, 0.7)",
          }}
        />
        <View
          pointerEvents="none"
          className="absolute items-center justify-center rounded-full bg-white"
          style={{
            left: thumbLeft,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderWidth: 2.5,
            borderColor: C.primary,
            shadowColor: C.shadow,
            shadowOpacity: 0.16,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: C.primary }}
          />
        </View>
      </View>

      <PretendardFont
        weight="semibold"
        style={{
          width: 56,
          textAlign: "right",
          fontSize: 15,
          color: C.textAlt,
        }}
      >
        {valueLabel}
      </PretendardFont>
    </View>
  );
}

import { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { useAppToast } from "@/components/ToastContext";
import type { HiveData } from "@/types/hive-control";
import { MAX_TEMPERATURE, MIN_TEMPERATURE, type useTargetTemperature } from "../hooks/useTargetTemperature";
import { formatValue, getHiveCondition } from "../model/hiveCondition";
import { R, T } from "../theme";
import { TemperatureDial } from "./TemperatureDial";

type TargetControl = ReturnType<typeof useTargetTemperature>;

const STEP_KEY_SIZE = 44;
// −/+를 꾹 누르면 이만큼 기다렸다가 일정 간격으로 계속 바꿉니다.
const HOLD_DELAY_MS = 400;
const REPEAT_MS = 85;
const OFFLINE_MESSAGE = "벌통이 온라인일 때만 온도를 바꿀 수 있어요";
// 화면 여백(16×2) + 패널 여백(20×2) + 양쪽 −/+ 버튼과 간격
const DIAL_SIDE_SPACE = 72 + (STEP_KEY_SIZE + 4) * 2;

/**
 * 홈 최상단 벌통 현황
 * - 다이얼로 내부 온도를, 아래 한 줄로 습도·기계 환경을 보여줍니다.
 * - 상태 문장 하나로 지금 신경 써야 할 일이 있는지 알려줍니다.
 * - control이 있으면 다이얼을 돌리거나 하단 양쪽 −/+(꾹 누르면 연속)로 목표 온도를 바꾸고,
 *   바꾸는 동안 상태 문장 자리가 취소/확인 버튼으로 바뀝니다.
 * - 다이얼을 잡고 있는 동안 onDialDragChange로 바깥 스크롤·카드 넘김을 잠그게 합니다.
 * - 연결이 끊긴 벌통은 조작을 막고, 다이얼이나 −/+를 누르면 토스트로 이유를 알립니다.
 */
export function HiveStatusPanel({
  hive,
  targetTemperature,
  control,
  onDialDragChange,
}: {
  hive: HiveData;
  targetTemperature: number | null;
  control?: TargetControl;
  onDialDragChange?: (dragging: boolean) => void;
}) {
  const { width } = useWindowDimensions();
  const condition = getHiveCondition(hive);
  const online = hive.status === "online";
  const { show: showToast } = useAppToast();
  const editable = online && !!control?.canEdit;
  const notifyOffline = online ? undefined : () => showToast(OFFLINE_MESSAGE, "info");
  const dialSize = Math.min(width - (control ? DIAL_SIDE_SPACE : 120), 248);
  const co2 = hive.telemetry?.co2;
  // 초안이 있거나 적용 중일 때만 가운데 숫자를 목표 온도로 바꿉니다.
  const editingTarget = control && (control.dirty || control.pending) ? control.target : null;

  const readings: { label: string; value: string; unit: string }[] = [
    { label: "내부 습도", value: formatValue(hive.humidity, 0), unit: "%" },
    { label: "기계 온도", value: formatValue(hive.externalTemperature), unit: "°C" },
    { label: "기계 습도", value: formatValue(hive.externalHumidity, 0), unit: "%" },
  ];
  if (co2 != null) readings.push({ label: "CO₂", value: formatValue(co2, 0), unit: "ppm" });

  return (
    <View className="pt-[18px] pb-5 px-5" style={{ backgroundColor: T.panel, borderRadius: R.panel }}>
      <View className="flex-row items-center justify-between">
        <PretendardFont weight="bold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 17, color: T.ink }}>
          {hive.name}
        </PretendardFont>
        <View
          accessible
          accessibilityLabel={`${online ? "실시간 연결됨" : "연결 끊김"}, ${hive.lastUpdate}`}
          className="flex-row items-center gap-1.5"
        >
          <View className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: online ? T.good : T.off }} />
          <PretendardFont style={{ fontSize: 12.5, color: T.muted }}>
            {online ? `실시간 · ${hive.lastUpdate}` : hive.lastUpdate}
          </PretendardFont>
        </View>
      </View>

      <View className="items-center mt-1.5">
        <View className="flex-row items-end justify-center gap-1">
          {control ? (
            <StepKey
              direction="minus"
              disabled={!editable || control.target <= MIN_TEMPERATURE}
              onStep={() => control.step(-1)}
              onBlockedPress={notifyOffline}
            />
          ) : null}
          <TemperatureDial
            size={dialSize}
            temperature={hive.temperature}
            targetTemperature={targetTemperature}
            color={condition.color}
            dimmed={!online}
            editingTarget={editingTarget}
            onChangeTarget={control?.setTarget}
            onStep={editable ? control?.step : undefined}
            onDragStateChange={onDialDragChange}
            locked={!editable}
            onLockedTouch={notifyOffline}
          />
          {control ? (
            <StepKey
              direction="plus"
              disabled={!editable || control.target >= MAX_TEMPERATURE}
              onStep={() => control.step(1)}
              onBlockedPress={notifyOffline}
            />
          ) : null}
        </View>

        {control?.pending ? (
          <View accessibilityLiveRegion="polite" className="flex-row items-center gap-2 -mt-1 px-3.5 py-2 rounded-full" style={{ backgroundColor: T.brandSoft }}>
            <ActivityIndicator size="small" color={T.brand} />
            <PretendardFont weight="semibold" style={{ fontSize: 13.5, color: T.inkSoft }}>벌통에 적용하고 있어요</PretendardFont>
          </View>
        ) : control?.dirty ? (
          <View className="flex-row gap-2 -mt-1">
            <ConfirmKey label="취소" onPress={control.reset} />
            <ConfirmKey
              label="확인"
              primary
              disabled={!control.canEdit || !control.hasChanges}
              accessibilityLabel={`${hive.name} 목표 온도 ${control.target.toFixed(1)}도로 적용`}
              onPress={control.apply}
            />
          </View>
        ) : (
          <View accessibilityLiveRegion="polite" className="-mt-1 px-3.5 py-2 rounded-full" style={{ backgroundColor: condition.soft }}>
            <PretendardFont weight="semibold" style={{ fontSize: 13.5, color: condition.color }}>
              {condition.message}
            </PretendardFont>
          </View>
        )}
      </View>

      <View className="flex-row mt-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: T.line }}>
        {readings.map((reading, index) => (
          <View
            key={reading.label}
            accessible
            accessibilityLabel={`${reading.label} ${reading.value}${reading.unit}`}
            className="flex-1 items-center"
            style={{ borderLeftWidth: index ? 1 : 0, borderLeftColor: T.line }}
          >
            <PretendardFont style={{ fontSize: 12, color: T.muted }}>{reading.label}</PretendardFont>
            <PretendardFont weight="semibold" style={{ marginTop: 4, fontSize: 17, color: T.ink, fontVariant: ["tabular-nums"] }}>
              {reading.value}
              <PretendardFont style={{ fontSize: 12, color: T.muted }}>{reading.value === "–" ? "" : ` ${reading.unit}`}</PretendardFont>
            </PretendardFont>
          </View>
        ))}
      </View>

      {hive.telemetry?.hwIssue ? (
        <PretendardFont style={{ marginTop: 14, fontSize: 12.5, lineHeight: 18, color: T.hot }}>
          장치 점검 코드 {hive.telemetry.hwIssue}. 실시간 센서 화면에서 자세한 상태를 확인해 주세요.
        </PretendardFont>
      ) : null}
    </View>
  );
}

/**
 * 다이얼 하단 양쪽의 0.5°C 조절 버튼
 * - 짧게 누르면 한 번, 꾹 누르면 HOLD_DELAY_MS 뒤부터 REPEAT_MS마다 계속 바꿉니다.
 * - 화면 낭독기의 두 번 탭은 onPress로 들어오므로 한 번만 바뀝니다.
 * - 막혀 있어도 onBlockedPress가 있으면 눌림은 받아 이유를 알립니다(흐리게 표시).
 */
function StepKey({ direction, disabled, onStep, onBlockedPress }: {
  direction: "minus" | "plus"; disabled: boolean; onStep: () => void; onBlockedPress?: () => void;
}) {
  const timersRef = useRef<{ hold?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({});
  const repeatedRef = useRef(false);

  const stop = useCallback(() => {
    clearTimeout(timersRef.current.hold);
    clearInterval(timersRef.current.repeat);
    timersRef.current = {};
  }, []);

  useEffect(() => stop, [stop]);
  // 끝값에 닿아 비활성화되면 반복을 멈춥니다.
  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  const handlePressIn = () => {
    repeatedRef.current = false;
    if (disabled) return;
    timersRef.current.hold = setTimeout(() => {
      repeatedRef.current = true;
      onStep();
      timersRef.current.repeat = setInterval(onStep, REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  const handlePress = () => {
    if (disabled) onBlockedPress?.();
    else if (!repeatedRef.current) onStep();
  };

  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`목표 온도 0.5도 ${direction === "plus" ? "올리기" : "내리기"}`}
      accessibilityHint="꾹 누르면 계속 바뀌어요"
      accessibilityState={{ disabled }}
      disabled={disabled && !onBlockedPress}
      onPressIn={handlePressIn}
      onPressOut={stop}
      onPress={handlePress}
      hitSlop={6}
      className="items-center justify-center rounded-full mb-2"
      style={({ pressed }) => ({
        width: STEP_KEY_SIZE,
        height: STEP_KEY_SIZE,
        backgroundColor: pressed ? T.keyPressed : T.key,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Feather name={direction} size={20} color={T.ink} />
    </Tap>
  );
}

/** 상태 문장 자리에 뜨는 취소/확인 버튼 */
function ConfirmKey({
  label,
  primary = false,
  disabled = false,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-w-[96px] min-h-[40px] px-5 items-center justify-center rounded-full"
      style={({ pressed }) => ({
        backgroundColor: primary ? (pressed ? "#333B45" : T.ink) : pressed ? T.keyPressed : T.key,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <PretendardFont weight="bold" style={{ fontSize: 14, color: primary ? T.panel : T.inkSoft }}>
        {label}
      </PretendardFont>
    </Tap>
  );
}

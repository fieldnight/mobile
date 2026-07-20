import { useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  Switch,
  TextInput,
  View,
} from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { BottomSheet, useBottomSheetScroll } from "@/components/BottomSheet";
import { C } from "@/constants/hive-colors";
import {
  isBeeCountLimitFunction,
  type NfcDoorFunction,
} from "./nfcDoorCards";

const FUNCTION_OPTIONS: Array<{ value: NfcDoorFunction; label: string }> = [
  { value: "open_at", label: "열기 예약" },
  { value: "close_at", label: "닫기 예약" },
  { value: "window", label: "여닫기" },
  { value: "alternate_24h", label: "24시간 교대" },
];

type ControlMode = "time" | "count";

const COUNT_LIMIT_OPTIONS: Array<{
  value: NfcDoorFunction;
  label: string;
  description: string;
}> = [
  {
    value: "activity_boost",
    label: "활동량 강제증가",
    description: "기준 마릿수 이상 나가기 전까지 들어오는 입구를 닫아요.",
  },
  {
    value: "overpollination_guard",
    label: "과수정 방지",
    description: "기준 마릿수 이상 나가면 밖으로 나가는 출구를 닫아요.",
  },
  {
    value: "return_limit",
    label: "귀소량 제한",
    description: "기준 마릿수 이상 들어오면 들어오는 입구를 닫아요.",
  },
];

const HOURS_12 = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const HOURS_24 = Array.from({ length: 24 }, (_, index) => index);
const WHEEL_ITEM_H = 42;
const WHEEL_DRAG_STEP = 24;
const MOMENTUM_FIRST_STEP_MS = 16;
const MOMENTUM_MAX_STEP_MS = 74;
const MOMENTUM_DECAY = 1.08;
const MOMENTUM_MIN_VELOCITY = 0.08;
const MAX_MOMENTUM_STEPS = 44;
const FORM_PANEL_BG = "#EEF2F6";
const INFO_PANEL_BG = "#EAF4FF";

export function AddNfcDoorCardModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    functionType: NfcDoorFunction;
    detail: string;
    repeat: boolean;
    start: string;
    end: string;
    threshold?: number;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [controlMode, setControlMode] = useState<ControlMode>("time");
  const [functionType, setFunctionType] = useState<NfcDoorFunction>("open_at");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [meridiem, setMeridiem] = useState<"오전" | "오후">("오전");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(14);
  const [repeat, setRepeat] = useState(false);
  const [threshold, setThreshold] = useState("50");
  const isCountLimit = isBeeCountLimitFunction(functionType);

  const changeControlMode = (nextMode: ControlMode) => {
    setControlMode(nextMode);
    setFunctionType(nextMode === "time" ? "open_at" : "activity_boost");
    setRepeat(false);
  };

  const detail = useMemo(() => {
    if (isCountLimit) {
      const selected = COUNT_LIMIT_OPTIONS.find((option) => option.value === functionType);
      return `${selected?.label ?? "벌 마릿수 제한"} · ${getThresholdValue(threshold)}마리 기준`;
    }
    if (functionType === "window") {
      if (startHour === endHour) return `${formatHour24(startHour)}부터 24시간 전체`;
      return `${formatHour24(startHour)} ~ ${formatHour24(endHour)}`;
    }
    if (functionType === "alternate_24h") {
      return repeat ? "24시간 닫기와 24시간 열기를 계속 반복" : "24시간 닫고 24시간 연 뒤 종료";
    }
    return `${meridiem} ${hour}:${String(minute).padStart(2, "0")}`;
  }, [endHour, functionType, hour, isCountLimit, meridiem, minute, repeat, startHour, threshold]);

  const resetAndClose = () => {
    setTitle("");
    setControlMode("time");
    setFunctionType("open_at");
    setHour(9);
    setMinute(0);
    setMeridiem("오전");
    setStartHour(9);
    setEndHour(14);
    setRepeat(false);
    setThreshold("50");
    onClose();
  };

  const submit = () => {
    const selectedTime = toTimeString(hour, minute, meridiem);
    const defaultTitle = "새 NFC 카드";
    onSubmit({
      title: title.trim() || defaultTitle,
      functionType,
      detail,
      repeat: isCountLimit ? false : repeat,
      start:
        isCountLimit
          ? ""
          : functionType === "close_at"
          ? ""
          : functionType === "window"
            ? toHourString(startHour)
            : functionType === "alternate_24h"
              ? "close_first"
            : selectedTime,
      end:
        isCountLimit || functionType === "open_at" || functionType === "alternate_24h"
          ? ""
          : functionType === "window"
            ? toHourString(endHour)
            : selectedTime,
      threshold: isCountLimit ? getThresholdValue(threshold) : undefined,
    });
    resetAndClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={resetAndClose}
      title="NFC 카드 추가"
      snapHeight={0.78}
      contentScrollEnabled
      dragCloseEnabled={false}
      headerAccessory={
        <ControlModeSegment value={controlMode} onChange={changeControlMode} />
      }
    >
      <SheetInfo>
        {controlMode === "time"
          ? "시간 기준으로 개폐기를 여닫는 카드를 추가해요."
          : "벌 출입 마릿수 기준으로 개폐기를 제어하는 카드를 추가해요."}
      </SheetInfo>

      <SheetFieldLabel label="제목" />
      <SheetTextInput
        value={title}
        onChangeText={setTitle}
        placeholder="예: 새벽 환기 카드"
      />

      <SheetFieldLabel label={controlMode === "time" ? "시간 제어 기능" : "벌 마릿수 제어 기능"} />
      {controlMode === "time" ? (
        <View className="flex-row flex-wrap gap-2">
          {FUNCTION_OPTIONS.map((option) => {
            const selected = option.value === functionType;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFunctionType(option.value)}
                className="items-center rounded-2xl px-4 py-3 active:opacity-70"
                style={{
                  minWidth: "47%",
                  backgroundColor: selected ? C.primary : FORM_PANEL_BG,
                }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 16.5, color: selected ? C.white : C.text }}
                >
                  {option.label}
                </PretendardFont>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="gap-2.5">
          {COUNT_LIMIT_OPTIONS.map((option) => {
            const selected = option.value === functionType;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFunctionType(option.value)}
                className="rounded-2xl px-4 py-3.5 active:opacity-70"
                style={{ backgroundColor: selected ? C.primary : FORM_PANEL_BG }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 17, color: selected ? C.white : C.text }}
                >
                  {option.label}
                </PretendardFont>
                <PretendardFont
                  weight="medium"
                  style={{
                    marginTop: 4,
                    fontSize: 15,
                    lineHeight: 21,
                    color: selected ? "rgba(255,255,255,0.86)" : C.textAlt,
                  }}
                >
                  {option.description}
                </PretendardFont>
              </Pressable>
            );
          })}
        </View>
      )}

      <SheetFieldLabel label={controlMode === "time" ? "시간 설정" : "기준 마릿수"} />

      {isCountLimit ? (
        <View className="rounded-2xl px-4 py-4" style={{ backgroundColor: C.bgAlt }}>
          <TextInput
            value={threshold}
            onChangeText={(value) => setThreshold(value.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="50"
            placeholderTextColor={C.ter}
            className="h-14 rounded-2xl px-4"
            style={{
              backgroundColor: FORM_PANEL_BG,
              color: C.text,
              fontFamily: "Pretendard-Bold",
              fontSize: 23,
            }}
          />
        </View>
      ) : functionType === "window" ? (
        <RangeWheelPicker
          startHour={startHour}
          endHour={endHour}
          onStartChange={setStartHour}
          onEndChange={setEndHour}
        />
      ) : functionType === "alternate_24h" ? (
        <View className="rounded-2xl px-4 py-4" style={{ backgroundColor: C.bgAlt }}>
          <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.sec, lineHeight: 23 }}>
            활성화하는 순간부터 24시간 닫고, 다음 24시간은 엽니다.
          </PretendardFont>
        </View>
      ) : (
        <SingleTimeWheel
          hour={hour}
          minute={minute}
          meridiem={meridiem}
          onHourChange={setHour}
          onMinuteChange={setMinute}
          onMeridiemChange={setMeridiem}
        />
      )}

      {!isCountLimit ? (
        <View
          className="mt-5 flex-row items-center justify-between rounded-2xl px-4 py-3"
          style={{ backgroundColor: FORM_PANEL_BG }}
        >
          <PretendardFont weight="semibold" style={{ fontSize: 17, color: C.text }}>
            반복 활성화
          </PretendardFont>
          <Switch
            value={repeat}
            onValueChange={setRepeat}
            trackColor={{ false: C.border, true: C.primary }}
            thumbColor={C.white}
          />
        </View>
      ) : null}

      <View className="mt-6 flex-row gap-2.5">
        <Pressable
          onPress={resetAndClose}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: FORM_PANEL_BG }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 17, color: C.textAlt }}>
            취소
          </PretendardFont>
        </Pressable>
        <Pressable
          onPress={submit}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: C.primary }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 17, color: C.white }}>
            추가
          </PretendardFont>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function ControlModeSegment({
  value,
  onChange,
}: {
  value: ControlMode;
  onChange: (value: ControlMode) => void;
}) {
  return (
    <View className="flex-row rounded-2xl p-1" style={{ backgroundColor: FORM_PANEL_BG }}>
      {[
        { value: "time" as const, label: "시간 제어" },
        { value: "count" as const, label: "벌 마릿수" },
      ].map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="rounded-xl px-3 py-2 active:opacity-70"
            style={{ backgroundColor: selected ? C.primary : "transparent" }}
          >
            <PretendardFont
              weight="bold"
              numberOfLines={1}
              style={{ fontSize: 14, color: selected ? C.white : C.textAlt }}
            >
              {option.label}
            </PretendardFont>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 같은 Add 계열 모달에서 반복되는 안내 문구 패널입니다. */
function SheetInfo({ children }: { children: string }) {
  return (
    <View className="mb-2 rounded-2xl p-4" style={{ backgroundColor: INFO_PANEL_BG }}>
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 16, color: C.primary, lineHeight: 23 }}
      >
        {children}
      </PretendardFont>
    </View>
  );
}

/** NFC 카드 추가 모달 안에서만 쓰는 border 없는 폼 라벨입니다. */
function SheetFieldLabel({ label }: { label: string }) {
  return (
    <View className="mb-2 mt-5 flex-row items-center">
      <PretendardFont weight="bold" style={{ fontSize: 16.5, color: C.text }}>
        {label}
      </PretendardFont>
    </View>
  );
}

/** Pretendard를 직접 지정한 Add 모달용 입력 필드입니다. */
function SheetTextInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.ter}
      className="h-12 rounded-2xl px-4"
      style={{
        backgroundColor: FORM_PANEL_BG,
        color: C.text,
        fontFamily: "Pretendard-Medium",
        fontSize: 17,
      }}
    />
  );
}

function SingleTimeWheel({
  hour,
  minute,
  meridiem,
  onHourChange,
  onMinuteChange,
  onMeridiemChange,
}: {
  hour: number;
  minute: number;
  meridiem: "오전" | "오후";
  onHourChange: (value: number) => void;
  onMinuteChange: (value: number) => void;
  onMeridiemChange: (value: "오전" | "오후") => void;
}) {
  return (
    <View className="rounded-2xl px-3 py-3" style={{ backgroundColor: C.bgAlt }}>
      <View className="flex-row items-center justify-between">
        <WheelColumn values={HOURS_12} value={hour} formatter={String} onChange={onHourChange} />
        <PretendardFont weight="bold" style={{ fontSize: 22, color: C.sec }}>
          :
        </PretendardFont>
        <WheelColumn
          values={MINUTES}
          value={minute}
          formatter={(value) => String(value).padStart(2, "0")}
          onChange={onMinuteChange}
        />
        <WheelColumn
          values={["오전", "오후"] as const}
          value={meridiem}
          formatter={(value) => value}
          onChange={onMeridiemChange}
        />
      </View>
    </View>
  );
}

function RangeWheelPicker({
  startHour,
  endHour,
  onStartChange,
  onEndChange,
}: {
  startHour: number;
  endHour: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}) {
  const span = getRangeSpan(startHour, endHour);

  return (
    <View className="rounded-2xl px-3 py-4" style={{ backgroundColor: C.bgAlt }}>
      <PretendardFont style={{ fontSize: 15, color: C.sec, marginBottom: 12 }}>
        시작과 종료 시간을 각각 굴려서 하루 중 한 구간을 정해요
      </PretendardFont>

      <View className="flex-row items-center justify-between">
        <View className="items-center">
          <PretendardFont weight="bold" style={{ fontSize: 15, color: C.primary, marginBottom: 4 }}>
            시작
          </PretendardFont>
          <WheelColumn
            values={HOURS_24}
            value={startHour}
            formatter={(value) => `${value}시`}
            onChange={onStartChange}
          />
        </View>
        <View className="w-4" />
        <View className="items-center">
          <PretendardFont weight="bold" style={{ fontSize: 15, color: C.primary, marginBottom: 4 }}>
            종료
          </PretendardFont>
          <WheelColumn
            values={HOURS_24}
            value={endHour}
            formatter={(value) => `${value}시`}
            onChange={onEndChange}
          />
        </View>
      </View>

      <View className="mt-4 h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: C.border }}>
        <View className="flex-1 flex-row">
          {HOURS_24.map((hour) => (
            <View
              key={hour}
              style={{
                flex: 1,
                backgroundColor: isHourInRange(hour, startHour, endHour)
                  ? C.primary
                  : "transparent",
              }}
            />
          ))}
        </View>
      </View>

      <PretendardFont weight="bold" style={{ fontSize: 18, color: C.text, marginTop: 12 }}>
        {formatHour24(startHour)} ~ {formatHour24(endHour)} · {span}시간
      </PretendardFont>
    </View>
  );
}

function WheelColumn<T extends string | number>({
  values,
  value,
  formatter,
  onChange,
}: {
  values: readonly T[];
  value: T;
  formatter: (value: T) => string;
  onChange: (value: T) => void;
}) {
  const setOuterScroll = useBottomSheetScroll();
  const selectedIndex = Math.max(0, values.findIndex((item) => item === value));
  const startIndexRef = useRef(selectedIndex);
  const lastIndexRef = useRef(selectedIndex);
  const momentumRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  lastIndexRef.current = selectedIndex;

  const clampIndex = (index: number) => Math.max(0, Math.min(values.length - 1, index));

  const moveToIndex = (index: number) => {
    const nextIndex = clampIndex(index);
    if (nextIndex === lastIndexRef.current) return false;
    lastIndexRef.current = nextIndex;
    onChange(values[nextIndex]);
    return true;
  };

  const stopMomentum = () => {
    if (!momentumRef.current) return;
    clearTimeout(momentumRef.current);
    momentumRef.current = null;
  };

  const finishMomentum = () => {
    stopMomentum();
    setOuterScroll?.(true);
  };

  const startMomentum = (velocityY: number) => {
    const direction = velocityY < 0 ? 1 : -1;
    const speed = Math.abs(velocityY);
    if (speed < MOMENTUM_MIN_VELOCITY) {
      setOuterScroll?.(true);
      return;
    }

    const totalSteps = Math.min(
      MAX_MOMENTUM_STEPS,
      Math.max(3, Math.round(speed * speed * 8 + speed * 12)),
    );
    let moved = 0;
    let stepDelay = MOMENTUM_FIRST_STEP_MS;

    // ScrollView를 쓰지 않는 커스텀 휠이라 손을 놓은 뒤 감속 타이머로 관성을 직접 만듭니다.
    const roll = () => {
      moved += 1;
      const changed = moveToIndex(lastIndexRef.current + direction);

      if (!changed || moved >= totalSteps) {
        finishMomentum();
        return;
      }

      stepDelay = Math.min(MOMENTUM_MAX_STEP_MS, stepDelay * MOMENTUM_DECAY);
      momentumRef.current = setTimeout(roll, stepDelay);
    };

    momentumRef.current = setTimeout(roll, stepDelay);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dy) > 2,
    onPanResponderGrant: () => {
      stopMomentum();
      startIndexRef.current = lastIndexRef.current;
      setOuterScroll?.(false);
    },
    onPanResponderMove: (_, gesture) => {
      moveToIndex(startIndexRef.current + Math.round(-gesture.dy / WHEEL_DRAG_STEP));
    },
    onPanResponderRelease: (_, gesture) => {
      startMomentum(gesture.vy);
    },
    onPanResponderTerminate: () => {
      stopMomentum();
      setOuterScroll?.(true);
    },
  });

  useEffect(() => stopMomentum, []);

  const visibleItems = [-1, 0, 1].map((offset) => {
    const index = clampIndex(selectedIndex + offset);
    return { item: values[index], offset, key: `${String(values[index])}-${offset}` };
  });

  const step = (direction: -1 | 1) => {
    stopMomentum();
    moveToIndex(selectedIndex + direction);
    setOuterScroll?.(true);
  };

  return (
    <View
      {...panResponder.panHandlers}
      className="items-center overflow-hidden"
      style={{ width: 86, height: WHEEL_ITEM_H * 3 }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: WHEEL_ITEM_H,
          left: 7,
          right: 7,
          height: WHEEL_ITEM_H,
          borderTopWidth: 2,
          borderBottomWidth: 2,
          borderColor: C.primary,
          zIndex: 2,
        }}
      />

      {/* ScrollView 대신 직접 dy를 읽는 휠입니다. 모달 부모 스크롤과 제스처 충돌이 없습니다. */}
      {visibleItems.map(({ item, offset, key }) => {
        const selected = offset === 0;
        return (
          <Pressable
            key={key}
            onPress={() => {
              if (offset !== 0) step(offset > 0 ? 1 : -1);
            }}
            className="items-center justify-center"
            style={{ height: WHEEL_ITEM_H }}
          >
            <PretendardFont
              weight="bold"
              style={{ fontSize: selected ? 23 : 19.5, color: selected ? C.text : C.ter }}
            >
              {formatter(item)}
            </PretendardFont>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatHour24(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const meridiem = normalized < 12 ? "오전" : "오후";
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${meridiem} ${displayHour}:00`;
}

function isHourInRange(hour: number, start: number, end: number) {
  if (start === end) return true;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

function getRangeSpan(start: number, end: number) {
  if (start === end) return 24;
  return end > start ? end - start : 24 - start + end;
}

function getThresholdValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 50;
}

function toHourString(hour: number) {
  return `${String(((hour % 24) + 24) % 24).padStart(2, "0")}:00`;
}

function toTimeString(hour: number, minute: number, meridiem: "오전" | "오후") {
  const normalizedHour =
    meridiem === "오전"
      ? hour % 12
      : hour === 12
        ? 12
        : hour + 12;
  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

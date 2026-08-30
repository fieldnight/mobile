import { useEffect, useMemo, useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { BottomSheet } from "@/components/BottomSheet";
import { C } from "@/constants/hive-colors";
import {
  isBeeCountLimitFunction,
  type BeeCountLimitFunction,
  type NfcDoorFunction,
} from "./nfcDoorCards";

const MERIDIEM_VALUES = ["오전", "오후"] as const;
const HOURS_12 = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES_10 = Array.from({ length: 6 }, (_, index) => index * 10);
const WHEEL_ITEM_H = 42;
const WHEEL_VISIBLE_ITEMS = 3;
const WHEEL_PAD_COUNT = 1;
/** TimeField(휠 3개) 자체 높이 + 세로 패딩(py-3 = 24px). 여닫기 시간대 필드가 열리고 닫힐 때
 * 이 값만큼 항상 공간을 예약해서, 휠이 나타나도 아래 "반복 활성화" 섹션 위치가 밀리지 않게 합니다. */
const TIME_FIELD_H = WHEEL_ITEM_H * WHEEL_VISIBLE_ITEMS + 24;

const FUNCTION_OPTIONS: Array<{ value: NfcDoorFunction; label: string }> = [
  { value: "open_at", label: "열기 예약" },
  { value: "close_at", label: "닫기 예약" },
  { value: "window", label: "여닫기" },
  { value: "alternate_24h", label: "24시간 교대" },
];

type ControlMode = "time" | "count";

const COUNT_LIMIT_OPTIONS: Array<{ value: NfcDoorFunction; label: string }> = [
  { value: "activity_boost", label: "활동량 강제증가" },
  { value: "overpollination_guard", label: "과수정 방지" },
  { value: "return_limit", label: "귀소량 제한" },
];

/**
 * 벌 마릿수 제어 3종 기능이 기준 마릿수 전/후로 입구·출구를 어떻게 움직이는지
 * 팀원이 한눈에 비교할 수 있도록 정리한 표 데이터입니다.
 * (기준 카운터: COUNT_TARGET_BY_LIMIT_FUNCTION과 동일한 값)
 */
const COUNT_LIMIT_TABLE: Record<
  BeeCountLimitFunction,
  {
    counterLabel: string;
    beforeThreshold: string;
    atThreshold: string;
  }
> = {
  activity_boost: {
    counterLabel: "출구로 나간 벌 수",
    beforeThreshold: "입구(들어오는 문) 닫힘 · 출구는 항상 열림",
    atThreshold: "입구 열림 · 벌이 자유롭게 들어올 수 있어요",
  },
  overpollination_guard: {
    counterLabel: "출구로 나간 벌 수",
    beforeThreshold: "입구·출구 모두 열림",
    atThreshold: "출구(나가는 문) 닫힘 · 입구는 계속 열려있어요",
  },
  return_limit: {
    counterLabel: "입구로 들어온 벌 수",
    beforeThreshold: "입구·출구 모두 열림",
    atThreshold: "입구(들어오는 문) 닫힘 · 출구는 계속 열려있어요",
  },
};

const FORM_PANEL_BG = "#EEF2F6";
/** 여닫기 시작·종료 버튼 행의 높이 (px-3 py-2 버튼 + 위아래 여백 기준). */
const TIME_RANGE_HEADER_H = 40;
/**
 * "시간 설정" 영역은 기능(열기 예약 / 여닫기 / 24시간 교대 등)을 바꾸거나 여닫기의
 * 오전·오후 버튼을 눌러 휠을 펼쳐도 항상 같은 높이를 유지해야, 아래 "반복 활성화"
 * 섹션이 오르내리지 않습니다. 가장 큰 상태(여닫기 박스: 시작/종료 버튼 행 + 휠)를
 * 기준으로 전체를 고정 높이로 맞춥니다.
 */
const TIME_SETTING_H =
  32 /* TimeRangeField py-4 */ + TIME_RANGE_HEADER_H + 12 /* mt-3 */ + TIME_FIELD_H;

function makeTime(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

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
    timeWindowEnabled?: boolean;
    timeWindowStart?: string;
    timeWindowEnd?: string;
  }) => void;
}) {
  const [controlMode, setControlMode] = useState<ControlMode>("time");
  const [functionType, setFunctionType] = useState<NfcDoorFunction>("open_at");
  const [time, setTime] = useState(() => makeTime(9, 0));
  const [windowStart, setWindowStart] = useState(() => makeTime(9, 0));
  const [windowEnd, setWindowEnd] = useState(() => makeTime(14, 0));
  const [repeat, setRepeat] = useState(false);
  const [threshold, setThreshold] = useState("50");
  // 벌 마릿수 제어 고급 옵션 — 이 시간 구간 동안만 마릿수 제한 규칙을 적용합니다.
  const [countTimeWindowEnabled, setCountTimeWindowEnabled] = useState(false);
  const [countWindowStart, setCountWindowStart] = useState(() => makeTime(9, 0));
  const [countWindowEnd, setCountWindowEnd] = useState(() => makeTime(18, 0));
  const isCountLimit = isBeeCountLimitFunction(functionType);

  const changeControlMode = (nextMode: ControlMode) => {
    setControlMode(nextMode);
    setFunctionType(nextMode === "time" ? "open_at" : "activity_boost");
    setRepeat(false);
  };

  const detail = useMemo(() => {
    if (isCountLimit) {
      const selected = COUNT_LIMIT_OPTIONS.find(
        (option) => option.value === functionType,
      );
      const base = `${selected?.label ?? "벌 마릿수 제한"} · ${getThresholdValue(threshold)}마리 기준`;
      return countTimeWindowEnabled
        ? `${base} · ${formatClock12(countWindowStart)} ~ ${formatClock12(countWindowEnd)}`
        : base;
    }
    if (functionType === "window") {
      if (isSameClock(windowStart, windowEnd))
        return `${formatClock12(windowStart)}부터 24시간 전체`;
      return `${formatClock12(windowStart)} ~ ${formatClock12(windowEnd)}`;
    }
    if (functionType === "alternate_24h") {
      return repeat
        ? "24시간 닫기와 24시간 열기를 계속 반복"
        : "24시간 닫고 24시간 연 뒤 종료";
    }
    return formatClock12(time);
  }, [
    countTimeWindowEnabled,
    countWindowEnd,
    countWindowStart,
    functionType,
    isCountLimit,
    repeat,
    threshold,
    time,
    windowEnd,
    windowStart,
  ]);

  const autoTitle = useMemo(() => {
    if (isCountLimit) {
      const selected = COUNT_LIMIT_OPTIONS.find(
        (option) => option.value === functionType,
      );
      return `${getThresholdValue(threshold)}마리 ${selected?.label ?? ""}`;
    }
    if (functionType === "window") {
      if (isSameClock(windowStart, windowEnd)) return "24시간 여닫기";
      return `${toHourMinuteString(windowStart)}~${toHourMinuteString(windowEnd)} 여닫기`;
    }
    if (functionType === "alternate_24h") return "24시간 교대";
    const label = functionType === "close_at" ? "닫기" : "열기";
    return `${toHourMinuteString(time)} ${label}`;
  }, [functionType, isCountLimit, threshold, time, windowEnd, windowStart]);

  const resetAndClose = () => {
    setControlMode("time");
    setFunctionType("open_at");
    setTime(makeTime(9, 0));
    setWindowStart(makeTime(9, 0));
    setWindowEnd(makeTime(14, 0));
    setRepeat(false);
    setThreshold("50");
    setCountTimeWindowEnabled(false);
    setCountWindowStart(makeTime(9, 0));
    setCountWindowEnd(makeTime(18, 0));
    onClose();
  };

  const submit = () => {
    const selectedTime = toHourMinuteString(time);
    onSubmit({
      title: autoTitle,
      functionType,
      detail,
      repeat: isCountLimit ? false : repeat,
      start: isCountLimit
        ? ""
        : functionType === "close_at"
          ? ""
          : functionType === "window"
            ? toHourMinuteString(windowStart)
            : functionType === "alternate_24h"
              ? "close_first"
              : selectedTime,
      end:
        isCountLimit ||
        functionType === "open_at" ||
        functionType === "alternate_24h"
          ? ""
          : functionType === "window"
            ? toHourMinuteString(windowEnd)
            : selectedTime,
      threshold: isCountLimit ? getThresholdValue(threshold) : undefined,
      timeWindowEnabled: isCountLimit ? countTimeWindowEnabled : undefined,
      timeWindowStart:
        isCountLimit && countTimeWindowEnabled
          ? toHourMinuteString(countWindowStart)
          : undefined,
      timeWindowEnd:
        isCountLimit && countTimeWindowEnabled
          ? toHourMinuteString(countWindowEnd)
          : undefined,
    });
    resetAndClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={resetAndClose}
      title="카드 추가"
      snapHeight={0.75}
      fixedHeight
      contentScrollEnabled={false}
      dragCloseEnabled={false}
      headerAccessory={
        <ControlModeSegment value={controlMode} onChange={changeControlMode} />
      }
      aboveSheet={
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 16, color: C.white, lineHeight: 23 }}
        >
          {controlMode === "time"
            ? "시간 기준으로 개폐기를 여닫는 카드를 추가해요."
            : "벌 출입 마릿수 기준으로 개폐기를 제어하는 카드를 추가해요."}
        </PretendardFont>
      }
    >
      <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 16 }}
      >
      <SheetFieldLabel
        label={
          controlMode === "time" ? "시간 제어 기능" : "벌 마릿수 제어 기능"
        }
        noTopMargin
      />
      {controlMode === "time" ? (
        <View className="flex-row flex-wrap gap-2">
          {FUNCTION_OPTIONS.map((option) => {
            const selected = option.value === functionType;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFunctionType(option.value)}
                className="items-center rounded-2xl px-4 py-2.5 active:opacity-70"
                style={{
                  minWidth: "47%",
                  backgroundColor: selected ? C.primary : FORM_PANEL_BG,
                }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 16.5, color: selected ? C.white : C.sec }}
                >
                  {option.label}
                </PretendardFont>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="gap-2.5">
          <View className="flex-row flex-wrap gap-2">
            {COUNT_LIMIT_OPTIONS.map((option) => {
              const selected = option.value === functionType;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setFunctionType(option.value)}
                  className="items-center rounded-2xl px-4 py-3 active:opacity-70"
                  style={{
                    minWidth: "31%",
                    backgroundColor: selected ? C.primary : FORM_PANEL_BG,
                  }}
                >
                  <PretendardFont
                    weight="bold"
                    style={{ fontSize: 14.5, color: selected ? C.white : C.sec }}
                  >
                    {option.label}
                  </PretendardFont>
                </Pressable>
              );
            })}
          </View>

          <CountLimitFunctionTable selected={functionType} />
        </View>
      )}

      <SheetFieldLabel
        label={controlMode === "time" ? "시간 설정" : "기준 마릿수"}
      />

      {isCountLimit ? (
        <View
          className="rounded-2xl px-4 py-4"
          style={{ backgroundColor: C.bgAlt }}
        >
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
      ) : (
        <View style={{ height: TIME_SETTING_H, justifyContent: "flex-start" }}>
          {functionType === "window" ? (
            <TimeRangeField
              startValue={windowStart}
              endValue={windowEnd}
              onStartChange={setWindowStart}
              onEndChange={setWindowEnd}
            />
          ) : functionType === "alternate_24h" ? (
            <View
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: C.bgAlt }}
            >
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 16, color: C.sec, lineHeight: 23 }}
              >
                활성화하는 순간부터 24시간 닫고, 다음 24시간은 엽니다.
              </PretendardFont>
            </View>
          ) : (
            <TimeField value={time} onChange={setTime} />
          )}
        </View>
      )}

      {isCountLimit ? (
        <CountLimitAdvancedOptions
          enabled={countTimeWindowEnabled}
          onToggle={setCountTimeWindowEnabled}
          startValue={countWindowStart}
          endValue={countWindowEnd}
          onStartChange={setCountWindowStart}
          onEndChange={setCountWindowEnd}
        />
      ) : null}

      {!isCountLimit ? (
        <View
          className="mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3"
          style={{ backgroundColor: FORM_PANEL_BG }}
        >
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 17, color: C.text }}
          >
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
      </ScrollView>

      <View className="pt-4 pb-5 flex-row gap-2.5">
        <Pressable
          onPress={resetAndClose}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: FORM_PANEL_BG }}
        >
          <PretendardFont
            weight="bold"
            style={{ fontSize: 17, color: C.textAlt }}
          >
            취소
          </PretendardFont>
        </Pressable>
        <Pressable
          onPress={submit}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: C.primary }}
        >
          <PretendardFont
            weight="bold"
            style={{ fontSize: 17, color: C.white }}
          >
            추가
          </PretendardFont>
        </Pressable>
      </View>
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
    <View className="flex-row items-center" style={{ gap: 8 }}>
      {[
        { value: "time" as const, label: "시간 제어" },
        { value: "count" as const, label: "벌 마릿수" },
      ].map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="items-center justify-center rounded-2xl active:opacity-75"
            style={{
              height: 38,
              paddingHorizontal: 14,
              backgroundColor: selected ? C.primary : FORM_PANEL_BG,
            }}
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

/**
 * 벌 마릿수 제어 3종 기능이 기준 마릿수 전/후로 입구·출구를 어떻게 여닫는지
 * 비교해서 보여주는 표. 지금 선택된 기능 행을 강조합니다.
 */
function CountLimitFunctionTable({
  selected,
}: {
  selected: NfcDoorFunction;
}) {
  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ borderWidth: 1, borderColor: "#E5E9ED" }}
    >
      <View
        className="flex-row px-3 py-2"
        style={{ backgroundColor: FORM_PANEL_BG }}
      >
        <PretendardFont
          weight="bold"
          style={{ flex: 1.1, fontSize: 12, color: C.textAlt }}
        >
          기능
        </PretendardFont>
        <PretendardFont
          weight="bold"
          style={{ flex: 1.3, fontSize: 12, color: C.textAlt }}
        >
          기준 마릿수 미달 시
        </PretendardFont>
        <PretendardFont
          weight="bold"
          style={{ flex: 1.3, fontSize: 12, color: C.textAlt }}
        >
          기준 마릿수 도달 시
        </PretendardFont>
      </View>

      {COUNT_LIMIT_OPTIONS.map((option, index) => {
        if (!isBeeCountLimitFunction(option.value)) return null;
        const row = COUNT_LIMIT_TABLE[option.value];
        const isSelected = option.value === selected;

        return (
          <View
            key={option.value}
            className="px-3 py-2.5"
            style={{
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: "#E5E9ED",
              backgroundColor: isSelected ? "rgba(105,180,213,0.12)" : C.white,
            }}
          >
            <View className="flex-row">
              <View style={{ flex: 1.1 }}>
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 13, lineHeight: 18, color: C.text }}
                >
                  {option.label}
                </PretendardFont>
                <PretendardFont
                  weight="medium"
                  style={{ marginTop: 1, fontSize: 10.5, color: C.ter }}
                >
                  {row.counterLabel}
                </PretendardFont>
              </View>
              <PretendardFont
                weight="medium"
                style={{ flex: 1.3, fontSize: 12, lineHeight: 17, color: C.textAlt }}
              >
                {row.beforeThreshold}
              </PretendardFont>
              <PretendardFont
                weight="medium"
                style={{ flex: 1.3, fontSize: 12, lineHeight: 17, color: C.textAlt }}
              >
                {row.atThreshold}
              </PretendardFont>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * 벌 마릿수 제어 고급 옵션 — 이 시간 구간 동안만 위 마릿수 제한 규칙을 적용합니다.
 * 서버·개폐기(ESP32)는 아직 이 값을 받는 자리가 없어, 지금은 카드에 표시용으로만
 * 저장되고 실제 개폐 동작에는 반영되지 않습니다.
 */
function CountLimitAdvancedOptions({
  enabled,
  onToggle,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
}: {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  startValue: Date;
  endValue: Date;
  onStartChange: (value: Date) => void;
  onEndChange: (value: Date) => void;
}) {
  return (
    <View className="mt-4">
      <PretendardFont weight="bold" style={{ fontSize: 14, color: C.textAlt }}>
        고급 옵션
      </PretendardFont>

      <View
        className="mt-2 flex-row items-center justify-between rounded-2xl px-4 py-3"
        style={{ backgroundColor: FORM_PANEL_BG }}
      >
        <View style={{ flex: 1 }}>
          <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.text }}>
            시간 구간 설정
          </PretendardFont>
          <PretendardFont
            weight="medium"
            style={{ marginTop: 2, fontSize: 12.5, lineHeight: 17, color: C.ter }}
          >
            켜면 아래 시간 구간 동안만 이 마릿수 제한이 적용돼요.
          </PretendardFont>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: C.border, true: C.primary }}
          thumbColor={C.white}
        />
      </View>

      {enabled ? (
        <View className="mt-3">
          <TimeRangeField
            startValue={startValue}
            endValue={endValue}
            onStartChange={onStartChange}
            onEndChange={onEndChange}
          />
        </View>
      ) : null}
    </View>
  );
}

/** NFC 카드 추가 모달 안에서만 쓰는 border 없는 폼 라벨입니다. */
function SheetFieldLabel({
  label,
  noTopMargin,
}: {
  label: string;
  noTopMargin?: boolean;
}) {
  return (
    <View className={`mb-2 ${noTopMargin ? "mt-0" : "mt-3"} flex-row items-center`}>
      <PretendardFont weight="bold" style={{ fontSize: 16.5, color: C.text }}>
        {label}
      </PretendardFont>
    </View>
  );
}

/** 시각 하나를 오전/오후 · 시 · 분 스와이프 휠 3개로 고르는 필드입니다. */
function TimeField({
  value,
  onChange,
}: {
  value: Date;
  onChange: (value: Date) => void;
}) {
  const hours = value.getHours();
  const meridiem: "오전" | "오후" = hours < 12 ? "오전" : "오후";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minute = value.getMinutes();
  const roundedMinute = MINUTES_10.reduce((best, item) =>
    Math.abs(item - minute) < Math.abs(best - minute) ? item : best,
  );

  const applyChange = (
    nextMeridiem: "오전" | "오후",
    nextHour12: number,
    nextMinute: number,
  ) => {
    const updated = new Date(value);
    updated.setHours(to24Hour(nextMeridiem, nextHour12), nextMinute);
    onChange(updated);
  };

  return (
    <View
      className="flex-row items-center justify-center rounded-2xl px-3 py-3"
      style={{ backgroundColor: C.bgAlt }}
    >
      <WheelColumn
        values={MERIDIEM_VALUES}
        value={meridiem}
        formatter={(item) => item}
        onChange={(next) => applyChange(next, hour12, roundedMinute)}
      />
      <WheelColumn
        values={HOURS_12}
        value={hour12}
        formatter={(item) => `${item}시`}
        onChange={(next) => applyChange(meridiem, next, roundedMinute)}
      />
      <WheelColumn
        values={MINUTES_10}
        value={roundedMinute}
        formatter={(item) => `${String(item).padStart(2, "0")}분`}
        onChange={(next) => applyChange(meridiem, hour12, next)}
      />
    </View>
  );
}

/** 시작·종료 시각 두 개를 고르는 구간 필드입니다. 요약 버튼을 누르면 해당 시각의 휠이 나타납니다. */
function TimeRangeField({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
}: {
  startValue: Date;
  endValue: Date;
  onStartChange: (value: Date) => void;
  onEndChange: (value: Date) => void;
}) {
  const [editing, setEditing] = useState<"start" | "end" | null>("start");

  return (
    <View
      className="rounded-2xl px-3 py-4"
      style={{ backgroundColor: C.bgAlt }}
    >
      <View className="flex-row items-center justify-center gap-2">
        <Pressable
          onPress={() => setEditing((prev) => (prev === "start" ? null : "start"))}
          className="rounded-xl px-3 py-2 active:opacity-70"
          style={{
            backgroundColor: editing === "start" ? C.primary : FORM_PANEL_BG,
          }}
        >
          <PretendardFont
            weight="bold"
            style={{
              fontSize: 15,
              color: editing === "start" ? C.white : C.text,
            }}
          >
            {formatClock12(startValue)}
          </PretendardFont>
        </Pressable>
        <PretendardFont weight="bold" style={{ fontSize: 15, color: C.sec }}>
          →
        </PretendardFont>
        <Pressable
          onPress={() => setEditing((prev) => (prev === "end" ? null : "end"))}
          className="rounded-xl px-3 py-2 active:opacity-70"
          style={{
            backgroundColor: editing === "end" ? C.primary : FORM_PANEL_BG,
          }}
        >
          <PretendardFont
            weight="bold"
            style={{
              fontSize: 15,
              color: editing === "end" ? C.white : C.text,
            }}
          >
            {formatClock12(endValue)}
          </PretendardFont>
        </Pressable>
      </View>

      <View className="mt-3" style={{ height: TIME_FIELD_H }}>
        {editing === "start" ? (
          <TimeField value={startValue} onChange={onStartChange} />
        ) : editing === "end" ? (
          <TimeField value={endValue} onChange={onEndChange} />
        ) : null}
      </View>
    </View>
  );
}

/**
 * 세로로 스와이프해 값을 고르는 휠 컬럼.
 * 네이티브 ScrollView의 snapToInterval로 스크롤/관성/스냅을 온전히 OS에 맡기고,
 * 스크롤 위치에서 가장 가까운 인덱스만 계산해 선택값을 반영합니다.
 */
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
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(
    0,
    values.findIndex((item) => item === value),
  );
  const lastReportedIndexRef = useRef(selectedIndex);
  const isDraggingRef = useRef(false);

  const clampIndex = (index: number) =>
    Math.max(0, Math.min(values.length - 1, index));

  // 부모에서 value가 바뀌면(다른 컬럼 변경 등) 스크롤 위치도 맞춰줍니다.
  // 사용자가 손가락으로 드래그하는 동안에는 위치를 되돌리지 않습니다.
  useEffect(() => {
    if (isDraggingRef.current) return;
    lastReportedIndexRef.current = selectedIndex;
    scrollRef.current?.scrollTo({
      y: selectedIndex * WHEEL_ITEM_H,
      animated: false,
    });
  }, [selectedIndex]);

  const commitIndexFromOffset = (offsetY: number) => {
    const index = clampIndex(Math.round(offsetY / WHEEL_ITEM_H));
    if (index !== lastReportedIndexRef.current) {
      lastReportedIndexRef.current = index;
      onChange(values[index]);
    }
    return index;
  };

  const handleScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    isDraggingRef.current = false;
    const index = commitIndexFromOffset(event.nativeEvent.contentOffset.y);
    scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_H, animated: true });
  };

  const paddedItems = Array.from(
    { length: values.length + WHEEL_PAD_COUNT * 2 },
    (_, paddedIndex) => paddedIndex - WHEEL_PAD_COUNT,
  );

  return (
    <View
      className="items-center overflow-hidden"
      style={{ width: 86, height: WHEEL_ITEM_H * WHEEL_VISIBLE_ITEMS }}
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

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        onScrollBeginDrag={() => {
          isDraggingRef.current = true;
        }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={(event) => {
          // momentum이 거의 없는 짧은 드래그는 onMomentumScrollEnd가 오지 않을 수 있어 여기서도 커밋합니다.
          if (event.nativeEvent.velocity?.y) return;
          handleScrollEnd(event);
        }}
      >
        {paddedItems.map((index) => {
          const inRange = index >= 0 && index < values.length;
          const distance = Math.abs(index - selectedIndex);
          const selected = inRange && distance === 0;
          return (
            <Pressable
              key={index}
              disabled={!inRange}
              onPress={() => {
                scrollRef.current?.scrollTo({
                  y: index * WHEEL_ITEM_H,
                  animated: true,
                });
                commitIndexFromOffset(index * WHEEL_ITEM_H);
              }}
              className="items-center justify-center"
              style={{ height: WHEEL_ITEM_H }}
            >
              {inRange ? (
                <PretendardFont
                  weight="bold"
                  style={{
                    fontSize: selected ? 20 : 17,
                    color: selected ? C.text : distance <= 1 ? C.ter : "transparent",
                  }}
                >
                  {formatter(values[index])}
                </PretendardFont>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function isSameClock(a: Date, b: Date) {
  return a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes();
}

function formatClock12(date: Date) {
  const hours = date.getHours();
  const meridiem = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${meridiem} ${displayHour}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function to24Hour(meridiem: "오전" | "오후", hour12: number) {
  return meridiem === "오전" ? hour12 % 12 : (hour12 % 12) + 12;
}

function getThresholdValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 50;
}

function toHourMinuteString(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

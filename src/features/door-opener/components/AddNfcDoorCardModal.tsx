import { useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { BottomSheet } from "@/components/BottomSheet";
import { DualRangeSlider, SingleRangeSlider } from "@/components/DualRangeSlider";
import { C } from "@/constants/hive-colors";
import {
  NO_REPEAT_DAYS,
  isRepeatDaysEmpty,
  isTimeWindowAllDay,
  type BeeCountControlConfig,
  type GateOpenState,
  type NfcDoorFunction,
  type RepeatDays,
} from "./nfcDoorCards";

/** 마릿수 슬라이더 상한. 이 값에 도달하면 "무제한"으로 취급해요(그림의 ∞에 대응). */
const COUNT_MAX = 99;
/** 시간 슬라이더는 하루(0~24시)를 30분 단위로 다룹니다. 값의 단위는 "시(hour, 소수)". */
const HOUR_MAX = 24;
const HOUR_STEP = 0.5;

const FUNCTION_OPTIONS: Array<{ value: NfcDoorFunction; label: string }> = [
  { value: "open_at", label: "열기 예약" },
  { value: "close_at", label: "닫기 예약" },
  { value: "window", label: "여닫기" },
  { value: "alternate_24h", label: "24시간 교대" },
];

type ControlMode = "time" | "count";

const DAY_OPTIONS: Array<{ key: keyof RepeatDays; label: string }> = [
  { key: "sun", label: "일" },
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
];

const FORM_PANEL_BG = "#EEF2F6";

function makeTime(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Date -> 슬라이더가 다루는 "하루 중 시(0~24, 0.5 단위)" 값. */
function dateToHourValue(date: Date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  return Math.round(hour / HOUR_STEP) * HOUR_STEP;
}

/** 슬라이더의 시(hour) 값 -> Date (오늘 날짜 기준, 시·분만 의미 있음). */
function hourValueToDate(hourValue: number) {
  const clamped = Math.min(HOUR_MAX, Math.max(0, hourValue));
  const hour = Math.floor(clamped);
  const minute = Math.round((clamped - hour) * 60);
  return makeTime(hour === HOUR_MAX ? 23 : hour, hour === HOUR_MAX ? 59 : minute);
}

function formatHourValueLabel(hourValue: number) {
  const hour = Math.floor(hourValue);
  const minute = Math.round((hourValue - hour) * 60);
  return minute === 0 ? `${hour}시` : `${hour}시${minute}분`;
}

function formatHourEdgeLabel(hourValue: number) {
  return `${hourValue}시`;
}

/** "HH:MM" 문자열 -> 슬라이더가 다루는 시(hour) 값. "24:00"(자정)은 24로 다룹니다. */
function hhmmToHourValue(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText) + Number(minuteText ?? 0) / 60;
  return Number.isFinite(hour) ? Math.round(hour / HOUR_STEP) * HOUR_STEP : 0;
}

/** 슬라이더의 시(hour) 값 -> "HH:MM" 문자열. 24는 "24:00"(다음날 자정)으로 그대로 남깁니다. */
function hourValueToHHMM(hourValue: number) {
  const clamped = Math.min(HOUR_MAX, Math.max(0, hourValue));
  const hour = Math.floor(clamped);
  const minute = Math.round((clamped - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatCountLabel(value: number) {
  return value >= COUNT_MAX ? `${COUNT_MAX}+` : `${value}`;
}

function toHourMinuteString(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatClock12(date: Date) {
  const hours = date.getHours();
  const meridiem = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${meridiem} ${displayHour}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isSameClock(a: Date, b: Date) {
  return a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes();
}

function describeRepeatDaysShort(days: RepeatDays) {
  if (isRepeatDaysEmpty(days)) return "단발성";
  const active = DAY_OPTIONS.filter((option) => days[option.key]).map((option) => option.label);
  return active.length === 7 ? "매일" : active.join("");
}

const DEFAULT_COUNT_CONTROL: BeeCountControlConfig = {
  low: 3,
  high: 12,
  within: { entranceOpen: true, exitOpen: true },
  above: { entranceOpen: true, exitOpen: false },
  repeatDays: NO_REPEAT_DAYS,
  timeWindowStart: "00:00",
  timeWindowEnd: "24:00",
};

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
    countControl?: BeeCountControlConfig;
    memo?: string;
  }) => void;
}) {
  const [controlMode, setControlMode] = useState<ControlMode>("time");
  const [functionType, setFunctionType] = useState<NfcDoorFunction>("open_at");
  const [time, setTime] = useState(() => makeTime(9, 0));
  const [windowStart, setWindowStart] = useState(() => makeTime(9, 0));
  const [windowEnd, setWindowEnd] = useState(() => makeTime(14, 0));
  const [repeat, setRepeat] = useState(false);
  const [countControl, setCountControl] = useState<BeeCountControlConfig>(DEFAULT_COUNT_CONTROL);
  const [memo, setMemo] = useState("");
  const isCountControl = controlMode === "count";

  const changeControlMode = (nextMode: ControlMode) => {
    setControlMode(nextMode);
    setFunctionType(nextMode === "time" ? "open_at" : "count_control");
    setRepeat(false);
  };

  const detail = useMemo(() => {
    if (isCountControl) {
      const timeWindowText = isTimeWindowAllDay(countControl)
        ? ""
        : ` · ${countControl.timeWindowStart}~${countControl.timeWindowEnd}`;
      return `현재 활동중인 벌 마릿수 · ${formatCountLabel(countControl.low)}~${formatCountLabel(countControl.high)}마리 구간 · ${describeRepeatDaysShort(countControl.repeatDays)}${timeWindowText}`;
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
  }, [countControl, functionType, isCountControl, repeat, time, windowEnd, windowStart]);

  const autoTitle = useMemo(() => {
    if (isCountControl) {
      return `${formatCountLabel(countControl.low)}~${formatCountLabel(countControl.high)}마리 구간 제어`;
    }
    if (functionType === "window") {
      if (isSameClock(windowStart, windowEnd)) return "24시간 여닫기";
      return `${toHourMinuteString(windowStart)}~${toHourMinuteString(windowEnd)} 여닫기`;
    }
    if (functionType === "alternate_24h") return "24시간 교대";
    const label = functionType === "close_at" ? "닫기" : "열기";
    return `${toHourMinuteString(time)} ${label}`;
  }, [countControl, functionType, isCountControl, time, windowEnd, windowStart]);

  const resetAndClose = () => {
    setControlMode("time");
    setFunctionType("open_at");
    setTime(makeTime(9, 0));
    setWindowStart(makeTime(9, 0));
    setWindowEnd(makeTime(14, 0));
    setRepeat(false);
    setCountControl(DEFAULT_COUNT_CONTROL);
    setMemo("");
    onClose();
  };

  const submit = () => {
    const selectedTime = toHourMinuteString(time);
    onSubmit({
      title: autoTitle,
      functionType,
      detail,
      memo: memo.trim() || undefined,
      repeat: isCountControl ? !isRepeatDaysEmpty(countControl.repeatDays) : repeat,
      start: isCountControl
        ? ""
        : functionType === "close_at"
          ? ""
          : functionType === "window"
            ? toHourMinuteString(windowStart)
            : functionType === "alternate_24h"
              ? "close_first"
              : selectedTime,
      end:
        isCountControl || functionType === "open_at" || functionType === "alternate_24h"
          ? ""
          : functionType === "window"
            ? toHourMinuteString(windowEnd)
            : selectedTime,
      countControl: isCountControl ? countControl : undefined,
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
      <SheetFieldLabel label="메모" subtitle="선택 · 카드 제목은 설정에 맞춰 자동으로 붙어요" noTopMargin />
      <TextInput
        value={memo}
        onChangeText={setMemo}
        placeholder="예: 남쪽 과수원 아침 개방"
        placeholderTextColor={C.ter}
        maxLength={40}
        className="rounded-2xl px-4 py-3 text-[14px]"
        style={{
          minHeight: 48,
          backgroundColor: FORM_PANEL_BG,
          color: C.text,
          fontFamily: "Pretendard-Medium",
        }}
      />

      {controlMode === "time" ? (
        <>
          <SheetFieldLabel label="시간 제어 기능" />
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
                    backgroundColor: selected ? C.gatePrimary : FORM_PANEL_BG,
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

          <SheetFieldLabel
            label="시간 설정"
            subtitle={functionType === "alternate_24h" ? "활성화 순간부터 24시간씩 교대" : undefined}
          />
          {functionType === "window" ? (
            <TimeRangeSliderField
              startValue={windowStart}
              endValue={windowEnd}
              onStartChange={setWindowStart}
              onEndChange={setWindowEnd}
            />
          ) : functionType === "alternate_24h" ? null : (
            <TimeSingleSliderField
              value={time}
              onChange={setTime}
              activeSide={functionType === "close_at" ? "before" : "after"}
            />
          )}

          <View className="mt-3 flex-row items-center justify-between px-1 py-2">
            <PretendardFont weight="semibold" style={{ fontSize: 17, color: C.text }}>
              반복 활성화
            </PretendardFont>
            <Switch
              value={repeat}
              onValueChange={setRepeat}
              trackColor={{ false: C.border, true: C.gatePrimary }}
              thumbColor={C.white}
            />
          </View>
        </>
      ) : (
        <CountControlForm value={countControl} onChange={setCountControl} />
      )}
      </ScrollView>

      <View className="pt-4 pb-5 flex-row gap-2.5">
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
          style={{ backgroundColor: C.gatePrimary }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 17, color: C.white }}>
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
              backgroundColor: selected ? C.gatePrimary : FORM_PANEL_BG,
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
 * 벌 마릿수 제어 폼 전체 — 반복 요일 + 마릿수 구간 슬라이더 + 시간 구간 슬라이더 +
 * 구간별 입출구 토글 표. "활동량 강제증가/과수정 방지/귀소량 제한" 3개 프리셋 기능 대신,
 * "현재 활동중인 벌 마릿수"(출구로 나간 수 - 입구로 들어온 수) 하나를 기준으로
 * 미만/사이/이상 3구간의 입구·출구 개폐를 사용자가 직접 조합하는 방식으로 통일했습니다.
 * 요일 × 시간 구간 × 마릿수 구간이 모두 맞을 때만 이 규칙이 적용됩니다.
 */
function CountControlForm({
  value,
  onChange,
}: {
  value: BeeCountControlConfig;
  onChange: (value: BeeCountControlConfig) => void;
}) {
  return (
    <View className="gap-1">
      <SheetFieldLabel
        label="반복"
        subtitle={
          isRepeatDaysEmpty(value.repeatDays)
            ? "지금 조건이 충족될 때 한 번만 적용"
            : "선택한 요일마다 반복 적용"
        }
      />
      <RepeatDaysPicker
        days={value.repeatDays}
        onChange={(repeatDays) => onChange({ ...value, repeatDays })}
      />

      <SheetFieldLabel label="마릿수 구간" subtitle="현재 활동중인 벌 마릿수 기준" />
      <View className="px-1 py-3">
        <DualRangeSlider
          min={0}
          max={COUNT_MAX}
          low={value.low}
          high={value.high}
          onChange={(low, high) => onChange({ ...value, low, high })}
          formatEdgeLabel={formatCountLabel}
          formatHandleLabel={formatCountLabel}
        />
      </View>

      <SheetFieldLabel label="시간 구간 설정" subtitle="양 끝까지 밀면 하루 종일" />
      <View className="px-1 py-3">
        <DualRangeSlider
          min={0}
          max={HOUR_MAX}
          step={HOUR_STEP}
          low={hhmmToHourValue(value.timeWindowStart)}
          high={hhmmToHourValue(value.timeWindowEnd)}
          onChange={(low, high) =>
            onChange({
              ...value,
              timeWindowStart: hourValueToHHMM(low),
              timeWindowEnd: hourValueToHHMM(high),
            })
          }
          formatEdgeLabel={formatHourEdgeLabel}
          formatHandleLabel={formatHourValueLabel}
        />
      </View>

      <SheetFieldLabel label="구간별 입구·출구 개폐" />
      <CountRangeRuleTable value={value} onChange={onChange} />
    </View>
  );
}

const COUNT_RANGE_ROWS: Array<{
  key: "within" | "above";
  label: (value: BeeCountControlConfig) => string;
}> = [
  {
    key: "within",
    label: (value) => `${formatCountLabel(value.low)}~${formatCountLabel(value.high)}마리`,
  },
  { key: "above", label: (value) => `${formatCountLabel(value.high)}마리 이상` },
];

function CountRangeRuleTable({
  value,
  onChange,
}: {
  value: BeeCountControlConfig;
  onChange: (value: BeeCountControlConfig) => void;
}) {
  const toggle = (key: "within" | "above", field: keyof GateOpenState) => {
    const current = value[key];
    onChange({ ...value, [key]: { ...current, [field]: !current[field] } });
  };

  return (
    <View>
      <View className="flex-row px-1 py-1.5">
        <PretendardFont weight="bold" style={{ flex: 1.3, fontSize: 12, color: C.textAlt }}>
          구간
        </PretendardFont>
        <PretendardFont weight="bold" style={{ flex: 1, fontSize: 12, color: C.textAlt, textAlign: "center" }}>
          입구 열림
        </PretendardFont>
        <PretendardFont weight="bold" style={{ flex: 1, fontSize: 12, color: C.textAlt, textAlign: "center" }}>
          출구 열림
        </PretendardFont>
      </View>

      {COUNT_RANGE_ROWS.map((row, index) => {
        const state = value[row.key];
        return (
          <View
            key={row.key}
            className="flex-row items-center px-1 py-2"
            style={{
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: C.border,
            }}
          >
            <PretendardFont weight="bold" style={{ flex: 1.3, fontSize: 13, color: C.text }}>
              {row.label(value)}
            </PretendardFont>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Switch
                value={state.entranceOpen}
                onValueChange={() => toggle(row.key, "entranceOpen")}
                trackColor={{ false: C.border, true: C.gatePrimary }}
                thumbColor={C.white}
              />
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Switch
                value={state.exitOpen}
                onValueChange={() => toggle(row.key, "exitOpen")}
                trackColor={{ false: C.border, true: C.gatePrimary }}
                thumbColor={C.white}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** 요일별 반복 선택. 아무 요일도 안 고르면 "단발성"(한 번만 적용)이 됩니다. */
function RepeatDaysPicker({
  days,
  onChange,
}: {
  days: RepeatDays;
  onChange: (days: RepeatDays) => void;
}) {
  return (
    <View className="flex-row justify-between">
      {DAY_OPTIONS.map((option) => {
        const selected = days[option.key];
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange({ ...days, [option.key]: !selected })}
            className="items-center justify-center rounded-full active:opacity-70"
            style={{
              width: 36,
              height: 36,
              backgroundColor: selected ? C.gatePrimary : FORM_PANEL_BG,
            }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 13, color: selected ? C.white : C.sec }}>
              {option.label}
            </PretendardFont>
          </Pressable>
        );
      })}
    </View>
  );
}

/** NFC 카드 추가 모달 안에서만 쓰는 border 없는 폼 라벨입니다. subtitle은 별도 줄이 아니라 타이틀 옆에 붙습니다. */
function SheetFieldLabel({
  label,
  subtitle,
  noTopMargin,
}: {
  label: string;
  subtitle?: string;
  noTopMargin?: boolean;
}) {
  return (
    <View className={`mb-2 ${noTopMargin ? "mt-0" : "mt-3"} flex-row items-baseline`} style={{ gap: 6 }}>
      <PretendardFont weight="bold" style={{ fontSize: 16.5, color: C.text }}>
        {label}
      </PretendardFont>
      {subtitle ? (
        <PretendardFont weight="medium" style={{ fontSize: 12.5, color: C.ter, flexShrink: 1 }}>
          {subtitle}
        </PretendardFont>
      ) : null}
    </View>
  );
}

/** 여닫기처럼 시작~종료 두 시각을 핸들 2개짜리 슬라이더로 고르는 필드입니다. */
function TimeRangeSliderField({
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
  return (
    <View className="px-1 py-3">
      <DualRangeSlider
        min={0}
        max={HOUR_MAX}
        step={HOUR_STEP}
        low={dateToHourValue(startValue)}
        high={dateToHourValue(endValue)}
        onChange={(low, high) => {
          onStartChange(hourValueToDate(low));
          onEndChange(hourValueToDate(high));
        }}
        minGap={1}
        formatEdgeLabel={formatHourEdgeLabel}
        formatHandleLabel={formatHourValueLabel}
      />
    </View>
  );
}

/**
 * 열기/닫기 예약처럼 시각 하나만 고르는 필드입니다. 핸들 1개짜리 슬라이더로,
 * 그 시각을 기준으로 "이후가 열림"(열기 예약) 또는 "이전이 열림"(닫기 예약)을 색으로 보여줍니다.
 */
function TimeSingleSliderField({
  value,
  onChange,
  activeSide,
}: {
  value: Date;
  onChange: (value: Date) => void;
  activeSide: "before" | "after";
}) {
  return (
    <View className="px-1 py-3">
      <SingleRangeSlider
        min={0}
        max={HOUR_MAX}
        step={HOUR_STEP}
        value={dateToHourValue(value)}
        onChange={(next) => onChange(hourValueToDate(next))}
        activeSide={activeSide}
        formatEdgeLabel={formatHourEdgeLabel}
        formatHandleLabel={formatHourValueLabel}
      />
    </View>
  );
}

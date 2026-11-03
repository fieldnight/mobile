import { Feather } from "@expo/vector-icons";

export type NfcDoorFunction =
  | "open_at"
  | "close_at"
  | "window"
  | "alternate_24h"
  | "count_control";
export type NfcDoorMode =
  | "open_now"
  | "close_now"
  | "open_at"
  | "close_at"
  | "alternate_24h"
  | "window"
  | "lock_days"
  | "count_status"
  | "count_control";

/** 요일 반복 설정. 전부 false면 "단발성"(한 번만 적용)을 뜻합니다. */
export interface RepeatDays {
  sun: boolean;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
}

export const NO_REPEAT_DAYS: RepeatDays = {
  sun: false,
  mon: false,
  tue: false,
  wed: false,
  thu: false,
  fri: false,
  sat: false,
};

export function isRepeatDaysEmpty(days: RepeatDays) {
  return !Object.values(days).some(Boolean);
}

/** 마릿수 구간 하나(사이/이상)에서 입구·출구를 열지 여부. */
export interface GateOpenState {
  entranceOpen: boolean;
  exitOpen: boolean;
}

/**
 * 벌 마릿수 제어 카드의 설정. "현재 활동중인 벌 마릿수"(출구로 나간 수 - 입구로 들어온 수,
 * 즉 밖에 나가있는 벌 수)를 기준으로 low~high 사이 / high 이상, 2개 구간으로
 * 나눠 각 구간마다 입구·출구를 열지 닫을지를 개별적으로 정합니다.
 * 요일(repeatDays)과 시간 구간(timeWindowStart~timeWindowEnd)을 함께 지정하면, 그 요일의
 * 그 시간대에만 마릿수 규칙을 감시합니다. timeWindowStart가 "00:00"이고 timeWindowEnd가
 * "24:00"이면(슬라이더 양 끝) 하루 종일 감시하는 것과 같습니다 — 별도 on/off 스위치 없이
 * 슬라이더 핸들을 끝까지 밀면 자연스럽게 하루 종일이 되는 방식입니다.
 */
export interface BeeCountControlConfig {
  low: number;
  high: number;
  within: GateOpenState;
  above: GateOpenState;
  repeatDays: RepeatDays;
  timeWindowStart: string;
  timeWindowEnd: string;
}

/** timeWindowStart~timeWindowEnd가 슬라이더 전체 범위(00:00~24:00)를 덮는지, 즉 "하루 종일"인지. */
export function isTimeWindowAllDay(config: Pick<BeeCountControlConfig, "timeWindowStart" | "timeWindowEnd">) {
  return config.timeWindowStart === "00:00" && config.timeWindowEnd === "24:00";
}

export function isCountControlMode(mode: NfcDoorMode): mode is "count_control" {
  return mode === "count_control";
}

export interface NfcDoorCardConfig {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  removable?: boolean;
  functionType?: NfcDoorFunction;
  mode: NfcDoorMode;
  start?: string;
  end?: string;
  /** After a window ends, keep only the return passage open when requested. */
  endAction?: "exit_only";
  detail?: string;
  repeat?: boolean;
  countControl?: BeeCountControlConfig;
  serverActionId?: number;
  /** 카드 추가 때 사용자가 직접 적어둔 한 줄 메모. */
  memo?: string;
  /** 온라인 모드에서 이 카드가 저장된 서버 카드 ID(PR #195 기준 사용자 소유 공용 카드). */
  serverCardId?: number;
}

export const DEFAULT_NFC_DOOR_CARDS: NfcDoorCardConfig[] = [
  {
    id: "door-open",
    title: "ON",
    description: "",
    detail: "개폐기를 즉시 열어야 할 때 쓰는 기본 카드예요.",
    icon: "unlock",
    mode: "open_now",
    start: "",
    end: "",
  },
  {
    id: "door-close",
    title: "OFF",
    description: "",
    detail: "방제, 휴식, 야간 차단처럼 문을 닫아야 할 때 사용해요.",
    icon: "lock",
    mode: "close_now",
    start: "",
    end: "",
  },
  {
    id: "bee-count-status",
    title: "COUNT",
    description: "벌 출입 카운트를 확인해요.",
    detail: "일반 카드도 카운트를 함께 받아오지만, 이 카드는 설정 변경 없이 출입 카운트만 확인해요.",
    icon: "bar-chart-2",
    mode: "count_status",
    start: "",
    end: "",
    repeat: false,
  },
  {
    id: "pesticide",
    title: "농약방제",
    description: "카드를 대면 닫고 72시간 뒤 열어요",
    detail: "적용 즉시 입구와 회수구를 닫고 72시간 뒤 자동으로 열어요. 방제 일정에 맞춰 적용 시점을 확인해 주세요.",
    icon: "shield",
    mode: "lock_days",
    start: "3",
    end: "",
    repeat: false,
  },
  {
    id: "bloom-30",
    title: "개화 30% 이하",
    description: "09:00~14:00 모두 열고 이후 회수구만 열어요",
    detail: "매일 09:00에 입구와 회수구를 열고 14:00부터는 입구를 닫아 회수구만 열어요.",
    icon: "sun",
    mode: "window",
    start: "09:00",
    end: "14:00",
    endAction: "exit_only",
    repeat: true,
  },
  {
    id: "bloom-30-60",
    title: "개화 30~60%",
    description: "24시간 열고 다음 24시간 닫아요",
    detail: "적용 순간부터 24시간 동안 입구와 회수구를 열고, 다음 24시간은 모두 닫는 동작을 반복해요.",
    icon: "repeat",
    mode: "alternate_24h",
    start: "open_first",
    end: "",
    repeat: true,
  },
  {
    id: "bloom-60",
    title: "개화 60% 이상",
    description: "매일 08:00~18:00 열고 이후 닫아요",
    detail: "매일 08:00에 입구와 회수구를 열고 18:00에 모두 닫는 카드예요.",
    icon: "sun",
    mode: "window",
    start: "08:00",
    end: "18:00",
    repeat: true,
  },
];

function describeGateOpenState(state: GateOpenState) {
  if (state.entranceOpen && state.exitOpen) return "입구·출구 모두 열림";
  if (state.entranceOpen) return "입구만 열림";
  if (state.exitOpen) return "출구만 열림";
  return "입구·출구 모두 닫힘";
}

function describeRepeatDays(days: RepeatDays) {
  if (isRepeatDaysEmpty(days)) return "단발성";
  const labels: Array<[keyof RepeatDays, string]> = [
    ["sun", "일"],
    ["mon", "월"],
    ["tue", "화"],
    ["wed", "수"],
    ["thu", "목"],
    ["fri", "금"],
    ["sat", "토"],
  ];
  const active = labels.filter(([key]) => days[key]).map(([, label]) => label);
  return active.length === 7 ? "매일 반복" : `${active.join("")} 반복`;
}

export function createCustomDoorCard({
  title,
  functionType,
  detail,
  repeat,
  start,
  end,
  countControl,
  memo,
}: {
  title: string;
  functionType: NfcDoorFunction;
  detail: string;
  repeat: boolean;
  start: string;
  end: string;
  countControl?: BeeCountControlConfig;
  memo?: string;
}): NfcDoorCardConfig {
  if (functionType === "count_control" && countControl) {
    const { low, high, timeWindowStart, timeWindowEnd } = countControl;
    const timeWindowText = isTimeWindowAllDay(countControl)
      ? ""
      : ` · ${timeWindowStart}~${timeWindowEnd}`;
    return {
      id: `custom-door-card-${Date.now()}`,
      title,
      description: `현재 활동중인 벌 마릿수 · ${low}~${high}마리 구간 · ${describeRepeatDays(countControl.repeatDays)}${timeWindowText}`,
      icon: "sliders",
      removable: true,
      functionType,
      mode: "count_control",
      start: "",
      end: `${low}-${high}`,
      detail,
      repeat: !isRepeatDaysEmpty(countControl.repeatDays),
      countControl,
      memo,
    };
  }

  const normalizedStart =
    functionType === "close_at"
      ? ""
      : functionType === "alternate_24h"
        ? "close_first"
        : start;
  const normalizedEnd =
    functionType === "open_at" || functionType === "alternate_24h" ? "" : end;

  const functionLabel = {
    open_at: "열기 예약",
    close_at: "닫기 예약",
    window: "시간대 운영",
    alternate_24h: "24시간 교대",
  }[functionType as "open_at" | "close_at" | "window" | "alternate_24h"];

  return {
    id: `custom-door-card-${Date.now()}`,
    title,
    description: `${functionLabel} · ${detail} · ${repeat ? "반복" : "한 번"}`,
    icon:
      functionType === "open_at"
        ? "unlock"
        : functionType === "close_at"
          ? "lock"
          : "repeat",
    removable: true,
    functionType,
    mode: functionType,
    start: normalizedStart,
    end: normalizedEnd,
    detail,
    repeat,
    memo,
  };
}

function sameRepeatDays(a: RepeatDays, b: RepeatDays) {
  return (
    a.sun === b.sun &&
    a.mon === b.mon &&
    a.tue === b.tue &&
    a.wed === b.wed &&
    a.thu === b.thu &&
    a.fri === b.fri &&
    a.sat === b.sat
  );
}

function sameGateOpenState(a: GateOpenState, b: GateOpenState) {
  return a.entranceOpen === b.entranceOpen && a.exitOpen === b.exitOpen;
}

function sameCountControl(a?: BeeCountControlConfig, b?: BeeCountControlConfig) {
  if (!a || !b) return a === b;
  return (
    a.low === b.low &&
    a.high === b.high &&
    a.timeWindowStart === b.timeWindowStart &&
    a.timeWindowEnd === b.timeWindowEnd &&
    sameRepeatDays(a.repeatDays, b.repeatDays) &&
    sameGateOpenState(a.within, b.within) &&
    sameGateOpenState(a.above, b.above)
  );
}

/**
 * 두 카드의 "설정값"(메모·제목 제외)이 완전히 같은지 비교합니다.
 * 카드 추가 시 이미 동일한 설정의 카드가 있으면 중복 추가를 막는 데 씁니다.
 */
export function isSameCardSettings(a: NfcDoorCardConfig, b: NfcDoorCardConfig) {
  if (a.mode !== b.mode) return false;
  if (a.mode === "count_control") {
    return sameCountControl(a.countControl, b.countControl);
  }
  return (
    a.functionType === b.functionType &&
    (a.start ?? "") === (b.start ?? "") &&
    (a.end ?? "") === (b.end ?? "") &&
    Boolean(a.repeat) === Boolean(b.repeat)
  );
}

export { describeGateOpenState, describeRepeatDays };

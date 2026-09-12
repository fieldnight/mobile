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
  detail?: string;
  repeat?: boolean;
  countControl?: BeeCountControlConfig;
  serverActionId?: number;
  /** 카드 추가 때 사용자가 직접 적어둔 한 줄 메모. */
  memo?: string;
}

export const DEFAULT_NFC_DOOR_CARDS: NfcDoorCardConfig[] = [
  {
    id: "door-open",
    title: "ON",
    description: "개폐기를 바로 열어요",
    detail: "개폐기를 즉시 열어야 할 때 쓰는 기본 카드예요.",
    icon: "unlock",
    mode: "open_now",
    start: "",
    end: "",
  },
  {
    id: "door-close",
    title: "OFF",
    description: "개폐기를 바로 닫아요",
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
    description: "방제 후 3일간 문을 닫아요",
    detail:
      "전체 작물의 살충제(약제) 방제 후에는 벌통 문을 닫고 약 3일 정도 운영하는 것을 권장해요.",
    icon: "shield",
    mode: "lock_days",
    start: "3",
    end: "",
    repeat: false,
  },
  {
    id: "bloom-30",
    title: "개화 30% 이하",
    description: "오전에만 열고 오후에는 회수구만 열어요",
    detail:
      "딸기 과수정은 개화율에 맞춰 출입구 시간을 조절해요. 개화가 30% 이하라면 오전에만 출입구를 열고, 오후에는 회수구만 열어 운영해요.",
    icon: "sun",
    mode: "window",
    start: "09:00",
    end: "14:00",
    repeat: true,
  },
  {
    id: "bloom-30-60",
    title: "개화 30~60%",
    description: "하루 열고 다음날 닫는 격일 운영이에요",
    detail:
      "개화가 30~60%라면 매일 오전부터 오후 2시까지 열거나, 하루 열고 다음날 닫는 퐁당퐁당 운영을 많이 해요.",
    icon: "repeat",
    mode: "alternate_24h",
    start: "close_first",
    end: "",
    repeat: true,
  },
  {
    id: "bloom-60",
    title: "개화 60% 이상",
    description: "매일 열어두거나 유연하게 운영해요",
    detail:
      "개화가 60% 이상이면 매일 열어두는 분도 많고, 30~60%처럼 관리하는 분도 적지 않아요. 단동 기준이며, 연동은 과수정 우려 없이 매일 열어두는 편이에요.",
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

export { describeGateOpenState, describeRepeatDays };

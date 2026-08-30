import { Feather } from "@expo/vector-icons";

export type BeeTrafficCounterKey =
  | "entrance_in"
  | "entrance_out"
  | "exit_in"
  | "exit_out";
export type BeeCountLimitFunction =
  | "activity_boost"
  | "overpollination_guard"
  | "return_limit";
export type NfcDoorFunction =
  | "open_at"
  | "close_at"
  | "window"
  | "alternate_24h"
  | BeeCountLimitFunction;
export type NfcDoorMode =
  | "open_now"
  | "close_now"
  | "open_at"
  | "close_at"
  | "alternate_24h"
  | "window"
  | "lock_days"
  | "count_status"
  | BeeCountLimitFunction;

export const COUNT_TARGET_BY_LIMIT_FUNCTION: Record<
  BeeCountLimitFunction,
  BeeTrafficCounterKey
> = {
  activity_boost: "exit_out",
  overpollination_guard: "exit_out",
  return_limit: "entrance_in",
};

export function isBeeCountLimitFunction(
  value: NfcDoorFunction,
): value is BeeCountLimitFunction {
  return value in COUNT_TARGET_BY_LIMIT_FUNCTION;
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
  threshold?: number;
  countTarget?: BeeTrafficCounterKey;
  /**
   * 벌 마릿수 제어 기능(활동량 강제증가 등)의 고급 옵션 — 이 시간 구간 동안만
   * 마릿수 제한 규칙을 적용합니다. 서버·개폐기(ESP32)는 아직 이 값을 받는 자리가
   * 없어 앱에만 로컬로 저장되며, 실제 개폐 동작에는 아직 반영되지 않습니다.
   */
  timeWindowEnabled?: boolean;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  serverActionId?: number;
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

export function createCustomDoorCard({
  title,
  functionType,
  detail,
  repeat,
  start,
  end,
  threshold,
  timeWindowEnabled,
  timeWindowStart,
  timeWindowEnd,
}: {
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
}): NfcDoorCardConfig {
  if (isBeeCountLimitFunction(functionType)) {
    const countTarget = COUNT_TARGET_BY_LIMIT_FUNCTION[functionType];
    const safeThreshold = Math.max(1, Math.floor(threshold ?? 50));
    const functionLabel = {
      activity_boost: "활동량 강제증가",
      overpollination_guard: "과수정 방지",
      return_limit: "귀소량 제한",
    }[functionType];
    const hasTimeWindow = Boolean(
      timeWindowEnabled && timeWindowStart && timeWindowEnd,
    );

    return {
      id: `custom-door-card-${Date.now()}`,
      title,
      description: hasTimeWindow
        ? `${functionLabel} · ${safeThreshold}마리 기준 · ${timeWindowStart}~${timeWindowEnd}`
        : `${functionLabel} · ${safeThreshold}마리 기준`,
      icon: "sliders",
      removable: true,
      functionType,
      mode: functionType,
      start: countTarget,
      end: String(safeThreshold),
      detail,
      repeat: false,
      threshold: safeThreshold,
      countTarget,
      timeWindowEnabled: hasTimeWindow,
      timeWindowStart: hasTimeWindow ? timeWindowStart : undefined,
      timeWindowEnd: hasTimeWindow ? timeWindowEnd : undefined,
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
  }[functionType];

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
  };
}

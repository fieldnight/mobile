import { Feather } from "@expo/vector-icons";

export type NfcDoorFunction = "on" | "off" | "cycle";
export type NfcDoorMode =
  | "open_now"
  | "close_now"
  | "alternate_days"
  | "window"
  | "lock_days";

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
    id: "pesticide",
    title: "농약방제",
    description: "방제 후 3일간 문을 닫아요",
    detail:
      "전체 작물의 살충제(약제) 방제 후에는 벌통 문을 닫고 약 3일 정도 운영하는 것을 권장해요.",
    icon: "shield",
    mode: "lock_days",
    start: "3",
    end: "",
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
  },
  {
    id: "bloom-30-60",
    title: "개화 30~60%",
    description: "하루 열고 다음날 닫는 격일 운영이에요",
    detail:
      "개화가 30~60%라면 매일 오전부터 오후 2시까지 열거나, 하루 열고 다음날 닫는 퐁당퐁당 운영을 많이 해요.",
    icon: "repeat",
    mode: "alternate_days",
    start: "close_first",
    end: "",
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
  },
];

export function createCustomDoorCard({
  title,
  functionType,
  detail,
  repeat,
  start,
  end,
}: {
  title: string;
  functionType: NfcDoorFunction;
  detail: string;
  repeat: boolean;
  start: string;
  end: string;
}): NfcDoorCardConfig {
  const functionLabel = {
    on: "ON 단일",
    off: "OFF 단일",
    cycle: "시간대 운영",
  }[functionType];

  return {
    id: `custom-door-card-${Date.now()}`,
    title,
    description: `${functionLabel} · ${detail}${repeat ? " · 반복" : ""}`,
    icon: functionType === "on" ? "unlock" : functionType === "off" ? "lock" : "repeat",
    removable: true,
    functionType,
    mode:
      functionType === "on"
        ? "open_now"
        : functionType === "off"
          ? "close_now"
          : "window",
    start: functionType === "off" ? "" : start,
    end: functionType === "on" ? "" : end,
    detail,
    repeat,
  };
}

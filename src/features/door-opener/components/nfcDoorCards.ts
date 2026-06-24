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
    icon: "unlock",
    mode: "open_now",
    start: "",
    end: "",
  },
  {
    id: "door-close",
    title: "OFF",
    description: "개폐기를 바로 닫아요",
    icon: "lock",
    mode: "close_now",
    start: "",
    end: "",
  },
  {
    id: "pesticide",
    title: "농약방제",
    description: "방제 후 3일간 문을 잠가요",
    icon: "shield",
    mode: "lock_days",
    start: "3",
    end: "",
  },
  {
    id: "morning-window",
    title: "오전개방",
    description: "오전 9시부터 오후 2시까지만 열어요",
    icon: "sun",
    mode: "window",
    start: "09:00",
    end: "14:00",
  },
  {
    id: "alternate-days",
    title: "격일운영",
    description: "하루 닫고 하루 열기를 반복해요",
    icon: "repeat",
    mode: "alternate_days",
    start: "close_first",
    end: "",
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

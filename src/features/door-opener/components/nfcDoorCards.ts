import { Feather } from "@expo/vector-icons";

export type NfcDoorFunction = "on" | "off" | "cycle";

export interface NfcDoorCardConfig {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  removable?: boolean;
  functionType?: NfcDoorFunction;
  detail?: string;
  repeat?: boolean;
}

export const DEFAULT_NFC_DOOR_CARDS: NfcDoorCardConfig[] = [
  {
    id: "door-open",
    title: "ON",
    description: "벌통문 열기",
    icon: "unlock",
  },
  {
    id: "door-close",
    title: "OFF",
    description: "벌통문 닫기",
    icon: "lock",
  },
  {
    id: "pesticide",
    title: "농약방제",
    description: "농약 살포 후 3일간 벌통문 닫기",
    icon: "shield",
  },
  {
    id: "pollination-guard-1",
    title: "과수정방지1",
    description: "오전 9시부터 오후 2시까지만 벌통문 열기",
    icon: "sun",
  },
  {
    id: "pollination-guard-2",
    title: "과수정방지2",
    description: "하루는 닫고 하루는 열기를 반복",
    icon: "repeat",
  },
];

export function createCustomDoorCard({
  title,
  functionType,
  detail,
  repeat,
}: {
  title: string;
  functionType: NfcDoorFunction;
  detail: string;
  repeat: boolean;
}): NfcDoorCardConfig {
  const functionLabel = {
    on: "ON 단일",
    off: "OFF 단일",
    cycle: "여닫기",
  }[functionType];

  return {
    id: `custom-door-card-${Date.now()}`,
    title,
    description: `${functionLabel} · ${detail}${repeat ? " · 반복" : ""}`,
    icon: functionType === "on" ? "unlock" : functionType === "off" ? "lock" : "repeat",
    removable: true,
    functionType,
    detail,
    repeat,
  };
}

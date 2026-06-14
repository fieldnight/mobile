import { Feather } from "@expo/vector-icons";
import { C } from "@/constants/hive-colors";

export interface ControlSetting {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  enabled: boolean;
}

export interface HiveData {
  id: string;
  name: string;
  status: "online" | "offline";
  temperature: number;
  humidity: number;
  externalTemperature?: number;
  externalHumidity?: number;
  weight: number;
  beeActivity: "high" | "medium" | "low";
  lastUpdate: string;
  location?: string;
  memo?: string;
  registeredAt?: string;
  replacedAt?: string;
}

export interface ActiveTag {
  label: string;
  color: string;
  bg: string;
}

export interface HiveControlState {
  controls: ControlSetting[];
  heaterOn: boolean;
  coolerOn: boolean;
  ventOn: boolean;
  circOn: boolean;
}

export function getDisabledState(controls: ControlSetting[]) {
  const heatingAuto =
    controls.find((c) => c.id === "heating")?.enabled ?? false;
  const humidityAuto =
    controls.find((c) => c.id === "humidity")?.enabled ?? false;
  const ventilationAuto =
    controls.find((c) => c.id === "ventilation")?.enabled ?? false;
  return {
    heaterDisabled: heatingAuto,
    coolerDisabled: heatingAuto,
    ventDisabled: humidityAuto || ventilationAuto,
    circDisabled: humidityAuto || ventilationAuto,
  };
}

const TAG_MAP: Record<string, string> = {
  heating: "온도유지",
  humidity: "습도조절",
  ventilation: "자동환기",
};

export function buildActiveTags(hc: HiveControlState): ActiveTag[] {
  const dis = getDisabledState(hc.controls);
  const tags: ActiveTag[] = [];
  hc.controls.forEach((c) => {
    if (c.enabled && TAG_MAP[c.id]) {
      tags.push({ label: TAG_MAP[c.id], color: C.primary, bg: C.primarySoft });
    }
  });
  if (hc.heaterOn && !dis.heaterDisabled)
    tags.push({ label: "히터", color: C.primary, bg: C.primarySoft });
  if (hc.coolerOn && !dis.coolerDisabled)
    tags.push({ label: "쿨러", color: C.primary, bg: C.primarySoft });
  if (hc.ventOn && !dis.ventDisabled)
    tags.push({ label: "환기팬", color: C.primary, bg: C.primarySoft });
  if (hc.circOn && !dis.circDisabled)
    tags.push({ label: "순환", color: C.primary, bg: C.primarySoft });
  return tags;
}

export const initialControls: ControlSetting[] = [
  {
    id: "heating",
    name: "온도 유지",
    description: "적정 온도(34~35°C) 자동 유지",
    icon: "thermometer",
    enabled: true,
  },
  {
    id: "humidity",
    name: "습도 조절",
    description: "적정 습도(50~70%) 자동 유지",
    icon: "droplet",
    enabled: false,
  },
  {
    id: "ventilation",
    name: "공기 시스템",
    description: "벌통 내부 공기 자동 조절",
    icon: "wind",
    enabled: true,
  },
];

export { C as BoxColor } from "@/constants/hive-colors";

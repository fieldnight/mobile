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
  macAddress: string;
  name: string;
  region: string;
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

export interface HiveFormInput {
  id?: string;
  macAddress: string;
  name: string;
  region: string;
  location: string;
  memo?: string;
  replacedAt?: string;
}

export function getDisabledState(controls: ControlSetting[]) {
  const heatingAuto =
    controls.find((control) => control.id === "heating")?.enabled ?? false;
  const humidityAuto =
    controls.find((control) => control.id === "humidity")?.enabled ?? false;
  const ventilationAuto =
    controls.find((control) => control.id === "ventilation")?.enabled ?? false;

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

export function buildActiveTags(hiveControl: HiveControlState): ActiveTag[] {
  const disabled = getDisabledState(hiveControl.controls);
  const tags: ActiveTag[] = [];

  hiveControl.controls.forEach((control) => {
    if (control.enabled && TAG_MAP[control.id]) {
      tags.push({ label: TAG_MAP[control.id], color: C.primary, bg: C.primarySoft });
    }
  });

  if (hiveControl.heaterOn && !disabled.heaterDisabled) {
    tags.push({ label: "히터", color: C.primary, bg: C.primarySoft });
  }
  if (hiveControl.coolerOn && !disabled.coolerDisabled) {
    tags.push({ label: "쿨러", color: C.primary, bg: C.primarySoft });
  }
  if (hiveControl.ventOn && !disabled.ventDisabled) {
    tags.push({ label: "환기팬", color: C.primary, bg: C.primarySoft });
  }
  if (hiveControl.circOn && !disabled.circDisabled) {
    tags.push({ label: "순환", color: C.primary, bg: C.primarySoft });
  }

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
    name: "환기 시스템",
    description: "벌통 내부 환기 자동 조절",
    icon: "wind",
    enabled: true,
  },
];

export { C as BoxColor } from "@/constants/hive-colors";

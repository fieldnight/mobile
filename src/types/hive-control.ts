import { Feather } from "@expo/vector-icons";

interface ControlSetting {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  enabled: boolean;
}
export const initialControls: ControlSetting[] = [
  {
    id: "ventilation",
    name: "환기 시스템",
    description: "벌통 내부 환기 자동 조절",
    icon: "wind",
    enabled: true,
  },
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
    id: "alert",
    name: "이상 알림",
    description: "비정상 상태 감지 시 알림",
    icon: "bell",
    enabled: true,
  },
];

export const BoxColor = {
  primary: "#3182F6",
  bg: "#F4F5F7",
  white: "#FFFFFF",
  text: "#191F28",
  sec: "#8B95A1",
  ter: "#B0B8C1",
  border: "#E5E8EB",
  success: "#00C853",
  warning: "#FF9100",
  error: "#F44336",
};

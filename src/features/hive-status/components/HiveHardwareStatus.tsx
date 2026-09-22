import { View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { HiveData } from "@/types/hive-control";

const numberLabel = (value: number | null | undefined, unit: string) =>
  value == null ? "미수신" : `${value}${unit}`;
const sensorLabel = (valid: boolean | null | undefined) =>
  valid == null ? "미수신" : valid ? "정상" : "점검 필요";

export function HiveHardwareStatus({ hive }: { hive?: HiveData }) {
  const data = hive?.telemetry;
  if (!data) return null;
  const rows = [
    ["펠티어 상태", data.peltierMode ?? "미수신"],
    ["목표 온도", numberLabel(data.targetTemperature, "°C")],
    ["펠티어 출력", numberLabel(data.peltierDutyPct, "%")],
    ["팬 상태", data.fanState ?? "미수신"],
    ["고온측 / 저온측 팬", `${numberLabel(data.fanHotDutyPct, "%")} / ${numberLabel(data.fanColdDutyPct, "%")}`],
    ["냉각 / 가열 전류", `${numberLabel(data.peltierCoolCurrentA, "A")} / ${numberLabel(data.peltierHeatCurrentA, "A")}`],
    ["내부 / 외부 센서", `${sensorLabel(data.internalSensorValid)} / ${sensorLabel(data.externalSensorValid)}`],
    ["CO₂", numberLabel(data.co2, " ppm")],
  ];
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
        최근 수신 장치 상태 · {hive.lastUpdate}
      </PretendardFont>
      {rows.map(([label, value]) => (
        <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <PretendardFont style={{ fontSize: 12, color: C.sec }}>{label}</PretendardFont>
          <PretendardFont style={{ fontSize: 12, color: C.text, flexShrink: 1 }}>{value}</PretendardFont>
        </View>
      ))}
      {data.hwIssue ? (
        <PretendardFont accessibilityLiveRegion="polite" style={{ fontSize: 12, color: C.error }}>
          장치 점검 · {data.hwIssue}{data.hwIssueTimestamp ? ` · ${data.hwIssueTimestamp === "UNSYNCED_BOOT" ? "기기 시간 동기화 전" : data.hwIssueTimestamp}` : ""}
        </PretendardFont>
      ) : null}
    </View>
  );
}

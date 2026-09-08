import { View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { HiveTelemetryHourRecord } from "../hooks/useHiveTelemetryHourData";

const TABLE_COLS: Array<{
  key: keyof Omit<HiveTelemetryHourRecord, "label">;
  label: string;
  unit: string;
  format: (value: number) => string;
}> = [
  {
    key: "internalTemperature",
    label: "내부 온도",
    unit: "°C",
    format: (value) => value.toFixed(1),
  },
  {
    key: "externalTemperature",
    label: "외부 온도",
    unit: "°C",
    format: (value) => value.toFixed(1),
  },
  {
    key: "internalHumidity",
    label: "내부 습도",
    unit: "%",
    format: (value) => value.toFixed(0),
  },
  {
    key: "externalHumidity",
    label: "외부 습도",
    unit: "%",
    format: (value) => value.toFixed(0),
  },
];

interface LiveTelemetryTableProps {
  records: HiveTelemetryHourRecord[];
}

export function LiveTelemetryTable({ records }: LiveTelemetryTableProps) {
  if (records.length === 0) {
    return (
      <View className="items-center py-10">
        <PretendardFont weight="medium" style={{ fontSize: 14, color: C.sec }}>
          아직 표시할 데이터가 없어요
        </PretendardFont>
      </View>
    );
  }

  return (
    <View>
      <View
        className="mb-1 flex-row pb-3"
        style={{ borderBottomWidth: 2, borderBottomColor: C.border }}
      >
        <View className="w-[64px] pl-1">
          <PretendardFont weight="bold" style={{ fontSize: 13, color: "#191F28" }}>
            시각
          </PretendardFont>
        </View>
        {TABLE_COLS.map((col) => (
          <View key={col.key} className="flex-1 items-center">
            <PretendardFont
              weight="bold"
              style={{ fontSize: 12, color: C.text, textAlign: "center" }}
              numberOfLines={2}
            >
              {col.label}
            </PretendardFont>
            <PretendardFont style={{ fontSize: 11, color: C.sec, marginTop: 2 }}>
              {col.unit}
            </PretendardFont>
          </View>
        ))}
      </View>

      {[...records].reverse().map((record, index) => (
        <View
          key={`${record.label}-${index}`}
          className="flex-row"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            backgroundColor: index % 2 === 0 ? C.bgAlt : C.white,
            paddingVertical: 10,
          }}
        >
          <View className="w-[64px] justify-center pl-1">
            <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.text }}>
              {record.label}
            </PretendardFont>
          </View>
          {TABLE_COLS.map((col) => {
            const value = record[col.key];
            return (
              <View key={col.key} className="flex-1 items-center justify-center">
                <PretendardFont weight="medium" style={{ fontSize: 13, color: C.text }}>
                  {value == null ? "-" : col.format(value)}
                </PretendardFont>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

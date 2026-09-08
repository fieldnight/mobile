import { View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { HiveTelemetryLogRecord } from "../model/telemetryLog";

const TABLE_COLS: Array<{
  key: keyof Omit<HiveTelemetryLogRecord, "recordedAt">;
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

function formatTimeLabel(recordedAt: string) {
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) return recordedAt;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

interface LiveTelemetryTableProps {
  records: HiveTelemetryLogRecord[];
}

export function LiveTelemetryTable({ records }: LiveTelemetryTableProps) {
  if (records.length === 0) {
    return (
      <View className="items-center py-10">
        <PretendardFont weight="medium" style={{ fontSize: 14, color: C.sec }}>
          아직 표시할 실시간 데이터가 없어요
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
        <View className="w-[92px] pl-1">
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

      {records.map((record, index) => (
        <View
          key={`${record.recordedAt}-${index}`}
          className="flex-row"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            backgroundColor: index % 2 === 0 ? C.bgAlt : C.white,
            paddingVertical: 10,
          }}
        >
          <View className="w-[92px] justify-center pl-1">
            <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.text }}>
              {formatTimeLabel(record.recordedAt)}
            </PretendardFont>
          </View>
          {TABLE_COLS.map((col) => (
            <View key={col.key} className="flex-1 items-center justify-center">
              <PretendardFont weight="medium" style={{ fontSize: 13, color: C.text }}>
                {col.format(record[col.key])}
              </PretendardFont>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

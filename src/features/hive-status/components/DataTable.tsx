import { View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import type { DataPoint, HiveSensorDataKey, Period } from "@/types";
import { C } from "@/constants/hive-colors";

const TABLE_COLS: Array<{
  key: HiveSensorDataKey;
  label: string;
  unit: string;
  color: string;
  format: (value: number) => string;
}> = [
  {
    key: "internalTemperature",
    label: "내부 온도",
    unit: "°C",
    color: C.text,
    format: (value) => value.toFixed(1),
  },
  {
    key: "externalTemperature",
    label: "외부 온도",
    unit: "°C",
    color: C.text,
    format: (value) => value.toFixed(1),
  },
  {
    key: "internalHumidity",
    label: "내부 습도",
    unit: "%",
    color: C.text,
    format: (value) => String(value),
  },
  {
    key: "externalHumidity",
    label: "외부 습도",
    unit: "%",
    color: C.text,
    format: (value) => String(value),
  },
];

interface DataTableProps {
  data: DataPoint[];
  period: Period;
}

export function DataTable({ data, period }: DataTableProps) {
  const periodLabel =
    period === "일간" ? "시간" : period === "주간" ? "요일" : "주차";

  return (
    <View>
      <View
        className="mb-1 flex-row pb-3"
        style={{ borderBottomWidth: 2, borderBottomColor: C.border }}
      >
        <View className="w-[68px] pl-1">
          <PretendardFont
            weight="bold"
            style={{ fontSize: 14, color: "#191F28" }}
          >
            {periodLabel}
          </PretendardFont>
        </View>
        {TABLE_COLS.map((col) => (
          <View key={col.key} className="flex-1 items-center">
            <PretendardFont
              weight="bold"
              style={{ fontSize: 12, color: col.color, textAlign: "center" }}
              numberOfLines={2}
            >
              {col.label}
            </PretendardFont>
            <PretendardFont
              style={{ fontSize: 11, color: C.sec, marginTop: 2 }}
            >
              {col.unit}
            </PretendardFont>
          </View>
        ))}
      </View>

      {data.map((point, index) => (
        <View
          key={`${point.label}-${index}`}
          className="flex-row"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            backgroundColor: index % 2 === 0 ? C.bgAlt : C.white,
            paddingVertical: 10,
          }}
        >
          <View className="w-[68px] justify-center pl-1">
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 14, color: C.text }}
            >
              {point.label}
            </PretendardFont>
          </View>
          {TABLE_COLS.map((col) => (
            <View key={col.key} className="flex-1 items-center justify-center">
              <PretendardFont
                weight="medium"
                style={{ fontSize: 13, color: C.text }}
              >
                {point.hasData !== false &&
                typeof point[col.key] === "number" &&
                Number.isFinite(point[col.key])
                  ? col.format(point[col.key] as number)
                  : "-"}
              </PretendardFont>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

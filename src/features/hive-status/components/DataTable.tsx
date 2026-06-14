import { View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import type { DataPoint, Period } from "@/types";
import { C } from "@/constants/hive-colors";

const TABLE_COLS = [
  {
    key: "temp" as const,
    label: "온도",
    unit: "°C",
    color: C.text,
    format: (v: number) => v.toFixed(1),
  },
  {
    key: "humidity" as const,
    label: "습도",
    unit: "%",
    color: C.text,
    format: (v: number) => String(v),
  },
  {
    key: "methane" as const,
    label: "메탄",
    unit: "ppm",
    color: C.ter,
    format: (v: number) => v.toFixed(1),
  },
  {
    key: "co2" as const,
    label: "CO₂",
    unit: "ppm",
    color: C.ter,
    format: (v: number) => String(v),
  },
] as const;

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
        className="flex-row pb-3 mb-1"
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
              style={{ fontSize: 14, color: col.color }}
            >
              {col.label}
            </PretendardFont>
            <PretendardFont
              style={{ fontSize: 12, color: C.sec, marginTop: 2 }}
            >
              {col.unit}
            </PretendardFont>
          </View>
        ))}
      </View>

      {data.map((point, index) => (
        <View
          key={index}
          className="flex-row"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            backgroundColor: index % 2 === 0 ? C.bgAlt : C.white,
            paddingVertical: 10,
          }}
        >
          <View className="w-[68px] pl-1 justify-center">
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
                style={{ fontSize: 14, color: C.text }}
              >
                {col.format(point[col.key] as number)}
              </PretendardFont>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

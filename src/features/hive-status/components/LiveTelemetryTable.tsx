import { memo, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { HiveTelemetryHourRecord } from "../hooks/useHiveTelemetryHourData";
import { DataTable } from "./DataTable";

interface LiveTelemetryTableProps {
  records: HiveTelemetryHourRecord[];
}

// 같은 기록이면 다시 그리지 않아, 조회 조건 버튼을 눌러도 표 때문에 반응이 늦어지지 않습니다.
export const LiveTelemetryTable = memo(function LiveTelemetryTable({ records }: LiveTelemetryTableProps) {
  const { height } = useWindowDimensions();
  const newestFirst = useMemo(() => toNewestFirst(records), [records]);

  if (newestFirst.length === 0) {
    return (
      <View className="items-center py-10">
        <PretendardFont weight="medium" style={{ fontSize: 14, color: C.sec }}>
          이 시간대에 받은 기록이 없어요
        </PretendardFont>
      </View>
    );
  }

  // 가장 최근 기록이 맨 위입니다. 표 위 안내 문구 없이 기록만 촘촘히 보여줍니다.
  return <DataTable data={newestFirst} period="일간" stickyHeaderMaxHeight={Math.round(height * 0.6)} />;
});

/**
 * 시간순으로 정렬한 뒤, 아직 오지 않은 뒤쪽 빈 구간(현재 시간대의 미래 칸)을 잘라내고 최신순으로 뒤집습니다.
 * 중간에 비어 있는 구간은 누락으로 보여야 하므로 남겨둡니다.
 */
function toNewestFirst(records: HiveTelemetryHourRecord[]) {
  const sorted = [...records].sort((a, b) => a.label.localeCompare(b.label));
  let end = sorted.length;
  while (end > 0 && !sorted[end - 1].hasData) end -= 1;
  return sorted.slice(0, end).reverse();
}

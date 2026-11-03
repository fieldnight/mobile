import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { useHiveTelemetryData } from "@/features/hive-status";
import type { DataPoint } from "@/types";
import { R, T } from "../theme";
import { TemperatureSummary } from "./TemperatureSummary";
import { TodayTemperatureChart } from "./TodayTemperatureChart";

const EMPTY: DataPoint[] = [];

/**
 * 스마트벌통 화면의 오늘 리포트 카드
 * - 리포트 화면 일간 요약과 같은 TemperatureSummary의 유지 비율과 평균·최저·최고 사이에 내부·지역 기온 비교 그래프를 둡니다.
 * - 누르면 그 벌통의 리포트(손가락으로 읽는 자세한 그래프)로 이동합니다.
 */
export function ReportPanel({ hiveId, onOpen }: { hiveId: string; onOpen: () => void }) {
  const query = useHiveTelemetryData({ hiveId, period: "일간", fallbackData: EMPTY });

  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel="오늘의 벌통 리포트, 자세히 보기"
      onPress={onOpen}
      className="p-5"
      style={({ pressed }) => ({ backgroundColor: pressed ? "#FAFBFC" : T.panel, borderRadius: R.panel })}
    >
      <View className="flex-row items-center justify-between">
        <PretendardFont weight="bold" style={{ fontSize: 16, color: T.ink }}>오늘의 벌통 리포트</PretendardFont>
        <View className="flex-row items-center gap-0.5">
          <PretendardFont weight="medium" style={{ fontSize: 13, color: T.inkSoft }}>그래프 보기</PretendardFont>
          <Feather name="chevron-right" size={16} color={T.inkSoft} />
        </View>
      </View>
      <TemperatureSummary data={query.data ?? EMPTY} periodLabel="오늘" loading={query.isLoading && query.isFetching}>
        <View className="mt-3">
          <TodayTemperatureChart data={query.data ?? EMPTY} loading={query.isLoading && query.isFetching} error={query.isError} />
        </View>
      </TemperatureSummary>
    </Tap>
  );
}

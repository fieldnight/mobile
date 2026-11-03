/**
 * 벌통 리포트 화면
 * - 위: 벌통 카드 줄로 벌통을 고릅니다.
 * - 요약: 기간을 고르면 내부 온도가 권장 구간에 머문 비율과 평균·최저·최고를 압축해 보여줍니다.
 *   스마트벌통 화면의 오늘 리포트 카드와 같은 TemperatureSummary라 그래프가 화면 위쪽에서 바로 보입니다.
 * - 기록: 비교 그래프 또는 표로 같은 기록을 봅니다. 표는 항목 이름 행이 위에 고정됩니다.
 * - 지역 날씨와 벌 교체 기록은 그 아래에 둡니다.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideFooterOnScroll } from "@/stores/useFooterVisibility";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { WeatherSection } from "@/components/hive/Hive-weather";
import {
  ChartCards,
  DataTable,
  HiveReplacementTable,
  useHiveTelemetryData,
  useMakeWeather,
  useWeatherRegion,
} from "@/features/hive-status";
import { VIEW_MODES } from "@/features/hive-status/constants";
import { useOrderedHives, useSyncHiveList } from "@/features/hive";
import { HiveCardRail, Panel, RiseIn, SectionHeader, Segmented, T, TemperatureSummary } from "@/features/hive-home";
import type { Period } from "@/types";

type ViewMode = (typeof VIEW_MODES)[number]["key"];

const PERIOD_OPTIONS = [
  { value: "일간", label: "일간" },
  { value: "주간", label: "주간" },
  { value: "월간", label: "월간" },
] as const satisfies readonly { value: Period; label: string }[];

const VIEW_OPTIONS = VIEW_MODES.map((mode) => ({ value: mode.key, label: mode.label }));

export default function HiveStatsScreen() {
  const insets = useSafeAreaInsets();
  // 아래로 스크롤하면 하단 탭바를 숨기고, 위로 당기면 다시 보여줍니다.
  const footerScroll = useHideFooterOnScroll();
  const { height } = useWindowDimensions();
  const { selectedHiveId } = useLocalSearchParams<{ selectedHiveId?: string }>();
  const hives = useOrderedHives();
  useSyncHiveList();

  const [period, setPeriod] = useState<Period>("일간");
  const [selectedHive, setSelectedHive] = useState<string>(selectedHiveId ?? hives[0]?.id ?? "");
  const [addHiveVisible, setAddHiveVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("combined");
  const [chartSession, setChartSession] = useState(0);
  const [chartInteracting, setChartInteracting] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);

  const { stn, regionName } = useWeatherRegion();
  const { todayWeather, weeklyWeather, loading, errorMsg } = useMakeWeather(stn);

  useEffect(() => {
    if (hives.length && !hives.some((hive) => hive.id === selectedHive)) setSelectedHive(hives[0].id);
  }, [hives, selectedHive]);

  const telemetryQuery = useHiveTelemetryData({ hiveId: selectedHive, period, fallbackData: [] });
  const statData = telemetryQuery.data ?? [];
  const hasHives = hives.length > 0;

  const changeViewMode = (mode: ViewMode) => {
    setChartInteracting(false);
    // 같은 보기를 다시 골라도 그래프를 현재 시점으로 맞춥니다.
    setChartSession((session) => session + 1);
    setViewMode(mode);
    if (mode !== "table") void telemetryQuery.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <HiveTabBar />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={footerScroll.onScroll}
        scrollEventThrottle={footerScroll.scrollEventThrottle}
        scrollEnabled={!chartInteracting}
        refreshControl={<RefreshControl refreshing={telemetryQuery.isRefetching} onRefresh={() => void telemetryQuery.refetch()} />}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 120, gap: 12 }}
      >
        <RiseIn index={0}>
          <HiveCardRail hives={hives} selectedId={selectedHive} onSelect={setSelectedHive} onAdd={() => setAddHiveVisible(true)} />
        </RiseIn>

        {hasHives ? (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <RiseIn index={1}>
            <Panel style={{ padding: 14 }}>
              <Segmented
                label="조회 기간"
                options={PERIOD_OPTIONS}
                value={period}
                onChange={(next) => {
                  setChartInteracting(false);
                  setPeriod(next);
                }}
              />
              <TemperatureSummary data={statData} periodLabel={period} loading={telemetryQuery.isLoading && telemetryQuery.isFetching} />
            </Panel>
            </RiseIn>

            <RiseIn index={2}>
            <Panel style={{ paddingHorizontal: 16 }}>
              <SectionHeader
                title="온습도 기록"
                right={<Segmented compact label="보기 방식" options={VIEW_OPTIONS} value={viewMode} onChange={changeViewMode} />}
              />

              {telemetryQuery.isError ? (
                <View accessibilityRole="alert" style={{ marginTop: 12, borderRadius: 12, padding: 12, backgroundColor: T.hotSoft }}>
                  <PretendardFont style={{ fontSize: 13, lineHeight: 19, color: T.hot }}>
                    기록을 불러오지 못했어요.{statData.length ? " 이전에 불러온 기록을 보여드려요." : " 아래로 당겨 다시 시도해 주세요."}
                  </PretendardFont>
                </View>
              ) : null}

              <View style={{ marginTop: 12 }}>
                {telemetryQuery.isLoading && telemetryQuery.isFetching ? (
                  <View style={{ alignItems: "center", paddingVertical: 48 }} accessibilityLiveRegion="polite">
                    <ActivityIndicator color={T.inkSoft} />
                    <PretendardFont style={{ marginTop: 12, color: T.muted, fontSize: 14 }}>기록을 불러오고 있어요</PretendardFont>
                  </View>
                ) : viewMode === "table" ? (
                  <DataTable data={statData} period={period} stickyHeaderMaxHeight={Math.round(height * 0.6)} />
                ) : (
                  <ChartCards
                    key={`${selectedHive}-${period}-${chartSession}`}
                    data={statData}
                    period={period}
                    viewMode="combined"
                    onInteractionChange={setChartInteracting}
                  />
                )}
              </View>

              <Tap
                onPress={() => setWeatherOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityState={{ expanded: weatherOpen }}
                style={({ pressed }) => ({
                  marginTop: 12,
                  minHeight: 48,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: T.line,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="cloud" size={16} color={T.inkSoft} />
                  <PretendardFont weight="medium" style={{ fontSize: 14, color: T.inkSoft }}>
                    {regionName ? `${regionName} 날씨 함께 보기` : "지역 날씨 함께 보기"}
                  </PretendardFont>
                </View>
                <Feather name={weatherOpen ? "chevron-up" : "chevron-down"} size={18} color={T.muted} />
              </Tap>
              {weatherOpen ? (
                <View style={{ borderRadius: 14, padding: 12, backgroundColor: T.key }}>
                  <WeatherSection
                    period={period}
                    stn={stn}
                    regionName={regionName}
                    loading={loading}
                    errorMsg={errorMsg}
                    todayWeather={todayWeather}
                    weeklyWeather={weeklyWeather}
                  />
                </View>
              ) : null}
            </Panel>
            </RiseIn>

            <RiseIn index={3}>
              <HiveReplacementTable hiveId={selectedHive} />
            </RiseIn>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <Panel style={{ alignItems: "center", paddingVertical: 36 }}>
              <PretendardFont weight="bold" style={{ fontSize: 17, color: T.ink }}>리포트를 볼 벌통이 없어요</PretendardFont>
              <PretendardFont style={{ marginTop: 6, fontSize: 14, color: T.inkSoft }}>벌통을 등록하면 기록이 여기에 쌓여요</PretendardFont>
            </Panel>
          </View>
        )}
      </ScrollView>

      <HiveAddSheet visible={addHiveVisible} onClose={() => setAddHiveVisible(false)} />
    </View>
  );
}

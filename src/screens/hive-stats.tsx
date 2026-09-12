/**
 * 벌통 통계 화면
 * - HiveSliderSection / PeriodCard / WeatherSection / ChartCards / DataTable / HiveEnvironmentGuide를 조합합니다.
 * - 기간(period), 선택된 벌통(selectedHive), 보기 모드(viewMode)를 로컬 상태로 관리합니다.
 * - useWeatherRegion/useMakeWeather로 날씨 데이터를 가져와 WeatherSection에 전달합니다.
 * - PullToRefresh 새로고침, 설정 이동, 슬라이더/보기 모드 전환 핸들러를 포함합니다.
 */

import { useState, useEffect, useRef } from "react";
import {
  Platform,
  ScrollView,
  useWindowDimensions,
  ImageBackground,
  ActivityIndicator,
  Pressable,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

const BG_IMAGE = require("../../assets/df.jpg");
import { BounceScrollView } from "@/components/refresh/BounceScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useScrollHeader } from "@/hooks";
import { Spacing } from "../constants";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import {
  HiveEnvironmentGuide,
  PeriodCard,
  ChartCards,
  DataTable,
  HiveReplacementTable,
} from "@/features/hive-status";
import { HiveSliderSection } from "@/components/hive/HiveSliderSection";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { WeatherSection } from "@/components/hive/Hive-weather";
import {
  useWeatherRegion,
  useMakeWeather,
  useHiveTelemetryData,
} from "@/features/hive-status";
import { useSyncHiveList } from "@/features/hive";
import { useHiveStore } from "@/stores/useHiveStore";
import type { Period } from "../types";

/**
 * HiveStatsScreen
 * - 벌통 통계 페이지의 메인 화면입니다.
 * - 상단에 벌통 슬라이더를 표시하고, 선택된 벌통의 통계 데이터를 보여줍니다.
 * - 기간 선택과 차트/표 조회를 관리합니다.
 */
export default function HiveStatsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sliderItemWidth = width - 32;
  const { selectedHiveId } = useLocalSearchParams<{ selectedHiveId?: string }>();
  const hives = useHiveStore((state) => state.hives);
  useSyncHiveList();

  const [period, setPeriod] = useState<Period>("일간");
  const [selectedHive, setSelectedHive] = useState<string>(
    selectedHiveId ?? hives[0]?.id ?? "",
  );
  const [addHiveVisible, setAddHiveVisible] = useState(false);
  const [viewMode, setViewMode] = useState<"chart" | "combined" | "table">(
    "combined",
  );
  const [chartSession, setChartSession] = useState(0);
  const [chartInteracting, setChartInteracting] = useState(false);
  const { onScroll, scrollEventThrottle } = useScrollHeader();

  const { stn, regionName } = useWeatherRegion();
  const { todayWeather, weeklyWeather, loading, errorMsg } =
    useMakeWeather(stn);

  const sliderRef = useRef<ScrollView | null>(null);
  const selectedIndex = Math.max(
    0,
    hives.findIndex((hive) => hive.id === selectedHive),
  );
  const hasHives = hives.length > 0;

  useEffect(() => {
    if (hives.length && !hives.some((hive) => hive.id === selectedHive)) {
      setSelectedHive(hives[0].id);
    }
  }, [hives, selectedHive]);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({
        x: selectedIndex * sliderItemWidth,
        animated: true,
      });
    }
  }, [selectedIndex, sliderItemWidth]);

  const telemetryQuery = useHiveTelemetryData({
    hiveId: selectedHive,
    period,
    fallbackData: [],
  });
  const statData = telemetryQuery.data ?? [];

  const isWeb = Platform.OS === "web";
  const haptic = () => {
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  //슬라이더에서 벌통을 선택했을 때 상태를 변경합니다.
  const handleHivePress = (id: string) => {
    haptic();
    setSelectedHive(id);
  };

  // 슬라이더 드래그가 끝났을 때 해당 인덱스 벌통을 선택합니다.
  const handleSlideEnd = (idx: number) => {
    const nextHive = hives[Math.max(0, Math.min(idx, hives.length - 1))];
    if (nextHive) {
      haptic();
      setSelectedHive(nextHive.id);
    }
  };

  // 차트 / 통합 / 표 보기 모드를 변경하고 햅틱을 트리거합니다.
  const handleViewModeChange = (mode: "chart" | "combined" | "table") => {
    setChartInteracting(false);
    // 같은 그래프 버튼을 다시 눌러도 현재 시점과 값으로 화면을 맞춥니다.
    setChartSession((session) => session + 1);
    setViewMode(mode);
    if (mode !== "table") void telemetryQuery.refetch();
  };

  return (
    <ImageBackground source={BG_IMAGE} resizeMode="cover" className="flex-1">
      <HiveTabBar />

      <BounceScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingTop: Spacing.sm,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!chartInteracting}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <HiveSliderSection
          hives={hives}
          allView={false}
          selectedIndex={selectedIndex}
          itemWidth={sliderItemWidth}
          sliderRef={sliderRef}
          onHivePress={handleHivePress}
          onSlideEnd={handleSlideEnd}
          onAddHive={() => setAddHiveVisible(true)}
        />

        {hasHives ? (
          <>
            <PeriodCard
              period={period}
              onSelect={(nextPeriod) => {
                setChartInteracting(false);
                setPeriod(nextPeriod);
              }}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              weatherContent={
                <WeatherSection
                  period={period}
                  stn={stn}
                  regionName={regionName}
                  loading={loading}
                  errorMsg={errorMsg}
                  todayWeather={todayWeather}
                  weeklyWeather={weeklyWeather}
                />
              }
            >
              <View className="mb-3 flex-row items-center justify-between gap-2">
                <View className="flex-1">
                  <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
                    {period === "일간" ? "오늘의 센서 기록" : `${period} 센서 기록`}
                  </PretendardFont>
                  <PretendardFont style={{ marginTop: 4, fontSize: 12, color: C.sec }}>
                    {period === "일간" ? "시간별 기록 · 최근 측정 구간부터 표시" : "선택한 기간의 측정 기록"}
                  </PretendardFont>
                </View>
                <Pressable
                  onPress={() => void telemetryQuery.refetch()}
                  accessibilityRole="button"
                  accessibilityLabel="센서 기록 새로고침"
                  accessibilityState={{ disabled: telemetryQuery.isFetching }}
                  disabled={telemetryQuery.isFetching}
                  style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
                >
                  {telemetryQuery.isFetching ? <ActivityIndicator color={C.primary} /> : <Feather name="refresh-cw" size={19} color={C.sec} />}
                </Pressable>
              </View>
              {telemetryQuery.isError && (
                <View accessibilityRole="alert" className="mb-3 rounded-xl p-3" style={{ backgroundColor: "#FFF4E5" }}>
                  <PretendardFont style={{ fontSize: 13, color: "#92400E" }}>
                    기록을 불러오지 못했어요. 새로고침해 주세요.{statData.length ? " 이전에 불러온 기록을 표시하고 있어요." : ""}
                  </PretendardFont>
                </View>
              )}
              {telemetryQuery.isLoading && telemetryQuery.isFetching ? (
                <View className="items-center py-10" accessibilityLiveRegion="polite">
                  <ActivityIndicator color={C.primary} />
                  <PretendardFont style={{ marginTop: 12, color: C.sec, fontSize: 14 }}>
                    센서 기록을 불러오고 있어요
                  </PretendardFont>
                </View>
              ) : viewMode === "table" ? (
                <DataTable data={statData} period={period} />
              ) : (
                <ChartCards
                  key={`${selectedHive}-${period}-${viewMode}-${chartSession}`}
                  data={statData}
                  period={period}
                  viewMode={viewMode}
                  onInteractionChange={setChartInteracting}
                />
              )}
            </PeriodCard>

            <HiveReplacementTable hiveId={selectedHive} />

            <HiveEnvironmentGuide />
          </>
        ) : null}
      </BounceScrollView>

      <HiveAddSheet
        visible={addHiveVisible}
        onClose={() => setAddHiveVisible(false)}
      />
    </ImageBackground>
  );
}

/**
 * 벌통 통계 화면
 * - HiveSliderSection / PeriodCard / WeatherSection / ChartCards / DataTable / HiveEnvironmentGuide를 조합합니다.
 * - 기간(period), 선택된 벌통(selectedHive), 보기 모드(viewMode)를 로컬 상태로 관리합니다.
 * - useWeatherRegion/useMakeWeather로 날씨 데이터를 가져와 WeatherSection에 전달합니다.
 * - PullToRefresh 새로고침, 설정 이동, 슬라이더/보기 모드 전환 핸들러를 포함합니다.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Platform,
  ScrollView,
  Dimensions,
  ImageBackground,
} from "react-native";

const BG_IMAGE = require("../../assets/df.jpg");
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRoute } from "@react-navigation/native";
import { useScrollHeader } from "@/hooks";
import { Spacing } from "../constants";
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
  getHivePeriodData,
} from "@/features/hive-status";
import { useHiveStore } from "@/stores/useHiveStore";
import type { Period } from "../types";

const SLIDER_ITEM_WIDTH = Dimensions.get("window").width - 32;

/**
 * HiveStatsScreen
 * - 벌통 통계 페이지의 메인 화면입니다.
 * - 상단에 벌통 슬라이더를 표시하고, 선택된 벌통의 통계 데이터를 보여줍니다.
 * - 기간 선택과 차트/표 조회를 관리합니다.
 */
export default function HiveStatsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const hives = useHiveStore((state) => state.hives);
  const hiveControls = useHiveStore((state) => state.hiveControls);

  const [period, setPeriod] = useState<Period>("일간");
  const [selectedHive, setSelectedHive] = useState<string>(
    route.params?.selectedHiveId ?? hives[0]?.id ?? "1",
  );
  const [viewMode, setViewMode] = useState<"chart" | "combined" | "table">(
    "chart",
  );
  const { onScroll, scrollEventThrottle } = useScrollHeader();

  const { stn, regionName } = useWeatherRegion();
  const { todayWeather, weeklyWeather, loading, errorMsg } =
    useMakeWeather(stn);

  const sliderRef = useRef<ScrollView | null>(null);
  const selectedIndex = Math.max(
    0,
    hives.findIndex((hive) => hive.id === selectedHive),
  );

  useEffect(() => {
    if (hives.length && !hives.some((hive) => hive.id === selectedHive)) {
      setSelectedHive(hives[0].id);
    }
  }, [hives, selectedHive]);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({
        x: selectedIndex * SLIDER_ITEM_WIDTH,
        animated: true,
      });
    }
  }, [selectedIndex]);

  const statData = getHivePeriodData(selectedHive, period);

  const isWeb = Platform.OS === "web";
  const haptic = () => {
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // PullToRefresh 컴포넌트 새로고침 처리. 데이터 API 연결 전 테스트용 0.8초 딜레이를 사용합니다.
  const handleRefresh = useCallback(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
  }, []);

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
    haptic();
    setViewMode(mode);
  };

  return (
    <ImageBackground source={BG_IMAGE} resizeMode="cover" className="flex-1">
      <HiveTabBar />

      <PullToRefresh
        className="flex-1"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingTop: Spacing.sm,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <HiveSliderSection
          hives={hives}
          hiveControls={hiveControls}
          allView={false}
          selectedIndex={selectedIndex}
          itemWidth={SLIDER_ITEM_WIDTH}
          sliderRef={sliderRef}
          onHivePress={handleHivePress}
          onSlideEnd={handleSlideEnd}
        />

        <PeriodCard
          period={period}
          onSelect={setPeriod}
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
          {viewMode === "table" ? (
            <DataTable data={statData} period={period} />
          ) : (
            <ChartCards data={statData} viewMode={viewMode} />
          )}
        </PeriodCard>

        <HiveReplacementTable hiveId={selectedHive} />

        <HiveEnvironmentGuide />
      </PullToRefresh>
    </ImageBackground>
  );
}

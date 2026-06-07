/**
 * 벌통 통계 화면
 * - HiveSliderSection / PeriodCard / WeatherSection / ChartCards / DataTable / HiveEnvironmentGuide를 조합합니다.
 * - 기간(period), 선택된 벌통(selectedHive), 보기 모드(viewMode)를 로컬 상태로 관리합니다.
 * - useWeatherRegion/useMakeWeather로 날씨 데이터를 가져와 WeatherSection에 전달합니다.
 * - PullToRefresh 새로고침, 설정 이동, 슬라이더/보기 모드 전환 핸들러를 포함합니다.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute } from "@react-navigation/native";
import { PretendardFont } from "@/components/PretendardFont";
import AppHeader from "@/components/AppHeader";
import { PageTitle } from "@/components/PageTitle";
import { HEADER_HEIGHT, useScrollHeader } from "@/hooks";
import { Spacing } from "../constants";
import {
  HiveEnvironmentGuide,
  PeriodCard,
  ChartCards,
  DataTable,
} from "@/features/hive-status";
import {
  HIVE_STATS_SUBTITLE,
  HIVE_STATS_TITLE,
  PERIOD_HINT,
  VIEW_MODES,
} from "@/features/hive-status/constants";
import { HiveSliderSection } from "@/components/hive/HiveSliderSection";
import { WeatherSection } from "@/components/hive/Hive-weather";
import {
  useWeatherRegion,
  useMakeWeather,
  hiveDataMap,
} from "@/features/hive-status";
import { useHiveStore } from "@/stores/useHiveStore";
import type { Period } from "../types";
import { C } from "@/constants/hive-colors";

const SLIDER_ITEM_WIDTH = Dimensions.get("window").width - 32;

/**
 * ViewModeToggle
 * - 통계 보기 모드를 차트 / 통합 / 표로 전환하는 버튼 그룹입니다.
 * - 상위에서 상태를 받아 렌더링하고, onChange 콜백으로 변경을 전달합니다.
 */
function ViewModeToggle({
  period,
  viewMode,
  onChange,
}: {
  period: Period;
  viewMode: "chart" | "combined" | "table";
  onChange: (mode: "chart" | "combined" | "table") => void;
}) {
  return (
    <View className="flex-row items-center justify-between mt-5 mb-4">
      <PretendardFont style={{ fontSize: 13, color: C.sec, marginRight: 8 }}>
        {PERIOD_HINT[period]}
      </PretendardFont>
      <View
        className="flex-row rounded-full overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: C.bgAlt,
        }}
      >
        {VIEW_MODES.map((item) => {
          const active = viewMode === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              className="px-4 py-2"
              style={{ backgroundColor: active ? C.primary : C.bgAlt }}
              data-testid={`button-view-${item.key}`}
            >
              <PretendardFont
                weight={active ? "semibold" : "medium"}
                style={{
                  fontSize: 14,
                  color: active ? C.buttonActiveText : C.text,
                }}
              >
                {item.label}
              </PretendardFont>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * HiveStatsScreen
 * - 벌통 통계 페이지의 메인 화면입니다.
 * - 상단에 벌통 슬라이더를 표시하고, 선택된 벌통의 통계 데이터를 보여줍니다.
 * - 기간 선택과 차트/표 조회를 관리합니다.
 */
export default function HiveStatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const hives = useHiveStore((state) => state.hives);

  const [period, setPeriod] = useState<Period>("일간");
  const [selectedHive, setSelectedHive] = useState<string>(
    route.params?.selectedHiveId ?? hives[0]?.id ?? "1",
  );
  const [viewMode, setViewMode] = useState<"chart" | "combined" | "table">(
    "chart",
  );
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();

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

  const statData = (hiveDataMap[selectedHive] ?? hiveDataMap["1"])[period];

  const isWeb = Platform.OS === "web";
  const haptic = () => {
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // PullToRefresh 컴포넌트 새로고침 처리. 데이터 API 연결 전 테스트용 0.8초 딜레이를 사용합니다.
  const handleRefresh = useCallback(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
  }, []);

  // 설정 화면으로 이동하며 모바일에서 햅틱 피드백을 제공합니다.
  const handleSettings = () => {
    if (!isWeb) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    (navigation as any).navigate("hive-setting");
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
    haptic();
    setViewMode(mode);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: C.bg }}>
      {/* Header */}
      <AppHeader
        title="벌통 통계"
        isScrolled={isScrolled}
        onBack={() => {
          haptic();
          navigation.goBack();
        }}
        rightAction={{
          icon: "settings",
          color: C.text,
          onPress: handleSettings,
          testId: "button-settings",
        }}
      />

      <PullToRefresh
        className="flex-1"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingTop: HEADER_HEIGHT + Spacing.lg,
          gap: Spacing.md,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <PageTitle title={HIVE_STATS_TITLE} subtitle={HIVE_STATS_SUBTITLE} />

        <HiveSliderSection
          hives={hives}
          hiveControls={{}}
          allView={false}
          selectedIndex={selectedIndex}
          itemWidth={SLIDER_ITEM_WIDTH}
          sliderRef={sliderRef}
          onHivePress={handleHivePress}
          onSlideEnd={handleSlideEnd}
          showToggle={false}
          title="내 벌통 확인"
          subtitle="밀어서 다른 벌통 확인 · 탭하여 통계 확인"
        />

        <PageTitle
          size="medium"
          title="내부 통계"
          subtitle={`온도·습도·가스 데이터를 한눈에 볼 수 있어요\n이는 벌의 활동성을 파악하는 데 중요해요`}
        />

        <PeriodCard
          period={period}
          onSelect={setPeriod}
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
          <ViewModeToggle
            period={period}
            viewMode={viewMode}
            onChange={handleViewModeChange}
          />

          {viewMode === "table" ? (
            <DataTable data={statData} period={period} />
          ) : (
            <ChartCards data={statData} viewMode={viewMode} />
          )}
        </PeriodCard>

        <HiveEnvironmentGuide />
      </PullToRefresh>
    </View>
  );
}

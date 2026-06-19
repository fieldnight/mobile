/**
 * 벌통 전체보기 화면
 * - 모든 벌통의 상태를 카드 목록으로 한눈에 확인합니다.
 * - 설치일 / 벌 교체일 / 내부·외부 온도·습도 포함
 */
import { Dimensions, ImageBackground } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG_IMAGE = require("../../assets/df.jpg");
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { Spacing } from "../constants";
import { useHiveStore } from "@/stores/useHiveStore";
import { useSyncHiveList } from "@/features/hive";
import { HiveSliderSection } from "@/components/hive/HiveSliderSection";
import { HiveTabBar } from "@/components/hive/HiveTabBar";

const ITEM_WIDTH = Dimensions.get("window").width - 32;

/**
 * HiveOverviewScreen
 * - 전체보기 탭의 메인 화면입니다.
 * - allView=true 고정으로 모든 벌통 카드를 나열합니다.
 */
export default function HiveOverviewScreen() {
  const insets = useSafeAreaInsets();
  useSyncHiveList();
  const hives = useHiveStore((state) => state.hives);
  const hiveControls = useHiveStore((state) => state.hiveControls);

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
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
        scrollEventThrottle={16}
        onRefresh={handleRefresh}
      >
        <HiveSliderSection
          hives={hives}
          hiveControls={hiveControls}
          allView={true}
          selectedIndex={0}
          itemWidth={ITEM_WIDTH}
          sliderRef={{ current: null }}
          onHivePress={() => {}}
          onSlideEnd={() => {}}
        />
      </PullToRefresh>
    </ImageBackground>
  );
}

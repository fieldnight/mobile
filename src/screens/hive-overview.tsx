/**
 * 벌통 전체보기 화면
 * - 모든 벌통의 상태를 카드 목록으로 한눈에 확인합니다.
 * - 설치일 / 벌 교체일 / 내부·외부 온도·습도 포함
 */
import { useState } from "react";
import { Dimensions, ImageBackground, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const BG_IMAGE = require("../../assets/df.jpg");
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
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
  const [addHiveVisible, setAddHiveVisible] = useState(false);

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
  };

  const openAddHiveSheet = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAddHiveVisible(true);
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
        <AddHiveStrip onPress={openAddHiveSheet} />

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

      <HiveAddSheet visible={addHiveVisible} onClose={() => setAddHiveVisible(false)} />
    </ImageBackground>
  );
}

function AddHiveStrip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <View className="flex-row items-center justify-between rounded-2xl border border-white/50 bg-white/70 px-4 py-3">
        <View className="flex-row items-center gap-2.5">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-900">
            <Feather name="plus" size={16} color={C.white} />
          </View>
          <View>
            <PretendardFont weight="bold" className="text-[14px] text-gray-900">
              벌통 추가
            </PretendardFont>
            <PretendardFont className="mt-0.5 text-[12px] text-gray-800">
              새 스마트벌통을 목록에 등록해요
            </PretendardFont>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={C.sec} />
      </View>
    </Pressable>
  );
}

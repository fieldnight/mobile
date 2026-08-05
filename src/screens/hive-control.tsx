import { useEffect, useRef, useState } from "react";
import { Dimensions, ImageBackground, Platform, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { HiveSliderSection } from "@/components/hive/HiveSliderSection";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { HiveControlSection } from "@/features/hive-control";
import { HiveReplacementCard } from "@/features/hive-status";
import { Spacing } from "../constants";
import { DEMO_HIVES, useHiveStore } from "@/stores/useHiveStore";

const BG_IMAGE = require("../../assets/df.jpg");

/**
 * 스마트벌통 제어 화면
 * - 상단 슬라이더에서 벌통을 고르고, 하단에서 자동/수동 제어를 변경합니다.
 * - 제어 설정은 현재 화면에서 로컬 상태로만 반영합니다.
 */
export default function HiveControlScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const hives = DEMO_HIVES;
  const hiveControls = useHiveStore((state) => state.hiveControls);

  // IoT 화면에서 특정 벌통을 눌러 진입하면 해당 벌통을 먼저 보여줍니다.
  const { selectedHiveId } = useLocalSearchParams<{
    selectedHiveId?: string;
  }>();
  const initialId =
    selectedHiveId && hives.some((h) => h.id === selectedHiveId)
      ? selectedHiveId
      : (hives[0]?.id ?? "");
  const initialIndex = Math.max(
    0,
    hives.findIndex((h) => h.id === initialId),
  );

  const [controlHive, setControlHive] = useState(initialId);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const hiveSliderRef = useRef<ScrollView>(null);

  const windowWidth = Dimensions.get("window").width;
  const itemWidth = windowWidth - 32;

  const hasHives = hives.length > 0;
  const currentHive = hives.find((hive) => hive.id === controlHive);

  useEffect(() => {
    if (!hives.length) return;
    const currentIndex = hives.findIndex((hive) => hive.id === controlHive);
    if (currentIndex === -1) {
      setControlHive(hives[0].id);
      setSelectedIndex(0);
    } else if (currentIndex !== selectedIndex) {
      setSelectedIndex(currentIndex);
    }
  }, [hives, controlHive, selectedIndex]);

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  };

  return (
    <ImageBackground source={BG_IMAGE} resizeMode="cover" className="flex-1">
      <HiveTabBar />

      <PullToRefresh
        className="flex-1"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingTop: Spacing.xs,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onRefresh={handleRefresh}
      >
        <HiveSliderSection
          hives={hives}
          hiveControls={hiveControls}
          allView={false}
          selectedIndex={selectedIndex}
          itemWidth={itemWidth}
          sliderRef={hiveSliderRef}
          onHivePress={(id) => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            (navigation as any).navigate("hive-stats", { selectedHiveId: id });
          }}
          onSlideEnd={(idx) => {
            const nextIndex = Math.max(0, Math.min(idx, hives.length - 1));
            const nextHive = hives[nextIndex];
            if (!nextHive) return;
            setSelectedIndex(nextIndex);
            setControlHive(nextHive.id);
          }}
        />

        {hasHives ? (
          <>
            <HiveControlSection controlHive={controlHive} />
            <HiveReplacementCard hive={currentHive} />
          </>
        ) : null}
      </PullToRefresh>
    </ImageBackground>
  );
}

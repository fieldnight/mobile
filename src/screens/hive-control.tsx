import { useEffect, useRef, useState } from "react";
import { Dimensions, ImageBackground, Platform, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BounceScrollView } from "@/components/refresh/BounceScrollView";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { HiveSliderSection } from "@/components/hive/HiveSliderSection";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { HiveControlSection, useHiveSseConnectionStatus } from "@/features/hive-control";
import { HiveReplacementCard } from "@/features/hive-status";
import { Spacing } from "../constants";
import { C } from "@/constants/hive-colors";
import { useHiveStore } from "@/stores/useHiveStore";
import { useSyncHiveList } from "@/features/hive";

const BG_IMAGE = require("../../assets/df.jpg");

/**
 * 스마트벌통 제어 화면
 * - 상단 슬라이더에서 벌통을 고르고, 하단에서 자동/수동 제어를 변경합니다.
 * - 제어 설정은 현재 화면에서 로컬 상태로만 반영합니다.
 */
export default function HiveControlScreen() {
  const insets = useSafeAreaInsets();
  const { show: showToast } = useAppToast();
  useSyncHiveList();
  const hives = useHiveStore((state) => state.hives);
  const hiveControls = useHiveStore((state) => state.hiveControls);

  // 실시간(SSE) 연결이 끊겨 온습도가 0으로 보일 수 있는 상황을 사용자에게 안내합니다.
  const sseStatus = useHiveSseConnectionStatus({ enabled: true });
  const prevSseStatusRef = useRef(sseStatus);

  useEffect(() => {
    const prevStatus = prevSseStatusRef.current;
    prevSseStatusRef.current = sseStatus;
    if (prevStatus === sseStatus) return;

    if (sseStatus === "reconnecting") {
      showToast("실시간 연결이 끊겼어요. 다시 연결하고 있어요", "error");
    } else if (sseStatus === "connected" && prevStatus === "reconnecting") {
      showToast("실시간 연결이 복구됐어요", "success");
    }
  }, [sseStatus, showToast]);

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

  return (
    <ImageBackground source={BG_IMAGE} resizeMode="cover" className="flex-1">
      <HiveTabBar />

      <BounceScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingTop: Spacing.xs,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
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
            router.push({
              pathname: "/hive-stats",
              params: { selectedHiveId: id },
            });
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
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.push({
                  pathname: "/hive-live",
                  params: { selectedHiveId: controlHive },
                });
              }}
              className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
              style={{ backgroundColor: C.text }}
            >
              <Feather name="activity" size={16} color={C.white} />
              <PretendardFont weight="bold" style={{ fontSize: 15, color: C.white }}>
                실시간 확인
              </PretendardFont>
            </Pressable>

            <HiveControlSection controlHive={controlHive} />
            <HiveReplacementCard hive={currentHive} />
          </>
        ) : null}
      </BounceScrollView>
    </ImageBackground>
  );
}

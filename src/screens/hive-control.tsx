import { useEffect, useRef, useState } from "react";
import { ImageBackground, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
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
 * - 상단 슬라이더에서 벌통을 고르고, 목표 온도를 조절한 뒤 적용합니다.
 * - 전송한 설정은 해당 벌통의 제어 설정을 다시 조회해 확인합니다.
 */
export default function HiveControlScreen() {
  const insets = useSafeAreaInsets();
  const { show: showToast } = useAppToast();
  useSyncHiveList();
  const hives = useHiveStore((state) => state.hives);

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
  const appliedRouteHiveRef = useRef<string | undefined>(undefined);

  const { width: windowWidth } = useWindowDimensions();
  const itemWidth = windowWidth - 32;

  const hasHives = hives.length > 0;
  const currentHive = hives.find((hive) => hive.id === controlHive);

  useEffect(() => {
    if (!hives.length) {
      setControlHive("");
      setSelectedIndex(0);
      return;
    }
    const requestedIndex = hives.findIndex((hive) => hive.id === selectedHiveId);
    if (selectedHiveId && requestedIndex !== -1 && appliedRouteHiveRef.current !== selectedHiveId) {
      appliedRouteHiveRef.current = selectedHiveId;
      setControlHive(selectedHiveId);
      setSelectedIndex(requestedIndex);
      return;
    }
    const currentIndex = hives.findIndex((hive) => hive.id === controlHive);
    if (currentIndex === -1) {
      setControlHive(hives[0].id);
      setSelectedIndex(0);
    } else if (currentIndex !== selectedIndex) {
      setSelectedIndex(currentIndex);
    }
  }, [hives, controlHive, selectedIndex, selectedHiveId]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      hiveSliderRef.current?.scrollTo({ x: selectedIndex * itemWidth, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedIndex, itemWidth, hives.length]);

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
          onAddHive={() => router.push("/hive-add")}
        />

        {hasHives ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${currentHive?.name ?? "선택한 벌통"} 실시간 센서값 보기`}
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
                실시간 센서값 보기
              </PretendardFont>
            </Pressable>

            {sseStatus === "reconnecting" ? (
              <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, backgroundColor: "#FFF7ED" }}>
                <Feather name="wifi-off" size={16} color={C.warning} />
                <PretendardFont style={{ flex: 1, fontSize: 13, lineHeight: 19, color: C.textAlt }}>실시간 연결을 다시 시도하고 있어요. 설정 확인이 늦어질 수 있어요.</PretendardFont>
              </View>
            ) : null}
            <HiveControlSection controlHive={controlHive} hiveName={currentHive?.name} />
            <HiveReplacementCard hive={currentHive} />
          </>
        ) : null}
      </BounceScrollView>
    </ImageBackground>
  );
}

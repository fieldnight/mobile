/**
 * 벌통 제어 화면
 * - HiveSliderSection: 벌통 목록 확인 (슬라이더)
 * - HiveControlSection: 수동·자동 제어 설정
 * - 상태와 핸들러를 여기서 관리하고 두 섹션에 내려줌
 */
import { useState, useRef, useEffect } from "react";
import {
  ScrollView,
  Platform,
  Dimensions,
  ImageBackground,
} from "react-native";

const BG_IMAGE = require("../../assets/df.jpg");
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { Spacing } from "../constants";
import { useLocalSearchParams } from "expo-router";
import { useHiveStore } from "@/stores/useHiveStore";
import { HiveSliderSection } from "@/components/hive/HiveSliderSection";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { HiveControlSection } from "@/features/hive-control";
import type { HiveControlState } from "@/types/hive-control";


/**
 * HiveControlScreen
 * - 내 농장 페이지의 메인 화면입니다.
 * - 상단에는 벌통 선택 슬라이더를 보여주고,
 *   아래에는 수동/자동 제어 섹션을 표시합니다.
 */
export default function HiveControlScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const hives = useHiveStore((state) => state.hives);
  const hiveControls = useHiveStore((state) => state.hiveControls);

  // IoT 홈에서 특정 벌통을 탭하면 selectedHiveId 파라미터로 진입 → 해당 벌통 선택
  const { selectedHiveId } = useLocalSearchParams<{
    selectedHiveId?: string;
  }>();
  const initialId =
    selectedHiveId && hives.some((h) => h.id === selectedHiveId)
      ? selectedHiveId
      : (hives[0]?.id ?? "1");
  const initialIndex = Math.max(
    0,
    hives.findIndex((h) => h.id === initialId),
  );

  const [controlHive, setControlHive] = useState(initialId);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const hiveSliderRef = useRef<ScrollView>(null);

  const windowWidth = Dimensions.get("window").width;
  const itemWidth = windowWidth - 32;

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

  const current =
    hiveControls[controlHive] ?? hiveControls[hives[0]?.id ?? "1"];

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  /**
   * handleToggleControl
   * - 자동 제어 항목을 토글합니다.
   * - 자동 ON→OFF 전환 시 연관 수동 상태를 off로 리셋합니다.
   */
  const handleToggleControl = (id: string) => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const manualResets: Partial<HiveControlState> = {};
    if (id === "heating") {
      manualResets.heaterOn = false;
      manualResets.coolerOn = false;
    } else if (id === "humidity" || id === "ventilation") {
      manualResets.ventOn = false;
      manualResets.circOn = false;
    }

    useHiveStore.setState((prev) => ({
      hiveControls: {
        ...prev.hiveControls,
        [controlHive]: {
          ...prev.hiveControls[controlHive],
          ...manualResets,
          controls: prev.hiveControls[controlHive].controls.map(
            (control: HiveControlState["controls"][number]) =>
              control.id === id
                ? { ...control, enabled: !control.enabled }
                : control,
          ),
        },
      },
    }));
  };

  /**
   * toggleQuickControl
   * - 히터/쿨러/환기/순환 빠른 제어 버튼을 토글합니다.
   */
  const toggleQuickControl = (
    key: "heaterOn" | "coolerOn" | "ventOn" | "circOn",
  ) => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    useHiveStore.setState((prev) => {
      const currentState = prev.hiveControls[controlHive];
      const newValue = !currentState[key];
      const updates: Partial<HiveControlState> = { [key]: newValue };
      if (key === "heaterOn" && newValue) updates.coolerOn = false;
      if (key === "coolerOn" && newValue) updates.heaterOn = false;
      if (key === "ventOn" && newValue) updates.circOn = false;
      if (key === "circOn" && newValue) updates.ventOn = false;
      return {
        hiveControls: {
          ...prev.hiveControls,
          [controlHive]: { ...currentState, ...updates },
        },
      };
    });
  };

  /**
   * handleSelectHive
   * - 개별 벌통 선택 시 선택 상태를 갱신하고 슬라이더를 스크롤합니다.
   */
  const handleSelectHive = (id: string) => {
    setControlHive(id);
    const index = hives.findIndex((hive) => hive.id === id);
    if (index >= 0) {
      setSelectedIndex(index);
      hiveSliderRef.current?.scrollTo({
        x: index * itemWidth,
        animated: true,
      });
    }
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
          allView={false}
          selectedIndex={selectedIndex}
          itemWidth={itemWidth}
          sliderRef={hiveSliderRef}
          onHivePress={(id) => {
            if (Platform.OS !== "web")
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

        <HiveControlSection
          hives={hives}
          current={current}
          controlHive={controlHive}
          onToggleControl={handleToggleControl}
          onToggleQuickControl={toggleQuickControl}
          onSelectHive={handleSelectHive}
        />
      </PullToRefresh>
    </ImageBackground>
  );
}

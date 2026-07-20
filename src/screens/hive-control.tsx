import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ImageBackground,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { HiveSliderSection } from "@/components/hive/HiveSliderSection";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { HiveControlSection } from "@/features/hive-control";
import { useSyncHiveList, useHiveConnectionStatuses } from "@/features/hive";
import { HIVE_REPLACEMENT_QUERY_KEYS, HiveReplacementCard } from "@/features/hive-status";
import { Spacing } from "../constants";
import { useHiveStore } from "@/stores/useHiveStore";
import type { HiveControlState } from "@/types/hive-control";

const BG_IMAGE = require("../../assets/df.jpg");

/** 특정 벌통의 제어 상태만 안전하게 교체합니다. */
function setHiveControlState(hiveId: string, nextState: HiveControlState) {
  useHiveStore.setState((prev) => ({
    hiveControls: {
      ...prev.hiveControls,
      [hiveId]: nextState,
    },
  }));
}

/**
 * 스마트벌통 제어 화면
 * - 상단 슬라이더에서 벌통을 고르고, 하단에서 자동/수동 제어를 변경합니다.
 * - 제어 설정은 현재 화면에서 로컬 상태로만 반영합니다.
 */
export default function HiveControlScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const hiveListQuery = useSyncHiveList();
  const hives = useHiveStore((state) => state.hives);
  const hiveIds = hives.map((h) => h.id);
  useHiveConnectionStatuses(hiveIds);
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
  const [addHiveVisible, setAddHiveVisible] = useState(false);
  const hiveSliderRef = useRef<ScrollView>(null);

  const windowWidth = Dimensions.get("window").width;
  const itemWidth = windowWidth - 32;

  const current =
    hiveControls[controlHive] ?? hiveControls[hives[0]?.id ?? ""];
  const currentHive = hives.find((hive) => hive.id === controlHive);
  const hasHives = hives.length > 0;

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
    await Promise.all([
      hiveListQuery.refetch(),
      queryClient.invalidateQueries({
        queryKey: HIVE_REPLACEMENT_QUERY_KEYS.listPrefix(controlHive),
      }),
      queryClient.invalidateQueries({
        queryKey: HIVE_REPLACEMENT_QUERY_KEYS.latest(controlHive),
      }),
    ]);
  };

  const updateCurrentControl = (updater: (prevState: HiveControlState) => HiveControlState) => {
    const store = useHiveStore.getState();
    const prevState =
      store.hiveControls[controlHive] ??
      store.hiveControls[store.hives[0]?.id ?? ""];
    if (!prevState || !controlHive) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setHiveControlState(controlHive, updater(prevState));
  };

  const toggleTemperature = () => {
    updateCurrentControl((prevState) => {
      const nextOn = !(prevState.heaterOn || prevState.coolerOn);
      return { ...prevState, heaterOn: nextOn, coolerOn: false };
    });
  };

  const toggleVentilation = () => {
    updateCurrentControl((prevState) => ({
      ...prevState,
      ventOn: !prevState.ventOn,
      circOn: false,
    }));
  };

  const toggleAutoControl = (id: "heating" | "ventilation") => {
    updateCurrentControl((prevState) => ({
      ...prevState,
      controls: prevState.controls.map((control) =>
        control.id === id ? { ...control, enabled: !control.enabled } : control,
      ),
    }));
  };

  /** 벌통 선택 시 드롭다운과 상단 슬라이더 위치를 같이 맞춥니다. */
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
          onAddHive={() => setAddHiveVisible(true)}
        />

        {hasHives && current ? (
          <>
            <HiveControlSection
              hives={hives}
              current={current}
              controlHive={controlHive}
              onToggleTemperature={toggleTemperature}
              onToggleVentilation={toggleVentilation}
              onToggleTemperatureAuto={() => toggleAutoControl("heating")}
              onToggleVentilationAuto={() => toggleAutoControl("ventilation")}
              onSelectHive={handleSelectHive}
            />

            <HiveReplacementCard hive={currentHive} />
          </>
        ) : null}
      </PullToRefresh>

      <HiveAddSheet
        visible={addHiveVisible}
        onClose={() => setAddHiveVisible(false)}
      />
    </ImageBackground>
  );
}

/**
 * 벌통 제어 화면
 * - HiveSliderSection: 벌통 목록 확인 (슬라이더 / 전체 보기)
 * - HiveControlSection: 수동·자동 제어 설정
 * - 상태와 핸들러를 여기서 관리하고 두 섹션에 내려줌
 */
import { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { C } from "@/constants/hive-colors";
import AppHeader from "@/components/AppHeader";
import { PageTitle } from "@/components/PageTitle";
import { PretendardFont } from "@/components/PretendardFont";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useHiveStore } from "@/stores/useHiveStore";
import { HiveSliderSection } from "@/components/hive/HiveSliderSection";
import { HiveControlSection } from "@/features/hive-control";
import type { HiveControlState } from "@/types/hive-control";

const GREETINGS = [
  "벌들, 오늘도 신나게 날고 있어요",
  "오늘 수확량도 기대해봐요",
  "농장, 잘 돌보고 계시네요",
  "벌통 상태 한번 봐볼까요",
  "벌들이 바빠야 수확도 많아져요",
  "오늘 날씨 벌들한테 딱이에요",
];

/**
 * HiveControlScreen
 * - 내 농장 페이지의 메인 화면입니다.
 * - 상단에는 벌통 선택 슬라이더를 보여주고,
 *   아래에는 수동/자동 제어 섹션을 표시합니다.
 * - 앱 상태와 벌통 선택 로직을 관리합니다.
 */
export default function HiveControlScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const hives = useHiveStore((state) => state.hives);
  const hiveControls = useHiveStore((state) => state.hiveControls);

  const [controlHive, setControlHive] = useState(hives[0]?.id ?? "1");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allView, setAllView] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hiveSliderRef = useRef<ScrollView>(null);

  const windowWidth = Dimensions.get("window").width;
  const itemWidth = windowWidth - 32;

  const greeting = useMemo(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
    [],
  );
  const displayName = user?.fullName ?? user?.username ?? "농장주";

  const isAll = controlHive === "all";

  useEffect(() => {
    if (!hives.length) return;
    const currentIndex = hives.findIndex((hive) => hive.id === controlHive);
    if (controlHive !== "all" && currentIndex === -1) {
      setControlHive(hives[0].id);
      setSelectedIndex(0);
      setAllView(false);
    } else if (currentIndex !== -1 && currentIndex !== selectedIndex) {
      setSelectedIndex(currentIndex);
    }
  }, [hives, controlHive, selectedIndex]);

  /**
   * getAllMergedState
   * - 전체 보기 상태에서 모든 벌통의 공통 제어 상태를 병합합니다.
   * - 동일한 컨트롤이 모든 벌통에서 켜져 있어야 전체가 켜진 것으로 간주합니다.
   */
  const getAllMergedState = (): HiveControlState => {
    const ids = hives.map((hive) => hive.id);
    const first = hiveControls[ids[0]];
    return {
      controls: first.controls.map(
        (control: HiveControlState["controls"][number], index: number) => ({
          ...control,
          enabled: ids.every((id) => hiveControls[id].controls[index].enabled),
        }),
      ),
      heaterOn: ids.every((id) => hiveControls[id].heaterOn),
      coolerOn: ids.every((id) => hiveControls[id].coolerOn),
      ventOn: ids.every((id) => hiveControls[id].ventOn),
      circOn: ids.every((id) => hiveControls[id].circOn),
    };
  };

  const current = isAll
    ? getAllMergedState()
    : (hiveControls[controlHive] ?? hiveControls[hives[0]?.id ?? "1"]);

  /**
   * handleRefresh
   * - pull-to-refresh 동작을 처리합니다.
   * - 현재는 1초 대기 후 새로고침 상태를 해제합니다.
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  /**
   * handleToggleControl
   * - 자동 제어 항목을 토글합니다.
   * - 전체 보기(allView) 상태에서는 모든 벌통에 동일한 변경을 적용합니다.
   */
  const handleToggleControl = (id: string) => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isAll) {
      const currentVal =
        current.controls.find(
          (control: HiveControlState["controls"][number]) => control.id === id,
        )?.enabled ?? false;
      const newValue = !currentVal;
      useHiveStore.setState((prev) => {
        const nextHiveControls = { ...prev.hiveControls };
        hives.forEach((hive) => {
          nextHiveControls[hive.id] = {
            ...nextHiveControls[hive.id],
            controls: nextHiveControls[hive.id].controls.map(
              (control: HiveControlState["controls"][number]) =>
                control.id === id ? { ...control, enabled: newValue } : control,
            ),
          };
        });
        return { hiveControls: nextHiveControls };
      });
    } else {
      useHiveStore.setState((prev) => ({
        hiveControls: {
          ...prev.hiveControls,
          [controlHive]: {
            ...prev.hiveControls[controlHive],
            controls: prev.hiveControls[controlHive].controls.map(
              (control: HiveControlState["controls"][number]) =>
                control.id === id
                  ? { ...control, enabled: !control.enabled }
                  : control,
            ),
          },
        },
      }));
    }
  };

  /**
   * toggleQuickControl
   * - 히터/쿨러/환기/순환 빠른 제어 버튼을 토글합니다.
   * - 전체 보기 중이면 모든 벌통에 동일하게 적용합니다.
   */
  const toggleQuickControl = (
    key: "heaterOn" | "coolerOn" | "ventOn" | "circOn",
  ) => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isAll) {
      const newValue = !current[key];
      const updates: Partial<HiveControlState> = { [key]: newValue };
      if (key === "heaterOn" && newValue) updates.coolerOn = false;
      if (key === "coolerOn" && newValue) updates.heaterOn = false;
      if (key === "ventOn" && newValue) updates.circOn = false;
      if (key === "circOn" && newValue) updates.ventOn = false;

      useHiveStore.setState((prev) => {
        const nextHiveControls = { ...prev.hiveControls };
        hives.forEach((hive) => {
          nextHiveControls[hive.id] = {
            ...nextHiveControls[hive.id],
            ...updates,
          };
        });
        return { hiveControls: nextHiveControls };
      });
    } else {
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
            [controlHive]: {
              ...currentState,
              ...updates,
            },
          },
        };
      });
    }
  };

  /**
   * handleToggleAllView
   * - 전체 보기 토글을 전환합니다.
   * - 전체 보기를 켜면 controlHive를 "all"로 설정합니다.
   */
  const handleToggleAllView = () => {
    const next = !allView;
    setAllView(next);
    setControlHive(
      next ? "all" : (hives[selectedIndex]?.id ?? hives[0]?.id ?? "1"),
    );
  };

  /**
   * handleSelectHive
   * - 개별 벌통 선택 시 선택 상태를 갱신합니다.
   * - 슬라이더가 표시 중일 때 선택된 벌통으로 스크롤합니다.
   */
  const handleSelectHive = (id: string) => {
    setControlHive(id);
    if (!allView) {
      const index = hives.findIndex((hive) => hive.id === id);
      if (index >= 0) {
        setSelectedIndex(index);
        hiveSliderRef.current?.scrollTo({
          x: index * itemWidth,
          animated: true,
        });
      }
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: C.bg }}>
      <AppHeader
        title="내 농장"
        onBack={() => router.back()}
        isScrolled={isScrolled}
        rightAction={{
          icon: "settings",
          color: C.text,
          onPress: () => {
            if (Platform.OS !== "web")
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            (navigation as any).navigate("hive-setting");
          },
          testId: "button-settings",
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 56 + 20,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 40,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) =>
          setIsScrolled(nativeEvent.contentOffset.y > 8)
        }
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#EA580C"
            colors={["#EA580C"]}
            progressBackgroundColor="#FFFFFF"
            progressViewOffset={56}
          />
        }
      >
        <View className="flex-row items-end mb-10">
          <View style={{ flex: 1 }}>
            <PageTitle title={`${displayName}님\n${greeting}`} />
          </View>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web")
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/hive-add");
            }}
            className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-full"
            style={{
              backgroundColor: C.primary,
              borderWidth: 1,
              borderColor: C.primary,
            }}
          >
            <Feather name="plus" size={15} color={C.white} />
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 13, color: C.white }}
            >
              벌통 연결
            </PretendardFont>
          </Pressable>
        </View>

        <HiveSliderSection
          hives={hives}
          hiveControls={hiveControls}
          allView={allView}
          selectedIndex={selectedIndex}
          itemWidth={itemWidth}
          sliderRef={hiveSliderRef}
          onToggleAllView={handleToggleAllView}
          onHivePress={(id) => {
            if (Platform.OS !== "web")
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            (navigation as any).navigate("hive-stats", { selectedHiveId: id });
          }}
          onSlideEnd={(idx) => {
            setSelectedIndex(idx);
            setControlHive(hives[idx].id);
          }}
          showToggle
          title="내 벌통 확인"
          subtitle="밀어서 다른 벌통 확인 · 탭하여 통계 확인"
        />

        <HiveControlSection
          hives={hives}
          current={current}
          controlHive={controlHive}
          onToggleControl={handleToggleControl}
          onToggleQuickControl={toggleQuickControl}
          onSelectHive={handleSelectHive}
        />
      </ScrollView>
    </View>
  );
}

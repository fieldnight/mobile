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
import { useQueryClient } from "@tanstack/react-query";

const BG_IMAGE = require("../../assets/df.jpg");
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { ConfirmSheet } from "@/components/BottomSheet";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { Spacing } from "../constants";
import { useHiveStore } from "@/stores/useHiveStore";
import { useDeleteHive, useSyncHiveList } from "@/features/hive";
import { HIVE_REPLACEMENT_QUERY_KEYS, useHiveLatestReplacementMap } from "@/features/hive-status";
import { HiveSliderSection } from "@/components/hive/HiveSliderSection";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { useAppToast } from "@/components/ToastContext";
import type { HiveData } from "@/types/hive-control";

const ITEM_WIDTH = Dimensions.get("window").width - 32;

/**
 * HiveOverviewScreen
 * - 전체보기 탭의 메인 화면입니다.
 * - allView=true 고정으로 모든 벌통 카드를 나열합니다.
 */
export default function HiveOverviewScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const hiveListQuery = useSyncHiveList();
  const deleteHiveMutation = useDeleteHive();
  const { show: showToast } = useAppToast();
  const hives = useHiveStore((state) => state.hives);
  const hiveControls = useHiveStore((state) => state.hiveControls);
  const latestReplacementMap = useHiveLatestReplacementMap(hives.map((hive) => hive.id));
  const [addHiveVisible, setAddHiveVisible] = useState(false);
  const [editingHive, setEditingHive] = useState<HiveData | null>(null);
  const [pendingDeleteHive, setPendingDeleteHive] = useState<HiveData | null>(null);
  const displayHives = hives.map((hive) => {
    const latestReplacement = latestReplacementMap.get(hive.id);
    return latestReplacement
      ? { ...hive, replacedAt: latestReplacement.replacedAt }
      : hive;
  });

  const handleRefresh = async () => {
    await Promise.all([
      hiveListQuery.refetch(),
      ...hives.map((hive) =>
        queryClient.invalidateQueries({
          queryKey: HIVE_REPLACEMENT_QUERY_KEYS.latest(hive.id),
        }),
      ),
    ]);
  };

  const triggerLightHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetTransientSheets = () => {
    setAddHiveVisible(false);
    setEditingHive(null);
    setPendingDeleteHive(null);
  };

  const openAddHiveSheet = () => {
    triggerLightHaptic();
    resetTransientSheets();
    setAddHiveVisible(true);
  };

  const openEditHiveSheet = (hive: HiveData) => {
    triggerLightHaptic();
    setAddHiveVisible(false);
    setPendingDeleteHive(null);
    setEditingHive(hive);
  };

  const openDeleteHiveSheet = (hive: HiveData) => {
    triggerLightHaptic();
    setAddHiveVisible(false);
    setEditingHive(null);
    setPendingDeleteHive(hive);
  };

  const confirmDeleteHive = () => {
    const hiveToDelete = pendingDeleteHive;
    if (!hiveToDelete || deleteHiveMutation.isLoading) return;

    deleteHiveMutation.mutate(hiveToDelete.id, {
      onSuccess: () => {
        showToast(`${hiveToDelete.name} 벌통을 삭제했어요.`, "success");
        setPendingDeleteHive(null);
      },
      onError: () => {
        showToast("벌통 삭제에 실패했어요.", "error");
        setPendingDeleteHive(null);
      },
    });
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
          hives={displayHives}
          hiveControls={hiveControls}
          allView={true}
          selectedIndex={0}
          itemWidth={ITEM_WIDTH}
          sliderRef={{ current: null }}
          onHivePress={() => {}}
          onSlideEnd={() => {}}
          onEditHive={openEditHiveSheet}
          onDeleteHive={openDeleteHiveSheet}
        />
      </PullToRefresh>

      <HiveAddSheet visible={addHiveVisible} onClose={() => setAddHiveVisible(false)} />
      <HiveAddSheet
        visible={editingHive != null}
        hive={editingHive}
        onClose={() => setEditingHive(null)}
      />
      <ConfirmSheet
        visible={pendingDeleteHive != null}
        onClose={() => setPendingDeleteHive(null)}
        title="벌통 삭제"
        message={`${
          pendingDeleteHive?.name ?? "선택한 벌통"
        }을 삭제할까요? 이 작업은 되돌릴 수 없어요.`}
        confirmLabel="삭제"
        destructive
        confirmDisabled={deleteHiveMutation.isLoading}
        onConfirm={confirmDeleteHive}
      />
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

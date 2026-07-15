import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  AUTO_CONTROL_TYPE_BY_ID,
  MANUAL_CONTROL_TYPE_BY_KEY,
  HIVE_CONTROL_QUERY_KEYS,
  HiveControlSection,
  applyControlResult,
  buildOptimisticAutoState,
  buildOptimisticManualState,
  mergeControlSettings,
  useHiveControlSettings,
  useHiveControlSse,
  useRequestAutoControl,
  useRequestManualControl,
  type HiveControlType,
  type QuickControlKey,
} from "@/features/hive-control";
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
 * - 제어 요청은 낙관적 UI로 먼저 반영하고, 실패하거나 SSE 결과가 오면 다시 동기화합니다.
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
  // 복합키 `${hiveId}:${type}` 로 관리 → 벌통 간 pending 상태 오염 방지
  const pendingAutoTypesRef = useRef(new Set<string>());
  const pendingManualTypesRef = useRef(new Set<string>());
  const pendingControlSeqRef = useRef(0);
  const pendingControlTokensRef = useRef(new Map<string, number>());

  const makePendingKey = (hiveId: string, type: HiveControlType) =>
    `${hiveId}:${type}` as const;

  const autoControlMutation = useRequestAutoControl();
  const manualControlMutation = useRequestManualControl();
  const controlSettingsQuery = useHiveControlSettings(controlHive);

  const windowWidth = Dimensions.get("window").width;
  const itemWidth = windowWidth - 32;

  const current =
    hiveControls[controlHive] ?? hiveControls[hives[0]?.id ?? ""];
  const currentHive = hives.find((hive) => hive.id === controlHive);
  const hasHives = hives.length > 0;

  const queueControlPendingRelease = useCallback(
    (hiveId: string, type: HiveControlType, delayMs: number) => {
      const key = makePendingKey(hiveId, type);
      const token = pendingControlTokensRef.current.get(key);
      setTimeout(() => {
        if (pendingControlTokensRef.current.get(key) !== token) return;
        pendingControlTokensRef.current.delete(key);
        pendingAutoTypesRef.current.delete(key);
        pendingManualTypesRef.current.delete(key);
        queryClient.invalidateQueries({
          queryKey: HIVE_CONTROL_QUERY_KEYS.settings(hiveId),
        });
      }, delayMs);
    },
    [queryClient],
  );

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

  /**
   * 서버 설정 조회 결과를 기존 Zustand 상태와 병합합니다.
   * 화면 곳곳이 아직 Zustand를 직접 바라보므로 React Query와 store 사이에 bridge를 둡니다.
   */
  useEffect(() => {
    if (!controlSettingsQuery.data || !controlHive) return;

    useHiveStore.setState((prev) => {
      const prevControl = prev.hiveControls[controlHive];
      if (!prevControl) return prev;

      const pendingAuto = new Set(
        [...pendingAutoTypesRef.current]
          .filter((k) => k.startsWith(`${controlHive}:`))
          .map((k) => k.split(":")[1] as HiveControlType),
      );
      const pendingManual = new Set(
        [...pendingManualTypesRef.current]
          .filter((k) => k.startsWith(`${controlHive}:`))
          .map((k) => k.split(":")[1] as HiveControlType),
      );

      return {
        hiveControls: {
          ...prev.hiveControls,
          [controlHive]: mergeControlSettings(
            prevControl,
            controlSettingsQuery.data,
            pendingAuto,
            pendingManual,
          ),
        },
      };
    });
  }, [controlHive, controlSettingsQuery.data]);

  /** SSE는 화면 단위 전역 구독이라 선택 벌통이 바뀌어도 재구독하지 않습니다. */
  const handleSseResult = useCallback(
    (event: Parameters<typeof applyControlResult>[1]) => {
      const hiveId = String(event.hiveId);

      if (!event.success) {
        const failKey = makePendingKey(hiveId, event.type);
        pendingControlTokensRef.current.delete(failKey);
        pendingAutoTypesRef.current.delete(failKey);
        pendingManualTypesRef.current.delete(failKey);
        console.error("[Hive Control SSE] 제어 처리 실패", event);
        queryClient.invalidateQueries({
          queryKey: HIVE_CONTROL_QUERY_KEYS.settings(hiveId),
        });
        return;
      }

      useHiveStore.setState((prev) => {
        const prevControl = prev.hiveControls[hiveId];
        if (!prevControl) return prev;

        return {
          hiveControls: {
            ...prev.hiveControls,
            [hiveId]: applyControlResult(prevControl, event),
          },
        };
      });

      console.log("[Hive Control SSE] 제어 처리 성공", event);
      queueControlPendingRelease(hiveId, event.type, 2000);
    },
    [queryClient, queueControlPendingRelease],
  );

  useHiveControlSse({
    enabled: true,
    onResult: handleSseResult,
  });

  const handleRefresh = async () => {
    await Promise.all([
      hiveListQuery.refetch(),
      controlSettingsQuery.refetch(),
      queryClient.invalidateQueries({
        queryKey: HIVE_REPLACEMENT_QUERY_KEYS.listPrefix(controlHive),
      }),
      queryClient.invalidateQueries({
        queryKey: HIVE_REPLACEMENT_QUERY_KEYS.latest(controlHive),
      }),
    ]);
  };

  /**
   * 자동 제어 토글
   * - UI는 즉시 바꾸고, POST 실패 시 이전 상태로 되돌립니다.
   * - 실제 MCU 처리 성공 여부는 SSE로 다시 들어옵니다.
   */
  const handleToggleControl = (id: string) => {
    const store = useHiveStore.getState();
    const prevState =
      store.hiveControls[controlHive] ??
      store.hiveControls[store.hives[0]?.id ?? ""];
    const serverType = AUTO_CONTROL_TYPE_BY_ID[id];
    if (!prevState || !serverType) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const nextState = buildOptimisticAutoState(prevState, id);
    const nextEnabled =
      nextState.controls.find((control) => control.id === id)?.enabled ?? false;

    const autoKey = makePendingKey(controlHive, serverType);
    pendingAutoTypesRef.current.add(autoKey);
    pendingControlSeqRef.current += 1;
    pendingControlTokensRef.current.set(autoKey, pendingControlSeqRef.current);
    setHiveControlState(controlHive, nextState);
    console.log("[Hive Control UI] 자동 제어 낙관적 반영", {
      hiveId: controlHive,
      type: serverType,
      enabled: nextEnabled,
    });

    autoControlMutation.mutate(
      {
        hiveId: controlHive,
        body: { type: serverType, enabled: nextEnabled },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: HIVE_CONTROL_QUERY_KEYS.settings(controlHive),
          });
          queueControlPendingRelease(controlHive, serverType, 8000);
        },
        onError: (error) => {
          pendingControlTokensRef.current.delete(autoKey);
          pendingAutoTypesRef.current.delete(autoKey);
          setHiveControlState(controlHive, prevState);
          console.error("[Hive Control UI] 자동 제어 롤백", {
            hiveId: controlHive,
            type: serverType,
            error,
          });
        },
      },
    );
  };

  /**
   * 수동 빠른 제어 토글
   * - 현재 백엔드 명세에 없는 쿨러/순환은 기존 로컬 UI만 유지하고 경고 로그를 남깁니다.
   * - 서버 타입이 있는 히터/환기는 자동 제어와 동일하게 낙관적 UI로 처리합니다.
   */
  const toggleQuickControl = (key: QuickControlKey) => {
    const store = useHiveStore.getState();
    const prevState =
      store.hiveControls[controlHive] ??
      store.hiveControls[store.hives[0]?.id ?? ""];
    if (!prevState) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const nextState = buildOptimisticManualState(prevState, key);
    setHiveControlState(controlHive, nextState);

    const serverType = MANUAL_CONTROL_TYPE_BY_KEY[key];
    if (!serverType) {
      console.warn("[Hive Control UI] 서버 수동 제어 타입 미정, 로컬만 반영", {
        hiveId: controlHive,
        key,
      });
      return;
    }

    const manualKey = makePendingKey(controlHive, serverType);
    pendingManualTypesRef.current.add(manualKey);
    pendingControlSeqRef.current += 1;
    pendingControlTokensRef.current.set(manualKey, pendingControlSeqRef.current);
    console.log("[Hive Control UI] 수동 제어 낙관적 반영", {
      hiveId: controlHive,
      type: serverType,
      isOn: nextState[key],
    });

    manualControlMutation.mutate(
      {
        hiveId: controlHive,
        body: {
          type: serverType,
          enabled: nextState[key],
          isOn: nextState[key],
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: HIVE_CONTROL_QUERY_KEYS.settings(controlHive),
          });
          queueControlPendingRelease(controlHive, serverType, 8000);
        },
        onError: (error) => {
          pendingControlTokensRef.current.delete(manualKey);
          pendingManualTypesRef.current.delete(manualKey);
          setHiveControlState(controlHive, prevState);
          console.error("[Hive Control UI] 수동 제어 롤백", {
            hiveId: controlHive,
            type: serverType,
            error,
          });
        },
      },
    );
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
              onToggleControl={handleToggleControl}
              onToggleQuickControl={toggleQuickControl}
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

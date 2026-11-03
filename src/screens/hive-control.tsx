/**
 * 스마트벌통 제어 화면
 * - 위: 벌통 카드 줄과 좌우로 넘기는 상태 패널(다이얼 아래에서 목표 온도 조작)
 * - 리포트: 권장 온도 비율과 오늘 내부 온도 요약(누르면 리포트 탭)
 * - 바로가기: 실시간 확인·설정·Wi-Fi
 * - 벌 교체: 교체 기록 등록·수정·삭제
 * 전송한 목표 온도는 해당 벌통의 제어 설정을 다시 조회해 확인합니다.
 */
import { useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideFooterOnScroll } from "@/stores/useFooterVisibility";
import { PretendardFont } from "@/components/PretendardFont";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { useAppToast } from "@/components/ToastContext";
import { DeviceWifiSetupSheet } from "@/features/device-wifi-setup";
import { createHiveWifiAdapter } from "@/features/hive-wifi";
import { useOrderedHives, useSyncHiveList } from "@/features/hive";
import { HiveReplacementCard } from "@/features/hive-status";
import {
  HiveCardRail,
  type HiveCardRailHandle,
  QuickActions,
  HiveStatusPager,
  Panel,
  ReportPanel,
  RiseIn,
  SectionHeader,
  T,
} from "@/features/hive-home";
import type { HiveData } from "@/types/hive-control";

export default function HiveControlScreen() {
  const insets = useSafeAreaInsets();
  // 아래로 스크롤하면 하단 탭바를 숨기고, 위로 당기면 다시 보여줍니다.
  const footerScroll = useHideFooterOnScroll();
  const hiveList = useSyncHiveList();
  const hives = useOrderedHives();
  const [addVisible, setAddVisible] = useState(false);
  const railRef = useRef<HiveCardRailHandle>(null);
  // 다이얼을 잡고 있는 동안에만 세로 스크롤·당겨서 새로고침을 잠급니다. 손을 떼면 바로 풀립니다.
  const [dialDragging, setDialDragging] = useState(false);

  // 다른 화면에서 특정 벌통을 눌러 들어오면 그 벌통을 먼저 보여줍니다.
  const { selectedHiveId } = useLocalSearchParams<{ selectedHiveId?: string }>();
  const [selectedId, setSelectedId] = useState(selectedHiveId ?? "");
  useEffect(() => {
    if (selectedHiveId && hives.some((hive) => hive.id === selectedHiveId)) setSelectedId(selectedHiveId);
  }, [selectedHiveId, hives]);

  const hive = hives.find((item) => item.id === selectedId) ?? hives[0];

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <HiveTabBar />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={footerScroll.onScroll}
        scrollEventThrottle={footerScroll.scrollEventThrottle}
        scrollEnabled={!dialDragging}
        refreshControl={<RefreshControl enabled={!dialDragging} refreshing={hiveList.isRefetching} onRefresh={() => void hiveList.refetch()} />}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 120 }}
      >
        <RiseIn index={0} style={{ paddingBottom: 14 }}>
          <HiveCardRail ref={railRef} followsPager hives={hives} selectedId={hive?.id ?? ""} onSelect={setSelectedId} onAdd={() => setAddVisible(true)} />
        </RiseIn>

        {hive ? (
          <>
            <RiseIn index={1}>
              <HiveStatusPager
                hives={hives}
                selectedId={hive.id}
                onSelect={setSelectedId}
                onScrollProgress={(progress) => railRef.current?.follow(progress)}
                onDialDragChange={setDialDragging}
              />
            </RiseIn>
            <RiseIn index={2} style={{ paddingHorizontal: 16 }}>
              <ControlBody key={hive.id} hive={hive} />
            </RiseIn>
          </>
        ) : (
          <RiseIn index={1} style={{ paddingHorizontal: 16 }}>
            <Panel style={{ alignItems: "center", paddingVertical: 36 }}>
              <PretendardFont weight="bold" style={{ fontSize: 17, color: T.ink }}>
                {hiveList.isLoading ? "벌통을 불러오고 있어요" : "등록된 벌통이 없어요"}
              </PretendardFont>
              <PretendardFont style={{ marginTop: 6, fontSize: 14, color: T.inkSoft }}>위 벌통 추가 카드로 등록해 주세요</PretendardFont>
            </Panel>
          </RiseIn>
        )}
      </ScrollView>

      <HiveAddSheet visible={addVisible} onClose={() => setAddVisible(false)} />
    </View>
  );
}

/** 선택한 벌통의 리포트·바로가기·벌 교체. 벌통이 바뀌면 key로 새로 그립니다. */
function ControlBody({ hive }: { hive: HiveData }) {
  const { show: showToast } = useAppToast();
  const [wifiVisible, setWifiVisible] = useState(false);
  const online = hive.status === "online";
  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      <ReportPanel hiveId={hive.id} onOpen={() => router.replace({ pathname: "/hive-stats", params: { selectedHiveId: hive.id } })} />
      <QuickActions
        actions={[
          {
            id: "live",
            label: "실시간 확인",
            caption: online ? `수신 중 · ${hive.lastUpdate}` : "기록 보기",
            icon: "activity",
            active: online,
            emphasis: true,
            onPress: () => router.push({ pathname: "/hive-live", params: { selectedHiveId: hive.id } }),
          },
          { id: "setting", label: "설정", caption: "날씨 지역 등", icon: "settings", onPress: () => router.replace("/hive-setting") },
          { id: "wifi", label: "Wi-Fi", caption: online ? "연결됨" : "연결 바꾸기", icon: "wifi", onPress: () => setWifiVisible(true) },
        ]}
      />
      <DeviceWifiSetupSheet
        visible={wifiVisible}
        onClose={() => setWifiVisible(false)}
        mode="change"
        initialDeviceId={hive.macAddress}
        adapter={createHiveWifiAdapter("change", hive.macAddress)}
        onProvisioned={() => showToast("벌통 Wi-Fi를 바꿨어요.", "success")}
      />

      <View style={{ marginTop: 16 }}>
        <SectionHeader title="벌 교체" />
      </View>
      <HiveReplacementCard hive={hive} />
    </View>
  );
}

/**
 * 벌통 전체보기 화면
 * - 맨 위 큰 버튼으로 바로 벌통을 추가합니다.
 * - 벌통마다 카드 한 장: 연결 상태, 이름·위치, 내부·기계 온습도, 설치일·벌 교체 경과일을 보여줍니다.
 * - 카드를 누르면 그 벌통의 제어 화면으로, ⋯ 버튼으로 수정·삭제합니다. 오프라인 벌통은 뒤로 정렬됩니다.
 */
import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideFooterOnScroll } from "@/stores/useFooterVisibility";
import { Feather } from "@expo/vector-icons";
import { BottomSheet, ConfirmSheet } from "@/components/BottomSheet";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { useAppToast } from "@/components/ToastContext";
import { useDeleteHive, useOrderedHives, useSyncHiveList } from "@/features/hive";
import { useHiveLatestReplacementMap } from "@/features/hive-status";
import { getReplacementElapsed } from "@/features/hive-status/model/replacement";
import { formatValue, getHiveCondition, R, RiseIn, T } from "@/features/hive-home";
import type { HiveData } from "@/types/hive-control";

// 벌통 카드 등장 모션은 앞쪽 몇 장까지만 차례로 늦춥니다.
const MAX_RISE_INDEX = 5;

type Sheet = { kind: "add" } | { kind: "menu" | "edit" | "delete"; hive: HiveData } | null;

export default function HiveOverviewScreen() {
  const insets = useSafeAreaInsets();
  // 아래로 스크롤하면 하단 탭바를 숨기고, 위로 당기면 다시 보여줍니다.
  const footerScroll = useHideFooterOnScroll();
  const hiveList = useSyncHiveList();
  const deleteHiveMutation = useDeleteHive();
  const { show: showToast } = useAppToast();
  const hives = useOrderedHives();
  const latestReplacementMap = useHiveLatestReplacementMap(hives.map((hive) => hive.id));
  const [sheet, setSheet] = useState<Sheet>(null);

  const displayHives = hives.map((hive) => {
    const latest = latestReplacementMap.get(hive.id);
    return latest ? { ...hive, replacedAt: latest.replacedAt } : hive;
  });
  const onlineCount = displayHives.filter((hive) => hive.status === "online").length;
  const targetHive = sheet && sheet.kind !== "add" ? sheet.hive : null;

  const confirmDelete = () => {
    if (!targetHive || deleteHiveMutation.isLoading) return;
    const hive = targetHive;
    deleteHiveMutation.mutate(hive.id, {
      onSuccess: () => showToast(`${hive.name} 벌통을 삭제했어요.`, "success"),
      onError: () => showToast("벌통을 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.", "error"),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <HiveTabBar />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={footerScroll.onScroll}
        scrollEventThrottle={footerScroll.scrollEventThrottle}
        refreshControl={<RefreshControl refreshing={hiveList.isRefetching} onRefresh={() => void hiveList.refetch()} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: insets.bottom + 120, gap: 12 }}
      >
        <RiseIn index={0}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel="새 벌통 추가"
          onPress={() => setSheet({ kind: "add" })}
          style={({ pressed }) => ({
            minHeight: 64,
            borderRadius: R.panel,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: pressed ? "#333B45" : T.ink,
          })}
        >
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" }}>
            <Feather name="plus" size={18} color={T.panel} />
          </View>
          <PretendardFont weight="bold" style={{ fontSize: 17, color: T.panel }}>새 벌통 추가</PretendardFont>
        </Tap>
        </RiseIn>

        {displayHives.length ? (
          <>
            <PretendardFont style={{ marginTop: 8, marginLeft: 4, fontSize: 14, color: T.inkSoft }}>
              벌통 <PretendardFont weight="bold" style={{ color: T.ink }}>{displayHives.length}개</PretendardFont>
              {"  "}실시간 연결 {onlineCount}개
            </PretendardFont>
            {displayHives.map((hive, index) => (
              // 카드가 많아도 앞쪽 몇 장만 차례로 떠오르고 나머지는 함께 나옵니다.
              <RiseIn key={hive.id} index={Math.min(index + 1, MAX_RISE_INDEX)}>
                <HiveListCard
                  hive={hive}
                  onPress={() => router.push({ pathname: "/hive-control", params: { selectedHiveId: hive.id } })}
                  onMenu={() => setSheet({ kind: "menu", hive })}
                />
              </RiseIn>
            ))}
          </>
        ) : (
          <View style={{ backgroundColor: T.panel, borderRadius: R.panel, paddingVertical: 36, paddingHorizontal: 24, alignItems: "center" }}>
            <PretendardFont weight="bold" style={{ fontSize: 17, color: T.ink }}>
              {hiveList.isLoading ? "벌통을 불러오고 있어요" : "아직 등록된 벌통이 없어요"}
            </PretendardFont>
            <PretendardFont style={{ marginTop: 6, fontSize: 14, lineHeight: 21, color: T.inkSoft, textAlign: "center" }}>
              위 버튼으로 스마트벌통을 등록해 주세요
            </PretendardFont>
          </View>
        )}
      </ScrollView>

      <HiveAddSheet visible={sheet?.kind === "add"} onClose={() => setSheet(null)} />
      <HiveAddSheet visible={sheet?.kind === "edit"} hive={targetHive} onClose={() => setSheet(null)} />
      <BottomSheet
        visible={sheet?.kind === "menu"}
        onClose={() => setSheet(null)}
        title={targetHive?.name ?? "벌통"}
        snapHeight={0.4}
        contentScrollEnabled={false}
      >
        <View style={{ gap: 8 }}>
          <MenuRow icon="edit-3" label="이름·위치·메모 수정" onPress={() => targetHive && setSheet({ kind: "edit", hive: targetHive })} />
          <MenuRow icon="trash-2" label="벌통 삭제" destructive onPress={() => targetHive && setSheet({ kind: "delete", hive: targetHive })} />
        </View>
      </BottomSheet>
      <ConfirmSheet
        visible={sheet?.kind === "delete"}
        onClose={() => setSheet(null)}
        title="벌통 삭제"
        message={`${targetHive?.name ?? "선택한 벌통"}을 삭제할까요? 삭제하면 되돌릴 수 없어요.`}
        confirmLabel="삭제"
        destructive
        confirmDisabled={deleteHiveMutation.isLoading}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

function HiveListCard({ hive, onPress, onMenu }: { hive: HiveData; onPress: () => void; onMenu: () => void }) {
  const condition = getHiveCondition(hive);
  const online = hive.status === "online";
  const elapsed = getReplacementElapsed(hive.replacedAt);
  const place = [hive.location, hive.region].filter(Boolean).join(" · ");
  const hasReading = hive.measuredAt != null;

  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${hive.name}, ${condition.message}. 눌러서 제어 화면으로 이동`}
      onPress={onPress}
      style={({ pressed }) => ({ borderRadius: R.panel, padding: 18, backgroundColor: pressed ? "#FAFBFC" : T.panel })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: online ? T.good : T.off }} />
            <PretendardFont style={{ fontSize: 12.5, color: T.muted }}>
              {online ? `실시간 · ${hive.lastUpdate}` : hive.lastUpdate}
            </PretendardFont>
          </View>
          <PretendardFont weight="bold" numberOfLines={1} style={{ marginTop: 8, fontSize: 18, color: T.ink }}>{hive.name}</PretendardFont>
          {place ? (
            <PretendardFont numberOfLines={1} style={{ marginTop: 2, fontSize: 13.5, color: T.inkSoft }}>{place}</PretendardFont>
          ) : null}
        </View>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`${hive.name} 수정 또는 삭제`}
          onPress={onMenu}
          hitSlop={8}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? T.keyPressed : T.key })}
        >
          <Feather name="more-horizontal" size={18} color={T.ink} />
        </Tap>
      </View>

      {hasReading ? (
        <View style={{ flexDirection: "row", marginTop: 18 }}>
          <Metric label="내부 온도" value={formatValue(hive.temperature)} unit="°C" strong color={online ? condition.color : undefined} />
          <Metric label="내부 습도" value={formatValue(hive.humidity, 0)} unit="%" />
          <Metric label="기계 온도" value={formatValue(hive.externalTemperature)} unit="°C" />
          <Metric label="기계 습도" value={formatValue(hive.externalHumidity, 0)} unit="%" />
        </View>
      ) : (
        <View style={{ marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: T.key }}>
          <PretendardFont style={{ fontSize: 13, color: T.muted }}>아직 받은 측정값이 없어요</PretendardFont>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 16, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: T.line }}>
        <Meta label="설치" value={hive.registeredAt ?? "–"} />
        <Meta
          label="벌 교체"
          value={elapsed.days == null ? "기록 없음" : `${elapsed.days}일째`}
          warn={elapsed.isOverdue}
        />
      </View>
    </Tap>
  );
}

function Metric({ label, value, unit, strong, color }: { label: string; value: string; unit: string; strong?: boolean; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <PretendardFont style={{ fontSize: 11.5, color: T.muted }}>{label}</PretendardFont>
      <PretendardFont
        weight="semibold"
        style={{ marginTop: 3, fontSize: strong ? 20 : 16, letterSpacing: strong ? -0.5 : 0, color: color ?? T.ink, fontVariant: ["tabular-nums"] }}
      >
        {value}
        <PretendardFont style={{ fontSize: 11.5, color: T.muted }}>{value === "–" ? "" : unit}</PretendardFont>
      </PretendardFont>
    </View>
  );
}

function Meta({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <PretendardFont style={{ fontSize: 12.5, color: T.muted }}>{label}</PretendardFont>
      <PretendardFont weight="semibold" style={{ fontSize: 12.5, color: warn ? T.hot : T.inkSoft }}>{value}</PretendardFont>
    </View>
  );
}

function MenuRow({ icon, label, destructive, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; destructive?: boolean; onPress: () => void }) {
  const color = destructive ? "#DC2626" : T.ink;
  return (
    <Tap
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderRadius: R.key, backgroundColor: pressed ? T.keyPressed : T.key })}
    >
      <Feather name={icon} size={18} color={color} />
      <PretendardFont weight="semibold" style={{ fontSize: 15.5, color }}>{label}</PretendardFont>
    </Tap>
  );
}

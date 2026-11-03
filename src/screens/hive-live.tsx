/**
 * 벌통 실시간 확인 화면
 * - 벌통 카드 줄로 벌통을 고르고, 날짜·시간대·간격을 골라 그 1시간의 기록을 표로 봅니다.
 * - 데이터는 백엔드 API(period=HOUR)에서 조회합니다. 지금 시간대를 보는 동안에만
 *   실시간(SSE) 연결을 열어, 새 값이 오면 해당 조회를 다시 불러옵니다.
 */
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, RefreshControl, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideFooterOnScroll } from "@/stores/useFooterVisibility";
import * as Haptics from "@/lib/haptics";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { useOrderedHives, useSyncHiveList } from "@/features/hive";
import { useHiveStore } from "@/stores/useHiveStore";
import { useHiveTelemetrySse, type HiveTelemetryEvent } from "@/features/hive-control/hooks";
import {
  LiveTelemetryTable,
  LoadingTips,
  useHiveTelemetryHourData,
  HIVE_TELEMETRY_HOUR_QUERY_KEY,
  type HiveTelemetryInterval,
} from "@/features/hive-status";
import { HiveCardRail, Panel, SectionHeader, Segmented, R, T } from "@/features/hive-home";

const INTERVAL_OPTIONS = [
  { value: "TEN_SEC", label: "10초" },
  { value: "ONE_MIN", label: "1분" },
  { value: "FIVE_MIN", label: "5분" },
  { value: "TEN_MIN", label: "10분" },
] as const satisfies readonly { value: HiveTelemetryInterval; label: string }[];

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const LIVE_REFRESH_MS = 30_000;
// 로그인 없이 보는 공개 웹(telemetry-web). 웹 서버에 공개 등록한 벌통에서만 버튼을 보여줍니다.
const TELEMETRY_WEB_URL = process.env.EXPO_PUBLIC_TELEMETRY_WEB_URL ?? "https://ourbee-telemetry.vercel.app";
const TELEMETRY_WEB_MACS = ["30:76:F5:A9:FD:C0", "B4:BF:E9:FA:E2:D0"];
/** 공개 벌통이면 웹 주소에 쓸 key(MAC, 콜론 없이 대문자)를, 아니면 null을 돌려줍니다. */
const telemetryWebKey = (mac?: string) => {
  const upper = mac?.trim().toUpperCase();
  return upper && TELEMETRY_WEB_MACS.includes(upper) ? upper.replace(/:/g, "") : null;
};

function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * 최근 7일치 날짜를 달력 한 주처럼 오래된 날부터 오늘(맨 오른쪽) 순서로 만듭니다.
 * 칸이 좁아 날짜는 일(日)만 쓰고, 달이 바뀌는 1일만 "11/1"처럼 달을 붙입니다.
 */
function buildRecentDateOptions() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const daysAgo = 6 - index;
    const date = startOfDay(today);
    date.setDate(date.getDate() - daysAgo);
    return {
      date,
      day: daysAgo === 0 ? "오늘" : WEEKDAY_LABELS[date.getDay()],
      dateLabel: date.getDate() === 1 ? `${date.getMonth() + 1}/1` : String(date.getDate()),
      fullLabel: `${date.getMonth() + 1}월 ${date.getDate()}일`,
    };
  });
}

const pad = (value: number) => String(value).padStart(2, "0");

export default function HiveLiveScreen() {
  const insets = useSafeAreaInsets();
  // 아래로 스크롤하면 하단 탭바를 숨기고, 위로 당기면 다시 보여줍니다.
  const footerScroll = useHideFooterOnScroll();
  const queryClient = useQueryClient();
  useSyncHiveList();
  const hives = useOrderedHives();
  const updateHiveTelemetry = useHiveStore((state) => state.updateHiveTelemetry);
  const { selectedHiveId } = useLocalSearchParams<{ selectedHiveId?: string }>();

  const [hiveId, setHiveId] = useState<string>(
    selectedHiveId && hives.some((h) => h.id === selectedHiveId) ? selectedHiveId : (hives[0]?.id ?? ""),
  );
  const [interval, setIntervalValue] = useState<HiveTelemetryInterval>("ONE_MIN");
  const dateOptions = useState(() => buildRecentDateOptions())[0];
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].date);
  const [selectedHour, setSelectedHour] = useState(() => new Date().getHours());

  const now = new Date();
  const isToday = isSameDay(selectedDate, now);
  const isViewingCurrentHour = isToday && selectedHour === now.getHours();
  const maxHour = isToday ? now.getHours() : 23;

  const from = useMemo(() => {
    const target = new Date(selectedDate);
    target.setHours(selectedHour, 0, 0, 0);
    return target;
  }, [selectedDate, selectedHour]);

  const telemetryQuery = useHiveTelemetryHourData({ hiveId, from, interval });
  const records = useMemo(() => telemetryQuery.data ?? [], [telemetryQuery.data]);
  // 버튼 반응을 먼저 처리하고, 큰 표는 그 뒤에 그립니다.
  const tableRecords = useDeferredValue(records);
  const currentHive = hives.find((hive) => hive.id === hiveId) ?? hives[0];

  // 받은 값은 공용 벌통 상태에도 반영하고, 보고 있는 벌통이면 현재 시간대를 다시 조회합니다.
  // 장치가 10초마다 보내므로 매번 1시간치를 다시 받지 않고 30초에 한 번만 갱신합니다.
  const lastRefreshRef = useRef(0);
  const handleTelemetry = useCallback(
    (event: HiveTelemetryEvent) => {
      updateHiveTelemetry(String(event.hiveId), event);
      if (String(event.hiveId) !== hiveId || Date.now() - lastRefreshRef.current < LIVE_REFRESH_MS) return;
      lastRefreshRef.current = Date.now();
      queryClient.invalidateQueries({ queryKey: [HIVE_TELEMETRY_HOUR_QUERY_KEY, hiveId] });
    },
    [hiveId, queryClient, updateHiveTelemetry],
  );

  // 실시간 연결은 지금 시간대를 볼 때만 엽니다.
  useHiveTelemetrySse({ enabled: isViewingCurrentHour, onTelemetry: handleTelemetry });

  const selectDate = (date: Date) => {
    setSelectedDate(date);
    // 오늘로 돌아오면 아직 오지 않은 시간대는 고를 수 없습니다.
    if (isSameDay(date, new Date())) setSelectedHour((hour) => Math.min(hour, new Date().getHours()));
  };

  const stepHour = (direction: 1 | -1) => {
    const next = selectedHour + direction;
    if (next < 0 || next > maxHour) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
    setSelectedHour(next);
  };

  const jumpToNow = () => {
    setSelectedDate(dateOptions[0].date);
    setSelectedHour(new Date().getHours());
  };

  const live = isViewingCurrentHour && currentHive?.status === "online";
  const statusLabel = live ? "실시간 수신 중" : isViewingCurrentHour ? "수신 대기" : "지난 기록";

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <View style={{ paddingHorizontal: 8, height: 60, flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={() => router.back()}
          style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? T.keyPressed : "transparent" })}
        >
          <Feather name="chevron-left" size={24} color={T.ink} />
        </Tap>
        <PretendardFont accessibilityRole="header" weight="bold" style={{ flex: 1, fontSize: 20, letterSpacing: -0.3, color: T.ink }}>
          실시간 확인
        </PretendardFont>
        {telemetryWebKey(currentHive?.macAddress) ? <Tap
          accessibilityRole="link"
          accessibilityLabel="웹으로 보기"
          accessibilityHint="공개 웹 페이지에서 이 벌통의 온습도를 엽니다"
          disabled={!currentHive}
          onPress={() => {
            void WebBrowser.openBrowserAsync(`${TELEMETRY_WEB_URL}/?hive=${telemetryWebKey(currentHive?.macAddress)}`);
          }}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, height: 36, paddingHorizontal: 10, borderRadius: R.chip, backgroundColor: pressed ? T.keyPressed : T.panel })}
        >
          <Feather name="external-link" size={14} color={T.inkSoft} />
          <PretendardFont weight="semibold" style={{ fontSize: 12.5, color: T.inkSoft }}>웹</PretendardFont>
        </Tap> : null}
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 6, marginRight: 12, paddingHorizontal: 12, height: 32, borderRadius: R.chip, backgroundColor: live ? T.goodSoft : T.panel }}
        >
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: live ? T.good : T.off }} />
          <PretendardFont weight="semibold" style={{ fontSize: 12.5, color: live ? T.good : T.inkSoft }}>{statusLabel}</PretendardFont>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={footerScroll.onScroll}
        scrollEventThrottle={footerScroll.scrollEventThrottle}
        refreshControl={<RefreshControl refreshing={telemetryQuery.isRefetching} onRefresh={() => void telemetryQuery.refetch()} />}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 120, gap: 12 }}
      >
        {hives.length > 1 ? <HiveCardRail compact hives={hives} selectedId={currentHive?.id ?? ""} onSelect={setHiveId} /> : null}

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Panel style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <SectionHeader
              title="조회 구간"
              right={
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel="AI 분석"
                  accessibilityHint="펠티어 정온 제어가 단계별로 잘 되는지 점검하는 화면으로 이동합니다"
                  disabled={!currentHive}
                  onPress={() => currentHive && router.push({ pathname: "/hive-analysis", params: { selectedHiveId: currentHive.id } })}
                  className="h-8 px-3 flex-row items-center gap-1 rounded-full"
                  style={({ pressed }) => ({ backgroundColor: pressed ? "#333B45" : T.ink })}
                >
                  <Feather name="cpu" size={13} color={T.panel} />
                  <PretendardFont weight="semibold" style={{ fontSize: 13, color: T.panel }}>AI 분석</PretendardFont>
                  <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.7)" />
                </Tap>
              }
            />

            {/* 토스 가계부의 한 주 달력처럼 7일을 한 줄에 모두 보여주고, 오늘이 맨 오른쪽입니다. */}
            <View accessibilityRole="radiogroup" accessibilityLabel="조회 날짜" className="flex-row mt-1.5">
              {dateOptions.map((option) => {
                const active = isSameDay(option.date, selectedDate);
                return (
                  <Tap
                    key={option.date.toISOString()}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${option.day === "오늘" ? "오늘, " : ""}${option.fullLabel}`}
                    onPress={() => selectDate(option.date)}
                    className="flex-1 items-center justify-center gap-0.5 py-2 rounded-2xl"
                    style={({ pressed }) => ({ backgroundColor: active ? T.ink : pressed ? T.keyPressed : "transparent" })}
                  >
                    <PretendardFont weight="medium" style={{ fontSize: 12, color: active ? "rgba(255,255,255,0.7)" : T.muted }}>{option.day}</PretendardFont>
                    <PretendardFont weight="bold" style={{ fontSize: 17, color: active ? T.panel : T.ink, fontVariant: ["tabular-nums"] }}>{option.dateLabel}</PretendardFont>
                  </Tap>
                );
              })}
            </View>

            {/* 시간대와 기록 간격은 기록 표가 많이 보이도록 한 줄씩 최소 높이로 둡니다. */}
            <View className="flex-row items-center mt-2.5 gap-1">
              <HourKey direction="chevron-left" label="이전 시간대" disabled={selectedHour <= 0} onPress={() => stepHour(-1)} />
              <PretendardFont
                accessibilityLiveRegion="polite"
                weight="semibold"
                style={{ fontSize: 17, color: T.ink, fontVariant: ["tabular-nums"] }}
              >
                {pad(selectedHour)}:00
                <PretendardFont weight="medium" style={{ fontSize: 13, color: T.muted }}> ~ {pad((selectedHour + 1) % 24)}:00</PretendardFont>
              </PretendardFont>
              <HourKey direction="chevron-right" label="다음 시간대" disabled={selectedHour >= maxHour} onPress={() => stepHour(1)} />
              <View className="flex-1" />
              {!isViewingCurrentHour ? (
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel="지금 시간대로"
                  onPress={jumpToNow}
                  className="h-8 px-3 justify-center rounded-full"
                  style={({ pressed }) => ({ backgroundColor: pressed ? T.keyPressed : T.brandSoft })}
                >
                  <PretendardFont weight="semibold" style={{ fontSize: 13, color: "#2B7DA3" }}>지금</PretendardFont>
                </Tap>
              ) : null}
            </View>

            <View className="mt-2 items-start">
              <Segmented compact label="기록 간격" options={INTERVAL_OPTIONS} value={interval} onChange={setIntervalValue} />
            </View>
          </Panel>

          <Panel style={{ paddingHorizontal: 16 }}>
            <SectionHeader
              title={`${currentHive?.name ?? "벌통"} 기록`}
              right={
                telemetryQuery.isFetching && records.length ? (
                  <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <ActivityIndicator size="small" color={T.muted} />
                    <PretendardFont style={{ fontSize: 12.5, color: T.muted }}>새 기록 불러오는 중</PretendardFont>
                  </View>
                ) : (
                  <PretendardFont style={{ fontSize: 12.5, color: T.muted }}>{records.length ? `${records.length}개 구간` : ""}</PretendardFont>
                )
              }
            />
            <View style={{ marginTop: 8 }}>
              {telemetryQuery.isLoading && !records.length ? (
                <LoadingTips />
              ) : telemetryQuery.isError && !records.length ? (
                <View accessibilityRole="alert" style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
                  <PretendardFont style={{ fontSize: 14, color: T.inkSoft }}>기록을 불러오지 못했어요</PretendardFont>
                  <Tap
                    accessibilityRole="button"
                    onPress={() => void telemetryQuery.refetch()}
                    style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 20, justifyContent: "center", borderRadius: R.key, backgroundColor: pressed ? T.keyPressed : T.key })}
                  >
                    <PretendardFont weight="semibold" style={{ fontSize: 14, color: T.ink }}>다시 불러오기</PretendardFont>
                  </Tap>
                </View>
              ) : (
                <LiveTelemetryTable records={tableRecords} />
              )}
            </View>
          </Panel>
        </View>
      </ScrollView>
    </View>
  );
}

function HourKey({ direction, label, disabled, onPress }: { direction: "chevron-left" | "chevron-right"; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? T.keyPressed : T.key, opacity: disabled ? 0.35 : 1 })}
    >
      <Feather name={direction} size={18} color={T.ink} />
    </Tap>
  );
}

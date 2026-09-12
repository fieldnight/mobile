/**
 * 벌통 실시간 확인 화면
 * - 선택한 벌통의 특정 날짜/시간대 온습도를 1/5/10분 간격 표로 보여줍니다.
 * - 데이터는 백엔드 API(period=HOUR)에서 조회하며, 현재 시간대를 보는 동안은
 *   SSE로 새 값이 올 때마다 해당 조회를 다시 불러와 최신 상태를 유지합니다.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Card } from "@/components/hive/hive-shared";
import { useAppToast } from "@/components/ToastContext";
import { C } from "@/constants/hive-colors";
import { useHiveStore } from "@/stores/useHiveStore";
import { useSyncHiveList } from "@/features/hive";
import { useHiveTelemetrySse, type HiveTelemetryEvent } from "@/features/hive-control/hooks";
import {
  LiveTelemetryTable,
  useHiveTelemetryHourData,
  HIVE_TELEMETRY_HOUR_QUERY_KEY,
  type HiveTelemetryInterval,
} from "@/features/hive-status";

const BG_IMAGE = require("../../assets/df.jpg");

const INTERVAL_OPTIONS: Array<{ value: HiveTelemetryInterval; label: string }> = [
  { value: "ONE_MIN", label: "1분" },
  { value: "FIVE_MIN", label: "5분" },
  { value: "TEN_MIN", label: "10분" },
];

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function triggerHaptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 오늘부터 최근 7일치 날짜를 최신순으로 만듭니다. */
function buildRecentDateOptions() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(today);
    date.setDate(date.getDate() - index);
    return {
      date,
      label: `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAY_LABELS[date.getDay()]})`,
      isToday: index === 0,
    };
  });
}

export default function HiveLiveScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { show: showToast } = useAppToast();
  useSyncHiveList();
  const hives = useHiveStore((state) => state.hives);
  const { selectedHiveId } = useLocalSearchParams<{ selectedHiveId?: string }>();

  const [hiveId, setHiveId] = useState<string>(
    selectedHiveId && hives.some((h) => h.id === selectedHiveId)
      ? selectedHiveId
      : (hives[0]?.id ?? ""),
  );
  const [interval, setIntervalValue] = useState<HiveTelemetryInterval>("ONE_MIN");
  const dateOptions = useState(() => buildRecentDateOptions())[0];
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].date);
  const [selectedHour, setSelectedHour] = useState(() => new Date().getHours());

  const isViewingCurrentHour = useMemo(() => {
    const now = new Date();
    return isSameDay(selectedDate, now) && selectedHour === now.getHours();
  }, [selectedDate, selectedHour]);

  const from = useMemo(() => {
    const target = new Date(selectedDate);
    target.setHours(selectedHour, 0, 0, 0);
    return target;
  }, [selectedDate, selectedHour]);

  const telemetryQuery = useHiveTelemetryHourData({ hiveId, from, interval });
  const records = telemetryQuery.data ?? [];

  useEffect(() => {
    console.log("[Hive Live] 조회 조건 변경", {
      hiveId,
      date: selectedDate.toISOString(),
      hour: selectedHour,
      interval,
    });
  }, [hiveId, selectedDate, selectedHour, interval]);

  // 현재 보고 있는 시간대가 지금 이 시각을 포함할 때만, 새 SSE 값이 오면 해당 조회를 다시 불러옵니다.
  const handleTelemetry = useCallback(
    (event: HiveTelemetryEvent) => {
      if (String(event.hiveId) !== hiveId || !isViewingCurrentHour) return;
      console.log("[Hive Live] SSE 수신, 현재 시간대 다시 조회", {
        hiveId,
        recordedAt: event.recordedAt,
      });
      queryClient.invalidateQueries({
        queryKey: [HIVE_TELEMETRY_HOUR_QUERY_KEY, hiveId],
      });
    },
    [hiveId, isViewingCurrentHour, queryClient],
  );

  useHiveTelemetrySse({ enabled: true, onTelemetry: handleTelemetry });

  const currentHive = hives.find((hive) => hive.id === hiveId);

  if (telemetryQuery.isError && !telemetryQuery.isFetching) {
    console.error("[Hive Live] 온습도 데이터 조회 실패", {
      hiveId,
      from: from.toISOString(),
      interval,
      error: telemetryQuery.error,
    });
    showToast("온습도 데이터를 불러오지 못했어요", "error");
  }

  return (
    <ImageBackground source={BG_IMAGE} resizeMode="cover" className="flex-1">
      <View
        className="flex-row items-center justify-between px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          hitSlop={12}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
          style={{ backgroundColor: "rgba(255,255,255,0.8)" }}
        >
          <Feather name="chevron-left" size={22} color={C.text} />
        </Pressable>
        <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
          실시간 확인
        </PretendardFont>
        <View className="h-9 w-9" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingTop: 4,
          paddingBottom: insets.bottom + 40,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {hives.length > 1 ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {hives.map((hive) => {
              const active = hive.id === hiveId;
              return (
                <Pressable
                  key={hive.id}
                  onPress={() => {
                    triggerHaptic();
                    setHiveId(hive.id);
                  }}
                  className="rounded-full px-4 py-2 active:opacity-70"
                  style={{
                    backgroundColor: active ? C.text : "rgba(255,255,255,0.8)",
                    borderWidth: 1,
                    borderColor: active ? C.text : C.border,
                  }}
                >
                  <PretendardFont
                    weight={active ? "bold" : "medium"}
                    style={{ fontSize: 13, color: active ? C.white : C.sec }}
                  >
                    {hive.name}
                  </PretendardFont>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <Card style={{ backgroundColor: "rgba(255,255,255,0.9)" }}>
          <View className="mb-3 flex-row items-center justify-between">
            <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
              {currentHive?.name ?? "벌통"} 온습도
            </PretendardFont>
            <View className="flex-row items-center gap-1.5">
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    isViewingCurrentHour && currentHive?.status === "online"
                      ? C.success
                      : C.ter,
                }}
              />
              <PretendardFont weight="medium" style={{ fontSize: 12, color: C.sec }}>
                {isViewingCurrentHour && currentHive?.status === "online"
                  ? "실시간 수신 중"
                  : "지난 기록"}
              </PretendardFont>
            </View>
          </View>

          <PretendardFont weight="bold" style={{ fontSize: 13, color: C.textAlt, marginBottom: 6 }}>
            날짜
          </PretendardFont>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
            style={{ marginBottom: 12 }}
          >
            {dateOptions.map((option) => {
              const active = isSameDay(option.date, selectedDate);
              return (
                <Pressable
                  key={option.date.toISOString()}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedDate(option.date);
                  }}
                  className="items-center rounded-full px-3.5 py-2 active:opacity-70"
                  style={{
                    backgroundColor: active ? C.text : C.white,
                    borderWidth: 1,
                    borderColor: active ? C.text : C.border,
                  }}
                >
                  <PretendardFont
                    weight={active ? "bold" : "medium"}
                    style={{ fontSize: 13, color: active ? C.white : C.sec }}
                  >
                    {option.isToday ? `오늘 ${option.label}` : option.label}
                  </PretendardFont>
                </Pressable>
              );
            })}
          </ScrollView>

          <PretendardFont weight="bold" style={{ fontSize: 13, color: C.textAlt, marginBottom: 6 }}>
            시간대
          </PretendardFont>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
            style={{ marginBottom: 12 }}
          >
            {HOURS.map((hour) => {
              const active = hour === selectedHour;
              return (
                <Pressable
                  key={hour}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedHour(hour);
                  }}
                  className="items-center rounded-full px-3 py-2 active:opacity-70"
                  style={{
                    backgroundColor: active ? C.text : C.white,
                    borderWidth: 1,
                    borderColor: active ? C.text : C.border,
                  }}
                >
                  <PretendardFont
                    weight={active ? "bold" : "medium"}
                    style={{ fontSize: 13, color: active ? C.white : C.sec }}
                  >
                    {String(hour).padStart(2, "0")}시
                  </PretendardFont>
                </Pressable>
              );
            })}
          </ScrollView>

          <PretendardFont weight="bold" style={{ fontSize: 13, color: C.textAlt, marginBottom: 6 }}>
            간격
          </PretendardFont>
          <View className="mb-4 flex-row gap-2">
            {INTERVAL_OPTIONS.map((option) => {
              const active = option.value === interval;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    triggerHaptic();
                    setIntervalValue(option.value);
                  }}
                  className="flex-1 items-center rounded-lg py-2.5"
                  style={{
                    backgroundColor: active ? C.text : C.white,
                    borderWidth: 1,
                    borderColor: active ? C.text : C.border,
                  }}
                >
                  <PretendardFont
                    weight={active ? "bold" : "medium"}
                    style={{ fontSize: 13, color: active ? C.white : C.sec }}
                  >
                    {option.label}
                  </PretendardFont>
                </Pressable>
              );
            })}
          </View>

          {telemetryQuery.isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : (
            <LiveTelemetryTable records={records} />
          )}
        </Card>
      </ScrollView>
    </ImageBackground>
  );
}

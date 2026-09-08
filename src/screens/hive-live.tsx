/**
 * 벌통 실시간 확인 화면
 * - 선택한 벌통의 SSE 온습도 데이터를 1/5/10분 간격 표로 보여줍니다.
 * - 로컬(AsyncStorage)에 최근 7일치만 저장하며, 저장 범위를 화면에 안내합니다.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Card } from "@/components/hive/hive-shared";
import { C } from "@/constants/hive-colors";
import { useHiveStore } from "@/stores/useHiveStore";
import { useSyncHiveList } from "@/features/hive";
import { useHiveTelemetrySse, type HiveTelemetryEvent } from "@/features/hive-control/hooks";
import {
  LiveTelemetryTable,
  getHiveTelemetryLog,
  bucketizeTelemetryLog,
  filterTelemetryLogByDateAndHour,
  type HiveTelemetryLogRecord,
  type TelemetryIntervalMinutes,
} from "@/features/hive-status";

const BG_IMAGE = require("../../assets/df.jpg");

const INTERVAL_OPTIONS: Array<{ value: TelemetryIntervalMinutes; label: string }> = [
  { value: 1, label: "1분" },
  { value: 5, label: "5분" },
  { value: 10, label: "10분" },
];

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function triggerHaptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 오늘부터 최근 7일치 날짜(yyyy-MM-dd)를 최신순으로 만듭니다. */
function buildRecentDateOptions() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    return {
      dateKey: toDateKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAY_LABELS[date.getDay()]})`,
      isToday: index === 0,
    };
  });
}

export default function HiveLiveScreen() {
  const insets = useSafeAreaInsets();
  useSyncHiveList();
  const hives = useHiveStore((state) => state.hives);
  const { selectedHiveId } = useLocalSearchParams<{ selectedHiveId?: string }>();

  const [hiveId, setHiveId] = useState<string>(
    selectedHiveId && hives.some((h) => h.id === selectedHiveId)
      ? selectedHiveId
      : (hives[0]?.id ?? ""),
  );
  const [interval, setIntervalValue] = useState<TelemetryIntervalMinutes>(1);
  const [rawRecords, setRawRecords] = useState<HiveTelemetryLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const dateOptions = useState(() => buildRecentDateOptions())[0];
  const [selectedDateKey, setSelectedDateKey] = useState(dateOptions[0].dateKey);
  const [selectedHour, setSelectedHour] = useState(() => new Date().getHours());

  useEffect(() => {
    if (hives.length && !hives.some((hive) => hive.id === hiveId)) {
      setHiveId(hives[0].id);
    }
  }, [hives, hiveId]);

  const reload = useCallback(async () => {
    if (!hiveId) {
      setRawRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const records = await getHiveTelemetryLog(hiveId);
    setRawRecords(records);
    setLoading(false);
  }, [hiveId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // 화면이 열려 있는 동안 새 SSE 값이 오면 즉시 표에 반영합니다.
  const handleTelemetry = useCallback(
    (event: HiveTelemetryEvent) => {
      if (String(event.hiveId) !== hiveId) return;
      setRawRecords((prev) => [
        ...prev,
        {
          recordedAt: event.recordedAt,
          internalTemperature: event.internalTemperature,
          internalHumidity: event.internalHumidity,
          externalTemperature: event.externalTemperature,
          externalHumidity: event.externalHumidity,
        },
      ]);
    },
    [hiveId],
  );

  useHiveTelemetrySse({ enabled: true, onTelemetry: handleTelemetry });

  const hourFilteredRecords = filterTelemetryLogByDateAndHour(
    rawRecords,
    selectedDateKey,
    selectedHour,
  );
  const displayRecords = bucketizeTelemetryLog(hourFilteredRecords, interval);
  const currentHive = hives.find((hive) => hive.id === hiveId);

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
              {currentHive?.name ?? "벌통"} 실시간 온습도
            </PretendardFont>
            <View className="flex-row items-center gap-1.5">
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: currentHive?.status === "online" ? C.success : C.ter,
                }}
              />
              <PretendardFont weight="medium" style={{ fontSize: 12, color: C.sec }}>
                {currentHive?.status === "online" ? "실시간 수신 중" : "오프라인"}
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
              const active = option.dateKey === selectedDateKey;
              return (
                <Pressable
                  key={option.dateKey}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedDateKey(option.dateKey);
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
            {Array.from({ length: 24 }, (_, hour) => hour).map((hour) => {
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

          <View
            className="mb-4 flex-row items-start gap-2 rounded-lg p-3"
            style={{ backgroundColor: C.bg }}
          >
            <Feather name="info" size={14} color={C.sec} style={{ marginTop: 1 }} />
            <PretendardFont
              weight="medium"
              style={{ fontSize: 12, color: C.sec, flex: 1, lineHeight: 18 }}
            >
              실시간 데이터는 휴대폰에 최근 7일치만 저장돼요. 7일이 지난 데이터는 자동으로
              삭제됩니다.
            </PretendardFont>
          </View>

          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : (
            <LiveTelemetryTable records={displayRecords} />
          )}
        </Card>
      </ScrollView>
    </ImageBackground>
  );
}

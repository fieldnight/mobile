import { useMemo, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useHiveStore } from "@/stores/useHiveStore";
import type { HiveData } from "@/types/hive-control";
import {
  formatReplacementDate,
  getHiveReplacementHistory,
  getReplacementElapsed,
  normalizeReplacementDate,
  parseReplacementDate,
} from "../model/replacement";

interface HiveReplacementCardProps {
  hive?: HiveData;
}

const FORM_PANEL_BG = "#EEF2F6";
const INFO_PANEL_BG = "#EAF4FF";
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 선택된 벌통의 현재 교체 상태를 표 형태로 보여줍니다.
 * API 연결 전까지 당일 또는 사용자가 고른 날짜를 로컬 store에 기록합니다.
 */
export function HiveReplacementCard({ hive }: HiveReplacementCardProps) {
  const updateReplacedAt = useHiveStore((state) => state.updateReplacedAt);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  if (!hive) return null;

  const history = getHiveReplacementHistory(hive);
  const latest = history[0];
  const lastReplacedAt = normalizeReplacementDate(latest?.replacedAt ?? hive.replacedAt);
  const elapsed = getReplacementElapsed(lastReplacedAt);

  const runLightHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTodayReplace = () => {
    runLightHaptic();
    updateReplacedAt(hive.id);
  };

  const openDateModal = () => {
    const baseDate = parseReplacementDate(lastReplacedAt) ?? new Date();
    setSelectedDate(baseDate);
    setVisibleMonth(startOfMonth(baseDate));
    setDateModalVisible(true);
  };

  const handleSelectedDateReplace = () => {
    runLightHaptic();
    updateReplacedAt(hive.id, formatReplacementDate(selectedDate));
    setDateModalVisible(false);
  };

  const moveMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <>
      <Card
        delay={180}
        className="mb-10"
        style={{
          marginHorizontal: -14,
          backgroundColor: "rgba(255,255,255,0.72)",
          elevation: 0,
        }}
      >
        <View className="mb-4">
          <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
            <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
              벌통 교체
            </PretendardFont>
            <View className="flex-row" style={{ gap: 6 }}>
              <ReplacementActionButton
                label="당일교체"
                icon="check"
                selected
                compact
                onPress={handleTodayReplace}
              />
              <ReplacementActionButton
                label="날짜 설정"
                icon="calendar"
                compact
                onPress={openDateModal}
              />
            </View>
          </View>
          <PretendardFont style={{ fontSize: 13, color: C.textSx, lineHeight: 19, marginTop: 6 }}>
            수정벌을 교체한 날짜와 사용일수를 확인해요.
          </PretendardFont>
        </View>

        <View className="flex-row rounded-xl px-3 py-2" style={{ backgroundColor: C.bgAlt }}>
          <PretendardFont weight="bold" style={{ flex: 1, fontSize: 12, color: C.sec }}>
            구분
          </PretendardFont>
          <PretendardFont weight="bold" style={{ flex: 1.35, fontSize: 12, color: C.sec }}>
            마지막 교체
          </PretendardFont>
          <PretendardFont
            weight="bold"
            style={{ flex: 1, fontSize: 12, color: C.sec, textAlign: "right" }}
          >
            사용일수
          </PretendardFont>
        </View>

        <View
          className="flex-row px-3 py-3"
          style={{ borderBottomWidth: 1, borderBottomColor: C.border }}
        >
          <PretendardFont style={{ flex: 1, fontSize: 13, color: C.text }}>
            {hive.name}
          </PretendardFont>
          <PretendardFont style={{ flex: 1.35, fontSize: 13, color: C.text }}>
            {lastReplacedAt || "미등록"}
          </PretendardFont>
          <PretendardFont
            weight="semibold"
            style={{
              flex: 1,
              fontSize: 13,
              color: elapsed.isOverdue ? "#DC2626" : C.text,
              textAlign: "right",
            }}
          >
            {elapsed.label}
          </PretendardFont>
        </View>

      </Card>

      <BottomSheet
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        title="교체 날짜 선택"
        contentScrollEnabled={false}
      >
        <SheetInfo>
          실제로 수정벌을 교체한 날짜를 선택하면 이 벌통의 마지막 교체일로 기록돼요.
        </SheetInfo>

        <View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: FORM_PANEL_BG }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => moveMonth(-1)}
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: C.white }}
            >
              <Feather name="chevron-left" size={18} color={C.text} />
            </Pressable>
            <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
              {visibleMonth.getFullYear()}년 {visibleMonth.getMonth() + 1}월
            </PretendardFont>
            <Pressable
              onPress={() => moveMonth(1)}
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: C.white }}
            >
              <Feather name="chevron-right" size={18} color={C.text} />
            </Pressable>
          </View>

          <View className="mb-2 flex-row">
            {WEEKDAY_LABELS.map((label) => (
              <View key={label} className="items-center" style={{ width: `${100 / 7}%` }}>
                <PretendardFont weight="bold" style={{ fontSize: 12, color: C.sec }}>
                  {label}
                </PretendardFont>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {calendarDays.map((date, index) => {
              const selected = !!date && isSameDate(date, selectedDate);
              const disabled = !!date && isFutureDate(date);

              return (
                <View
                  key={date ? formatReplacementDate(date) : `empty-${index}`}
                  className="items-center justify-center py-1"
                  style={{ width: `${100 / 7}%` }}
                >
                  {date ? (
                    <Pressable
                      disabled={disabled}
                      onPress={() => setSelectedDate(date)}
                      className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
                      style={{
                        backgroundColor: selected ? C.primary : C.white,
                        opacity: disabled ? 0.35 : 1,
                      }}
                    >
                      <PretendardFont
                        weight={selected ? "bold" : "medium"}
                        style={{ fontSize: 14, color: selected ? C.white : C.text }}
                      >
                        {date.getDate()}
                      </PretendardFont>
                    </Pressable>
                  ) : (
                    <View className="h-9 w-9" />
                  )}
                </View>
              );
            })}
          </View>

          <View className="mt-4 rounded-2xl px-4 py-3" style={{ backgroundColor: C.white }}>
            <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.text }}>
              선택한 날짜: {formatReplacementDate(selectedDate)}
            </PretendardFont>
          </View>
        </View>

        <View className="mt-6 flex-row gap-2.5">
          <Pressable
            onPress={() => setDateModalVisible(false)}
            className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
            style={{ backgroundColor: FORM_PANEL_BG }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.textAlt }}>
              취소
            </PretendardFont>
          </Pressable>
          <Pressable
            onPress={handleSelectedDateReplace}
            className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
            style={{ backgroundColor: C.primary }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
              기록하기
            </PretendardFont>
          </Pressable>
        </View>
      </BottomSheet>
    </>
  );
}

function ReplacementActionButton({
  label,
  icon,
  selected = false,
  compact = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  selected?: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center rounded-2xl active:opacity-85"
      style={{
        backgroundColor: selected ? C.text : FORM_PANEL_BG,
        paddingHorizontal: compact ? 10 : 16,
        paddingVertical: compact ? 8 : 12,
        gap: 6,
      }}
    >
      <Feather name={icon} size={15} color={selected ? C.white : C.text} />
      <PretendardFont
        weight="bold"
        style={{ fontSize: 13, color: selected ? C.white : C.text }}
      >
        {label}
      </PretendardFont>
    </Pressable>
  );
}

function SheetInfo({ children }: { children: string }) {
  return (
    <View className="mb-2 rounded-2xl p-4" style={{ backgroundColor: INFO_PANEL_BG }}>
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 13, color: C.primary, lineHeight: 20 }}
        >
          {children}
        </PretendardFont>
    </View>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: Array<Date | null> = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= lastDate; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isFutureDate(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target.getTime() > today.getTime();
}

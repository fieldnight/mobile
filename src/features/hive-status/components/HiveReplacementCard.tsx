import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { BottomSheet, ConfirmSheet } from "@/components/BottomSheet";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { C } from "@/constants/hive-colors";
import type { HiveData } from "@/types/hive-control";
import type { HiveReplacementHistory } from "../api/replacementHistoryApi";
import {
  useCreateHiveReplacementHistory,
  useDeleteHiveReplacementHistory,
  useHiveReplacementHistoryDetail,
  useHiveReplacementHistoryList,
  useUpdateHiveReplacementHistory,
} from "../hooks/useHiveReplacementHistory";
import {
  formatReplacementDate,
  getReplacementElapsed,
  parseReplacementDate,
} from "../model/replacement";

interface HiveReplacementCardProps {
  hive?: HiveData;
}

const FORM_PANEL_BG = "#EEF2F6";
const INFO_PANEL_BG = "#EAF4FF";
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 스마트벌통 메인 화면의 벌통 교체 섹션.
 * 목록 조회, 등록, 수정, 삭제, 상세 조회 API를 모두 연결합니다.
 */
export function HiveReplacementCard({ hive }: HiveReplacementCardProps) {
  const { show: showToast } = useAppToast();
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [editingHistoryId, setEditingHistoryId] = useState<number | undefined>();
  const [deletingRecord, setDeletingRecord] = useState<HiveReplacementHistory | null>(null);

  const historyQuery = useHiveReplacementHistoryList(hive?.id, { size: 5 });
  const detailQuery = useHiveReplacementHistoryDetail({
    hiveId: hive?.id,
    historyId: editingHistoryId,
  });
  const createHistory = useCreateHiveReplacementHistory();
  const updateHistory = useUpdateHiveReplacementHistory();
  const deleteHistory = useDeleteHiveReplacementHistory();

  const history = historyQuery.data?.content ?? [];
  const latest = history[0];
  const elapsed = getReplacementElapsed(latest?.replacedAt, latest?.usageDays);
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const submitting =
    createHistory.isLoading || updateHistory.isLoading || deleteHistory.isLoading;

  useEffect(() => {
    if (!detailQuery.data || sheetMode !== "edit") return;

    const date = parseReplacementDate(detailQuery.data.replacedAt) ?? new Date();
    setSelectedDate(date);
    setVisibleMonth(startOfMonth(date));
    setSheetVisible(true);
  }, [detailQuery.data, sheetMode]);

  if (!hive) return null;

  const runLightHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const openCreateSheet = (date = new Date()) => {
    runLightHaptic();
    setSheetMode("create");
    setEditingHistoryId(undefined);
    setSelectedDate(date);
    setVisibleMonth(startOfMonth(date));
    setSheetVisible(true);
  };

  const openEditSheet = (record: HiveReplacementHistory) => {
    runLightHaptic();
    setSheetMode("edit");
    setEditingHistoryId(record.replacementHistoryId);
  };

  const handleTodayReplace = () => {
    if (!hive.id || createHistory.isPending) return;

    runLightHaptic();
    const body = { replacedAt: formatReplacementDate(new Date()) };

    createHistory.mutate(
      { hiveId: hive.id, body },
      {
        onSuccess: () => {
          console.log("[Hive Replacement UI] 당일 교체 등록 반영", {
            hiveId: hive.id,
            body,
          });
          showToast("오늘 날짜로 교체 기록을 등록했어요", "success");
        },
        onError: () => {
          showToast("교체 기록 등록에 실패했어요", "error");
        },
      },
    );
  };

  const submitSheet = () => {
    if (!hive.id || submitting) return;

    const body = { replacedAt: formatReplacementDate(selectedDate) };

    if (sheetMode === "edit" && editingHistoryId) {
      updateHistory.mutate(
        { hiveId: hive.id, historyId: editingHistoryId, body },
        {
          onSuccess: () => {
            console.log("[Hive Replacement UI] 교체 기록 수정 반영", {
              hiveId: hive.id,
              historyId: editingHistoryId,
              body,
            });
            showToast("교체 기록을 수정했어요", "success");
            setSheetVisible(false);
            setEditingHistoryId(undefined);
          },
          onError: () => {
            showToast("교체 기록 수정에 실패했어요", "error");
          },
        },
      );
      return;
    }

    createHistory.mutate(
      { hiveId: hive.id, body },
      {
        onSuccess: () => {
          console.log("[Hive Replacement UI] 교체 기록 등록 반영", {
            hiveId: hive.id,
            body,
          });
          showToast("교체 기록을 등록했어요", "success");
          setSheetVisible(false);
        },
        onError: () => {
          showToast("교체 기록 등록에 실패했어요", "error");
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!hive.id || !deletingRecord) return;

    const record = deletingRecord;
    deleteHistory.mutate(
      { hiveId: hive.id, historyId: record.replacementHistoryId },
      {
        onSuccess: () => {
          console.log("[Hive Replacement UI] 교체 기록 삭제 반영", {
            hiveId: hive.id,
            historyId: record.replacementHistoryId,
          });
          showToast("교체 기록을 삭제했어요", "success");
          setDeletingRecord(null);
        },
        onError: () => {
          showToast("교체 기록 삭제에 실패했어요", "error");
        },
      },
    );
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
            <View className="flex-1">
              <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
                벌통 교체
              </PretendardFont>
              <PretendardFont style={{ fontSize: 13, color: C.textSx, lineHeight: 19, marginTop: 6 }}>
                수정벌 교체 날짜와 사용일수를 기록해요.
              </PretendardFont>
            </View>
            <View className="flex-row" style={{ gap: 6 }}>
              <ReplacementActionButton
                label="당일교체"
                icon="check"
                selected
                compact
                disabled={createHistory.isPending}
                onPress={handleTodayReplace}
              />
              <ReplacementActionButton
                label="날짜추가"
                icon="calendar"
                compact
                onPress={() => openCreateSheet()}
              />
            </View>
          </View>
        </View>

        <View className="mb-3 rounded-2xl px-4 py-3" style={{ backgroundColor: C.bgAlt }}>
          <View className="flex-row items-center justify-between">
            <View>
              <PretendardFont weight="bold" style={{ fontSize: 13, color: C.sec }}>
                마지막 교체
              </PretendardFont>
              <PretendardFont weight="bold" style={{ fontSize: 18, color: C.text, marginTop: 3 }}>
                {latest?.replacedAt ?? "미등록"}
              </PretendardFont>
            </View>
            <View className="items-end">
              <PretendardFont weight="bold" style={{ fontSize: 13, color: C.sec }}>
                사용일수
              </PretendardFont>
              <PretendardFont
                weight="bold"
                style={{
                  fontSize: 18,
                  color: elapsed.isOverdue ? C.error : C.text,
                  marginTop: 3,
                }}
              >
                {elapsed.label}
              </PretendardFont>
            </View>
          </View>
        </View>

        <View className="flex-row rounded-xl px-3 py-2" style={{ backgroundColor: C.bgAlt }}>
          <PretendardFont weight="bold" style={{ flex: 1.3, fontSize: 12, color: C.sec }}>
            교체날짜
          </PretendardFont>
          <PretendardFont
            weight="bold"
            style={{ flex: 1, fontSize: 12, color: C.sec, textAlign: "right" }}
          >
            사용일수
          </PretendardFont>
          <View style={{ width: 108 }} />
        </View>

        {historyQuery.isLoading ? (
          <View className="items-center py-5">
            <ActivityIndicator size="small" color={C.primary} />
          </View>
        ) : history.length ? (
          history.slice(0, 5).map((record, index) => (
            <View
              key={record.replacementHistoryId}
              className="flex-row items-center px-3 py-3"
              style={{
                borderBottomWidth: index < Math.min(history.length, 5) - 1 ? 1 : 0,
                borderBottomColor: C.border,
              }}
            >
              <PretendardFont style={{ flex: 1.3, fontSize: 13, color: C.text }}>
                {record.replacedAt}
              </PretendardFont>
              <PretendardFont
                weight="semibold"
                style={{ flex: 1, fontSize: 13, color: C.text, textAlign: "right" }}
              >
                {getReplacementElapsed(record.replacedAt, record.usageDays).label}
              </PretendardFont>
              <View className="ml-3 flex-row" style={{ gap: 10 }}>
                <IconAction
                  icon="edit-2"
                  color={C.text}
                  disabled={detailQuery.isFetching && editingHistoryId === record.replacementHistoryId}
                  onPress={() => openEditSheet(record)}
                />
                <IconAction
                  icon="trash-2"
                  color={C.error}
                  onPress={() => setDeletingRecord(record)}
                />
              </View>
            </View>
          ))
        ) : (
          <View className="px-3 py-5">
            <PretendardFont style={{ fontSize: 13, color: C.ter }}>
              아직 등록된 교체 기록이 없습니다.
            </PretendardFont>
          </View>
        )}
      </Card>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={sheetMode === "edit" ? "교체 기록 수정" : "교체 기록 추가"}
        contentScrollEnabled={false}
      >
        <SheetInfo>
          실제로 수정벌을 교체한 날짜를 선택하면 서버 교체 기록에 저장돼요.
        </SheetInfo>

        <View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: FORM_PANEL_BG }}>
          <View className="mb-4 flex-row items-center justify-between">
            <IconAction icon="chevron-left" color={C.text} onPress={() => moveMonth(-1)} />
            <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
              {visibleMonth.getFullYear()}년 {visibleMonth.getMonth() + 1}월
            </PretendardFont>
            <IconAction icon="chevron-right" color={C.text} onPress={() => moveMonth(1)} />
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
                  className="items-center justify-center py-2"
                  style={{ width: `${100 / 7}%` }}
                >
                  {date ? (
                    <Pressable
                      disabled={disabled}
                      onPress={() => setSelectedDate(date)}
                      hitSlop={6}
                      className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
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
                    <View className="h-11 w-11" />
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
            onPress={() => setSheetVisible(false)}
            className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
            style={{ backgroundColor: FORM_PANEL_BG }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.textAlt }}>
              취소
            </PretendardFont>
          </Pressable>
          <Pressable
            onPress={submitSheet}
            disabled={submitting}
            className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
            style={{ backgroundColor: submitting ? C.ter : C.primary }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
              {submitting ? "저장 중" : sheetMode === "edit" ? "수정하기" : "등록하기"}
            </PretendardFont>
          </Pressable>
        </View>
      </BottomSheet>

      <ConfirmSheet
        visible={deletingRecord != null}
        onClose={() => setDeletingRecord(null)}
        title="교체 기록 삭제"
        message={
          deletingRecord
            ? `${deletingRecord.replacedAt} 교체 기록을 삭제할까요?`
            : undefined
        }
        confirmLabel="삭제하기"
        cancelLabel="취소"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}

function ReplacementActionButton({
  label,
  icon,
  selected = false,
  compact = false,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  selected?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center justify-center rounded-2xl active:opacity-85"
      style={{
        backgroundColor: selected ? C.text : FORM_PANEL_BG,
        paddingHorizontal: compact ? 10 : 16,
        paddingVertical: compact ? 8 : 12,
        gap: 6,
        opacity: disabled ? 0.5 : 1,
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

function IconAction({
  icon,
  color,
  disabled = false,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
      style={{ backgroundColor: C.white, opacity: disabled ? 0.5 : 1 }}
    >
      <Feather name={icon} size={20} color={color} />
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

import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import * as Haptics from "@/lib/haptics";
import { Feather } from "@expo/vector-icons";
import { BottomSheet, ConfirmSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { C } from "@/constants/hive-colors";
import { Tap } from "@/components/Tap";
import { T } from "@/features/hive-home/theme";
import type { HiveData } from "@/types/hive-control";
import { getReplacementErrorMessage, type HiveReplacementHistory } from "../api/replacementHistoryApi";
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
    if (!hive.id || createHistory.isLoading) return;

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
        onError: (error) => {
          showToast(getReplacementErrorMessage(error, "교체 기록 등록에 실패했어요"), "error");
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
          onError: (error) => {
            showToast(getReplacementErrorMessage(error, "교체 기록 수정에 실패했어요"), "error");
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
        onError: (error) => {
          showToast(getReplacementErrorMessage(error, "교체 기록 등록에 실패했어요"), "error");
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
        onError: (error) => {
          showToast(getReplacementErrorMessage(error, "교체 기록 삭제에 실패했어요"), "error");
        },
      },
    );
  };

  const moveMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <>
      {/* 화면의 "벌 교체" 섹션 제목 아래에 놓이는 흰 카드. 한 줄 요약 + 최근 기록만 보여 높이를 줄였습니다. */}
      <View style={{ backgroundColor: T.panel, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <PretendardFont style={{ fontSize: 12.5, color: T.muted }}>마지막 교체</PretendardFont>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 2 }}>
              <PretendardFont weight="bold" style={{ fontSize: 17, color: T.ink, fontVariant: ["tabular-nums"] }}>
                {latest?.replacedAt ?? "기록 없음"}
              </PretendardFont>
              {latest ? (
                <PretendardFont weight="semibold" style={{ fontSize: 14, color: elapsed.isOverdue ? T.hot : T.inkSoft }}>
                  {elapsed.label}째
                </PretendardFont>
              ) : null}
            </View>
          </View>
          <Tap
            accessibilityRole="button"
            accessibilityLabel="오늘 날짜로 교체 기록"
            disabled={createHistory.isPending}
            onPress={handleTodayReplace}
            style={({ pressed }) => ({ height: 44, paddingHorizontal: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: pressed ? "#333B45" : T.ink, opacity: createHistory.isPending ? 0.5 : 1 })}
          >
            <Feather name="check" size={15} color={T.panel} />
            <PretendardFont weight="bold" style={{ fontSize: 13.5, color: T.panel }}>오늘 교체</PretendardFont>
          </Tap>
          <Tap
            accessibilityRole="button"
            accessibilityLabel="날짜를 골라 교체 기록 추가"
            onPress={() => openCreateSheet()}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? T.keyPressed : T.key })}
          >
            <Feather name="calendar" size={17} color={T.ink} />
          </Tap>
        </View>

        {historyQuery.isLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={T.inkSoft} />
          </View>
        ) : history.length ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: T.line }}>
            {history.slice(0, 3).map((record) => (
              <View
                key={record.replacementHistoryId}
                style={{ flexDirection: "row", alignItems: "center", minHeight: 44, borderBottomWidth: 1, borderBottomColor: T.line }}
              >
                <PretendardFont style={{ flex: 1, fontSize: 14, color: T.ink, fontVariant: ["tabular-nums"] }}>{record.replacedAt}</PretendardFont>
                <PretendardFont weight="semibold" style={{ width: 64, fontSize: 13.5, color: T.inkSoft, textAlign: "right" }}>
                  {getReplacementElapsed(record.replacedAt, record.usageDays).label}
                </PretendardFont>
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel={`${record.replacedAt} 기록 수정`}
                  disabled={detailQuery.isFetching && editingHistoryId === record.replacementHistoryId}
                  onPress={() => openEditSheet(record)}
                  hitSlop={6}
                  style={({ pressed }) => ({ width: 40, height: 40, marginLeft: 8, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: pressed ? T.keyPressed : "transparent" })}
                >
                  <Feather name="edit-2" size={16} color={T.inkSoft} />
                </Tap>
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel={`${record.replacedAt} 기록 삭제`}
                  onPress={() => setDeletingRecord(record)}
                  hitSlop={6}
                  style={({ pressed }) => ({ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: pressed ? T.keyPressed : "transparent" })}
                >
                  <Feather name="trash-2" size={16} color={T.hot} />
                </Tap>
              </View>
            ))}
            {history.length > 3 ? (
              <PretendardFont style={{ marginTop: 8, fontSize: 12.5, color: T.muted }}>최근 3건만 보여드려요</PretendardFont>
            ) : null}
          </View>
        ) : null}
      </View>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={sheetMode === "edit" ? "교체 기록 수정" : "교체 기록 추가"}
        contentScrollEnabled={false}
      >
        <SheetInfo>
          실제로 수정벌을 교체한 날짜를 선택하면 서버 교체 기록에 저장돼요.
        </SheetInfo>

        <View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: C.bgAlt }}>
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
            style={{ backgroundColor: C.bgAlt }}
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
    <View className="mb-2 rounded-2xl p-4" style={{ backgroundColor: C.infoBg }}>
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 13, color: C.textAlt, lineHeight: 20 }}
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

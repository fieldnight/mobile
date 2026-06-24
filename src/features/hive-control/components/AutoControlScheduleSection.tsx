import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Switch, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ConfirmSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { C } from "@/constants/hive-colors";
import {
  AUTO_SCHEDULE_PRESETS,
  getScheduleLabel,
  isSameScheduleTime,
  isOverlappingSchedule,
  isValidScheduleRange,
} from "../model/autoSchedule";
import {
  useCreateHiveAutoControlSchedule,
  useDeleteHiveAutoControlSchedule,
  useHiveAutoControlSchedules,
} from "../hooks";
import type { HiveAutoControlSchedule } from "../api";
import { AutoControlScheduleSheet } from "./AutoControlScheduleSheet";

interface AutoControlScheduleSectionProps {
  hiveId?: string | number;
  hiveName?: string;
}

export function AutoControlScheduleSection({
  hiveId,
  hiveName,
}: AutoControlScheduleSectionProps) {
  const { show: showToast } = useAppToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<HiveAutoControlSchedule | null>(null);
  const [activeScheduleKey, setActiveScheduleKey] = useState<string | null>(null);

  const schedulesQuery = useHiveAutoControlSchedules(hiveId);
  const createSchedule = useCreateHiveAutoControlSchedule();
  const deleteSchedule = useDeleteHiveAutoControlSchedule();
  const schedules = schedulesQuery.data ?? [];

  useEffect(() => {
    setActiveScheduleKey(null);
  }, [hiveId]);

  const customSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules]);

  const registerSchedule = (
    body: { startTime: string; endTime: string },
    successMessage = "자동제어 스케줄을 추가했어요",
  ) => {
    if (!hiveId) {
      showToast("벌통 정보를 불러온 뒤 다시 시도해주세요", "error");
      return;
    }

    if (!isValidScheduleRange(body)) {
      showToast("종료 시간은 시작 시간보다 늦어야 해요", "info");
      return;
    }

    if (AUTO_SCHEDULE_PRESETS.some((preset) => isSameScheduleTime(preset, body.startTime, body.endTime))) {
      showToast("기본 스케줄에 이미 있는 시간대예요", "info");
      return;
    }

    if (schedules.some((schedule) => isSameScheduleTime(schedule, body.startTime, body.endTime))) {
      showToast("이미 등록된 시간대예요", "info");
      return;
    }

    const overlappingSchedule = schedules.find((schedule) =>
      isOverlappingSchedule(schedule, body),
    );

    if (overlappingSchedule) {
      showToast(`${getScheduleLabel(overlappingSchedule)} 스케줄과 시간이 겹쳐요`, "info");
      return;
    }

    createSchedule.mutate(
      { hiveId, body },
      {
        onSuccess: () => {
          console.log("[Hive Control Schedule UI] 등록 결과 반영", { hiveId, body });
          showToast(successMessage, "success");
          setSheetOpen(false);
        },
        onError: () => {
          showToast("스케줄 등록에 실패했어요", "error");
        },
      },
    );
  };

  const toggleSchedule = (scheduleKey: string, nextValue?: boolean) => {
    setActiveScheduleKey((currentKey) => {
      if (nextValue === false && currentKey === scheduleKey) return null;
      if (currentKey === scheduleKey) return null;
      return scheduleKey;
    });
  };

  const confirmDelete = () => {
    if (!hiveId || !pendingDelete) return;

    const deletingSchedule = pendingDelete;

    deleteSchedule.mutate(
      { hiveId, scheduleId: deletingSchedule.scheduleId },
      {
        onSuccess: () => {
          console.log("[Hive Control Schedule UI] 삭제 결과 반영", {
            hiveId,
            scheduleId: deletingSchedule.scheduleId,
          });
          showToast("자동제어 스케줄을 삭제했어요", "success");
          setActiveScheduleKey((currentKey) =>
            currentKey === `custom-${deletingSchedule.scheduleId}` ? null : currentKey,
          );
          setPendingDelete(null);
        },
        onError: () => {
          showToast("스케줄 삭제에 실패했어요", "error");
        },
      },
    );
  };

  return (
    <View>
      <View className="mb-3 flex-row items-center gap-2.5">
        <View
          className="items-center justify-center rounded-lg p-2"
          style={{ backgroundColor: C.bg }}
        >
          <Feather name="calendar" size={18} color={C.text} />
        </View>
        <View className="flex-1">
          <PretendardFont weight="bold" className="text-[18px] text-toss-text">
            자동 제어 스케줄
          </PretendardFont>
          <PretendardFont className="mt-0.5 text-[14px] leading-[20px] text-toss-sec">
            {hiveName
              ? `${hiveName}의 자동제어 시간대를 관리해요`
              : "벌통 자동제어 시간대를 관리해요"}
          </PretendardFont>
        </View>
      </View>

      {AUTO_SCHEDULE_PRESETS.map((preset, index) => {
        const scheduleKey = `preset-${preset.id}`;
        const isActive = activeScheduleKey === scheduleKey;

        return (
          <ScheduleActionRow
            key={preset.id}
            title={preset.label}
            description={`${preset.startTime.slice(0, 5)} ~ ${preset.endTime.slice(0, 5)}`}
            subtitle={preset.description}
            trailing={
              <Switch
                value={isActive}
                onValueChange={(value) => toggleSchedule(scheduleKey, value)}
                disabled={!hiveId}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={C.white}
              />
            }
            isLast={false}
            onPress={() => toggleSchedule(scheduleKey)}
            index={index}
          />
        );
      })}

      {customSchedules.map((schedule, index) => {
        const scheduleKey = `custom-${schedule.scheduleId}`;
        const isActive = activeScheduleKey === scheduleKey;

        return (
          <ScheduleActionRow
            key={schedule.scheduleId}
            title={getScheduleLabel(schedule)}
            description=""
            subtitle="사용자가 추가한 자동제어 시간대"
            trailing={
              <View className="flex-row items-center gap-2">
                <Switch
                  value={isActive}
                  onValueChange={(value) => toggleSchedule(scheduleKey, value)}
                  disabled={!hiveId}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor={C.white}
                />
                <Pressable
                  onPress={() => setPendingDelete(schedule)}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
                  style={{ backgroundColor: C.bgAlt }}
                >
                  <Feather name="trash-2" size={15} color={C.error} />
                </Pressable>
              </View>
            }
            isLast={false}
            onPress={() => toggleSchedule(scheduleKey)}
            index={AUTO_SCHEDULE_PRESETS.length + index}
          />
        );
      })}

      {schedulesQuery.isFetching && (
        <View className="items-center py-3">
          <ActivityIndicator size="small" color={C.primary} />
        </View>
      )}

      <ScheduleActionRow
        title="스케줄 추가하기"
        description="원하는 시작·종료 시간을 직접 설정해요"
        subtitle="추가한 스케줄은 기본 시간대 아래에 표시돼요"
        trailing={<Feather name="plus" size={20} color={C.primary} />}
        isLast
        onPress={() => setSheetOpen(true)}
        index={AUTO_SCHEDULE_PRESETS.length + customSchedules.length}
      />

      <AutoControlScheduleSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={(body) => registerSchedule(body)}
        submitting={createSchedule.isPending}
      />

      <ConfirmSheet
        visible={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="스케줄 삭제"
        message={
          pendingDelete
            ? `${getScheduleLabel(pendingDelete)} 스케줄을 삭제할까요?`
            : undefined
        }
        confirmLabel="삭제하기"
        cancelLabel="취소"
        destructive
        onConfirm={confirmDelete}
      />
    </View>
  );
}

function ScheduleActionRow({
  title,
  description,
  subtitle,
  trailing,
  isLast,
  onPress,
}: {
  title: string;
  description: string;
  subtitle: string;
  trailing: ReactNode;
  isLast: boolean;
  onPress: () => void;
  index: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 active:opacity-70"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <View className="flex-1 pr-3">
        <View className="flex-row items-center gap-2">
          <PretendardFont weight="semibold" className="text-[16px] text-toss-text">
            {title}
          </PretendardFont>
          {description.length > 0 && (
            <PretendardFont className="text-[13px] text-toss-sec">
              {description}
            </PretendardFont>
          )}
        </View>
        <PretendardFont className="mt-0.5 text-[12px] leading-[17px] text-toss-sec">
          {subtitle}
        </PretendardFont>
      </View>
      {trailing}
    </Pressable>
  );
}

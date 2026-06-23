import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { getScheduleLabel, toApiTime } from "../model/autoSchedule";

interface AutoControlScheduleSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (schedule: { startTime: string; endTime: string }) => void;
  submitting?: boolean;
}

export function AutoControlScheduleSheet({
  visible,
  onClose,
  onSubmit,
  submitting = false,
}: AutoControlScheduleSheetProps) {
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(18);
  const [endMinute, setEndMinute] = useState(0);

  const schedule = useMemo(
    () => ({
      startTime: toApiTime(startHour, startMinute),
      endTime: toApiTime(endHour, endMinute),
    }),
    [endHour, endMinute, startHour, startMinute],
  );

  const submit = () => {
    console.log("[Hive Control Schedule UI] 사용자 지정 스케줄 등록 요청", schedule);
    onSubmit(schedule);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="스케줄 추가하기"
      snapHeight={0.72}
      contentScrollEnabled={false}
    >
      <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: C.infoBg }}>
        <PretendardFont weight="semibold" className="text-[13px] leading-[20px] text-toss-text">
          자동제어가 필요한 시간대를 직접 정해 추가해요. 추가한 시간대는 기본 스케줄
          아래 목록에서 확인하고 삭제할 수 있어요.
        </PretendardFont>
      </View>

      <View className="mt-5 gap-4">
        <TimeStepper
          label="시작 시간"
          hour={startHour}
          minute={startMinute}
          onHourChange={setStartHour}
          onMinuteChange={setStartMinute}
        />
        <TimeStepper
          label="종료 시간"
          hour={endHour}
          minute={endMinute}
          onHourChange={setEndHour}
          onMinuteChange={setEndMinute}
        />
      </View>

      <View className="mt-5 rounded-2xl px-4 py-3" style={{ backgroundColor: C.bgAlt }}>
        <PretendardFont weight="bold" className="text-[15px] text-toss-text">
          {getScheduleLabel(schedule)}
        </PretendardFont>
        <PretendardFont className="mt-1 text-[13px] leading-[18px] text-toss-sec">
          이 시간 동안 벌통 센서 자동제어 스케줄을 등록해요.
        </PretendardFont>
      </View>

      <View className="mt-6 flex-row gap-2.5">
        <Pressable
          onPress={onClose}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: C.bgAlt }}
        >
          <PretendardFont weight="bold" className="text-[14px] text-toss-sec">
            취소
          </PretendardFont>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={submitting}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: submitting ? C.ter : C.primary }}
        >
          <PretendardFont weight="bold" className="text-[14px] text-white">
            {submitting ? "등록 중" : "추가하기"}
          </PretendardFont>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function TimeStepper({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  label: string;
  hour: number;
  minute: number;
  onHourChange: (value: number) => void;
  onMinuteChange: (value: number) => void;
}) {
  return (
    <View className="rounded-2xl p-4" style={{ backgroundColor: C.bgAlt }}>
      <PretendardFont weight="bold" className="mb-3 text-[14px] text-toss-text">
        {label}
      </PretendardFont>
      <View className="flex-row items-center gap-3">
        <StepperCell
          label="시"
          value={hour}
          onDecrease={() => onHourChange((hour + 23) % 24)}
          onIncrease={() => onHourChange((hour + 1) % 24)}
        />
        <StepperCell
          label="분"
          value={minute}
          onDecrease={() => onMinuteChange((minute + 50) % 60)}
          onIncrease={() => onMinuteChange((minute + 10) % 60)}
        />
      </View>
    </View>
  );
}

function StepperCell({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View className="flex-1 flex-row items-center justify-between rounded-2xl bg-white px-3 py-2.5">
      <IconButton icon="minus" onPress={onDecrease} />
      <View className="items-center">
        <PretendardFont weight="bold" className="text-[19px] text-toss-text">
          {String(value).padStart(2, "0")}
        </PretendardFont>
        <PretendardFont className="text-[11px] text-toss-sec">{label}</PretendardFont>
      </View>
      <IconButton icon="plus" onPress={onIncrease} />
    </View>
  );
}

function IconButton({
  icon,
  onPress,
}: {
  icon: "minus" | "plus";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
      style={{ backgroundColor: C.bg }}
    >
      <Feather name={icon} size={16} color={C.text} />
    </Pressable>
  );
}

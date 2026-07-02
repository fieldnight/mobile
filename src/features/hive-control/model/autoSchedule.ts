import type { HiveAutoControlSchedule } from "../api";

export interface AutoSchedulePreset {
  id: string;
  label: string;
  description: string;
  startTime: string;
  endTime: string;
}

export const AUTO_SCHEDULE_PRESETS: AutoSchedulePreset[] = [
  {
    id: "dawn",
    label: "새벽",
    description: "새벽 시간대만 자동제어를 켜둬요",
    startTime: "00:00:00",
    endTime: "06:00:00",
  },
  {
    id: "morning",
    label: "오전",
    description: "아침부터 정오까지 자동제어를 켜둬요",
    startTime: "06:00:00",
    endTime: "12:00:00",
  },
  {
    id: "afternoon",
    label: "오후",
    description: "낮 시간대에 자동제어를 켜둬요",
    startTime: "12:00:00",
    endTime: "18:00:00",
  },
  {
    id: "night",
    label: "저녁",
    description: "저녁 시간대만 자동제어를 켜둬요",
    startTime: "18:00:00",
    endTime: "23:59:00",
  },
];

export function toApiTime(hour: number, minute = 0) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export function toDisplayTime(time: string) {
  return time.slice(0, 5);
}

export function getScheduleLabel(schedule: Pick<HiveAutoControlSchedule, "startTime" | "endTime">) {
  return `${toDisplayTime(schedule.startTime)} ~ ${toDisplayTime(schedule.endTime)}`;
}

export function getTimeMinutes(time: string) {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

export function isSameScheduleTime(
  schedule: Pick<HiveAutoControlSchedule, "startTime" | "endTime">,
  startTime: string,
  endTime: string,
) {
  return schedule.startTime === startTime && schedule.endTime === endTime;
}

export function isValidScheduleRange(
  schedule: Pick<HiveAutoControlSchedule, "startTime" | "endTime">,
) {
  return getTimeMinutes(schedule.startTime) < getTimeMinutes(schedule.endTime);
}

export function isOverlappingSchedule(
  schedule: Pick<HiveAutoControlSchedule, "startTime" | "endTime">,
  target: Pick<HiveAutoControlSchedule, "startTime" | "endTime">,
) {
  const scheduleStart = getTimeMinutes(schedule.startTime);
  const scheduleEnd = getTimeMinutes(schedule.endTime);
  const targetStart = getTimeMinutes(target.startTime);
  const targetEnd = getTimeMinutes(target.endTime);

  return scheduleStart < targetEnd && targetStart < scheduleEnd;
}

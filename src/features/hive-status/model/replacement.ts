import type { HiveData } from "@/types/hive-control";

export const HIVE_REPLACEMENT_CYCLE_DAYS = 45;

export interface HiveReplacementRecord {
  id: string;
  hiveId: string;
  replacedAt: string;
  note: string;
}

const DUMMY_REPLACEMENT_HISTORY: HiveReplacementRecord[] = [
  {
    id: "history-1-2026-06-01",
    hiveId: "1",
    replacedAt: "2026-06-01",
    note: "테스트",
  },
  {
    id: "history-1-2026-04-18",
    hiveId: "1",
    replacedAt: "2026-04-18",
    note: "테스트",
  },
  {
    id: "history-2-2026-05-26",
    hiveId: "2",
    replacedAt: "2026-05-26",
    note: "테스트",
  },
  {
    id: "history-2-2026-04-10",
    hiveId: "2",
    replacedAt: "2026-04-10",
    note: "테스트",
  },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatReplacementDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function normalizeReplacementDate(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function parseReplacementDate(value?: string) {
  const normalized = normalizeReplacementDate(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getReplacementElapsed(replacedAt?: string) {
  const replaced = parseReplacementDate(replacedAt);

  if (!replaced) {
    return {
      label: "미등록",
      days: null,
      remainingDays: null,
      isOverdue: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  replaced.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - replaced.getTime();
  const days = Math.max(0, Math.floor(diffMs / 86400000));
  const remainingDays = HIVE_REPLACEMENT_CYCLE_DAYS - days;

  return {
    label: `${days}일`,
    days,
    remainingDays,
    isOverdue: remainingDays < 0,
  };
}

export function getHiveReplacementHistory(hive: HiveData): HiveReplacementRecord[] {
  const records = [...DUMMY_REPLACEMENT_HISTORY.filter((item) => item.hiveId === hive.id)];
  const currentReplacedAt = normalizeReplacementDate(hive.replacedAt);

  if (currentReplacedAt && !records.some((item) => item.replacedAt === currentReplacedAt)) {
    records.unshift({
      id: `current-${hive.id}-${currentReplacedAt}`,
      hiveId: hive.id,
      replacedAt: currentReplacedAt,
      note: "테스트",
    });
  }

  return records.sort(
    (a, b) =>
      (parseReplacementDate(b.replacedAt)?.getTime() ?? 0) -
      (parseReplacementDate(a.replacedAt)?.getTime() ?? 0),
  );
}

export const HIVE_REPLACEMENT_CYCLE_DAYS = 45;

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

  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getReplacementElapsed(replacedAt?: string, usageDays?: number) {
  if (typeof usageDays === "number") {
    return {
      label: `${usageDays}일`,
      days: usageDays,
      remainingDays: HIVE_REPLACEMENT_CYCLE_DAYS - usageDays,
      isOverdue: usageDays > HIVE_REPLACEMENT_CYCLE_DAYS,
    };
  }

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

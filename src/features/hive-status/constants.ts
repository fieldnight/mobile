import type { Period } from "@/types";

export const HIVE_STATS_TITLE = "Webee가 기록한\n벌통의 하루를 확인해요";
export const HIVE_STATS_SUBTITLE =
  "온도·습도·가스 데이터를 한눈에 볼 수 있어요\n이는 벌의 활동성을 파악하는 데 중요해요";

export const PERIOD_HINT: Record<Period, string> = {
  일간: "오늘 시간대별 흐름을 확인할 수 있어요",
  주간: "이번 주 일별 변화를 한눈에 볼 수 있어요",
  월간: "한 달간의 전체 추이를 파악할 수 있어요",
};

export const VIEW_MODES = [
  { key: "chart" as const, label: "차트" },
  { key: "combined" as const, label: "통합" },
  { key: "table" as const, label: "표" },
] as const;

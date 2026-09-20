export const HIVE_STATS_TITLE = "Webee가 기록한\n벌통의 하루를 확인해요";

export const VIEW_MODES = [
  { key: "combined" as const, label: "비교 그래프" },
  { key: "chart" as const, label: "그래프" },
  { key: "table" as const, label: "표" },
] as const;

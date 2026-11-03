import type { HiveData } from "@/types/hive-control";
import { COMFORT_MAX, COMFORT_MIN, T } from "../theme";

export type HiveConditionKind = "good" | "hot" | "cold" | "offline" | "waiting" | "issue";

export interface HiveCondition {
  kind: HiveConditionKind;
  /** 상태를 한 문장으로 알려주는 안내 */
  message: string;
  color: string;
  soft: string;
}

/**
 * 벌통 한 개의 현재 상태를 홈 화면 안내 문장으로 바꿉니다.
 * 장치 점검 > 연결 > 온도 순으로 더 급한 상태를 먼저 알립니다.
 */
export function getHiveCondition(hive: HiveData | undefined): HiveCondition {
  if (!hive) {
    return { kind: "waiting", message: "벌통을 선택해 주세요", color: T.off, soft: T.offSoft };
  }
  if (hive.telemetry?.hwIssue) {
    return { kind: "issue", message: "장치 점검이 필요해요", color: T.hot, soft: T.hotSoft };
  }
  if (hive.temperature == null) {
    return hive.status === "online"
      ? { kind: "waiting", message: "측정값을 기다리고 있어요", color: T.off, soft: T.offSoft }
      : { kind: "offline", message: "벌통과 연결되지 않았어요", color: T.off, soft: T.offSoft };
  }
  if (hive.status === "offline") {
    return { kind: "offline", message: "연결이 끊겨 마지막 측정값을 보여드려요", color: T.off, soft: T.offSoft };
  }
  if (hive.temperature > COMFORT_MAX) {
    return { kind: "hot", message: "권장 온도보다 높아요", color: T.hot, soft: T.hotSoft };
  }
  if (hive.temperature < COMFORT_MIN) {
    return { kind: "cold", message: "권장 온도보다 낮아요", color: T.cold, soft: T.coldSoft };
  }
  return { kind: "good", message: "수정벌이 활동하기 좋은 온도예요", color: T.good, soft: T.goodSoft };
}

export function formatValue(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(value) ? "–" : value.toFixed(digits);
}

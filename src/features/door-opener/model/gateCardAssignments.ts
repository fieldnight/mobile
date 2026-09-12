import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ourbee:gate-card-assignments:v1";

/**
 * 카드 id -> 이 카드를 적용하기로 고른 개폐기 id 목록.
 * 온라인 모드에서만 쓰는 로컬 전용 기록입니다. 실제 온라인 명령 채널이 없어
 * 서버에 확인된 상태가 아니라 사용자가 로컬에 남긴 "적용 의도"일 뿐입니다.
 */
export type GateCardAssignments = Record<string, string[]>;

export async function loadGateCardAssignments(): Promise<GateCardAssignments> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as { assignments?: unknown };
    if (!parsed.assignments || typeof parsed.assignments !== "object") return {};

    return parsed.assignments as GateCardAssignments;
  } catch (error) {
    console.warn("[Gate Card Assignments] 저장된 적용 기록 복구 실패", error);
    return {};
  }
}

export async function saveGateCardAssignments(assignments: GateCardAssignments) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, assignments }),
    );
  } catch (error) {
    console.warn("[Gate Card Assignments] 적용 기록 저장 실패", error);
  }
}

export function assignCardToGates(
  assignments: GateCardAssignments,
  cardId: string,
  gateIds: string[],
): GateCardAssignments {
  return { ...assignments, [cardId]: gateIds };
}

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ourbee:gate-card-assignments:v2";

/**
 * 카드 id -> 마지막 SUCCESS 응답을 확인한 개폐기 id 목록.
 * 실시간 적용 상태가 아니며, 자동 종료/다른 폰의 변경은 반영되지 않습니다.
 * v1의 미확인 적용 의도는 가져오지 않습니다.
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
      JSON.stringify({ version: 2, assignments }),
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
  const next = Object.fromEntries(Object.entries(assignments).map(([id, ids]) =>
    [id, ids.filter(gateId => !gateIds.includes(gateId))],
  ));
  next[cardId] = [...new Set([...(next[cardId] ?? []), ...gateIds])];
  return next;
}

import type { GateData } from "@/types/gate-control";
import { useDoorDeviceState } from "@/stores/useDoorDeviceState";
import { loadGateCardAssignments } from "./gateCardAssignments";
import { loadStoredNfcDoorCards } from "./gateActionSync";
import { buildDoorOpenerRuntimeState } from "./doorOpenerRuntime";
import { normalizeGateMac } from "./deviceCardState";

/** Old online assignments have no timestamp. Preserve that uncertainty. */
export async function migrateDeviceCards(gates: GateData[]) {
  try {
    const [assignments, cards] = await Promise.all([loadGateCardAssignments(), loadStoredNfcDoorCards()]);
    for (const [cardId, ids] of Object.entries(assignments)) {
      const card = cards.find(item => item.id === cardId);
      if (!card || card.mode === "count_status") continue;
      for (const id of ids) {
        const mac = normalizeGateMac(gates.find(gate => gate.id === id)?.macAddress);
        if (!mac || useDoorDeviceState.getState().records[mac]) continue;
        const runtime = buildDoorOpenerRuntimeState(card, { status: "ok", result: "legacy:online", deviceId: mac });
        runtime.activatedAt = 0;
        useDoorDeviceState.getState().confirm({ deviceId: mac, runtime, source: "online", confirmedAt: 0 });
      }
    }
  } catch (error) {
    console.warn("[Door Cards] 이전 적용 기록 복구 실패", error);
  }
}

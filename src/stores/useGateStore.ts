import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GateData, GateFormInput } from "@/types/gate-control";

/** 화면 표시용 오늘 날짜를 yyyy-MM-dd로 만듭니다. */
function todayLabel() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** 등록 폼 입력값을 GateData로 변환합니다. */
function createGateData(input: GateFormInput): GateData {
  const id = input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    gateId: input.gateId ?? 0,
    macAddress: input.macAddress,
    name: input.name,
    location: input.location,
    memo: input.memo ?? "",
    registeredAt: todayLabel(),
  };
}

interface GateStoreState {
  gates: GateData[];
  setGates: (gates: GateData[]) => void;
  addGate: (input: GateFormInput) => void;
  updateGate: (id: string, input: Omit<GateFormInput, "id" | "macAddress">) => void;
  deleteGate: (id: string) => void;
  reorderGates: (nextGates: GateData[]) => void;
}

/**
 * 개폐기 기기 등록 store
 * - 등록(POST /api/v1/gates)은 서버에 반영되고, 성공 후 이 store에 결과를 저장합니다.
 * - 목록 조회 API가 없어 등록된 개폐기 "목록" 자체는 계속 로컬(AsyncStorage)에만 보관합니다.
 * - 수정(updateGate)은 서버에 PATCH 엔드포인트가 아직 없어 로컬에만 반영됩니다.
 *   나중에 백엔드에 수정 API가 생기면 updateGate만 서버 호출로 교체하면 됩니다.
 */
export const useGateStore = create<GateStoreState>()(
  persist(
    (set) => ({
      gates: [],
      setGates: (gates) => set({ gates }),
      addGate: (input) => {
        set((state) => ({ gates: [...state.gates, createGateData(input)] }));
      },
      updateGate: (id, input) => {
        set((state) => ({
          gates: state.gates.map((gate) =>
            gate.id === id
              ? {
                  ...gate,
                  name: input.name,
                  location: input.location,
                  memo: input.memo ?? "",
                }
              : gate,
          ),
        }));
      },
      deleteGate: (id) => {
        set((state) => ({ gates: state.gates.filter((gate) => gate.id !== id) }));
      },
      reorderGates: (nextGates) => {
        set({ gates: nextGates });
      },
    }),
    {
      name: "webee-gate-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: () => {
        return { gates: [] } as unknown as GateStoreState;
      },
    },
  ),
);

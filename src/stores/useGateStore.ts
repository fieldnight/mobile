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
    region: input.region,
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
 * - 서버(/api/v1/gates)가 목록/수정/삭제의 source of truth입니다. 이 store는 그 결과를
 *   AsyncStorage에 캐시해 앱을 다시 열었을 때 서버 응답 전에도 마지막 목록을 보여줍니다.
 * - addGate/updateGate/deleteGate는 서버 요청이 성공한 뒤 화면(useGateSync 등)에서
 *   호출해 로컬 캐시를 맞춰주는 용도입니다. 실제 서버 동기화는
 *   src/features/door-opener/hooks/useGateDeviceApi.ts의 훅들이 담당합니다.
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
                  region: input.region,
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

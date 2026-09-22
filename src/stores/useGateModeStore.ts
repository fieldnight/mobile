import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type GateOperatingMode = "offline" | "online";

interface GateModeStoreState {
  /** 오프라인(NFC) / 온라인 제어 모드. 기본값은 기존 NFC 전용 동작과 같은 "offline". */
  mode: GateOperatingMode;
  setMode: (mode: GateOperatingMode) => void;
  /** 개폐기 선택 시트에서 마지막으로 선택했던 개폐기 id 목록 (다음에 열 때 기본값으로 사용) */
  lastSelectedGateIds: string[];
  setLastSelectedGateIds: (ids: string[]) => void;
}

/**
 * 개폐기 제어 모드 store
 * - 게이트 "레지스트리"(useGateStore)와 관심사를 분리해, 모드/마지막 선택값 같은
 *   UI·운영 설정 변경이 게이트 데이터의 persist 버전에 영향을 주지 않게 합니다.
 */
export const useGateModeStore = create<GateModeStoreState>()(
  persist(
    (set) => ({
      mode: "offline",
      setMode: (mode) => set({ mode }),
      lastSelectedGateIds: [],
      setLastSelectedGateIds: (ids) => set({ lastSelectedGateIds: ids }),
    }),
    {
      name: "webee-gate-mode-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HiveControlState, HiveData } from "@/types/hive-control";
import { initialControls } from "@/types";

function createDefaultControlState(): HiveControlState {
  return {
    controls: initialControls.map((control) => ({ ...control })),
    heaterOn: false,
    coolerOn: false,
    ventOn: false,
    circOn: false,
  };
}

function createInitialHiveControls(hives: HiveData[]) {
  return hives.reduce<Record<string, HiveControlState>>((acc, hive) => {
    acc[hive.id] = createDefaultControlState();
    return acc;
  }, {});
}

const initialHives: HiveData[] = [
  {
    id: "1",
    name: "벌통 1호",
    status: "online",
    temperature: 34.5,
    humidity: 62,
    externalTemperature: 22.1,
    externalHumidity: 48,
    weight: 28.3,
    beeActivity: "high",
    lastUpdate: "2분 전",
    location: "동쪽 과수원 옆",
    memo: "벌들이 잘 모여 있어요. 다음 검사 주기는 2일 후가 좋습니다.",
    registeredAt: "2026-04-14",
  },
  {
    id: "2",
    name: "벌통 2호",
    status: "online",
    temperature: 33.8,
    humidity: 58,
    externalTemperature: 21.3,
    externalHumidity: 52,
    weight: 31.2,
    beeActivity: "medium",
    lastUpdate: "5분 전",
    location: "서쪽 과수원 중앙",
    memo: "이번 주에 꿀 채집이 예상됩니다.",
    registeredAt: "2026-04-20",
  },
  {
    id: "3",
    name: "벌통 3호",
    status: "offline",
    temperature: 0,
    humidity: 0,
    weight: 25.1,
    beeActivity: "low",
    lastUpdate: "3시간 전",
    location: "남쪽 창고 옆",
    memo: "네트워크 연결이 끊어졌어요. 현장 점검이 필요합니다.",
    registeredAt: "2026-04-25",
  },
];

interface HiveStoreState {
  hives: HiveData[];
  hiveControls: Record<string, HiveControlState>;
  addHive: (name: string, location: string, memo: string, replacedAt?: string) => void;
  reorderHives: (nextHives: HiveData[]) => void;
  updateReplacedAt: (id: string) => void;
  updateHiveControls: (id: string, nextState: HiveControlState) => void;
}

export const useHiveStore = create<HiveStoreState>()(
  persist(
    (set, get) => ({
      hives: initialHives,
      hiveControls: createInitialHiveControls(initialHives),
      addHive: (name, location, memo, replacedAt) => {
        const now = new Date();
        const id = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
        const registeredAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const newHive: HiveData = {
          id,
          name,
          location,
          memo,
          registeredAt,
          replacedAt,
          status: "online",
          temperature: 34,
          humidity: 60,
          weight: 28.0,
          beeActivity: "medium",
          lastUpdate: "방금",
        };

        set((state) => ({
          hives: [...state.hives, newHive],
          hiveControls: {
            ...state.hiveControls,
            [id]: createDefaultControlState(),
          },
        }));
      },
      reorderHives: (nextHives) => {
        set({ hives: nextHives });
      },
      updateReplacedAt: (id) => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        set((state) => ({
          hives: state.hives.map((hive) =>
            hive.id === id ? { ...hive, replacedAt: today } : hive,
          ),
        }));
      },
      updateHiveControls: (id, nextState) => {
        set((state) => ({
          hiveControls: {
            ...state.hiveControls,
            [id]: nextState,
          },
        }));
      },
    }),
    {
      name: "webee-hive-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: any) => {
        const state = persistedState as Partial<HiveStoreState> | undefined;
        const safeHives = state?.hives ?? initialHives;
        const prevControls = state?.hiveControls ?? {};
        const fresh = initialControls.map((c) => ({ ...c }));
        const nextControls: Record<string, HiveControlState> = {};

        for (const hive of safeHives) {
          const prev = prevControls[hive.id];
          nextControls[hive.id] = prev
            ? {
                ...prev,
                controls: fresh.map((fc) => {
                  const existing = prev.controls.find((c) => c.id === fc.id);
                  return existing ? { ...fc, enabled: existing.enabled } : { ...fc };
                }),
              }
            : createDefaultControlState();
        }

        return { ...state, hives: safeHives, hiveControls: nextControls } as HiveStoreState;
      },
    },
  ),
);

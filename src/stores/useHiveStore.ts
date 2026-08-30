import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HiveControlState, HiveData, HiveFormInput } from "@/types/hive-control";
import { initialControls } from "@/types";

/** 화면 표시용 오늘 날짜를 yyyy-MM-dd로 만듭니다. */
function todayLabel() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** 새 벌통이 추가될 때 기본 자동/수동 제어 상태를 만듭니다. */
function createDefaultControlState(): HiveControlState {
  return {
    controls: initialControls.map((control) => ({ ...control })),
    heaterOn: false,
    coolerOn: false,
    ventOn: false,
    circOn: false,
  };
}


/** 등록 폼 입력값을 기존 화면에서 쓰는 HiveData 형태로 변환합니다. */
function createHiveData(input: HiveFormInput): HiveData {
  const id =
    input.id ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    macAddress: input.macAddress,
    name: input.name,
    region: input.region,
    location: input.location,
    memo: input.memo ?? "",
    registeredAt: todayLabel(),
    replacedAt: input.replacedAt,
    status: "offline",
    temperature: 0,
    humidity: 0,
    externalTemperature: 0,
    externalHumidity: 0,
    weight: 28,
    beeActivity: "low",
    lastUpdate: "연결 확인 중",
  };
}


interface HiveStoreState {
  hives: HiveData[];
  hiveControls: Record<string, HiveControlState>;
  setHives: (hives: HiveData[]) => void;
  addHive: (input: HiveFormInput) => void;
  updateHive: (id: string, input: Omit<HiveFormInput, "id" | "macAddress">) => void;
  deleteHive: (id: string) => void;
  reorderHives: (nextHives: HiveData[]) => void;
  updateReplacedAt: (id: string, replacedAt?: string) => void;
  updateHiveControls: (id: string, nextState: HiveControlState) => void;
}

/**
 * 벌통 화면 공용 store
 * - 기존 스마트벌통/개폐기 화면이 모두 이 store를 바라봅니다.
 * - API 조회 성공 시 setHives로 서버 목록을 주입합니다.
 */
export const useHiveStore = create<HiveStoreState>()(
  persist(
    (set) => ({
      hives: [],
      hiveControls: {},
      setHives: (hives) => {
        set((state) => {
          const nextControls = { ...state.hiveControls };
          // 서버에서 새 벌통이 내려와도 제어 UI가 깨지지 않도록 기본 상태를 보강합니다.
          hives.forEach((hive) => {
            if (!nextControls[hive.id]) {
              nextControls[hive.id] = createDefaultControlState();
            }
          });

          return { hives, hiveControls: nextControls };
        });
      },
      addHive: (input) => {
        const newHive = createHiveData(input);
        set((state) => ({
          hives: [...state.hives, newHive],
          hiveControls: {
            ...state.hiveControls,
            [newHive.id]: createDefaultControlState(),
          },
        }));
      },
      updateHive: (id, input) => {
        set((state) => ({
          hives: state.hives.map((hive) =>
            hive.id === id
              ? {
                  ...hive,
                  name: input.name,
                  region: input.region,
                  location: input.location,
                  memo: input.memo ?? "",
                  replacedAt: input.replacedAt,
                }
              : hive,
          ),
        }));
      },
      deleteHive: (id) => {
        set((state) => {
          // 삭제된 벌통의 제어 상태도 함께 제거해 persist 데이터가 불어나지 않게 합니다.
          const { [id]: _removed, ...nextControls } = state.hiveControls;
          return {
            hives: state.hives.filter((hive) => hive.id !== id),
            hiveControls: nextControls,
          };
        });
      },
      reorderHives: (nextHives) => {
        set({ hives: nextHives });
      },
      updateReplacedAt: (id, replacedAt) => {
        set((state) => ({
          hives: state.hives.map((hive) =>
            hive.id === id ? { ...hive, replacedAt: replacedAt ?? todayLabel() } : hive,
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
      version: 7,
      migrate: () => {
        // hives는 항상 서버에서 받아오므로 버전 업 시 초기화합니다.
        return { hives: [], hiveControls: {} } as unknown as HiveStoreState;
      },
    },
  ),
);

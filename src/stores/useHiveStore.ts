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

/** 벌통 목록에 맞춰 제어 상태 맵을 초기화합니다. */
function createInitialHiveControls(hives: HiveData[]) {
  return hives.reduce<Record<string, HiveControlState>>((acc, hive) => {
    acc[hive.id] = createDefaultControlState();
    return acc;
  }, {});
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
    status: "online",
    temperature: 34,
    humidity: 60,
    externalTemperature: 22,
    externalHumidity: 48,
    weight: 28,
    beeActivity: "medium",
    lastUpdate: "방금",
  };
}

/**
 * 개발/서버 실패 fallback용 기본 벌통 목록
 * - 요청대로 맥주소, 이름, 지역, 위치, 메모가 있는 벌통 2개만 유지합니다.
 */
export const HIVE_DEMO_MODE = true;

export const DEMO_HIVES: HiveData[] = [
  {
    id: "1",
    macAddress: "AA:BB:CC:DD:EE:FF",
    name: "딸기벌통 1호",
    region: "충청북도 청주시 오창읍",
    location: "딸기 하우스",
    memo: "스마트벌통 데모",
    registeredAt: "2024-03-15",
    status: "online",
    temperature: 25,
    humidity: 62,
    externalTemperature: 32,
    externalHumidity: 80,
    weight: 28.3,
    beeActivity: "high",
    lastUpdate: "방금",
  },
  {
    id: "2",
    macAddress: "11:22:33:44:55:66",
    name: "딸기벌통 2호",
    region: "충청북도 청주시 오창읍",
    location: "딸기 하우스 2동",
    memo: "스마트벌통 데모",
    registeredAt: "2024-03-16",
    status: "online",
    temperature: 24.5,
    humidity: 64,
    externalTemperature: 31.5,
    externalHumidity: 78,
    weight: 29.1,
    beeActivity: "medium",
    lastUpdate: "방금",
  },
  {
    id: "3",
    macAddress: "22:33:44:55:66:77",
    name: "딸기벌통 3호",
    region: "충청북도 청주시 오창읍",
    location: "딸기 하우스 3동",
    memo: "스마트벌통 데모",
    registeredAt: "2024-03-17",
    status: "online",
    temperature: 26,
    humidity: 60,
    externalTemperature: 33,
    externalHumidity: 82,
    weight: 27.8,
    beeActivity: "high",
    lastUpdate: "방금",
  },
];

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
 * - API 조회 성공 시 setHives로 서버 목록을 주입하고, 실패 시 기본 목록을 유지합니다.
 */
export const useHiveStore = create<HiveStoreState>()(
  persist(
    (set) => ({
      hives: DEMO_HIVES,
      hiveControls: createInitialHiveControls(DEMO_HIVES),
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
      version: 4,
      migrate: (persistedState: unknown, version) => {
        const state = persistedState as Partial<HiveStoreState> | undefined;
        // v4 데모에서는 기존 저장값과 관계없이 딸기벌통 1호만 표시합니다.
        const safeHives =
          HIVE_DEMO_MODE || version < 4
            ? DEMO_HIVES
            : (state?.hives ?? DEMO_HIVES);
        const prevControls = state?.hiveControls ?? {};
        const fresh = initialControls.map((control) => ({ ...control }));
        const nextControls: Record<string, HiveControlState> = {};

        safeHives.forEach((hive) => {
          const prev = prevControls[hive.id];
          nextControls[hive.id] = prev
            ? {
                ...prev,
                controls: fresh.map((control) => {
                  const existing = prev.controls.find((item) => item.id === control.id);
                  return existing ? { ...control, enabled: existing.enabled } : { ...control };
                }),
              }
            : createDefaultControlState();
        });

        return {
          ...state,
          hives: safeHives,
          hiveControls: nextControls,
        } as HiveStoreState;
      },
    },
  ),
);

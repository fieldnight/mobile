import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HiveControlState, HiveData, HiveFormInput } from "@/types/hive-control";
import { initialControls } from "@/types";
import { mergeHive, refreshPresence } from "./hivePresence";

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
  refreshPresence: () => void;
  updateConnections: (updates: { id: string; connected: boolean; checkedAt: number }[]) => void;
  updateHiveTelemetry: (
    id: string,
    telemetry: {
      internalTemperature: number;
      internalHumidity: number;
      externalTemperature: number;
      externalHumidity: number;
      recordedAt?: string;
    },
  ) => void;
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
          const prevHiveById = new Map(state.hives.map((hive) => [hive.id, hive]));

          const mergedHives = hives.map((hive) => mergeHive(prevHiveById.get(hive.id), hive));

          // 서버에서 새 벌통이 내려와도 제어 UI가 깨지지 않도록 기본 상태를 보강합니다.
          mergedHives.forEach((hive) => {
            if (!nextControls[hive.id]) {
              nextControls[hive.id] = createDefaultControlState();
            }
          });

          return { hives: mergedHives, hiveControls: nextControls };
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
      refreshPresence: () => set((state) => {
        const hives = state.hives.map((hive) => refreshPresence(hive));
        return hives.every((hive, i) => hive === state.hives[i]) ? state : { hives };
      }),
      updateConnections: (updates) => set((state) => {
        const byId = new Map(updates.map((update) => [update.id, update]));
        const hives = state.hives.map((hive) => {
          const update = byId.get(hive.id);
          // 캐시된 이전 조회 결과가 새 SSE 상태를 되돌리지 않게 합니다.
          if (!update || update.checkedAt <= Math.max(hive.connectionCheckedAt ?? 0, hive.telemetryReceivedAt ?? 0)) return hive;
          return refreshPresence({ ...hive, status: update.connected ? "online" : "offline",
            connectionCheckedAt: update.checkedAt,
            disconnectedAt: update.connected ? hive.disconnectedAt : update.checkedAt });
        });
        return hives.every((hive, i) => hive === state.hives[i]) ? state : { hives };
      }),
      updateHiveTelemetry: (id, telemetry) => {
        const now = Date.now();
        const parsed = telemetry.recordedAt ? Date.parse(telemetry.recordedAt) : now;
        const measuredAt = Number.isFinite(parsed) ? Math.min(parsed, now) : now;
        set((state) => ({
          hives: state.hives.map((hive) =>
            hive.id === id && measuredAt > (hive.measuredAt ?? 0)
              ? refreshPresence({
                  ...hive,
                  status: measuredAt <= (hive.disconnectedAt ?? 0) ? "offline" : "online",
                  temperature: telemetry.internalTemperature,
                  humidity: telemetry.internalHumidity,
                  externalTemperature: telemetry.externalTemperature,
                  externalHumidity: telemetry.externalHumidity,
                  lastUpdate: "방금",
                  measuredAt,
                  // 과거 이벤트 재전송은 현재 연결의 증거로 사용하지 않습니다.
                  telemetryReceivedAt: measuredAt,
                }, now)
              : hive,
          ),
        }));
      },
    }),
    {
      name: "webee-hive-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 7,
      // 재실행 때 저장된 온라인 상태를 실시간 연결로 취급하지 않습니다.
      merge: (persisted, current) => {
        const saved = persisted as Partial<HiveStoreState> | undefined;
        return { ...current, hiveControls: saved?.hiveControls ?? {}, hives: (saved?.hives ?? []).map((hive) =>
          refreshPresence({ ...hive, status: "offline", connectionCheckedAt: undefined, telemetryReceivedAt: undefined })) };
      },
      migrate: () => {
        // hives는 항상 서버에서 받아오므로 버전 업 시 초기화합니다.
        return { hives: [], hiveControls: {} } as unknown as HiveStoreState;
      },
    },
  ),
);

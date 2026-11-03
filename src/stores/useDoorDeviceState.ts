import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { mergeDeviceCardState, type DeviceCardState } from "@/features/door-opener/model/deviceCardState";

interface DoorDeviceStore {
  records: Record<string, DeviceCardState>;
  confirm: (record: DeviceCardState) => void;
}

export const useDoorDeviceState = create<DoorDeviceStore>()(persist((set) => ({
  records: {},
  confirm: record => set(state => ({ records: mergeDeviceCardState(state.records, record) })),
}), {
  name: "ourbee:door-device-cards:v1",
  storage: createJSONStorage(() => AsyncStorage),
  merge: (persisted, current) => {
    let records: Record<string, DeviceCardState> = {};
    for (const record of Object.values((persisted as Partial<DoorDeviceStore>)?.records ?? {})) {
      if (record && typeof record === "object") records = mergeDeviceCardState(records, record);
    }
    for (const record of Object.values(current.records)) records = mergeDeviceCardState(records, record);
    return { ...current, records };
  },
}));

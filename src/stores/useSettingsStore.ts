import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_OFFSET_MIN = -2;
const FONT_OFFSET_MAX = 2;

interface SettingsState {
  fontOffset: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      fontOffset: 0,
      increaseFontSize: () => {
        const { fontOffset } = get();
        if (fontOffset < FONT_OFFSET_MAX) set({ fontOffset: fontOffset + 2 });
      },
      decreaseFontSize: () => {
        const { fontOffset } = get();
        if (fontOffset > FONT_OFFSET_MIN) set({ fontOffset: fontOffset - 2 });
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

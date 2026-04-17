/**
 * 농약 검색 전역 상태 스토어
 * - zustand로 필터값(작물/용도/곤충)과 페이지 상태 관리
 * - persist 미들웨어로 코드 목록 + 전체 데이터를 AsyncStorage에 영구 저장
 *   → 최초 1회 전체 560건 API 호출 후 앱 재실행 시 API 호출 없음
 *   → 이후 필터링/페이지네이션은 클라이언트 JS filter()로 처리
 *
 *   - aList/bList/cList/allItems → AsyncStorage 영구 저장
 * - crop/usage/insect/page → 앱 재실행 시 초기화
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ResultItem } from "./utils";

interface PesticideStore {
  // 필터값 (저장 안 함)
  crop: string;
  usage: string;
  insect: string;
  page: number;
  // 드롭다운 코드 목록 (영구 저장)
  aList: string[]; // 작물
  bList: string[]; // 용도
  cList: string[]; // 곤충
  // 전체 데이터 (영구 저장)
  allItems: ResultItem[];
  // actions
  setCrop: (v: string) => void;
  setUsage: (v: string) => void;
  setInsect: (v: string) => void;
  setPage: (v: number) => void;
  setOptions: (a: string[], b: string[], c: string[]) => void;
  setAllItems: (items: ResultItem[]) => void;
}

export const usePesticideStore = create<PesticideStore>()(
  persist(
    (set) => ({
      crop: "",
      usage: "",
      insect: "",
      page: 1,
      aList: [],
      bList: [],
      cList: [],
      allItems: [],
      setCrop: (v) => set({ crop: v, page: 1 }),
      setUsage: (v) => set({ usage: v, page: 1 }),
      setInsect: (v) => set({ insect: v, page: 1 }),
      setPage: (v) => set({ page: v }),
      setOptions: (a, b, c) => set({ aList: a, bList: b, cList: c }),
      setAllItems: (items) => set({ allItems: items }),
    }),
    {
      name: "pesticide-store",
      storage: createJSONStorage(() => AsyncStorage),
      // 필터값/페이지는 저장 제외
      partialize: (s) => ({
        aList: s.aList,
        bList: s.bList,
        cList: s.cList,
        allItems: s.allItems,
      }),
    },
  ),
);

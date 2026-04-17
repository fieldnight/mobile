import type { Row, TradeStore } from "@/types";
import { create } from "zustand"; // zustand로 캐싱·로딩·에러 관리
import { getTodayKST, middleKey, CACHE_TTL } from "@/constants";
import { apiFetch } from "../api";

// 캐시 저장 — 조회 결과를 키별로 저장하고 fetchedAt 갱신
function setCache(set: any, key: string, rows: Row[], totalCount: number) {
  set((s: TradeStore) => ({
    cache: { ...s.cache, [key]: { rows, totalCount, fetchedAt: Date.now() } },
  }));
}

// 로딩 상태 업데이트
function setLoading(set: any, key: string, val: boolean) {
  set((s: TradeStore) => ({ loading: { ...s.loading, [key]: val } }));
}

// 에러 메시지 업데이트 (null이면 초기화)
function setError(set: any, key: string, msg: string | null) {
  set((s: TradeStore) => ({ error: { ...s.error, [key]: msg } }));
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  cache: {},
  loading: {},
  error: {},

  // 도매시장 코드 + 날짜로 조회 — 캐시 키는 "marketCode_date" 형태
  // marketCode 비어있으면 도매시장 조건 없이 전체 조회
  fetchMarket: async (marketCode, date = getTodayKST()) => {
    const key = `${marketCode}_${date}`;
    const cached = get().cache[key];
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return;

    setLoading(set, key, true);
    setError(set, key, null);
    try {
      const params: Record<string, string> = {
        "cond[trd_clcln_ymd::EQ]": date,
      };
      // marketCode 있을 때만 도매시장 조건 추가
      if (marketCode) params["cond[whsl_mrkt_cd::EQ]"] = marketCode;

      const { rows, totalCount } = await apiFetch(params);
      setCache(set, key, rows, totalCount);
    } catch (e: any) {
      setError(set, key, e?.message ?? "오류");
    } finally {
      setLoading(set, key, false);
    }
  },

  // 중분류명으로 전국 조회 (예: "딸기") + 날짜 — 캐시 키는 "middle_딸기_date"
  fetchByMiddle: async (middleName, date = getTodayKST(), marketCode = "") => {
    const key = `${middleKey(middleName)}_${date}_${marketCode}`;
    const cached = get().cache[key];
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return;

    setLoading(set, key, true);
    setError(set, key, null);
    try {
      const params: Record<string, string> = {
        "cond[trd_clcln_ymd::EQ]": date,
        "cond[gds_mclsf_nm::EQ]": middleName,
      };
      if (marketCode) params["cond[whsl_mrkt_cd::EQ]"] = marketCode;

      const { rows, totalCount } = await apiFetch(params);
      setCache(set, key, rows, totalCount);
    } catch (e: any) {
      setError(set, key, e?.message ?? "오류");
    } finally {
      setLoading(set, key, false);
    }
  },

  // 캐시 무효화 — fetchedAt을 0으로 리셋해서 다음 호출 시 강제 재요청
  invalidate: (cacheKey) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [cacheKey]: { ...s.cache[cacheKey], fetchedAt: 0 },
      },
    })),

  // 캐시에서 rows 반환 — 없으면 빈 배열
  getRows: (cacheKey) => get().cache[cacheKey]?.rows ?? [],
}));

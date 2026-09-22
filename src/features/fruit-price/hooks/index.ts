/**
 * 도매시장 시세 + 관심시장 훅 레이어
 *
 * [역할]
 * api/index.ts의 함수를 react-query로 감싸서
 * 로딩/에러/캐시 상태를 컴포넌트에 제공
 *
 * [구성]
 * - useTradeStore          : zustand 시세 캐시 스토어 (기존)
 * - getLargeOptions 등     : 드롭다운 옵션 파생 유틸 (기존)
 * - useInterestMarkets     : 바로가기 목록 조회 (5분 캐시)
 * - useAddInterestMarket   : 바로가기 저장 → 성공 시 목록 자동 갱신
 * - useDeleteInterestMarket: 바로가기 삭제
 *     → 낙관적 업데이트: API 응답 전에 UI에서 먼저 제거
 *     → 실패 시 목록 롤백
 */
export { useTradeStore } from "./store";
export { getLargeOptions, getMiddleOptions, getSmallOptions } from "./utils";

// 관심 시장 hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInterestMarkets,
  addInterestMarket,
  deleteInterestMarket,
} from "../api";
import type { InterestMarket } from "../api";

export type { InterestMarket };

const QK = "interest-markets";

export function useInterestMarkets() {
  return useQuery({
    queryKey: [QK],
    queryFn: getInterestMarkets,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddInterestMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addInterestMarket,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

export function useDeleteInterestMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteInterestMarket,
    // 낙관적 업데이트 — API 응답 전에 UI에서 먼저 제거
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [QK] });
      const prev = qc.getQueryData<InterestMarket[]>([QK]);
      qc.setQueryData<InterestMarket[]>(
        [QK],
        (old) => old?.filter((m) => m.interestMarketId !== id) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData([QK], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

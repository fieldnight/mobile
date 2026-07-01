/**
 * 관심 농약 훅 레이어
 *
 * useInterestPesticides     : 목록 조회 (5분 캐시)
 * useAddInterestPesticide   : 등록 → 성공 시 목록 자동 갱신
 *   - 409(중복) 에러는 호출부에서 토스트 처리
 *   - 그 외 에러는 console.log 후 종료
 * useDeleteInterestPesticide: 삭제 → 낙관적 업데이트
 *   - 404(미존재) 에러는 호출부에서 토스트 처리
 *   - 그 외 에러는 console.log 후 롤백
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInterestPesticides,
  addInterestPesticide,
  deleteInterestPesticide,
} from "../api/interestPesticide";
import type {
  InterestPesticide,
  AddInterestPesticideBody,
} from "../api/interestPesticide";

export type { InterestPesticide, AddInterestPesticideBody };

const QK = "interest-pesticides";

export function useInterestPesticides() {
  return useQuery({
    queryKey: [QK],
    queryFn: getInterestPesticides,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddInterestPesticide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addInterestPesticide,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
    onError: (err: any) => {
      // 409는 호출부에서 처리하므로 그 외 에러만 로깅
      if (err?.response?.status !== 409) {
        console.log("[관심농약] 등록 실패", err);
      }
    },
  });
}

export function useDeleteInterestPesticide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteInterestPesticide,
    // API 응답 전에 UI에서 먼저 제거 (낙관적 업데이트)
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [QK] });
      const prev = qc.getQueryData<InterestPesticide[]>([QK]);
      qc.setQueryData<InterestPesticide[]>(
        [QK],
        (old) => old?.filter((p) => p.interestPesticideId !== id) ?? [],
      );
      return { prev };
    },
    onError: (err: any, _id, ctx) => {
      // 404는 호출부에서 처리, 그 외 에러는 로깅 후 롤백
      if (err?.response?.status !== 404) {
        console.log("[관심농약] 삭제 실패", err);
      }
      if (ctx?.prev) qc.setQueryData([QK], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAiRecommendation,
  saveRecommendation,
  getRecommendationList,
  getRecommendationDetail,
  getBeeTypeEnum,
} from '../api';
import type {
  BeeRecommendationAiRequest,
  BeeRecommendationAiResponse,
  BeeRecommendationSaveRequest,
} from '@/types/recommendation';

// AI 추천 요청 mutation
export function useAiRecommendation() {
  return useMutation({
    mutationFn: (request: BeeRecommendationAiRequest) => getAiRecommendation(request),
  });
}

// 추천 결과 저장 mutation
export function useSaveRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BeeRecommendationSaveRequest) => saveRecommendation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bee-recommendations'] });
    },
  });
}

// 추천 목록 조회
export function useRecommendationList() {
  return useQuery({
    queryKey: ['bee-recommendations'],
    queryFn: getRecommendationList,
  });
}

// 추천 상세 조회
export function useRecommendationDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ['bee-recommendation-detail', id],
    queryFn: () => getRecommendationDetail(id!),
    enabled: !!id,
  });
}

export { getBeeTypeEnum };

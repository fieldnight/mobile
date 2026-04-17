import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  analyzeBeeImage,
  getAiDiagnosis,
  saveDiagnosis,
  getDiagnosisList,
  getDiagnosisDetail,
  type SaveDiagnosisParams,
} from '../api';
import type { BeeDiagnosisAiRequest } from '@/types/bee-diagnosis';

// 이미지 분석 mutation
export function useAnalyzeBeeImage() {
  return useMutation({
    mutationFn: (imageUri: string) => analyzeBeeImage(imageUri),
  });
}

// AI 진단 mutation
export function useAiDiagnosis() {
  return useMutation({
    mutationFn: (request: BeeDiagnosisAiRequest) => getAiDiagnosis(request),
  });
}

// 진단 저장 mutation
export function useSaveDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveDiagnosisParams) => saveDiagnosis(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bee-diagnoses'] });
    },
  });
}

// 진단 목록 조회
export function useDiagnosisList() {
  return useQuery({
    queryKey: ['bee-diagnoses'],
    queryFn: getDiagnosisList,
  });
}

// 진단 상세 조회
export function useDiagnosisDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ['bee-diagnosis-detail', id],
    queryFn: () => getDiagnosisDetail(id!),
    enabled: !!id,
  });
}

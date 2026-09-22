import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  analyzeBeeImage,
  getAiDiagnosis,
  saveDiagnosis,
  getDiagnosisList,
  getDiagnosisDetail,
} from "../api";
import type { BeeDiagnosisAiRequest, SaveDiagnosisParams } from "../model";

export function useAnalyzeBeeImage() {
  return useMutation({
    mutationFn: (imageUri: string) => analyzeBeeImage(imageUri),
  });
}

export function useAiDiagnosis() {
  return useMutation({
    mutationFn: (request: BeeDiagnosisAiRequest) => getAiDiagnosis(request),
  });
}

export function useSaveDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveDiagnosisParams) => saveDiagnosis(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diagnosisQueryKeys.all });
    },
  });
}

export function useDiagnosisList() {
  return useQuery({
    queryKey: diagnosisQueryKeys.all,
    queryFn: getDiagnosisList,
  });
}

export function useDiagnosisDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: diagnosisQueryKeys.detail(id),
    queryFn: () => getDiagnosisDetail(id!),
    enabled: !!id,
  });
}

const diagnosisQueryKeys = {
  all: ["bee-diagnoses"] as const,
  detail: (id: string | number | undefined) =>
    [...diagnosisQueryKeys.all, "detail", id] as const,
};

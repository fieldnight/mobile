import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFarmList,
  createFarm,
  getFarmDetail,
  updateFarm,
  deleteFarm,
} from '../api';
import type { UserCropCreateRequest } from '@/types/farm';

// 농지 목록 조회
export function useFarmList() {
  return useQuery({
    queryKey: ['farms'],
    queryFn: getFarmList,
  });
}

// 농지 등록
export function useCreateFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UserCropCreateRequest) => createFarm(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

// 농지 상세 조회
export function useFarmDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ['farm-detail', id],
    queryFn: () => getFarmDetail(id!),
    enabled: !!id,
  });
}

// 농지 수정
export function useUpdateFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string | number; request: Partial<UserCropCreateRequest> }) =>
      updateFarm(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

// 농지 삭제
export function useDeleteFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deleteFarm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

import { api } from '@/lib/api';
import type { UserCrop, UserCropCreateRequest } from '@/types/farm';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

// 농지 목록 조회
export async function getFarmList(): Promise<UserCrop[]> {
  const response = await api.get<ApiResponse<UserCrop[]>>('/api/v1/profile/crops');
  const list = response.data.data || [];
  // 최신순 정렬
  return list.sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b.id - a.id;
  });
}

// 농지 등록
export async function createFarm(request: UserCropCreateRequest): Promise<{ id: number }> {
  const response = await api.post<ApiResponse<{ id: number }>>('/api/v1/profile/crops', request);
  return response.data.data;
}

// 농지 상세 조회
export async function getFarmDetail(id: string | number): Promise<UserCrop> {
  const response = await api.get<ApiResponse<UserCrop>>(`/api/v1/profile/crops/${id}`);
  return response.data.data;
}

// 농지 수정
export async function updateFarm(
  id: string | number,
  request: Partial<UserCropCreateRequest>
): Promise<UserCrop> {
  const response = await api.put<ApiResponse<UserCrop>>(`/api/v1/profile/crops/${id}`, request);
  return response.data.data;
}

// 농지 삭제
export async function deleteFarm(id: string | number): Promise<void> {
  await api.delete(`/api/v1/profile/crops/${id}`);
}

import { api } from '@/lib/api';
import type { CropCategory, CropGuide } from '@/types/crop-guide';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export async function getCropCategories(): Promise<CropCategory[]> {
  console.log('[작물별가이드] 카테고리 목록 조회');
  const response = await api.get<ApiResponse<CropCategory[]>>(
    '/api/v1/bee/recommendations/crops',
  );
  console.log('[작물별가이드] 카테고리 목록 응답:', response.data.data?.map((c) => c.category));
  return response.data.data;
}

export async function getCropGuide(
  category: string,
  crop: string,
): Promise<CropGuide> {
  console.log(`[작물별가이드] 가이드 조회 → 대분류: ${category} / 소분류: ${crop}`);
  const response = await api.get<ApiResponse<CropGuide>>(
    '/api/v1/bee/recommendations/crops/guide',
    { params: { category, crop } },
  );
  console.log(`[작물별가이드] 가이드 응답 → 대분류: ${category} / 소분류: ${crop}`, response.data.data);
  return response.data.data;
}

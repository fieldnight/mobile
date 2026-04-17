import { api } from '@/lib/api';
import type {
  BeeRecommendationAiRequest,
  BeeRecommendationAiResponse,
  BeeRecommendationSaveRequest,
  BeeRecommendationListItem,
  BeeRecommendationDetailResponse,
} from '@/types/recommendation';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

// 벌 한글명 → enum 매핑
const BEE_TYPE_MAP: Record<string, string> = {
  '뒤영벌': 'BUMBLEBEE',
  '꿀벌': 'HONEYBEE',
  '가위벌': 'MASON_BEE',
  '호박벌': 'BUMBLEBEE',
  '서양뒤영벌': 'BUMBLEBEE',
};

// 벌 타입을 enum으로 변환
export function getBeeTypeEnum(beeType: string): string {
  if (['HONEYBEE', 'BUMBLEBEE', 'MASON_BEE'].includes(beeType.toUpperCase())) {
    return beeType.toUpperCase();
  }
  return BEE_TYPE_MAP[beeType] || 'BUMBLEBEE';
}

// AI 추천 요청
export async function getAiRecommendation(
  request: BeeRecommendationAiRequest
): Promise<BeeRecommendationAiResponse> {
  const response = await api.post<ApiResponse<BeeRecommendationAiResponse>>(
    '/api/v1/bee/recommendations/ai',
    request
  );
  return response.data.data;
}

// 추천 결과 저장
export async function saveRecommendation(
  request: BeeRecommendationSaveRequest
): Promise<{ beeRecommendationId: number }> {
  const response = await api.post<ApiResponse<{ beeRecommendationId: number }>>(
    '/api/v1/bee/recommendations',
    request
  );
  return response.data.data;
}

// 추천 목록 조회
export async function getRecommendationList(): Promise<BeeRecommendationListItem[]> {
  const response = await api.get<ApiResponse<BeeRecommendationListItem[]>>(
    '/api/v1/bee/recommendations'
  );
  const list = response.data.data || [];
  // 최신순 정렬
  return list.sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b.beeRecommendationId - a.beeRecommendationId;
  });
}

// 추천 상세 조회
export async function getRecommendationDetail(
  id: string | number
): Promise<BeeRecommendationDetailResponse> {
  const response = await api.get<ApiResponse<BeeRecommendationDetailResponse>>(
    `/api/v1/bee/recommendations/${id}`
  );
  return response.data.data;
}

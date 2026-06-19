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

const BEE_TYPE_MAP: Record<string, string> = {
  '꿀벌': 'HONEYBEE',
  '뒤영벌': 'BUMBLEBEE',
  '호박벌': 'BUMBLEBEE',
  '서양뒤영벌': 'BUMBLEBEE',
  '가위벌': 'MASON_BEE',
};

const logRecommendation = (message: string, payload?: unknown) => {
  if (__DEV__) console.log(`[RecommendationAI] ${message}`, payload ?? '');
};

const logRecommendationError = (message: string, error: unknown) => {
  if (__DEV__) console.error(`[RecommendationAI] ${message}`, error);
};

export function getBeeTypeEnum(beeType: string): string {
  if (['HONEYBEE', 'BUMBLEBEE', 'MASON_BEE'].includes(beeType.toUpperCase())) {
    return beeType.toUpperCase();
  }
  return BEE_TYPE_MAP[beeType] || 'BUMBLEBEE';
}

export async function getAiRecommendation(
  request: BeeRecommendationAiRequest,
): Promise<BeeRecommendationAiResponse> {
  logRecommendation('ai request', request);

  try {
    const response = await api.post<ApiResponse<BeeRecommendationAiResponse>>(
      '/api/v1/bee/recommendations/ai',
      request,
    );
    const data = response.data.data;

    logRecommendation('ai response', {
      beeType: data?.beeType,
      inputStartDate: data?.inputStartDate,
      inputEndDate: data?.inputEndDate,
      characteristicCount: data?.characteristics?.length ?? 0,
      cautionCount: data?.caution?.length ?? 0,
      usageTipCount: data?.usageTip?.length ?? 0,
      raw: data,
    });

    return data;
  } catch (error) {
    logRecommendationError('ai error', error);
    throw error;
  }
}

export async function saveRecommendation(
  request: BeeRecommendationSaveRequest,
): Promise<{ beeRecommendationId: number }> {
  logRecommendation('save request', request);

  try {
    const response = await api.post<ApiResponse<{ beeRecommendationId: number }>>(
      '/api/v1/bee/recommendations',
      request,
    );

    logRecommendation('save response', response.data.data);
    return response.data.data;
  } catch (error) {
    logRecommendationError('save error', error);
    throw error;
  }
}

export async function getRecommendationList(): Promise<BeeRecommendationListItem[]> {
  logRecommendation('list request');

  try {
    const response = await api.get<ApiResponse<BeeRecommendationListItem[]>>(
      '/api/v1/bee/recommendations',
    );
    const list = response.data.data || [];
    const sorted = list.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return b.beeRecommendationId - a.beeRecommendationId;
    });

    logRecommendation('list response', {
      count: sorted.length,
      latestId: sorted[0]?.beeRecommendationId,
    });

    return sorted;
  } catch (error) {
    logRecommendationError('list error', error);
    throw error;
  }
}

export async function getRecommendationDetail(
  id: string | number,
): Promise<BeeRecommendationDetailResponse> {
  logRecommendation('detail request', { id });

  try {
    const response = await api.get<ApiResponse<BeeRecommendationDetailResponse>>(
      `/api/v1/bee/recommendations/${id}`,
    );

    logRecommendation('detail response', response.data.data);
    return response.data.data;
  } catch (error) {
    logRecommendationError('detail error', error);
    throw error;
  }
}

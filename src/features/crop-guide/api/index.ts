import { api } from '@/lib/api';
import type { CropCategory, CropGuide } from '@/types/crop-guide';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

const logCropGuide = (message: string, payload?: unknown) => {
  if (__DEV__) console.log(`[CropGuide] ${message}`, payload ?? '');
};

const logCropGuideError = (message: string, error: unknown) => {
  if (__DEV__) console.error(`[CropGuide] ${message}`, error);
};

export async function getCropCategories(): Promise<CropCategory[]> {
  logCropGuide('categories request');

  try {
    const response = await api.get<ApiResponse<CropCategory[]>>(
      '/api/v1/bee/recommendations/crops',
    );
    const categories = response.data.data;

    logCropGuide('categories response', {
      count: categories?.length ?? 0,
      categories: categories?.map((item) => ({
        category: item.category,
        cropCount: item.crops?.length ?? 0,
      })),
    });

    return categories;
  } catch (error) {
    logCropGuideError('categories error', error);
    throw error;
  }
}

export async function getCropGuide(
  category: string,
  crop: string,
): Promise<CropGuide> {
  logCropGuide('guide request', { category, crop });

  try {
    const response = await api.get<ApiResponse<CropGuide>>(
      '/api/v1/bee/recommendations/crops/guide',
      { params: { category, crop } },
    );
    const guide = response.data.data;

    logCropGuide('guide response', {
      name: guide?.name,
      category: guide?.category,
      pollinatorCount: guide?.pollinators?.length ?? 0,
      applicableVarietyCount: guide?.applicableVarieties?.length ?? 0,
      hasPrecautions: !!guide?.precautions,
      hasEffectiveness: !!guide?.effectiveness,
      raw: guide,
    });

    return guide;
  } catch (error) {
    logCropGuideError('guide error', error);
    throw error;
  }
}

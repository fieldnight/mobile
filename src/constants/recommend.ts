import type { CultivationType } from '@/types/farm';

// Crop options for recommendation
export const CROP_OPTIONS = [
  '딸기',
  '토마토',
  '고추',
  '오이',
  '호박',
  '수박',
  '참외',
  '멜론',
  '블루베리',
  '사과',
  '배',
  '기타',
] as const;

export type CropOption = (typeof CROP_OPTIONS)[number];

// Cultivation type labels for UI
export const CULTIVATION_TYPE_LABELS: Record<CultivationType, string> = {
  CONTROLLED: '시설재배',
  OPEN_FIELD: '노지',
};

// Bee type info for UI display
export const BEE_TYPE_INFO: Record<string, { icon: string; color: string }> = {
  HONEYBEE: { icon: 'sun', color: '#FFB300' },
  BUMBLEBEE: { icon: 'zap', color: '#7C4DFF' },
  MASON_BEE: { icon: 'home', color: '#00897B' },
};

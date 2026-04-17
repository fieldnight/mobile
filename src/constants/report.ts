import type { FacilityType } from '@/types/report';

export const BEE_BRANDS = [
  '지리산 수정벌',
  '두레수정벌',
  '수정벌마야',
  '비플라이',
  '에코벌',
  '하나벌',
  '강한벌',
  '기타',
] as const;

export type BeeBrand = (typeof BEE_BRANDS)[number];

export interface FacilityTypeOption {
  id: FacilityType;
  label: string;
  icon: 'home' | 'sun';
}

export const FACILITY_TYPES: FacilityTypeOption[] = [
  { id: 'greenhouse', label: '하우스 시설', icon: 'home' },
  { id: 'farmland', label: '농지', icon: 'sun' },
];

export const REPORT_TOTAL_STEPS = 5;

export const REPORT_STEP_LABELS = [
  { step: 1, label: '농장 정보' },
  { step: 2, label: '작물 정보' },
  { step: 3, label: '수정벌 정보' },
  { step: 4, label: '생산 정보' },
  { step: 5, label: '환경 데이터' },
] as const;

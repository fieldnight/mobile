import type { CultivationType } from '@/types/farm';

export interface CultivationTypeOption {
  id: CultivationType;
  label: string;
  icon: 'home' | 'sun';
}

export const CULTIVATION_TYPES: CultivationTypeOption[] = [
  { id: 'CONTROLLED', label: '시설재배', icon: 'home' },
  { id: 'OPEN_FIELD', label: '노지재배', icon: 'sun' },
];

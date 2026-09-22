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

/** 농지 추가/수정 화면 공통 색상 */
export const FC = {
  text:        "#191F28", // 기본 텍스트
  textSub:     "#4B5563", // 라벨·보조 텍스트
  placeholder: "#B0B8C1", // 인풋 플레이스홀더
  border:      "#E5E8EB", // 구분선·테두리
  bg:          "#F4F5F7", // 인풋·카드 배경
  white:       "#FFFFFF",
  accent:      "#F59E0B", // 포인트 (yellow-500)
  accentBg:    "#FFFBEB", // 선택된 카드 배경
  accentBorder:"#F59E0B", // 선택된 카드 테두리
  accentIcon:  "#FFFFFF", // 선택된 아이콘 색
  unselIcon:   "#9CA3AF", // 미선택 아이콘 색
  requiredBg:  "#DBEAFE", // 필수 뱃지 배경 (blue-100)
  requiredText:"#2563EB", // 필수 뱃지 텍스트 (blue-600)
  optionalBg:  "#F3F4F6", // 선택 뱃지 배경
  optionalText:"#6B7280", // 선택 뱃지 텍스트
  error:       "#EF4444", // 삭제·오류
  calIcon:     "#9CA3AF", // 달력 아이콘
} as const;

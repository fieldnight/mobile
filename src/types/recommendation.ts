import type { CultivationType } from '@/types/farm';

// AI 추천 요청 (UserCropInfoRequest)
export interface BeeRecommendationAiRequest {
  name: string; // 작물명
  variety?: string; // 품종
  cultivationType: CultivationType; // 재배 방식
  cultivationAddress: string; // 재배 지역
  cultivationArea: number; // 재배 면적
  plantingDate: string; // 정식일 (YYYY-MM-DD)
}

// AI 추천 응답 (BeeRecommendationAiResponse)
export interface BeeRecommendationAiResponse {
  beeType: string; // 수정벌 종류
  characteristics: string[]; // 수정벌 특징
  inputStartDate: string; // 투입 적정 시작일
  inputEndDate: string; // 투입 적정 마감일
  caution: string[]; // 주의사항
  usageTip: string[]; // 사용 팁
}

// 추천 저장 요청 (BeeRecommendationRequest)
export interface BeeRecommendationSaveRequest {
  cropName: string;
  cultivationAddress: string;
  cultivationType: CultivationType;
  beeType: string;
  characteristics: string;
  inputStartDate: string;
  inputEndDate: string;
  caution: string;
  usageTip: string;
}

// 추천 저장 응답 (BeeRecommendationCreateResponse)
export interface BeeRecommendationSaveResponse {
  beeRecommendationId: number;
}

// 추천 목록 항목 (BeeRecommendationListResponse)
export interface BeeRecommendationListItem {
  beeRecommendationId: number;
  beeType: string;
  inputStartDate: string;
  inputEndDate: string;
  cropName: string;
  cultivationAddress: string;
  cultivationType: CultivationType;
  createdAt: string;
}

// 추천 상세 응답 (BeeRecommendationDetailResponse)
export interface BeeRecommendationDetailResponse {
  beeRecommendationId: number;
  beeType: string;
  inputStartDate: string;
  inputEndDate: string;
  cropName: string;
  cultivationAddress: string;
  cultivationType: CultivationType;
  characteristics: string;
  caution: string;
  usageTip: string;
  createdAt: string;
}

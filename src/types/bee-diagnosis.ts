import type { CultivationType } from './farm';

// 꿀벌 질병 타입
export type BeeDiseaseType =
  | 'ADULT_DWV' // 성충 날개불구바이러스감염증
  | 'ADULT_MITE' // 성충 응애
  | 'LARVA_FOULBROOD' // 유충 부저병
  | 'LARVA_SACBROOD' // 유충 낭충봉아부패병
  | 'LARVA_MITE'; // 유충 응애

// 질병 한글 라벨
export const DISEASE_LABELS: Record<BeeDiseaseType, string> = {
  ADULT_DWV: '성충 날개불구바이러스감염증',
  ADULT_MITE: '성충 응애',
  LARVA_FOULBROOD: '유충 부저병',
  LARVA_SACBROOD: '유충 낭충봉아부패병',
  LARVA_MITE: '유충 응애',
};

// 진단 요청
export interface BeeDiagnosisRequest {
  cropName: string;
  cultivationType: CultivationType;
  cultivationAddress?: string;
  additionalInfo?: string;
}

// 이미지 분석 응답
export interface BeeDiagnosisAnalyzeResponse {
  diseaseType: BeeDiseaseType;
  confidence: number;
  imageUrl: string;
}

// AI 대처 방안 요청
export interface BeeDiagnosisAiRequest {
  imageUrl: string;
  diseaseType: BeeDiseaseType;
  cropName: string;
  cultivationType: CultivationType;
  cultivationAddress?: string;
  additionalInfo?: string;
}

// AI 대처 방안 응답
export interface BeeDiagnosisAiResponse {
  diseaseType: BeeDiseaseType;
  description: string;
  symptoms: string[];
  cause: string;
  severity: '상' | '중' | '하';
  solutions: string[];
}

// 진단 저장 요청
export interface BeeDiagnosisSaveRequest {
  imageUrl: string;
  diseaseType: BeeDiseaseType;
  confidence: number;
  cropName: string;
  cultivationType: CultivationType;
  cultivationAddress?: string;
  additionalInfo?: string;
  description: string;
  symptoms: string;
  cause: string;
  severity: string;
  solutions: string;
}

// 진단 저장 응답
export interface BeeDiagnosisSaveResponse {
  beeDiagnosisId: number;
}

// 진단 목록 항목
export interface BeeDiagnosisListItem {
  beeDiagnosisId: number;
  imageUrl: string;
  diseaseType: BeeDiseaseType;
  confidence: number;
  createdAt: string;
}

// 진단 상세 응답
export interface BeeDiagnosisDetailResponse {
  imageUrl: string;
  diseaseType: BeeDiseaseType;
  confidence: number;
  cropName: string;
  cultivationType: CultivationType;
  cultivationAddress?: string;
  additionalInfo?: string;
  description: string;
  symptoms: string;
  cause: string;
  severity: string;
  solutions: string;
  createdAt: string;
}

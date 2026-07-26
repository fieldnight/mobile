import type { CultivationType } from "@/types/farm";

export type BeeDiagnosisStatus = "상" | "중" | "하" | string;

export interface BeeDiagnosisAnalyzeResponse {
  name: string;
  confidence: string | number;
  description: string;
  symptoms: string[];
  cause: string;
  severity: BeeDiagnosisStatus;
}

export interface BeeDiagnosisAiRequest {
  disease: string;
  cultivationType: CultivationType;
  cropName: string;
  cultivationAddress?: string;
  details?: string;
}

export interface BeeDiagnosisAiResponse {
  situationAnalysis: string[];
  solutions: string[];
}

export interface BeeDiagnosisSaveRequest {
  diseaseType: string;
  confidence: number;
  cropName: string;
  cultivationType: CultivationType;
  cultivationAddress?: string;
  details?: string;
  situationAnalysis: string;
  solutions: string;
}

export interface BeeDiagnosisListItem {
  beeDiagnosisId: number;
  imageUrl: string;
  diseaseType: string;
  confidence?: number;
  situationAnalysis: string;
  createdAt: string;
}

export interface BeeDiagnosisDetailResponse {
  imageUrl: string;
  diseaseType: string;
  confidence?: number;
  cropName: string;
  cultivationType: CultivationType;
  cultivationAddress?: string;
  details?: string;
  situationAnalysis: string;
  solutions: string;
  createdAt: string;
}

export interface BeeDiagnosisResult {
  diseaseType: string;
  confidence: number;
  description: string;
  symptoms: string[];
  cause: string;
  severity: BeeDiagnosisStatus;
  situationAnalysis: string[];
  solutions: string[];
}

export interface SaveDiagnosisParams {
  imageUri: string;
  request: BeeDiagnosisSaveRequest;
}

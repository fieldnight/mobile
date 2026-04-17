// Severity levels
export type DiagnosisSeverity = 'healthy' | 'warning' | 'critical';

// Diagnosis types
export interface Diagnosis {
  id: string;
  userId: string;
  imageUrl: string;
  diseaseName: string;
  severity: DiagnosisSeverity;
  confidence: string;
  symptoms: string;
  recommendations: string;
  createdAt: string;
}

export interface DiagnosisRequest {
  imageUrl?: string;
  imageBase64?: string;
}

export interface DiagnosisResult {
  diseaseName: string;
  diseaseNameEn: string;
  severity: DiagnosisSeverity;
  confidence: number;
  symptoms: string;
  recommendations: string;
}

export interface DiagnosisResponse {
  diagnosis: Diagnosis;
  result: DiagnosisResult;
}

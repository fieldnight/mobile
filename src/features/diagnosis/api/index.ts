import { api } from '@/lib/api';
import type {
  BeeDiagnosisAnalyzeResponse,
  BeeDiagnosisAiRequest,
  BeeDiagnosisAiResponse,
  BeeDiagnosisListItem,
  BeeDiagnosisDetailResponse,
} from '@/types/bee-diagnosis';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

// 이미지 분석 API
export async function analyzeBeeImage(imageUri: string): Promise<BeeDiagnosisAnalyzeResponse> {
  const formDataBody = new FormData();
  const filename = imageUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formDataBody.append('beeImage', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const response = await api.post<ApiResponse<BeeDiagnosisAnalyzeResponse>>(
    '/api/v1/bee/diagnosis',
    formDataBody,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data;
}

// AI 대처 방안 요청
export async function getAiDiagnosis(
  request: BeeDiagnosisAiRequest
): Promise<BeeDiagnosisAiResponse> {
  const response = await api.post<ApiResponse<BeeDiagnosisAiResponse>>(
    '/api/v1/bee/diagnosis/ai',
    request
  );
  return response.data.data;
}

// 진단 결과 저장
export interface SaveDiagnosisParams {
  imageUri: string;
  request: {
    diseaseType: string;
    confidence: number;
    cropName: string;
    cultivationType: string;
    cultivationAddress?: string;
    additionalInfo?: string;
    description: string;
    symptoms: string;
    cause: string;
    severity: string;
    solutions: string;
  };
}

export async function saveDiagnosis(params: SaveDiagnosisParams): Promise<{ beeDiagnosisId: number }> {
  const formDataBody = new FormData();
  formDataBody.append('request', JSON.stringify(params.request));

  if (params.imageUri) {
    const filename = params.imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formDataBody.append('beeImage', {
      uri: params.imageUri,
      name: filename,
      type,
    } as any);
  }

  const response = await api.post<ApiResponse<{ beeDiagnosisId: number }>>(
    '/api/v1/bee/diagnosis/save',
    formDataBody,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data;
}

// 진단 목록 조회
export async function getDiagnosisList(): Promise<BeeDiagnosisListItem[]> {
  const response = await api.get<ApiResponse<BeeDiagnosisListItem[]>>('/api/v1/bee/diagnosis');
  const list = response.data.data || [];
  // 최신순 정렬
  return list.sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b.beeDiagnosisId - a.beeDiagnosisId;
  });
}

// 진단 상세 조회
export async function getDiagnosisDetail(id: string | number): Promise<BeeDiagnosisDetailResponse> {
  const response = await api.get<ApiResponse<BeeDiagnosisDetailResponse>>(
    `/api/v1/bee/diagnosis/${id}`
  );
  return response.data.data;
}

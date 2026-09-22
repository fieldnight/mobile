import { Platform } from "react-native";
import { api } from "@/lib/api";
import type {
  BeeDiagnosisAnalyzeResponse,
  BeeDiagnosisAiRequest,
  BeeDiagnosisAiResponse,
  BeeDiagnosisListItem,
  BeeDiagnosisDetailResponse,
  SaveDiagnosisParams,
} from "../model";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export async function analyzeBeeImage(imageUri: string): Promise<BeeDiagnosisAnalyzeResponse> {
  try {
    const formData = new FormData();
    formData.append("beeImage", createImagePart(imageUri));

    console.log("[Diagnosis API] 이미지 분석 요청");
    const response = await api.post<ApiResponse<BeeDiagnosisAnalyzeResponse>>(
      "/api/v1/bee/diagnosis",
      formData,
      getMultipartRequestConfig(),
    );
    console.log("[Diagnosis API] 이미지 분석 성공", {
      disease: response.data.data?.name,
    });
    return response.data.data;
  } catch (error) {
    console.warn("[Diagnosis API] 이미지 분석 실패", getDiagnosisErrorLog(error));
    throw error;
  }
}

export async function getAiDiagnosis(
  request: BeeDiagnosisAiRequest,
): Promise<BeeDiagnosisAiResponse> {
  try {
    console.log("[Diagnosis API] 맞춤 대처 방안 요청", {
      disease: request.disease,
      cultivationType: request.cultivationType,
    });
    const response = await api.post<ApiResponse<BeeDiagnosisAiResponse>>(
      "/api/v1/bee/diagnosis/ai",
      request,
    );
    console.log("[Diagnosis API] 맞춤 대처 방안 성공", {
      solutionCount: response.data.data?.solutions?.length ?? 0,
    });
    return response.data.data;
  } catch (error) {
    console.warn("[Diagnosis API] 맞춤 대처 방안 실패", getDiagnosisErrorLog(error));
    throw error;
  }
}

export async function saveDiagnosis(params: SaveDiagnosisParams): Promise<{ beeDiagnosisId: number }> {
  try {
    const formData = new FormData();
    formData.append("request", JSON.stringify(params.request));
    formData.append("beeImage", createImagePart(params.imageUri));

    console.log("[Diagnosis API] 진단 결과 저장 요청", {
      disease: params.request.diseaseType,
    });
    const response = await api.post<ApiResponse<{ beeDiagnosisId: number }>>(
      "/api/v1/bee/diagnosis/save",
      formData,
      getMultipartRequestConfig(),
    );
    console.log("[Diagnosis API] 진단 결과 저장 성공", {
      beeDiagnosisId: response.data.data?.beeDiagnosisId,
    });
    return response.data.data;
  } catch (error) {
    console.warn("[Diagnosis API] 진단 결과 저장 실패", getDiagnosisErrorLog(error));
    throw error;
  }
}

export async function getDiagnosisList(): Promise<BeeDiagnosisListItem[]> {
  try {
    const response = await api.get<ApiResponse<BeeDiagnosisListItem[]>>(
      "/api/v1/bee/diagnosis",
    );
    const list = response.data.data ?? [];
    console.log("[Diagnosis API] 진단 기록 조회 성공", { count: list.length });
    return [...list].sort(compareDiagnosisCreatedAt);
  } catch (error) {
    console.warn("[Diagnosis API] 진단 기록 조회 실패", getDiagnosisErrorLog(error));
    throw error;
  }
}

export async function getDiagnosisDetail(id: string | number): Promise<BeeDiagnosisDetailResponse> {
  try {
    const response = await api.get<ApiResponse<BeeDiagnosisDetailResponse>>(
      `/api/v1/bee/diagnosis/${id}`,
    );
    console.log("[Diagnosis API] 진단 상세 조회 성공", { beeDiagnosisId: id });
    return response.data.data;
  } catch (error) {
    console.warn("[Diagnosis API] 진단 상세 조회 실패", {
      beeDiagnosisId: id,
      ...getDiagnosisErrorLog(error),
    });
    throw error;
  }
}

export function getDiagnosisErrorMessage(error: unknown, fallback: string) {
  const value = error as {
    code?: unknown;
    response?: { data?: { code?: unknown; message?: unknown } };
  };
  if (value.response?.data?.code === "BEE_001") {
    return "사진에서 벌을 찾지 못했어요. 벌 한 마리가 크게 보이는 사진으로 다시 시도해주세요.";
  }
  if (value.code === "ERR_NETWORK") {
    return "사진을 서버로 보내지 못했어요. 네트워크를 확인하고 다시 시도해주세요.";
  }

  const serverMessage = value.response?.data?.message;
  return typeof serverMessage === "string" && serverMessage.trim()
    ? serverMessage.trim()
    : fallback;
}

function createImagePart(imageUri: string) {
  const filename = imageUri.split("/").pop() || "bee.jpg";
  const extension = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase();
  const type = extension === "png" ? "image/png" : "image/jpeg";
  return { uri: imageUri, name: filename, type } as unknown as Blob;
}

function getMultipartRequestConfig() {
  return {
    headers: {
      "Content-Type": Platform.OS === "web" ? undefined : "multipart/form-data",
    },
    transformRequest: (data: unknown) => data,
  };
}

function compareDiagnosisCreatedAt(a: BeeDiagnosisListItem, b: BeeDiagnosisListItem) {
  const aTime = Date.parse(a.createdAt);
  const bTime = Date.parse(b.createdAt);
  if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
  return b.beeDiagnosisId - a.beeDiagnosisId;
}

function getDiagnosisErrorLog(error: unknown) {
  const value = error as {
    message?: unknown;
    response?: { status?: unknown; data?: { code?: unknown; message?: unknown } };
  };
  return {
    status: value.response?.status,
    code: value.response?.data?.code,
    message: value.response?.data?.message ?? value.message,
  };
}

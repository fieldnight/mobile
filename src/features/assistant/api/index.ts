/**
 * 챗봇 서버 API를 호출하는 네트워크 계층입니다.
 * 주요 함수:
 * - sendAssistantMessage: `POST /api/v1/assistants/messages`로 사용자 질문을 보내고 AI 답변/출처/conversationId를 받습니다.
 * - getAssistantSampleQuestions: `GET /api/v1/assistants/sample-questions`로 추천 질문 목록을 가져옵니다.
 */
import { api } from "@/lib/api";
import type {
  DoorActivityReportRequest,
  DoorActivityReportResponse,
  SendAssistantMessageRequest,
  SendAssistantMessageResponse,
} from "../model";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export async function sendAssistantMessage(
  request: SendAssistantMessageRequest,
): Promise<SendAssistantMessageResponse> {
  try {
    console.log("[Assistant API] 질문 전송", {
      conversationId: request.conversationId,
      mode: request.mode,
    });

    const response = await api.post<ApiResponse<SendAssistantMessageResponse>>(
      "/api/v1/assistants/messages",
      request,
    );

    return response.data.data;
  } catch (error) {
    console.log("[Assistant API] 질문 전송 실패", error);
    throw error;
  }
}

export async function getAssistantSampleQuestions(): Promise<string[]> {
  try {
    console.log("[Assistant API] 예시 질문 조회");

    const response = await api.get<ApiResponse<string[]>>(
      "/api/v1/assistants/sample-questions",
    );

    return response.data.data ?? [];
  } catch (error) {
    console.log("[Assistant API] 예시 질문 조회 실패", error);
    throw error;
  }
}

export async function createDoorActivityReport(
  request: DoorActivityReportRequest,
): Promise<DoorActivityReportResponse> {
  try {
    console.log("[Assistant API] 벌 활동 리포트 요청", {
      deviceId: request.deviceId,
      analysisDate: request.analysisDate,
      hourlyCount: request.hourlyStats.length,
      climateCount: request.climateSamples.length,
    });

    const response = await api.post<ApiResponse<DoorActivityReportResponse>>(
      "/api/v1/assistants/door-reports",
      request,
    );

    console.log("[Assistant API] 벌 활동 리포트 생성 성공", {
      deviceId: request.deviceId,
      status: response.data.data?.status,
    });

    return response.data.data;
  } catch (error) {
    console.log("[Assistant API] 벌 활동 리포트 생성 실패", error);
    throw error;
  }
}

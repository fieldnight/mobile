/**
 * 챗봇 서버 API를 호출하는 네트워크 계층입니다.
 *
 * 사용 기술/구조:
 * - `@/lib/api`의 axios 인스턴스를 사용해 공통 baseURL, 인증 헤더, 토큰 재발급 인터셉터를 그대로 탑니다.
 * - 서버 공통 응답 형태 `{ code, message, data }`를 `ApiResponse<T>` 제네릭으로 감싸 타입을 맞춥니다.
 * - try-catch 안에서 `console.log`로 실패 지점을 남기고, 상위 hook이 UI 에러 메시지를 만들 수 있도록 error를 다시 throw합니다.
 *
 * 주요 함수:
 * - sendAssistantMessage: `POST /api/v1/assistants/messages`로 사용자 질문을 보내고 AI 답변/출처/conversationId를 받습니다.
 * - getAssistantSampleQuestions: `GET /api/v1/assistants/sample-questions`로 추천 질문 목록을 가져옵니다.
 */
import { api } from "@/lib/api";
import type {
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

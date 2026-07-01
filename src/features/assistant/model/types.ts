/**
 * 챗봇 API와 로컬 대화 저장에 사용하는 데이터 타입 정의 파일입니다.
 *
 * 사용 기술/구조:
 * - TypeScript `type`과 `interface`로 API DTO와 화면 모델을 명확히 분리합니다.
 * - 서버 응답의 sources는 문자열 배열이지만, 화면에서는 확장 가능하도록 `AssistantSource` 객체 배열로 변환해 사용합니다.
 *
 * 주요 타입:
 * - AssistantMode: 현재 API 요청 mode 값입니다. 지금은 `"RAG"`만 사용합니다.
 * - ChatRole: 메시지 작성자가 사용자와 AI 중 누구인지 구분합니다.
 * - AssistantMessage: 채팅 화면에 렌더링되는 단일 메시지 구조입니다.
 * - AssistantConversation: 로컬 스토리지에 저장되는 대화 단위 구조입니다.
 * - SendAssistantMessageRequest/Response: `/api/v1/assistants/messages` 요청/응답 DTO입니다.
 */
export type AssistantMode = "RAG";

export type ChatRole = "user" | "assistant";

export interface AssistantSource {
  title: string;
}

export interface AssistantMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  sources?: AssistantSource[];
  isError?: boolean;
}

export interface AssistantConversation {
  id: string;
  title: string;
  mode: AssistantMode;
  messages: AssistantMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SendAssistantMessageRequest {
  input: string;
  conversationId: string;
  mode: AssistantMode;
}

export interface SendAssistantMessageResponse {
  answer: string;
  conversationId: string;
  sources: string[];
}

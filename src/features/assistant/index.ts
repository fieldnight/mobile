/**
 * Assistant feature의 public entry 파일입니다.
 *
 * 사용 기술/구조:
 * - FSD(feature-sliced design)에서 화면이 feature 내부 구현 경로를 직접 알지 않도록 barrel export를 제공합니다.
 * - API 함수, React hook, 타입을 한 곳에서 재노출해 `@/features/assistant` import를 가능하게 합니다.
 *
 * 주요 export:
 * - sendAssistantMessage, getAssistantSampleQuestions: 챗봇 서버 API 호출 함수입니다.
 * - useAssistantChat: 채팅 화면이 사용하는 대화 상태/전송/로컬 저장 관리 훅입니다.
 * - Assistant* 타입들: 화면, API, storage 계층이 공유하는 데이터 타입입니다.
 */
export { sendAssistantMessage, getAssistantSampleQuestions } from "./api";
export { useAssistantChat } from "./hooks";
export type {
  AssistantConversation,
  AssistantMessage,
  AssistantMode,
  AssistantSource,
  SendAssistantMessageRequest,
  SendAssistantMessageResponse,
} from "./model";

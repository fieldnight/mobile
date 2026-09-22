/**
 * Assistant feature의 public entry 파일입니다.
 * 주요 export:
 * - sendAssistantMessage, getAssistantSampleQuestions, createDoorActivityReport: 챗봇 서버 API 호출 함수입니다.
 * - useAssistantChat: 채팅 화면이 사용하는 대화 상태/전송/로컬 저장 관리 훅입니다.
 * - Assistant* 타입들: 화면, API, storage 계층이 공유하는 데이터 타입입니다.
 */
export {
  createDoorActivityReport,
  getAssistantSampleQuestions,
  sendAssistantMessage,
} from "./api";
export { useAssistantChat } from "./hooks";
export type {
  AssistantConversation,
  AssistantMessage,
  AssistantMode,
  AssistantSource,
  DoorActivityGateState,
  DoorActivityReportRequest,
  DoorActivityReportResponse,
  SendAssistantMessageRequest,
  SendAssistantMessageResponse,
} from "./model";

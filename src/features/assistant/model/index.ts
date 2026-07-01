/**
 * Assistant feature model 타입의 barrel export 파일입니다.
 *
 * 사용 기술/구조:
 * - `types.ts`의 타입 정의를 다시 내보내 feature 내부/외부 import 경로를 짧게 유지합니다.
 * - 런타임 값이 없는 타입 전용 export라 번들에 불필요한 JS 코드가 추가되지 않습니다.
 *
 * 주요 export:
 * - AssistantConversation, AssistantMessage: 로컬 저장과 화면 렌더링에 쓰는 대화/메시지 타입입니다.
 * - SendAssistantMessageRequest, SendAssistantMessageResponse: 챗봇 메시지 API 요청/응답 타입입니다.
 */
export type {
  AssistantConversation,
  AssistantMessage,
  AssistantMode,
  AssistantSource,
  SendAssistantMessageRequest,
  SendAssistantMessageResponse,
} from "./types";

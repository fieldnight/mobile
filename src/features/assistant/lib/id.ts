/**
 * 챗봇 대화와 메시지에서 사용할 ID를 생성하는 유틸 파일입니다.
 *
 * 사용 기술/구조:
 * - 별도 네이티브 UUID 라이브러리를 추가하지 않고 JS 기본 API(`Date.now`, `Math.random`)로 클라이언트 임시 ID를 만듭니다.
 * - conversationId는 서버 스펙 예시와 맞는 UUID v4 형태 문자열로 생성합니다.
 *
 * 주요 함수:
 * - createAssistantId: 메시지 key로 사용할 `prefix-timestamp-random` 형태의 ID를 생성합니다.
 * - createConversationId: 새 대화 시작 시 API에 전달할 UUID 형식 conversationId를 생성합니다.
 */
export function createAssistantId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createConversationId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}

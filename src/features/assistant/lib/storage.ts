/**
 * 챗봇 대화 목록을 휴대폰 로컬 스토리지에 저장/복원하는 저장소 계층입니다.
 *
 * 사용 기술/구조:
 * - `@react-native-async-storage/async-storage`를 사용해 앱을 종료해도 대화 목록이 유지되게 합니다.
 * - 저장 key는 `assistant-conversations-v1`로 버전 suffix를 붙여 추후 저장 구조 변경에 대비합니다.
 * - JSON parse/stringify 실패나 저장소 오류는 try-catch에서 `console.log`로 남기고 앱 흐름은 깨지지 않게 처리합니다.
 *
 * 주요 함수:
 * - loadAssistantConversations: AsyncStorage에서 JSON 문자열을 읽어 `AssistantConversation[]`로 복원합니다.
 * - saveAssistantConversations: 현재 대화 목록을 JSON 문자열로 직렬화해 AsyncStorage에 저장합니다.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AssistantConversation } from "../model";

const ASSISTANT_CONVERSATIONS_KEY = "assistant-conversations-v1";

export async function loadAssistantConversations(): Promise<
  AssistantConversation[]
> {
  try {
    const raw = await AsyncStorage.getItem(ASSISTANT_CONVERSATIONS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch (error) {
    console.log("[Assistant Storage] 대화 목록 불러오기 실패", error);
    return [];
  }
}

export async function saveAssistantConversations(
  conversations: AssistantConversation[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ASSISTANT_CONVERSATIONS_KEY,
      JSON.stringify(conversations),
    );
  } catch (error) {
    console.log("[Assistant Storage] 대화 목록 저장 실패", error);
  }
}

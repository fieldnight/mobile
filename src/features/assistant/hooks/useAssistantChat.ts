/**
 * 챗봇 대화 상태와 서버 요청, 로컬 저장/복원을 관리하는 핵심 hook입니다.
 *
 * 사용 기술/구조:
 * - React `useState`, `useMemo`, `useCallback`, `useEffect`로 화면 상태와 액션을 캡슐화합니다.
 * - TanStack Query `useQuery`로 예시 질문 API를 캐싱하고, 실패 시 fallback 질문을 사용합니다.
 * - AsyncStorage 저장소 함수(`loadAssistantConversations`, `saveAssistantConversations`)를 통해 앱 재실행 후에도 대화를 복원합니다.
 * - 메시지 전송 시 optimistic update를 적용해 사용자 질문을 먼저 저장/표시하고, 서버 응답 후 AI 답변을 이어 붙입니다.
 *
 * 주요 함수:
 * - createTitle: 첫 질문을 기반으로 대화 목록에 표시할 제목을 만듭니다.
 * - sortConversations: updatedAt 기준으로 최신 대화가 위에 오도록 정렬합니다.
 * - persistConversations: 대화 목록을 정렬/최대 개수 제한 후 state와 AsyncStorage에 함께 저장합니다.
 * - loadHistory: AsyncStorage에서 저장된 대화 목록을 불러와 현재 대화를 초기화합니다.
 * - startNewConversation: 현재 대화 선택을 해제해 다음 질문이 새 conversation으로 저장되게 합니다.
 * - selectConversation: 대화 목록에서 선택한 conversationId를 현재 대화로 설정합니다.
 * - deleteConversation: 선택한 대화를 삭제하고 필요하면 다음 대화를 현재 대화로 지정합니다.
 * - sendMessage: 질문 저장, `/assistants/messages` 호출, AI 답변/에러 메시지 저장까지 처리합니다.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAssistantSampleQuestions,
  sendAssistantMessage,
} from "../api";
import {
  loadAssistantConversations,
  saveAssistantConversations,
} from "../lib/storage";
import { createAssistantId, createConversationId } from "../lib/id";
import type {
  AssistantConversation,
  AssistantMessage,
  AssistantMode,
} from "../model";

const DEFAULT_MODE: AssistantMode = "RAG";
const MAX_CONVERSATIONS = 30;

const FALLBACK_SAMPLE_QUESTIONS = [
  "호박벌은 어디에 쓰이나요?",
  "수정벌을 온실에 넣을 때 주의할 점은?",
  "벌통 관리는 어떤 온도가 적당한가요?",
];

const WELCOME_MESSAGE: AssistantMessage = {
  id: "welcome",
  role: "assistant",
  text: "안녕하세요. 벌 관련 질문을 도와드릴게요.\n궁금한 내용을 편하게 물어보세요.",
  createdAt: new Date(0).toISOString(),
};

function createTitle(input: string): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= 24) return normalized;

  return `${normalized.slice(0, 24)}...`;
}

function sortConversations(conversations: AssistantConversation[]) {
  return [...conversations].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function useAssistantChat() {
  const [conversations, setConversations] = useState<AssistantConversation[]>(
    [],
  );
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const sampleQuestionsQuery = useQuery({
    queryKey: ["assistant", "sample-questions"],
    queryFn: getAssistantSampleQuestions,
    staleTime: 1000 * 60 * 10,
  });

  const currentConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === currentConversationId,
      ) ?? null,
    [conversations, currentConversationId],
  );

  const visibleMessages = currentConversation?.messages.length
    ? currentConversation.messages
    : [WELCOME_MESSAGE];

  const sampleQuestions =
    sampleQuestionsQuery.data && sampleQuestionsQuery.data.length > 0
      ? sampleQuestionsQuery.data
      : FALLBACK_SAMPLE_QUESTIONS;

  const persistConversations = useCallback(
    async (nextConversations: AssistantConversation[]) => {
      const sorted = sortConversations(nextConversations).slice(
        0,
        MAX_CONVERSATIONS,
      );

      setConversations(sorted);
      await saveAssistantConversations(sorted);
    },
    [],
  );

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);

    try {
      const savedConversations = sortConversations(
        await loadAssistantConversations(),
      );

      setConversations(savedConversations);
    } catch (error) {
      console.log("[Assistant Hook] 대화 목록 초기화 실패", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
  }, []);

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      const nextConversations = conversations.filter(
        (conversation) => conversation.id !== conversationId,
      );

      await persistConversations(nextConversations);

      if (currentConversationId === conversationId) {
        setCurrentConversationId(nextConversations[0]?.id ?? null);
      }
    },
    [conversations, currentConversationId, persistConversations],
  );

  const sendMessage = useCallback(
    async (input: string) => {
      const trimmedInput = input.trim();
      if (!trimmedInput || isSending) return;

      setIsSending(true);

      const now = new Date().toISOString();
      const conversationId = currentConversation?.id ?? createConversationId();
      const userMessage: AssistantMessage = {
        id: createAssistantId("user"),
        role: "user",
        text: trimmedInput,
        createdAt: now,
      };

      const baseConversation: AssistantConversation =
        currentConversation ?? {
          id: conversationId,
          title: createTitle(trimmedInput),
          mode: DEFAULT_MODE,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };

      const conversationWithQuestion: AssistantConversation = {
        ...baseConversation,
        messages: [...baseConversation.messages, userMessage],
        updatedAt: now,
      };

      const withQuestion = [
        conversationWithQuestion,
        ...conversations.filter(
          (conversation) => conversation.id !== conversationId,
        ),
      ];

      setCurrentConversationId(conversationId);
      await persistConversations(withQuestion);

      try {
        const answer = await sendAssistantMessage({
          input: trimmedInput,
          conversationId,
          mode: DEFAULT_MODE,
        });
        const answeredAt = new Date().toISOString();
        const assistantMessage: AssistantMessage = {
          id: createAssistantId("assistant"),
          role: "assistant",
          text: answer.answer,
          createdAt: answeredAt,
          sources: answer.sources.map((title) => ({ title })),
        };

        const nextConversation: AssistantConversation = {
          ...conversationWithQuestion,
          id: answer.conversationId || conversationId,
          messages: [...conversationWithQuestion.messages, assistantMessage],
          updatedAt: answeredAt,
        };
        const nextConversations = [
          nextConversation,
          ...withQuestion.filter(
            (conversation) => conversation.id !== conversationId,
          ),
        ];

        setCurrentConversationId(nextConversation.id);
        await persistConversations(nextConversations);
      } catch (error) {
        console.log("[Assistant Hook] 답변 생성 실패", error);

        const failedAt = new Date().toISOString();
        const errorMessage: AssistantMessage = {
          id: createAssistantId("assistant-error"),
          role: "assistant",
          text: "답변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
          createdAt: failedAt,
          isError: true,
        };
        const nextConversation: AssistantConversation = {
          ...conversationWithQuestion,
          messages: [...conversationWithQuestion.messages, errorMessage],
          updatedAt: failedAt,
        };
        const nextConversations = [
          nextConversation,
          ...withQuestion.filter(
            (conversation) => conversation.id !== conversationId,
          ),
        ];

        await persistConversations(nextConversations);
      } finally {
        setIsSending(false);
      }
    },
    [conversations, currentConversation, isSending, persistConversations],
  );

  return {
    conversations,
    currentConversationId,
    visibleMessages,
    sampleQuestions,
    isLoadingHistory,
    isSending,
    sendMessage,
    startNewConversation,
    selectConversation,
    deleteConversation,
    reloadHistory: loadHistory,
  };
}

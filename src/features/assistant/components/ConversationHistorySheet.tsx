/**
 * 저장된 챗봇 대화 목록을 바텀시트로 보여주는 컴포넌트입니다.
 *
 * 사용 기술/구조:
 * - 공용 `BottomSheet`를 사용하고, 내부 UI는 NativeWind `className`으로 구성합니다.
 * - 상단 `삭제`를 눌러 삭제 모드를 켠 경우에만 각 카드 우측 상단에 `x` 버튼을 표시합니다.
 * - 카드 padding, min-height, line-height를 NativeWind 클래스로 고정해 텍스트 겹침을 방지합니다.
 */
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import type { AssistantConversation } from "../model";

interface ConversationHistorySheetProps {
  visible: boolean;
  conversations: AssistantConversation[];
  currentConversationId: string | null;
  onClose: () => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

function formatConversationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "날짜 없음";
  }

  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationHistorySheet({
  visible,
  conversations,
  currentConversationId,
  onClose,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: ConversationHistorySheetProps) {
  const [deleteMode, setDeleteMode] = useState(false);

  useEffect(() => {
    if (visible) setDeleteMode(false);
  }, [visible]);

  const handleNewConversation = () => {
    onNewConversation();
    onClose();
  };

  const handleSelect = (conversationId: string) => {
    onSelectConversation(conversationId);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="대화 목록"
      snapHeight={0.72}
    >
      <View className="gap-3.5 px-1">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={handleNewConversation}
            className="min-h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-[#69b4d5] px-4 py-3.5 active:opacity-75"
            data-testid="button-new-assistant-conversation"
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <PretendardFont
              weight="bold"
              className="text-[15px] leading-5 text-white"
            >
              새 대화 시작
            </PretendardFont>
          </Pressable>

          <Pressable
            onPress={() => setDeleteMode((value) => !value)}
            disabled={conversations.length === 0}
            className={[
              "min-h-[52px] min-w-[68px] items-center justify-center rounded-2xl active:opacity-65",
              deleteMode ? "bg-red-100" : "bg-[#F8FAFC]",
              conversations.length === 0 ? "opacity-45" : "",
            ].join(" ")}
            data-testid="button-toggle-delete-mode"
          >
            <PretendardFont
              weight="bold"
              className={[
                "text-[14px] leading-5",
                deleteMode ? "text-[#DC2626]" : "text-[#4B5563]",
              ].join(" ")}
            >
              {deleteMode ? "완료" : "삭제"}
            </PretendardFont>
          </Pressable>
        </View>

        <View className="rounded-2xl bg-[#E8F2FF] px-4 py-3">
          <PretendardFont
            weight="semibold"
            className="text-[13px] leading-5 text-[#4B5563]"
          >
            이전 대화를 다시 열거나 새 대화를 시작할 수 있어요.
          </PretendardFont>
        </View>

        <View className="gap-2.5">
          {conversations.length === 0 ? (
            <View className="items-center rounded-2xl bg-[#F8FAFC] px-5 py-7">
              <Feather name="message-circle" size={28} color="#8B95A1" />
              <PretendardFont
                weight="semibold"
                className="mt-2.5 text-center text-[15px] leading-[21px] text-[#4B5563]"
              >
                저장된 대화가 없어요
              </PretendardFont>
            </View>
          ) : (
            conversations.map((conversation) => {
              const isCurrent = conversation.id === currentConversationId;

              return (
                <View
                  key={conversation.id}
                  className={[
                    "min-h-[82px] overflow-hidden rounded-2xl border",
                    isCurrent
                      ? "border-[#69b4d5] bg-[#EBF4FF]"
                      : "border-[#E5E8EB] bg-[#F8FAFC]",
                  ].join(" ")}
                >
                  <Pressable
                    onPress={() => handleSelect(conversation.id)}
                    className={[
                      "min-h-[82px] justify-center py-3.5 pl-[22px] active:opacity-75",
                      deleteMode ? "pr-12" : "pr-5",
                    ].join(" ")}
                    data-testid={`button-select-conversation-${conversation.id}`}
                  >
                    <PretendardFont
                      weight="semibold"
                      numberOfLines={1}
                      className="text-[15px] leading-[21px] text-[#191F28]"
                    >
                      {conversation.title}
                    </PretendardFont>

                    <PretendardFont
                      numberOfLines={1}
                      className="mt-1.5 text-[12px] leading-[17px] text-[#8B95A1]"
                    >
                      {formatConversationDate(conversation.updatedAt)}
                    </PretendardFont>
                  </Pressable>

                  {deleteMode ? (
                    <Pressable
                      onPress={() => onDeleteConversation(conversation.id)}
                      hitSlop={10}
                      className="absolute right-2 top-2 h-[30px] w-[30px] items-center justify-center rounded-full border border-[#E5E8EB] bg-white active:opacity-50"
                      data-testid={`button-delete-conversation-${conversation.id}`}
                    >
                      <Feather name="x" size={17} color="#DC2626" />
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

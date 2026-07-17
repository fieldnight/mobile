import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "@/components/AppHeader";
import { PretendardFont } from "@/components/PretendardFont";
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { useScrollHeader } from "@/hooks";
import { useAssistantChat } from "@/features/assistant";
import {
  AssistantMessageBubble,
  AssistantSuggestions,
  AssistantTypingBubble,
  ConversationHistorySheet,
} from "@/features/assistant/components";

export default function BeeChatScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const [inputText, setInputText] = useState("");
  const [historyVisible, setHistoryVisible] = useState(false);

  const {
    conversations,
    currentConversationId,
    visibleMessages,
    sampleQuestions,
    isSending,
    sendMessage,
    startNewConversation,
    selectConversation,
    deleteConversation,
    reloadHistory,
  } = useAssistantChat();

  const hasUserMessage = visibleMessages.some((message) => message.role === "user");
  const canSend = inputText.trim().length > 0 && !isSending;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, visibleMessages.length, isSending]);

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", scrollToBottom);

    return () => subscription.remove();
  }, [scrollToBottom]);

  const sendWithHaptic = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText || isSending) return;

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setInputText("");
      await sendMessage(trimmedText);
    },
    [isSending, sendMessage],
  );

  const handleSend = useCallback(() => {
    sendWithHaptic(inputText);
  }, [inputText, sendWithHaptic]);

  const handleRefresh = useCallback(async () => {
    await reloadHistory();
  }, [reloadHistory]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F4F5F7]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <AppHeader
        title="수정벌 AI 상담"
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: "clock",
          onPress: () => setHistoryVisible(true),
          testId: "button-open-assistant-history",
        }}
        isScrolled={isScrolled}
      />

      <PullToRefresh
        ref={scrollRef}
        onRefresh={handleRefresh}
        className="flex-1"
        contentContainerClassName="px-4 pb-2 pt-[72px]"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToBottom}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        {!hasUserMessage ? (
          <AssistantSuggestions
            questions={sampleQuestions}
            onSelect={sendWithHaptic}
          />
        ) : null}

        {visibleMessages.map((message) => (
          <AssistantMessageBubble key={message.id} message={message} />
        ))}

        {isSending ? <AssistantTypingBubble /> : null}
      </PullToRefresh>

      {hasUserMessage ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="grow-0 border-t border-[#E5E8EB] bg-white"
          contentContainerClassName="gap-2 px-3 py-2"
          keyboardShouldPersistTaps="handled"
        >
          {sampleQuestions.slice(0, 8).map((question, index) => (
            <Pressable
              key={`${question}-${index}`}
              onPress={() => sendWithHaptic(question)}
              disabled={isSending}
              className={[
                "rounded-full border border-[#E5E8EB] bg-white px-3.5 py-2",
                isSending ? "opacity-55" : "active:opacity-70",
              ].join(" ")}
            >
              <PretendardFont
                weight="medium"
                className="text-[13px] text-[#8B95A1]"
              >
                {question}
              </PretendardFont>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View className="border-t border-[#E5E8EB] bg-white px-3 pb-3 pt-2.5">
        <View className="min-h-[52px] flex-row items-center rounded-[26px] border border-[#E5E8EB] bg-[#F9FAFB] py-1.5 pl-4 pr-2">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="벌과 작물 상황을 물어보세요"
            placeholderTextColor="#B0B8C1"
            editable={!isSending}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            className="min-h-[38px] flex-1 px-0 py-1.5 text-[15px] leading-[21px] text-[#191F28]"
            textAlignVertical="center"
            data-testid="input-chat-message"
          />

          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            className={[
              "ml-2.5 h-9 w-9 items-center justify-center rounded-full",
              canSend ? "bg-[#EA580C]" : "bg-[#E5E8EB]",
            ].join(" ")}
            data-testid="button-send-message"
          >
            <Feather
              name="send"
              size={16}
              color={canSend ? "#FFFFFF" : "#8B95A1"}
            />
          </Pressable>
        </View>
      </View>

      <ConversationHistorySheet
        visible={historyVisible}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onClose={() => setHistoryVisible(false)}
        onNewConversation={startNewConversation}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
      />
    </KeyboardAvoidingView>
  );
}

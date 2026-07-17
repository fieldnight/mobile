import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const ASSISTANT_CHAT_GUIDE_HIDDEN_KEY = "webee:assistant-chat-guide-hidden";

function CoachText({
  before,
  highlight,
  after,
}: {
  before: string;
  highlight: string;
  after: string;
}) {
  return (
    <PretendardFont
      weight="semibold"
      className="text-[15px] leading-[23px] text-white"
    >
      {before}
      <PretendardFont weight="bold" className="text-[15px] text-[#1EA7FF]">
        {highlight}
      </PretendardFont>
      {after}
    </PretendardFont>
  );
}

function AssistantGuideOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Pressable onPress={onClose} className="absolute inset-0 z-[1001] bg-black/50">

      <View className="absolute right-1 top-0 h-14 w-14 items-center justify-center">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg">
          <Feather name="clock" size={22} color="#149EF2" />
        </View>
      </View>

      <View className="absolute right-6 top-[78px] w-[250px]">
        <Feather
          name="corner-right-up"
          size={30}
          color="#FFFFFF"
          style={{ alignSelf: "flex-end", marginBottom: 2, marginRight: 28 }}
        />
        <CoachText
          before="우측 시계 아이콘을 누르면 "
          highlight="기존 대화내역"
          after="을 확인할 수 있어요"
        />
      </View>

      <View className="absolute left-7 right-7 top-[185px]">
        <Feather
          name="corner-left-down"
          size={30}
          color="#FFFFFF"
          style={{ marginBottom: 4, marginLeft: 22 }}
        />
        <CoachText
          before="궁금한 게 막막하면 "
          highlight="질문 예시"
          after="를 눌러 바로 답변을 받아보세요"
        />
      </View>

      <View className="absolute bottom-[88px] left-6 right-6">
        <Feather
          name="corner-left-down"
          size={30}
          color="#FFFFFF"
          style={{ alignSelf: "flex-end", marginBottom: 4, marginRight: 42 }}
        />
        <CoachText
          before="원하는 질문은 아래 "
          highlight="입력창"
          after="에 직접 적어 대화할 수 있어요"
        />
      </View>
    </Pressable>
  );
}

export default function BeeChatScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const [inputText, setInputText] = useState("");
  const [historyVisible, setHistoryVisible] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);

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

  const hasUserMessage = visibleMessages.some(
    (message) => message.role === "user",
  );
  const canSend = inputText.trim().length > 0 && !isSending;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(ASSISTANT_CHAT_GUIDE_HIDDEN_KEY)
      .then((value) => {
        if (isMounted && value !== "true") {
          setNoticeVisible(true);
        }
      })
      .catch(() => {
        if (isMounted) setNoticeVisible(true);
      });

    return () => {
      isMounted = false;
    };
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

      setGuideVisible(false);
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

  const startGuide = useCallback(() => {
    setNoticeVisible(false);
    setGuideVisible(true);
  }, []);

  const hideGuidePermanently = useCallback(async () => {
    setNoticeVisible(false);
    setGuideVisible(false);
    await AsyncStorage.setItem(ASSISTANT_CHAT_GUIDE_HIDDEN_KEY, "true");
  }, []);

  const closeGuide = useCallback(() => {
    setGuideVisible(false);
  }, []);

  const openHistory = useCallback(() => {
    setGuideVisible(false);
    setHistoryVisible(true);
  }, []);

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
          onPress: openHistory,
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

      {guideVisible ? <AssistantGuideOverlay onClose={closeGuide} /> : null}

      <Modal
        visible={noticeVisible}
        transparent
        animationType="fade"
        onRequestClose={startGuide}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full max-w-[360px] rounded-3xl bg-white px-5 pb-5 pt-5">
            <View className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-[#FFF7ED]">
              <Feather name="alert-circle" size={22} color="#EA580C" />
            </View>

            <PretendardFont
              weight="bold"
              className="text-[18px] leading-6 text-[#191F28]"
            >
              챗봇은 아직 실험 중이에요
            </PretendardFont>

            <PretendardFont className="mt-3 text-[14px] leading-[22px] text-[#4E5968]">
              이 화면의 답변은 AI가 생성하며, 현재는 테스트 데이터가 일부
              포함될 수 있어요. 방제, 구매, 생육 판단처럼 중요한 결정은 현장
              상황과 전문가 확인을 함께 참고해주세요.
            </PretendardFont>

            <View className="mt-5 gap-2.5">
              <Pressable
                onPress={startGuide}
                className="h-[50px] items-center justify-center rounded-2xl bg-[#EA580C] active:opacity-80"
                data-testid="button-start-assistant-guide"
              >
                <PretendardFont weight="bold" className="text-[15px] text-white">
                  시작하기
                </PretendardFont>
              </Pressable>

              <Pressable
                onPress={hideGuidePermanently}
                className="h-[48px] items-center justify-center rounded-2xl border border-[#E5E8EB] bg-white active:opacity-80"
                data-testid="button-hide-assistant-guide"
              >
                <PretendardFont weight="semibold" className="text-[14px] text-[#6B7684]">
                  다시 보지 않기
                </PretendardFont>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

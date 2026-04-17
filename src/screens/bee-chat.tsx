import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Text,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";

import InquiryModal from "./bee-chat-inquiry";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "@/components/AppHeader";

// ── 색상 팔레트 ──────────────────────────────────────
const C = {
  primary: "#3182F6",
  bg: "#F4F5F7",
  white: "#FFFFFF",
  Text: "#191F28",
  sec: "#8B95A1",
  ter: "#B0B8C1",
  border: "#E5E8EB",
  userBubble: "#3182F6",
  botBubble: "#FFFFFF",
  bee: "#FFD55F",
};

// ── 타입 ─────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  Text: string;
}

// ── 추천 질문 ─────────────────────────────────────────
const SUGGESTIONS = [
  "수정벌이 뭐예요?",
  "딸기 수분에 좋은 벌은?",
  "서양뒤영벌 관리법",
  "벌통 적정 온도는?",
  "수정벌 투입 시기",
  "꿀벌 vs 뒤영벌 차이",
];

// ── 봇 아바타 ─────────────────────────────────────────
function BotAvatar() {
  return (
    <View
      className="items-center justify-center mr-2"
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.bee,
      }}
    >
      <Text style={{ fontSize: 16 }}>🐝</Text>
    </View>
  );
}

// ── 메인 스크린 ───────────────────────────────────────
export default function BeeChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      Text: "안녕하세요! 수정벌 AI 챗봇이에요. 🐝\n수정벌에 관한 궁금한 점을 자유롭게 물어보세요!",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [inquiryVisible, setInquiryVisible] = useState(false);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 첫 유저 메시지 이전인지 여부
  const hasUserMessage = messages.some((m) => m.role === "user");

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleGoBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  };

  // 메시지 전송 — 실제 답변 로직은 외부에서 주입하거나 추후 연결
  const handleSend = useCallback(
    (Text?: string) => {
      const msg = (Text ?? inputText).trim();
      if (!msg || isTyping) return;

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", Text: msg },
      ]);
      setInputText("");
      setIsTyping(true);
      scrollToBottom();

      // TODO: 백엔드 연결 후 실제 응답으로 교체
      replyTimerRef.current = setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: "bot",
            Text: "답변을 준비 중이에요. 백엔드 연결 후 실제 응답이 표시됩니다.",
          },
        ]);
        setIsTyping(false);
        scrollToBottom();
        replyTimerRef.current = null;
      }, 1000);
    },
    [inputText, isTyping, scrollToBottom],
  );

  const handleSuggestionPress = (suggestion: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    handleSend(suggestion);
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#F4F5F7]">
      {/* ── 헤더 ── */}
      <AppHeader
        title="채팅 및 문의"
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: "mail",
          onPress: () => setInquiryVisible(true),
          testId: "button-inquiry",
        }}
      />
      // 설정 버튼 있는 화면
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {/* 추천 질문 — 유저 메시지 없을 때만 */}
        {!hasUserMessage && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text
              style={{
                fontSize: 12,
                color: C.ter,

                marginBottom: 16,
              }}
            >
              추천 질문을 눌러보세요
            </Text>
            <View
              className="flex-row flex-wrap justify-center"
              style={{ gap: 8, marginBottom: 16 }}
            >
              {SUGGESTIONS.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleSuggestionPress(s)}
                  className="bg-white"
                  style={{
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                  data-testid={`button-suggestion-${i}`}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.primary,
                      fontWeight: "500",
                    }}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* 말풍선 목록 */}
        {messages.map((msg) => (
          <Animated.View
            key={msg.id}
            entering={FadeInDown.duration(300)}
            style={{
              flexDirection: "row",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-end",
              marginBottom: 12,
            }}
          >
            {msg.role === "bot" && <BotAvatar />}
            <View
              style={{
                maxWidth: "75%",
                backgroundColor:
                  msg.role === "user" ? C.userBubble : C.botBubble,
                borderRadius: 18,
                borderBottomRightRadius: msg.role === "user" ? 4 : 18,
                borderBottomLeftRadius: msg.role === "bot" ? 4 : 18,
                paddingHorizontal: 14,
                paddingVertical: 10,
                ...(msg.role === "bot"
                  ? { borderWidth: 1, borderColor: C.border }
                  : {}),
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  color: msg.role === "user" ? C.white : C.Text,
                }}
              >
                {msg.Text}
              </Text>
            </View>
          </Animated.View>
        ))}

        {/* 타이핑 인디케이터 */}
        {isTyping && (
          <Animated.View
            entering={FadeIn.duration(200)}
            className="flex-row items-end"
            style={{ marginBottom: 12 }}
          >
            <BotAvatar />
            <View
              className="bg-white"
              style={{
                borderRadius: 18,
                borderBottomLeftRadius: 4,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <View className="flex-row items-center gap-1">
                <ActivityIndicator size="small" color={C.sec} />
                <Text style={{ fontSize: 13, color: C.sec, marginLeft: 6 }}>
                  답변 작성 중...
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
      {/* ── 입력창 ── */}
      <View
        className="bg-white border-t border-[#E5E8EB]"
        style={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        }}
      >
        <View
          className="flex-row items-center"
          style={{
            backgroundColor: C.bg,
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: Platform.OS === "ios" ? 10 : 4,
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="수정벌에 대해 물어보세요..."
            placeholderTextColor={C.ter}
            style={{
              flex: 1,
              fontSize: 15,
              color: C.Text,
              maxHeight: 100,
              paddingVertical: 0,
            }}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            editable={!isTyping}
            data-testid="input-chat-message"
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            className="items-center justify-center ml-2"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor:
                inputText.trim() && !isTyping ? C.primary : C.border,
            }}
            data-testid="button-send-message"
          >
            <Feather name="send" size={16} color={C.white} />
          </Pressable>
        </View>
      </View>
      {/* ── 문의 모달 ── */}
      <InquiryModal
        visible={inquiryVisible}
        onClose={() => setInquiryVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

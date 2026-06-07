import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Keyboard,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import { PretendardFont } from "@/components/PretendardFont";
import { PullToRefresh } from "@/components/refresh/RefreshControl";

// ── 색상 팔레트 ──────────────────────────────────────
const C = {
  primary: "#EA580C",
  bg: "#F4F5F7",
  white: "#FFFFFF",
  Text: "#191F28",
  sec: "#8B95A1",
  ter: "#B0B8C1",
  border: "#E5E8EB",
  userBubble: "#EA580C",
  botBubble: "#FFFFFF",
  bee: "#FFD55F",
};

// ── 타입 ─────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  Text: string;
  ragCount?: number;
}

// ── 추천 질문 ─────────────────────────────────────────
const SUGGESTIONS = [
  "벌집 떨어질 때 유입구 청소하는 방법?",
  "꿀물 주는데 심지가 자꾸 내려가요",
  "벌통 환기 어느 정도가 적당한가요?",
];

// ── 봇 아바타 (SVG) ───────────────────────────────────
function BotAvatar() {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#1C1C1E",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
      }}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        {/* 육각형 */}
        <Path
          d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z"
          stroke="white"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        {/* 중앙 점 */}
        <Circle cx={12} cy={12} r={2.2} fill="white" />
        {/* 위아래 연결선 */}
        <Path
          d="M12 4.5V9.8M12 14.2V19.5"
          stroke="white"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

// ── 유저 아바타 ───────────────────────────────────────
function UserAvatar() {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.primary,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
      }}
    >
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 13, color: C.white }}
      >
        나
      </PretendardFont>
    </View>
  );
}

// ── RAG 참고 칩 ───────────────────────────────────────
function RagChip({ count }: { count: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "#FFF7ED",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginTop: 6,
        gap: 5,
      }}
    >
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
        <Rect
          x="3"
          y="3"
          width="18"
          height="5"
          rx="2"
          stroke={C.primary}
          strokeWidth={1.8}
        />
        <Rect
          x="3"
          y="10"
          width="18"
          height="5"
          rx="2"
          stroke={C.primary}
          strokeWidth={1.8}
        />
        <Rect
          x="3"
          y="17"
          width="18"
          height="4"
          rx="2"
          stroke={C.primary}
          strokeWidth={1.8}
        />
      </Svg>
      <PretendardFont
        weight="medium"
        style={{ fontSize: 11, color: C.primary }}
      >
        유사 케이스 {count}건 참고
      </PretendardFont>
    </View>
  );
}

// ── 메인 스크린 ───────────────────────────────────────
export default function BeeChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      Text: "안녕하세요! 수정벌 AI예요 🐝\n수분용 벌통 설치하면서 궁금한 점 있으시면 편하게 물어봐 주세요. 어떤 작물인지, 지금 어떤 상황인지 함께 알려주시면 더 정확하게 도와드릴 수 있어요.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasUserMessage = messages.some((m) => m.role === "user");

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", scrollToBottom);
    return () => sub.remove();
  }, [scrollToBottom]);

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
      scrollToBottom();

      // 유저 메시지 애니메이션 후 타이핑 인디케이터 표시
      setTimeout(() => setIsTyping(true), 1200);

      // TODO: 백엔드 연결 후 실제 응답으로 교체
      replyTimerRef.current = setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: "bot",
            Text: "답변을 준비 중이에요. 백엔드 연결 후 실제 응답이 표시됩니다.",
            ragCount: 7,
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

  const handleRefresh = useCallback(async (): Promise<void> => {
    // 새로고침: 메시지 초기화 및 상태 리셋
    setMessages([
      {
        id: "welcome",
        role: "bot",
        Text: "안녕하세요! 수정벌 AI예요 🐝\n수분용 벌통 설치하면서 궁금한 점 있으시면 편하게 물어봐 주세요. 어떤 작물인지, 지금 어떤 상황인지 함께 알려주시면 더 정확하게 도와드릴 수 있어요.",
      },
    ]);
    setInputText("");
    setIsTyping(false);

    // 입력 중이면 취소
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }

    // 새로고침 딜레이 (애니메이션 노출)
    return new Promise((resolve) => setTimeout(resolve, 800));
  }, []);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F4F5F7]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── 헤더 ── */}
      <AppHeader
        title="수정벌 AI 상담"
        onBack={() => navigation.goBack()}
        isScrolled={isScrolled}
      />
      <PullToRefresh
        ref={scrollRef}
        onRefresh={handleRefresh}
        contentContainerStyle={{
          padding: 16,
          paddingTop: HEADER_HEIGHT + 16,
          paddingBottom: 8,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {/* 추천 질문 — 유저 메시지 없을 때만 */}
        {!hasUserMessage && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 14, color: C.Text, marginBottom: 16 }}
            >
              💡 이런 걸 궁금해하는 농부님들이 많아요
            </PretendardFont>
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
                  <PretendardFont
                    weight="medium"
                    style={{ fontSize: 13, color: C.primary }}
                  >
                    {s}
                  </PretendardFont>
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
            <View style={{ maxWidth: "75%" }}>
              <View
                style={{
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
                <PretendardFont
                  weight="regular"
                  style={{
                    fontSize: 15,
                    lineHeight: 22,
                    color: msg.role === "user" ? C.white : C.Text,
                  }}
                >
                  {msg.Text}
                </PretendardFont>
              </View>
              {msg.role === "bot" && msg.ragCount !== undefined && (
                <RagChip count={msg.ragCount} />
              )}
            </View>
            {msg.role === "user" && <UserAvatar />}
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
                <PretendardFont
                  weight="regular"
                  style={{ fontSize: 13, color: C.sec, marginLeft: 6 }}
                >
                  답변 작성 중...
                </PretendardFont>
              </View>
            </View>
          </Animated.View>
        )}
      </PullToRefresh>

      {/* ── 퀵 칩 (유저 메시지 이후) ── */}
      {hasUserMessage && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            backgroundColor: C.white,
            borderTopWidth: 1,
            borderTopColor: C.border,
            flexGrow: 0,
          }}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 8,
          }}
        >
          {SUGGESTIONS.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => handleSuggestionPress(s)}
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: C.white,
              }}
            >
              <PretendardFont
                weight="medium"
                style={{ fontSize: 13, color: C.sec }}
              >
                {s}
              </PretendardFont>
            </Pressable>
          ))}
        </ScrollView>
      )}

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
            placeholder="우리 농장 상황에 맞춰서 물어봐주세요"
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
    </KeyboardAvoidingView>
  );
}

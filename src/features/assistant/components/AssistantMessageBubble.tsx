/**
 * 사용자 질문과 AI 답변을 채팅 말풍선 형태로 렌더링하는 컴포넌트입니다.
 */
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import type { AssistantMessage } from "../model";
import { AssistantAvatar } from "./AssistantAvatar";

interface AssistantMessageBubbleProps {
  message: AssistantMessage;
}

export function AssistantMessageBubble({ message }: AssistantMessageBubbleProps) {
  const isUser = message.role === "user";
  const hasSources = !isUser && message.sources && message.sources.length > 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      className={`mb-3 flex-row items-end ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && <AssistantAvatar type="assistant" />}

      <View className="max-w-[76%]">
        <View
          className={[
            "min-w-11 rounded-[18px] px-3.5 py-2.5",
            isUser
              ? "rounded-br bg-[#EA580C]"
              : "rounded-bl border bg-white shadow-sm",
            !isUser && message.isError
              ? "border-red-300"
              : !isUser
                ? "border-[#E5E8EB]"
                : "",
          ].join(" ")}
        >
          <PretendardFont
            className={[
              "text-[15px] leading-[22px]",
              isUser
                ? "text-white"
                : message.isError
                  ? "text-[#DC2626]"
                  : "text-[#191F28]",
            ].join(" ")}
          >
            {message.text}
          </PretendardFont>
        </View>

        {hasSources ? (
          <View className="mt-2 items-start gap-1.5">
            {message.sources?.map((source, index) => (
              <View
                key={`${source.title}-${index}`}
                className="flex-row items-center gap-1.5 self-start rounded-xl bg-[#FFF7ED] px-2.5 py-1"
              >
                <Feather name="book-open" size={12} color="#EA580C" />
                <PretendardFont
                  weight="medium"
                  className="text-[11px] text-[#EA580C]"
                >
                  {source.title}
                </PretendardFont>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {isUser && <AssistantAvatar type="user" />}
    </Animated.View>
  );
}

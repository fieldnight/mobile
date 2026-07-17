/**
 * 챗봇 예시 질문을 추천 칩 형태로 보여주는 컴포넌트입니다.
 */
import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PretendardFont } from "@/components/PretendardFont";

interface AssistantSuggestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function AssistantSuggestions({
  questions,
  onSelect,
}: AssistantSuggestionsProps) {
  return (
    <Animated.View entering={FadeInDown.delay(200).duration(300)}>
      <PretendardFont
        weight="semibold"
        className="mb-3.5 text-[14px] text-[#191F28]"
      >
        이런 질문을 많이 물어봐요
      </PretendardFont>

      <View className="mb-4 flex-row flex-wrap justify-center gap-2">
        {questions.slice(0, 5).map((question, index) => (
          <Pressable
            key={`${question}-${index}`}
            onPress={() => onSelect(question)}
            className="rounded-full border border-[#E5E8EB] bg-white px-3.5 py-2 shadow-sm active:opacity-70"
            data-testid={`button-assistant-suggestion-${index}`}
          >
            <PretendardFont
              weight="medium"
              className="text-[13px] text-[#EA580C]"
            >
              {question}
            </PretendardFont>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

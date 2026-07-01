/**
 * 챗봇 예시 질문을 추천 칩 형태로 보여주는 컴포넌트입니다.
 *
 * 사용 기술/구조:
 * - `react-native-reanimated`의 `FadeInDown`으로 추천 질문 영역 진입 애니메이션을 적용합니다.
 * - NativeWind `className`으로 wrap 레이아웃, 칩 border, 배경, padding을 구성합니다.
 * - 질문 목록이 길어져도 첫 화면이 과밀해지지 않도록 최대 5개만 렌더링합니다.
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

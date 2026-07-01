/**
 * AI가 답변을 생성 중임을 보여주는 로딩 말풍선 컴포넌트입니다.
 *
 * 사용 기술/구조:
 * - React Native `ActivityIndicator`로 로딩 스피너를 표시합니다.
 * - `react-native-reanimated`의 `FadeIn`으로 타이핑 말풍선이 부드럽게 나타나게 합니다.
 * - NativeWind `className`으로 실제 AI 답변 말풍선과 같은 시각 구조를 유지합니다.
 */
import { ActivityIndicator, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { PretendardFont } from "@/components/PretendardFont";
import { AssistantAvatar } from "./AssistantAvatar";

export function AssistantTypingBubble() {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      className="mb-3 flex-row items-end"
    >
      <AssistantAvatar type="assistant" />
      <View className="rounded-[18px] rounded-bl border border-[#E5E8EB] bg-white px-4 py-3">
        <View className="flex-row items-center gap-1.5">
          <ActivityIndicator size="small" color="#8B95A1" />
          <PretendardFont className="text-[13px] text-[#8B95A1]">
            답변 작성 중...
          </PretendardFont>
        </View>
      </View>
    </Animated.View>
  );
}

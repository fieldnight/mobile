/**
 * 채팅 말풍선 옆에 표시되는 사용자/AI 아바타 컴포넌트입니다.
 *
 * 사용 기술/구조:
 * - NativeWind `className`으로 크기, 원형 배경, 정렬, 여백을 구성합니다.
 * - 사용자 아바타는 Pretendard 텍스트, AI 아바타는 `assets/homeIcons/bee.png` 이미지를 사용합니다.
 */
import { Image, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";

interface AssistantAvatarProps {
  type: "assistant" | "user";
}

export function AssistantAvatar({ type }: AssistantAvatarProps) {
  if (type === "user") {
    return (
      <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-[#EA580C]">
        <PretendardFont
          weight="semibold"
          className="text-[13px] text-white"
        >
          나
        </PretendardFont>
      </View>
    );
  }

  return (
    <View className="mr-2.5 h-[42px] w-[42px] items-center justify-center rounded-full bg-[#FEF08A]">
      <Image
        source={require("../../../../assets/homeIcons/bee.png")}
        className="h-[34px] w-[34px]"
        resizeMode="contain"
      />
    </View>
  );
}

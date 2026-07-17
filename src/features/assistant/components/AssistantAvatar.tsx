/**
 * 채팅 말풍선 옆에 표시되는 사용자/AI 아바타 컴포넌트입니다.
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

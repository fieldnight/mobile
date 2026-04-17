import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

// ── 타입 ─────────────────────────────────────────────
type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface RightAction {
  icon: FeatherIconName;
  onPress: () => void;
  color?: string;
  testId?: string;
}

interface AppHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: RightAction;
}

// ── 아이콘 버튼 ───────────────────────────────────────
function IconButton({
  icon,
  onPress,
  color = "#191F28",
  testId,
}: {
  icon: FeatherIconName;
  onPress: () => void;
  color?: string;
  testId?: string;
}) {
  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      android_ripple={{ color: "#E5E8EB", radius: 22, borderless: true }}
      className="w-10 h-10 items-center justify-center rounded-full"
      data-testid={testId}
    >
      <Feather name={icon} size={22} color={color} />
    </Pressable>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function AppHeader({
  title,
  onBack,
  rightAction,
}: AppHeaderProps) {
  return (
    <View className="h-14 flex-row items-center justify-between px-4 bg-white border-b border-[#E5E8EB]">
      {/* 왼쪽: 뒤로가기 or 빈 공간 */}
      {onBack ? (
        <IconButton
          icon="chevron-left"
          onPress={onBack}
          testId="button-header-back"
        />
      ) : (
        <View className="w-10" />
      )}

      {/* 중앙: 타이틀 */}
      <Text className="text-[#191F28] text-lg font-semibold">{title}</Text>

      {/* 오른쪽: 액션 버튼 or 빈 공간 */}
      {rightAction ? (
        <IconButton
          icon={rightAction.icon}
          onPress={rightAction.onPress}
          color={rightAction.color ?? "#3182F6"}
          testId={rightAction.testId ?? "button-header-right"}
        />
      ) : (
        <View className="w-10" />
      )}
    </View>
  );
}

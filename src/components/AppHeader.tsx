/**
 * 공통 앱 헤더 컴포넌트
 * - 모든 화면에서 position:absolute 로 떠 있으므로, 각 화면 콘텐츠에 paddingTop: HEADER_HEIGHT 필요
 * - 뒤로가기(onBack), 우측 액션(rightAction) 선택 제공
 *
 * [스크롤 시 배경 효과]
 * - iOS   : expo-blur(BlurView)로 진짜 frosted glass 효과 — 뒤 콘텐츠가 뭉개지며 빛남
 * - Android: 반투명 흰 배경 fallback으로 처리됨 (expo-blur 자체 동작)
 */
import React, { useEffect } from "react";
import { View, Pressable, Platform, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

// intensity를 Reanimated로 직접 제어 — opacity 래핑 시 iOS 블러 레이어 flatten 문제 회피
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
import { PretendardFont } from "@/components/PretendardFont";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface AppHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: {
    icon: FeatherIconName;
    onPress: () => void;
    color?: string;
    testId?: string;
  };
  isScrolled?: boolean;
}

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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 32, bottom: 32, left: 32, right: 32 }}
      android_ripple={{ color: "#E5E8EB", radius: 32, borderless: true }}
      className="w-14 h-14 items-center justify-center rounded-full"
      style={({ pressed }) => ({ opacity: pressed ? 0.2 : 1 })}
      data-testid={testId}
    >
      <Feather name={icon} size={24} color={color} />
    </Pressable>
  );
}

export default function AppHeader({
  title,
  onBack,
  rightAction,
  isScrolled = false,
}: AppHeaderProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isScrolled ? 1 : 0, { duration: 200 });
  }, [isScrolled, progress]);

  // 기본 흰 배경: 스크롤 시 사라짐
  const solidStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  // BlurView intensity 직접 애니메이션 (0 → 80)
  const blurProps = useAnimatedProps(() => ({
    intensity: progress.value * 50,
  }));

  // 타이틀: 스크롤 시 50% 반투명
  const titleStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.5,
  }));

  // 하단 구분선: 스크롤 시 미세하게 나타남
  const borderStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.15,
  }));

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 1000,
      }}
    >
      {/* 기본 흰 배경 — 스크롤하면 페이드아웃 */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: "white" }, solidStyle]}
      />
      {/* frosted glass — intensity를 직접 애니메이션해야 iOS에서 실제 blur 작동 */}
      <AnimatedBlurView
        animatedProps={blurProps}
        tint="light"
        style={StyleSheet.absoluteFillObject}
      />
      {/* 스크롤 시 나타나는 하단 구분선 */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: "#000",
          },
          borderStyle,
        ]}
      />
      {/* 헤더 콘텐츠 */}
      <View className="h-14 flex-row items-center justify-between px-1">
        {onBack ? (
          <IconButton icon="chevron-left" onPress={onBack} testId="button-header-back" />
        ) : (
          <View className="w-14" />
        )}

        <Animated.View style={[{ flex: 1 }, titleStyle]}>
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 17, color: "#191F28", textAlign: "center" }}
          >
            {title}
          </PretendardFont>
        </Animated.View>

        {rightAction ? (
          <IconButton
            icon={rightAction.icon}
            onPress={rightAction.onPress}
            color={rightAction.color ?? "#191F28"}
            testId={rightAction.testId}
          />
        ) : (
          <View className="w-14" />
        )}
      </View>
    </View>
  );
}

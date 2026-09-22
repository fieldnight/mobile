/**
 * 커뮤니티 글쓰기 플로팅 액션 버튼 (FAB)
 * - 우하단 고정, 탭 시 스프링 스케일 애니메이션
 */
import { Pressable, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRef } from "react";

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      style={{
        position: "absolute",
        right: 20,
        bottom: 20,
        zIndex: 50,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          width: 56,
          height: 56,
          backgroundColor: "#191f28",
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Feather name="edit-3" size={22} color="#ffffff" />
      </Animated.View>
    </Pressable>
  );
}
import { useState, useRef, useEffect } from "react";
import { Pressable, Animated, Easing, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";

interface LikeButtonProps {
  initialCount: number;
  initialLiked?: boolean;
}

export function LikeButton({
  initialCount,
  initialLiked = false,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const scale = useRef(new Animated.Value(1)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !liked;

    setLiked(next);
    setCount((c) => (next ? c + 1 : c - 1));

    scale.setValue(0.7);
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 180,
      useNativeDriver: true,
    }).start();

    if (next) {
      particleAnim.setValue(0);
      Animated.timing(particleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  };

  const particleTranslateY = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const particleOpacity = particleAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <Pressable onPress={toggle} className="flex-row items-center gap-1">
      <View>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={16}
            color={liked ? "#f04452" : "#8b95a1"}
          />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 2,
            top: 0,
            opacity: particleOpacity,
            transform: [{ translateY: particleTranslateY }],
          }}
        >
          <Ionicons name="heart" size={10} color="#f04452" />
        </Animated.View>
      </View>

      <PretendardFont
        weight="medium"
        style={{ fontSize: 12, color: liked ? "#f04452" : "#8b95a1" }}
      >
        {count}
      </PretendardFont>
    </Pressable>
  );
}

/**
 * 커뮤니티 상단 히어로 배너
 * - 어두운 배경 + SVG 벌통 일러스트 (위아래 float 루프 애니메이션)
 * - 커뮤니티 소개 문구 + 주황색 액센트
 */
import { View, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import Svg, {
  Circle,
  Rect,
  Ellipse,
  G,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { PretendardFont } from "@/components/PretendardFont";

export function HeroBanner() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <View
      className="mx-5 mt-4 rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#0d1520", minHeight: 140 }}
    >
      <View
        className="absolute inset-0"
        style={{ backgroundColor: "#1a2535", opacity: 0.6 }}
      />

      <View className="p-5 relative z-10">
        <View className="flex-row items-center gap-1.5 self-start bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 rounded-full mb-2.5">
          <View className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 11, color: "#f97316" }}
          >
            수정벌 농가 커뮤니티
          </PretendardFont>
        </View>
        <PretendardFont weight="bold" style={{ fontSize: 20, color: "#ffffff", lineHeight: 28, marginBottom: 4 }}>
          함께 나누면{"\n"}
          <PretendardFont weight="bold" style={{ fontSize: 20, color: "#f97316" }}>착과율</PretendardFont>이 높아져요
        </PretendardFont>
        <PretendardFont style={{ fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.55)" }}>
          이번 주 수정벌 현장 노하우 23개 공유됨
        </PretendardFont>
      </View>

      {/* 3D 벌통 에셋 */}
      <Animated.View
        style={{
          position: "absolute",
          right: -10,
          bottom: -10,
          transform: [{ translateY }],
        }}
      >
        <Svg width={120} height={120} viewBox="0 0 130 130" fill="none">
          <Defs>
            <LinearGradient id="hiveGrad" x1="35" y1="60" x2="95" y2="105">
              <Stop offset="0%" stopColor="white" />
              <Stop offset="100%" stopColor="transparent" />
            </LinearGradient>
          </Defs>
          <Ellipse cx="65" cy="105" rx="38" ry="8" fill="rgba(0,0,0,0.2)" />
          <Rect x="35" y="60" width="60" height="45" rx="6" fill="#D4A520" />
          <Rect x="35" y="60" width="60" height="8" rx="3" fill="#B8890A" />
          <Rect x="35" y="75" width="60" height="8" fill="#B8890A" />
          <Rect x="35" y="90" width="60" height="8" fill="#B8890A" />
          <Rect x="52" y="97" width="26" height="8" rx="4" fill="#6B4A00" />
          <G>
            <Ellipse cx="85" cy="28" rx="8" ry="6" fill="#FFC107" />
            <Rect x="79" y="25" width="3" height="4" rx="1.5" fill="#333" />
            <Rect x="85" y="25" width="3" height="4" rx="1.5" fill="#333" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

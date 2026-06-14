/**
 * 개폐기 화면 배경 그라데이션
 * - expo-linear-gradient 없이 react-native-svg로 배경을 그립니다.
 */
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

export function DoorOpenerBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="doorOpenerBg" x1="0" y1="0" x2="0.25" y2="1">
            <Stop offset="0" stopColor="#5B79A8" />
            <Stop offset="0.5" stopColor="#8295B8" />
            <Stop offset="1" stopColor="#AEB7C3" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#doorOpenerBg)" />
      </Svg>
    </View>
  );
}

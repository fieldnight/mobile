import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/**
 * BottomWhiteGradient
 * - 투명한 화면 위에 하단 내비게이션이 올라올 때 쓰는 흰색 페이드 배경입니다.
 * - 아래로 갈수록 불투명해져서 아이콘/라벨 가독성을 안정적으로 유지합니다.
 */
export function BottomWhiteGradient({ height = 118 }: { height?: number }) {
  return (
    <Svg
      pointerEvents="none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, height }}
      width="100%"
      height={height}
    >
      <Defs>
        <LinearGradient id="bottomWhiteGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.78" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height={height} fill="url(#bottomWhiteGradient)" />
    </Svg>
  );
}

/**
 * 누름 상태에 따라 스타일이 바뀌는 Pressable
 * - 이 프로젝트의 NativeWind(css-interop)는 Pressable의 함수형 style({ pressed }) => ...을 버려
 *   배경·크기·여백이 통째로 사라집니다. 누름 상태를 직접 관리하고 항상 일반 스타일 객체를 넘깁니다.
 * - 사용법은 Pressable과 같습니다. style에 함수를 넘겨도 됩니다.
 */
import { useState } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

type TapStyle = StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);

export type TapProps = Omit<PressableProps, "style"> & { style?: TapStyle };

export function Tap({ style, onPressIn, onPressOut, ...rest }: TapProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={typeof style === "function" ? style({ pressed }) : style}
    />
  );
}

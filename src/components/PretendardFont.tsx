import { StyleSheet, Text, TextProps } from "react-native";
import { useSettingsStore } from "@/stores/useSettingsStore";

type Weight =
  | "thin"
  | "light"
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "extrabold"
  | "black";

const familyMap: Record<Weight, string> = {
  thin: "Pretendard-Thin",
  light: "Pretendard-Light",
  regular: "Pretendard-Regular",
  medium: "Pretendard-Medium",
  semibold: "Pretendard-SemiBold",
  bold: "Pretendard-Bold",
  extrabold: "Pretendard-ExtraBold",
  black: "Pretendard-Black",
};

export function PretendardFont({
  weight = "regular",
  style,
  ...props
}: TextProps & { weight?: Weight }) {
  const fontOffset = useSettingsStore((s) => s.fontOffset);
  const flat = StyleSheet.flatten(style);
  const baseFontSize = typeof flat?.fontSize === "number" ? flat.fontSize : undefined;

  return (
    <Text
      style={[
        { fontFamily: familyMap[weight] },
        style,
        baseFontSize != null && { fontSize: baseFontSize + fontOffset },
      ]}
      {...props}
    />
  );
}

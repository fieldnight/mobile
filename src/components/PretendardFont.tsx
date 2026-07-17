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

const TAILWIND_SIZES: Record<string, number> = {
  "text-xs": 12,
  "text-sm": 14,
  "text-base": 16,
  "text-lg": 18,
  "text-xl": 20,
  "text-2xl": 24,
  "text-3xl": 30,
};

function getClassFontSize(className?: string) {
  if (!className) return undefined;

  const arbitrarySize = className.match(/text-\[(\d+(?:\.\d+)?)px\]/);
  if (arbitrarySize) return Number(arbitrarySize[1]);

  return Object.entries(TAILWIND_SIZES).find(([cls]) =>
    className.split(/\s+/).includes(cls),
  )?.[1];
}

export function PretendardFont({
  weight = "regular",
  className,
  style,
  ...props
}: TextProps & { weight?: Weight; className?: string }) {
  const fontOffset = useSettingsStore((s) => s.fontOffset);
  const flat = StyleSheet.flatten(style);
  const styleFontSize = typeof flat?.fontSize === "number" ? flat.fontSize : undefined;
  const baseFontSize = styleFontSize ?? getClassFontSize(className);

  return (
    <Text
      className={className}
      style={[
        { fontFamily: familyMap[weight] },
        style,
        baseFontSize != null && { fontSize: baseFontSize + fontOffset },
      ]}
      {...props}
    />
  );
}

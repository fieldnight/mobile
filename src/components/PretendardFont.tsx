import { Text, TextProps } from "react-native";

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
  return (
    <Text
      style={[
        { fontFamily: familyMap[weight] },
        style,
      ]}
      {...props}
    />
  );
}

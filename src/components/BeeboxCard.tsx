import Animated, { FadeInDown } from "react-native-reanimated";

const C = {
  primary: "#3182F6",
  bg: "#F4F5F7",
  white: "#FFFFFF",
  text: "#191F28",
  sec: "#8B95A1",
  ter: "#B0B8C1",
  border: "#E5E8EB",
  success: "#00C853",
  warning: "#FF9100",
  error: "#F44336",
};

export function BeeBoxCard({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify()}
      style={[
        { backgroundColor: C.white, borderRadius: 16, padding: 16 },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

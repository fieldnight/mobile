import React from "react";
import { type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { C } from "@/constants/hive-colors";

export function BeeBoxCard({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify()}
      style={[
        {
          backgroundColor: C.white,
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: "rgba(0, 0, 0, 0.04)",
          shadowColor: C.sec,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

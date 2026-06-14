/**
 * 벌통 카드 컨테이너 (흰색 카드 UI)
 * - 통계/설정/제어 화면에서 공통 사용하는 카드 래퍼
 * - variant="setting": 반투명 배경 + 그림자 제거 (설정 화면용)
 */
import React from "react";
import { View, type ViewStyle } from "react-native";
import { C } from "@/constants/hive-colors";

export function BeeBoxCard({
  children,
  style,
  variant,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
  variant?: "setting";
}) {
  const isSettingVariant = variant === "setting";
  return (
    <View
      style={[
        {
          backgroundColor: isSettingVariant ? "rgba(255,255,255,0.80)" : C.white,
          borderRadius: 20,
          padding: 14,
          shadowColor: C.sec,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: isSettingVariant ? 0 : 4,
          ...(isSettingVariant && { marginHorizontal: -12 }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

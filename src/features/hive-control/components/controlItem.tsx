/**
 * 자동 제어 항목 행
 * - 행 전체(텍스트 + 토글) 탭으로 켜기/끄기
 * - 탭 시 스케일 바운스 인터랙션
 * - 이름 굵게·크게, 설명 가독성 개선
 */
import { BoxColor as C } from "@/types";
import { View, Switch, Pressable, Animated } from "react-native";
import { useRef } from "react";
import { PretendardFont } from "@/components/PretendardFont";
import type { ControlSetting } from "@/types/hive-control";

export function ControlItem({
  control,
  onToggle,
  blocked = false,
  onBlockedPress,
}: {
  control: ControlSetting;
  onToggle: (id: string) => void;
  blocked?: boolean;
  onBlockedPress?: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <Pressable
      onPress={() => {
        if (blocked) {
          onBlockedPress?.();
          return;
        }
        onToggle(control.id);
      }}
      onPressIn={pressIn}
      onPressOut={pressOut}
      android_ripple={{ color: "rgba(0,0,0,0.04)", borderless: false }}
    >
      <Animated.View
        className="flex-row items-center py-1"
        style={{
          transform: [{ scale }],
          opacity: blocked ? 0.56 : 1,
        }}
      >
        <View className="flex-1 pr-3">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <PretendardFont
              weight="bold"
              style={{ fontSize: 15, color: C.text }}
            >
              {control.name}
            </PretendardFont>
            <PretendardFont
              weight="medium"
              style={{ fontSize: 12, color: C.textSx }}
            >
              {control.description}
            </PretendardFont>
          </View>
        </View>
        <Switch
          value={control.enabled}
          pointerEvents="none"
          trackColor={{ false: C.border, true: C.primary }}
          thumbColor={C.white}
          ios_backgroundColor={C.border}
        />
      </Animated.View>
    </Pressable>
  );
}

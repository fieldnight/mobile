import { BoxColor as C } from "@/types";
import { Feather } from "@expo/vector-icons";
import { View, Pressable } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";

export function QcToggleButton({
  label,
  icon,
  isOn,
  disabled,
  onPress,
  testId,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  isOn: boolean;
  disabled: boolean;
  onPress: () => void;
  testId: string;
}) {
  return (
    <View className="flex-1 relative">
      <Pressable
        onPress={disabled ? undefined : onPress}
        className="items-center rounded-2xl"
        style={[
          {
            paddingVertical: 12,
            paddingHorizontal: 4,
            gap: 6,
            backgroundColor: C.bg,
          },
          isOn && !disabled && {
            backgroundColor: C.white,
            borderWidth: 1.5,
            borderColor: C.text,
          },
          disabled && { opacity: 0.25 },
        ]}
        data-testid={testId}
      >
        {/* 아이콘 원형 배경 — on 상태는 진한 배경 */}
        <View
          className="items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isOn ? C.text : C.bgAlt,
          }}
        >
          <Feather name={icon} size={16} color={isOn ? C.white : C.sec} />
        </View>
        <PretendardFont
          weight={isOn ? "bold" : "semibold"}
          style={{ fontSize: 13, color: C.text }}
        >
          {label}
        </PretendardFont>
      </Pressable>

      {/* 자동 제어 활성화 시 "자동" 오버레이 — 터치 통과 */}
      {disabled && (
        <View
          className="absolute inset-0 justify-center items-center rounded-2xl"
          pointerEvents="none"
        >
          <PretendardFont weight="bold" style={{ fontSize: 13, color: C.sec }}>
            자동
          </PretendardFont>
        </View>
      )}
    </View>
  );
}

import { BoxColor as C } from "@/types";
import { Feather } from "@expo/vector-icons";
import { View, Pressable, Text } from "react-native";

export function QcToggleButton({
  label,
  icon,
  isOn,
  disabled,
  onColor,
  bgOn,
  onPress,
  testId,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  isOn: boolean;
  disabled: boolean;
  onColor: string;
  bgOn: string;
  onPress: () => void;
  testId: string;
}) {
  return (
    <View className="flex-1 relative">
      <Pressable
        onPress={disabled ? undefined : onPress}
        className="items-center rounded-lg"
        style={[
          {
            paddingVertical: 5,
            gap: 3,
            backgroundColor: C.bg,
          },
          isOn &&
            !disabled && {
              backgroundColor: C.white,
              borderWidth: 1.5,
              borderColor: C.primary,
            },
          disabled && { opacity: 0.25 },
        ]}
        data-testid={testId}
      >
        <View
          className="items-center justify-center"
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: isOn ? bgOn : C.bg,
          }}
        >
          <Feather name={icon} size={13} color={isOn ? onColor : C.ter} />
        </View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: isOn ? "600" : "500",
            color: isOn ? onColor : C.sec,
          }}
        >
          {label}
        </Text>
      </Pressable>
      {disabled && (
        <View
          className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center rounded-lg"
          pointerEvents="none"
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.primary }}>
            자동
          </Text>
        </View>
      )}
    </View>
  );
}

import { BoxColor as C } from "@/types";
import { Feather } from "@expo/vector-icons";
import { View, Pressable } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";

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
        <PretendardFont
          weight={isOn ? "semibold" : "medium"}
          className="text-[12px]"
          style={{ color: isOn ? onColor : C.sec }}
        >
          {label}
        </PretendardFont>
      </Pressable>
      {disabled && (
        <View
          className="absolute inset-0 justify-center items-center rounded-lg"
          pointerEvents="none"
        >
          <PretendardFont
            weight="bold"
            className="text-[13px]"
            style={{ color: C.primary }}
          >
            자동
          </PretendardFont>
        </View>
      )}
    </View>
  );
}

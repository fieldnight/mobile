import { BoxColor as C } from "@/types";
import { Feather } from "@expo/vector-icons";
import { View, Switch, Text } from "react-native";

interface ControlSetting {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  enabled: boolean;
}

export function ControlItem({
  control,
  onToggle,
}: {
  control: ControlSetting;
  onToggle: (id: string) => void;
}) {
  return (
    <View className="flex-row items-center py-2">
      <View
        className="w-10 h-10 items-center justify-center mr-3"
        style={{ borderRadius: 10, backgroundColor: "#E8F2FF" }}
      >
        <Feather name={control.icon} size={20} color={C.primary} />
      </View>
      <View className="flex-1">
        <Text style={{ fontSize: 15, fontWeight: "500", color: C.text }}>
          {control.name}
        </Text>
        <Text style={{ fontSize: 12, color: C.sec, marginTop: 2 }}>
          {control.description}
        </Text>
      </View>
      <Switch
        value={control.enabled}
        onValueChange={() => onToggle(control.id)}
        trackColor={{ false: C.border, true: "#A8D5FF" }}
        thumbColor={control.enabled ? C.primary : "#FFFFFF"}
        ios_backgroundColor={C.border}
      />
    </View>
  );
}

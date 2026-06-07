import { BoxColor as C } from "@/types";
import { Feather } from "@expo/vector-icons";
import { View, Switch } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import type { ControlSetting } from "@/types/hive-control";

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
        <PretendardFont
          weight="medium"
          className="text-[15px]"
          style={{ color: C.text }}
        >
          {control.name}
        </PretendardFont>
        <PretendardFont className="text-[12px] mt-0.5" style={{ color: C.sec }}>
          {control.description}
        </PretendardFont>
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

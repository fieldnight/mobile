import { Pressable, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

export function DoorOpenerSectionHeader({
  title,
  count,
  actionLabel,
  actionActive = false,
  onActionPress,
}: {
  title: string;
  count?: number;
  actionLabel?: string;
  actionActive?: boolean;
  onActionPress?: () => void;
}) {
  return (
    <View className="mb-3 ml-1 flex-row items-center justify-between">
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <PretendardFont weight="bold" style={{ fontSize: 17, color: C.white }}>
          {title}
        </PretendardFont>
        {count != null && (
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 14.5, color: "rgba(255,255,255,0.7)" }}
          >
            {count}
          </PretendardFont>
        )}
      </View>

      <View className="mr-2 flex-row items-center" style={{ gap: 14 }}>
        {actionLabel && onActionPress && (
          <Pressable
            onPress={onActionPress}
            hitSlop={10}
            className="active:opacity-70"
          >
            <PretendardFont
              weight="semibold"
              style={{
                fontSize: 14.5,
                color: actionActive ? C.white : "rgba(255,255,255,0.8)",
              }}
            >
              {actionLabel}
            </PretendardFont>
          </Pressable>
        )}
      </View>
    </View>
  );
}

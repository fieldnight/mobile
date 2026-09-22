import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

export function DoorOpenerSectionHeader({
  title,
  count,
  actionLabel,
  actionActive = false,
  onActionPress,
  onAddPress,
}: {
  title: string;
  count?: number;
  actionLabel?: string;
  actionActive?: boolean;
  onActionPress?: () => void;
  onAddPress?: () => void;
}) {
  return (
    <View className="mb-3 ml-1 flex-row items-center justify-between">
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
          {title}
        </PretendardFont>
        {count != null && (
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 14.5, color: C.ter }}
          >
            {count}
          </PretendardFont>
        )}
      </View>

      <View className="flex-row items-center" style={{ gap: 8 }}>
        {actionLabel && onActionPress && (
          <Pressable
            onPress={onActionPress}
            hitSlop={6}
            className="items-center justify-center rounded-2xl active:opacity-75"
            style={{
              height: 38,
              paddingHorizontal: 16,
              backgroundColor: actionActive ? C.primary : C.white,
            }}
          >
            <PretendardFont
              weight="semibold"
              style={{
                fontSize: 14.5,
                color: actionActive ? C.white : C.text,
              }}
            >
              {actionLabel}
            </PretendardFont>
          </Pressable>
        )}

        {onAddPress && (
          <Pressable
            onPress={onAddPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="추가하기"
            className="items-center justify-center rounded-2xl active:opacity-75"
            style={{
              width: 38,
              height: 38,
              backgroundColor: "rgba(255,255,255,0.4)",
            }}
          >
            <Feather name="plus" size={20} color={C.white} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

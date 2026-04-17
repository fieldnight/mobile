import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

interface HeaderProps {
  onMenuPress: () => void;
  onNotificationPress?: () => void;
}

export default function Header({
  onMenuPress,
  onNotificationPress,
}: HeaderProps) {
  return (
    <View className="flex-row justify-between items-center px-3 py-2 bg-[#F5F5F7] z-50">
      {/* 햄버거 메뉴 버튼 */}
      <Pressable
        className="p-1"
        onPress={onMenuPress}
        hitSlop={{ top: 15, bottom: 25, left: 15, right: 15 }}
      >
        <Feather name="menu" size={30} color="#000000" />
      </Pressable>

      {/* 알림 버튼 */}
      <Pressable
        className="p-1"
        onPress={onNotificationPress}
        hitSlop={{ top: 15, bottom: 25, left: 15, right: 15 }}
      >
        <Feather name="bell" size={30} color="#000000" />
      </Pressable>
    </View>
  );
}

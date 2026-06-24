import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

interface HeaderProps {
  onMenuPress: () => void;
  onSettingsPress?: () => void;
}

export default function Header({ onMenuPress, onSettingsPress }: HeaderProps) {
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

      {/* 설정 버튼 (마이페이지에서만 표시) */}
      {onSettingsPress ? (
        <Pressable
          className="p-1 mt-1.5"
          onPress={onSettingsPress}
          hitSlop={{ top: 15, bottom: 25, left: 15, right: 15 }}
        >
          <Feather name="settings" size={24} color="#000000" />
        </Pressable>
      ) : (
        <View className="w-10" />
      )}
    </View>
  );
}

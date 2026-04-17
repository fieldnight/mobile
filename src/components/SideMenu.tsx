import React from "react";
import { View, Text, Pressable, Modal, Dimensions, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
}

const menuItems: MenuItem[] = [
  { id: "bee-diagnosis", title: "꿀벌 질병 진단", icon: "activity" },
  { id: "recommend", title: "수정벌 추천", icon: "thumbs-up" },
  { id: "bee-news", title: "수정벌 뉴스", icon: "file-text" },
  { id: "bee-chat", title: "채팅 및 문의", icon: "dribbble" },
  { id: "pesticide", title: "맞춤 농약", icon: "droplet" },
  { id: "bee-map", title: "꿀벌 지도", icon: "map" },
];

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onMenuPress?: (menuId: string) => void;
}

export function SideMenu({ visible, onClose, onMenuPress }: SideMenuProps) {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(-MENU_WIDTH);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateX.value = withTiming(-MENU_WIDTH, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleMenuItemPress = (menuId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMenuPress?.(menuId);
    onClose();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        {/* Overlay */}
        <Animated.View
          className="absolute inset-0 bg-black/40"
          style={overlayStyle}
        >
          <Pressable className="flex-1" onPress={handleClose} />
        </Animated.View>

        {/* Menu */}
        <Animated.View
          className="absolute left-0 top-0 bottom-0 bg-white px-5"
          style={[
            { width: MENU_WIDTH, paddingTop: insets.top + 20 },
            menuStyle,
          ]}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <Image
              source={require("../../assets/branding/webee_logo.png")}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
            />
            <Pressable onPress={handleClose} className="p-1">
              <Feather name="x" size={24} color="#000000" />
            </Pressable>
          </View>

          {/* Menu Items */}
          <View className="flex-1">
            {menuItems.map((item) => (
              <Pressable
                key={item.id}
                className="flex-row items-center py-3 border-b border-gray-100"
                onPress={() => handleMenuItemPress(item.id)}
              >
                <View className="w-10 h-10 rounded-xl bg-main-500 items-center justify-center mr-3">
                  <Feather name={item.icon} size={20} color="#F59E0B" />
                </View>
                <Text className="flex-1 text-base font-medium text-gray-900">
                  {item.title}
                </Text>
                <Feather name="chevron-right" size={18} color="#C7C7CC" />
              </Pressable>
            ))}
          </View>

          {/* Footer */}
          <View className="py-4 items-center">
            <Text className="text-xs text-gray-600">v1.0.0</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

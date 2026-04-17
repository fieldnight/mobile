import { View, Pressable, Text } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { MaterialCommunityIcons,Feather  } from "@expo/vector-icons";
import { Colors } from "../constants/theme";

interface FooterTab {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
}

const TABS: FooterTab[] = [
  {
    id: "bee-diagnosis",
    label: "새소식",
    icon: "comment-alert-outline",
    route: "/community",
  },
  {
    id: "recommend",
    label: "벌관리",
    icon: "bee-flower",
    route: "/hive-control",
  },
  { id: "home", label: "홈", icon: "home", route: "/home" },
  { id: "market", label: "장터", icon: "store", route: "/market" },
  { id: "profile", label: "마이", icon: "account", route: "/profile" },
];

export default function Footer() {
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[0] || "home";

  return (
    <View className="flex-row bg-white border-t border-gray-200 pb-2 pt-2 mb-1.5">
      {TABS.map((tab) => {
        const isActive = currentRoute === tab.route.replace("/", "");

        return (
          <Pressable
            key={tab.id}
            className="flex-1 items-center py-1"
            onPress={() => router.push(tab.route as any)}
          >
            <MaterialCommunityIcons 
              name={tab.icon}
              size={30}
              color={isActive ? Colors.active : Colors.inactive}
              className="mb-1"
            />
            <Text
              className={`text-xs mt-1 ${
                isActive
                  ? "text-footer-active font-semibold"
                  : "text-footer-inactive"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

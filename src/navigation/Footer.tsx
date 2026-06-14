import { View, Pressable, Text } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomWhiteGradient } from "@/components/BottomWhiteGradient";
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
    label: "스마트벌통",
    icon: "bee-flower",
    route: "/hive-control",
  },
  { id: "home", label: "홈", icon: "home", route: "/home" },
  { id: "iot-home", label: "개폐기   ", icon: "devices", route: "/iot-home" },
  { id: "profile", label: "마이", icon: "account", route: "/profile" },
];

export default function Footer() {
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[0] || "home";

  // IoT 홈에서는 그라데이션 위에 떠 있는 투명 푸터 (흰색 아이콘/글자)
  const onIot = ["iot-home", "hive-control", "hive-stats", "hive-setting", "hive-overview"].includes(currentRoute);

  return (
    <View
      className="flex-row pt-2 pb-2"
      style={
        onIot
          ? {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingBottom: 10,
              backgroundColor: "transparent",
            }
          : {
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
              marginBottom: 6,
            }
      }
    >
      {onIot && <BottomWhiteGradient />}
      {TABS.map((tab) => {
        const isActive = currentRoute === tab.route.replace("/", "");
        const iconColor = onIot
          ? isActive
            ? Colors.active
            : Colors.inactive
          : isActive
            ? Colors.active
            : Colors.inactive;

        return (
          <Pressable
            key={tab.id}
            className="flex-1 items-center py-1"
            onPress={() => router.push(tab.route as any)}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={30}
              color={iconColor}
              className="mb-1"
            />
            {onIot ? (
              <Text
                className="text-xs mt-1"
                style={{
                  color: isActive ? Colors.active : Colors.inactive,
                  fontWeight: isActive ? "600" : "400",
                }}
              >
                {tab.label}
              </Text>
            ) : (
              <Text
                className={`text-xs mt-1 ${
                  isActive
                    ? "text-footer-active font-semibold"
                    : "text-footer-inactive"
                }`}
              >
                {tab.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

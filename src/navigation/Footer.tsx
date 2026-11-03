import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomWhiteGradient } from "@/components/BottomWhiteGradient";
import { Colors } from "../constants/theme";
import { useFooterVisibility } from "@/stores/useFooterVisibility";

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
    route: "/bee-news",
  },
  {
    id: "recommend",
    label: "스마트벌통",
    icon: "bee-flower",
    route: "/hive-control",
  },
  { id: "home", label: "홈", icon: "home", route: "/home" },
  { id: "iot-home", label: "개폐기", icon: "devices", route: "/iot-home" },
  { id: "profile", label: "마이", icon: "account", route: "/profile" },
];

export default function Footer() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const currentRoute = segments[0] || "home";
  const onIot = ["iot-home", "hive-control", "hive-stats", "hive-setting", "hive-overview", "hive-live", "hive-analysis"].includes(currentRoute);

  // 벌통 화면에서는 아래로 스크롤하면 탭바를 내려 숨기고, 위로 당기면 다시 올립니다.
  const visible = useFooterVisibility((state) => state.visible);
  const setVisible = useFooterVisibility((state) => state.setVisible);
  const [height, setHeight] = useState(90);
  const offset = useRef(new Animated.Value(0)).current;
  const hidden = onIot && !visible;

  // 다른 화면으로 가면 항상 다시 보여줍니다.
  useEffect(() => setVisible(true), [currentRoute, setVisible]);

  useEffect(() => {
    Animated.timing(offset, {
      toValue: hidden ? height : 0,
      duration: hidden ? 220 : 180,
      useNativeDriver: true,
    }).start();
  }, [hidden, height, offset]);

  return (
    <Animated.View
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      pointerEvents={hidden ? "none" : "auto"}
      style={[
        { flexDirection: "row", paddingTop: 8, paddingBottom: 8 },
        onIot ? { transform: [{ translateY: offset }] } : null,
        onIot
          ? {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingBottom: insets.bottom + 10,
              backgroundColor: "transparent",
            }
          : {
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
              paddingBottom: Math.max(insets.bottom, 6),
            },
      ]}
    >
      {onIot && <BottomWhiteGradient />}
      {TABS.map((tab) => {
        const isActive = currentRoute === tab.route.replace("/", "");
        const iconColor = isActive ? Colors.active : Colors.inactive;

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
            <Text
              className={`text-xs mt-1 ${
                !onIot && isActive
                  ? "text-footer-active font-semibold"
                  : !onIot
                    ? "text-footer-inactive"
                    : ""
              }`}
              style={
                onIot
                  ? {
                      color: isActive ? Colors.active : Colors.inactive,
                      fontWeight: isActive ? "600" : "400",
                    }
                  : undefined
              }
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

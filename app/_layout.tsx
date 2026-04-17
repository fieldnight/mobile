import { useState } from "react";
import { StatusBar, View, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Slot, useRouter, useSegments } from "expo-router";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Providers } from "@/providers";
import Header from "@/navigation/Header";
import Footer from "@/navigation/Footer";
import { SideMenu } from "@/components/SideMenu";

// 헤더를 숨길 페이지들
const HIDE_HEADER_ROUTES = [
  "login",
  "register",
  "index",
  "add-farm",
  "report",
  "report-result",
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_EDGE_WIDTH = 30; // 스와이프 감지 영역 너비
const SWIPE_THRESHOLD = 80; // 뒤로가기 트리거 거리

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const translateX = useSharedValue(0);
  const [menuVisible, setMenuVisible] = useState(false);

  // 현재 라우트가 헤더를 숨겨야 하는 페이지인지 확인
  const currentRoute = segments[0] || "index";
  const showHeader = !HIDE_HEADER_ROUTES.includes(currentRoute);

  const handleMenuPress = (menuId: string) => {
    setMenuVisible(false);
    switch (menuId) {
      case "home":
        router.push("/home");
        break;
      case "diagnosis":
        router.push("/diagnose");
        break;
      case "bee-diagnosis":
        router.push("/bee-diagnosis");
        break;
      case "recommend":
        router.push("/recommend");
        break;
      case "market":
        router.push("/market");
        break;
      case "profile":
        router.push("/profile");
        break;
      case "bee-news":
        router.push("/bee-news");
        break;
      case "pesticide":
        router.push("/pesticide");
        break;
      case "fruit-price":
        router.push("/fruit-price");
        break;
      case "bee-chat":
        router.push("/bee-chat");
        break;
      case "bee-map":
        router.push("/bee-map");
        break;
      case "hive-status":
        router.push("/hive-stats");
        break;
      case "hive-setting":
        router.push("/hive-setting");
        break;
      case "hive-control":
        router.push("/hive-control");
        break;
      default:
        console.log("Menu pressed:", menuId);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
    translateX.value = withTiming(0, { duration: 200 });
  };

  const resetPosition = () => {
    translateX.value = withTiming(0, { duration: 200 });
  };

  // 왼쪽 가장자리 스와이프 제스처
  const edgeSwipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, SCREEN_WIDTH * 0.4);
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(goBack)();
      } else {
        runOnJS(resetPosition)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Providers>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* 메인 콘텐츠 */}
          <Animated.View
            style={[{ flex: 1, backgroundColor: "#fff" }, animatedStyle]}
          >
            <SafeAreaView
              className="flex-1 bg-white"
              edges={showHeader ? ["top"] : []}
            >
              <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
              {showHeader && (
                <Header
                  onMenuPress={() => setMenuVisible(true)}
                  onNotificationPress={() =>
                    console.log("Notification pressed")
                  }
                />
              )}
              <View style={{ flex: 1 }}>
                <Slot />
              </View>
              {showHeader && <Footer />}
            </SafeAreaView>
          </Animated.View>

          {/* Side Menu */}
          <SideMenu
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            onMenuPress={handleMenuPress}
          />

          {/* 왼쪽 가장자리 스와이프 감지 영역 */}
          <GestureDetector gesture={edgeSwipeGesture}>
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: SWIPE_EDGE_WIDTH,
                backgroundColor: "transparent",
              }}
            />
          </GestureDetector>
        </View>
      </Providers>
    </GestureHandlerRootView>
  );
}

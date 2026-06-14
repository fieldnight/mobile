import { useState, useEffect } from "react";
import "../global.css";
import { StatusBar, View, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Slot, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

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
import { ToastProvider } from "@/components/ToastContext";

SplashScreen.preventAutoHideAsync();

// 헤더(햄버거 메뉴 라인)를 숨길 페이지들 — home, profile 제외 전부
const HIDE_HEADER_ROUTES = [
  "login",
  "register",
  "index",
  "home",
  "add-farm",
  "report",
  "report-result",
  "oauth-register",
  "settings",
  "hive-control",
  "hive-stats",
  "hive-setting",
  "hive-add",
  "bee-chat",
  "bee-chat-inquiry",
  "bee-news",
  "bee-diagnosis",
  "diagnose-history",
  "recommend",
  "recommend-detail",
  "recommend-history",
  "fruit-price",
  "pesticide",
  "market",
  "community",
  "feature-guide",
  "iot-home",
  "hive-overview",
];

// 하단 탭바를 숨길 페이지 — 로그인/온보딩 계열만
const HIDE_FOOTER_ROUTES = [
  "login",
  "register",
  "index",
  "oauth-register",
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_EDGE_WIDTH = 30; // 스와이프 감지 영역 너비
const SWIPE_THRESHOLD = 80; // 뒤로가기 트리거 거리

export default function RootLayout() {
  const [loaded] = useFonts({
    "Pretendard-Thin": require("../assets/font/Pretendard-Thin.ttf"),
    "Pretendard-Light": require("../assets/font/Pretendard-Light.ttf"),
    "Pretendard-Regular": require("../assets/font/Pretendard-Regular.ttf"),
    "Pretendard-Medium": require("../assets/font/Pretendard-Medium.ttf"),
    "Pretendard-SemiBold": require("../assets/font/Pretendard-SemiBold.ttf"),
    "Pretendard-Bold": require("../assets/font/Pretendard-Bold.ttf"),
    "Pretendard-ExtraBold": require("../assets/font/Pretendard-ExtraBold.ttf"),
    "Pretendard-Black": require("../assets/font/Pretendard-Black.ttf"),
  });

  const router = useRouter();
  const segments = useSegments();
  const translateX = useSharedValue(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // 폰트 로드 완료 시 스플래시 숨김 (깜빡임 방지)
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // 폰트가 아직 로드 중이면 아무것도 렌더링하지 않음
  // (스플래시가 유지되므로 사용자 눈에는 보이지 않음)
  if (!loaded) return null;

  // 현재 라우트가 헤더를 숨겨야 하는 페이지인지 확인
  const currentRoute = segments[0] || "index";
  const showHeader = !HIDE_HEADER_ROUTES.includes(currentRoute);
  const showFooter = !HIDE_FOOTER_ROUTES.includes(currentRoute);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Providers>
      <ToastProvider>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* 메인 콘텐츠 */}
          <Animated.View
            style={[{ flex: 1, backgroundColor: "#fff" }, animatedStyle]}
          >
            <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
              <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
              {showHeader && (
                <Header
                  onMenuPress={() => setMenuVisible(true)}
                  onSettingsPress={
                    currentRoute === "profile"
                      ? () => router.push("/settings")
                      : undefined
                  }
                />
              )}
              <View style={{ flex: 1 }}>
                <Slot />
              </View>
              {showFooter && <Footer />}
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
      </ToastProvider>
      </Providers>
    </GestureHandlerRootView>
  );
}

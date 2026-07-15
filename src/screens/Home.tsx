import { View } from "react-native";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { NewsCarousel } from "@/components/NewsCarousel";
import { PromoBanner } from "@/components/Promobanner";
import { HomeGridIcon } from "@/components/HomeGridIcon";
import { HiveStatusBanner } from "@/components/HiveStatusBanner";
import { AppWelcomeSheet } from "@/components/AppWelcomeSheet";
import InquiryModal from "@/screens/bee-chat-inquiry";

const WELCOME_HIDE_TODAY_KEY = "webee-welcome-hide-date";
const WELCOME_HIDE_FOREVER_KEY = "webee-welcome-hide-forever";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export default function Home() {
  const [inquiryVisible, setInquiryVisible] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const handleRefresh = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkWelcomePreference = async () => {
      try {
        const [hideForever, hideDate] = await Promise.all([
          AsyncStorage.getItem(WELCOME_HIDE_FOREVER_KEY),
          AsyncStorage.getItem(WELCOME_HIDE_TODAY_KEY),
        ]);

        if (!mounted) return;
        setWelcomeVisible(hideForever !== "true" && hideDate !== todayKey());
      } catch {
        if (mounted) setWelcomeVisible(true);
      }
    };

    checkWelcomePreference();

    return () => {
      mounted = false;
    };
  }, []);

  const hideWelcomeToday = useCallback(async () => {
    await AsyncStorage.setItem(WELCOME_HIDE_TODAY_KEY, todayKey());
    setWelcomeVisible(false);
  }, []);

  const hideWelcomeForever = useCallback(async () => {
    await AsyncStorage.setItem(WELCOME_HIDE_FOREVER_KEY, "true");
    setWelcomeVisible(false);
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: "#F4F5F7" }}>
      <PullToRefresh
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      >
        <PromoBanner />
        <HomeGridIcon onInquiryPress={() => setInquiryVisible(true)} />
        <HiveStatusBanner />
        <NewsCarousel keyword="수정벌" />
      </PullToRefresh>

      <InquiryModal
        visible={inquiryVisible}
        onClose={() => setInquiryVisible(false)}
      />

      <AppWelcomeSheet
        visible={welcomeVisible}
        onClose={() => setWelcomeVisible(false)}
        onHideToday={hideWelcomeToday}
        onHideForever={hideWelcomeForever}
      />
    </View>
  );
}

import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NewsCarousel } from "@/components/NewsCarousel";
import { PromoBanner } from "@/components/Promobanner";
import { HomeGridIcon } from "@/components/HomeGridIcon";
import { LiveHiveHero } from "@/components/home/LiveHiveHero";
import { DoorDeviceCollection } from "@/components/home/DoorDeviceCollection";
import { useSyncGateList } from "@/features/door-opener/hooks";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { useSyncHiveList } from "@/features/hive";
import { T } from "@/features/hive-home";
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
  useSyncHiveList();
  useSyncGateList();

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
    <View className="flex-1" style={{ backgroundColor: T.canvas }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}>
        <PretendardFont weight="bold" style={{ marginHorizontal: 16, marginBottom: 10, fontSize: 17, color: T.ink }}>스마트벌통</PretendardFont>
        <LiveHiveHero />
        <DoorDeviceCollection />
        {/* 2. 기능 바로가기 */}
        <HomeGridIcon onInquiryPress={() => setInquiryVisible(true)} />
        <GuideRow />
        <BrandSiteCard />
        <PromoBanner />
        <NewsCarousel keyword="수정벌" />
      </ScrollView>

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

/** 처음 쓰는 사람을 위한 기능 가이드 진입. 예전 홈의 큰 카드를 한 줄로 줄였습니다. */
function GuideRow() {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
      <Tap
        accessibilityRole="button"
        onPress={() => router.push("/feature-guide")}
        style={({ pressed }) => ({
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 18,
          borderRadius: 18,
          backgroundColor: pressed ? T.keyPressed : T.panel,
        })}
      >
        <Feather name="compass" size={18} color={T.ink} />
        <PretendardFont weight="semibold" style={{ flex: 1, fontSize: 15, color: T.ink }}>처음이라면 기능 가이드부터</PretendardFont>
        <Feather name="chevron-right" size={18} color={T.muted} />
      </Tap>
    </View>
  );
}

const BRAND_SITE_URL = "https://ourbee.vercel.app";

/** 아워비 공식 웹사이트 소개. 제품을 처음 보는 사람이나 주변에 소개할 때 씁니다. */
function BrandSiteCard() {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
      <Tap
        accessibilityRole="link"
        accessibilityLabel="아워비 공식 웹사이트 열기"
        onPress={() => void WebBrowser.openBrowserAsync(BRAND_SITE_URL)}
        style={({ pressed }) => ({ borderRadius: 20, padding: 18, backgroundColor: pressed ? "#333B45" : T.ink })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <PretendardFont weight="bold" style={{ fontSize: 13, letterSpacing: 0.2, color: "#F5C451" }}>ourbee 아워비</PretendardFont>
          <Feather name="external-link" size={16} color="rgba(255,255,255,0.7)" />
        </View>
        <PretendardFont weight="bold" style={{ marginTop: 8, fontSize: 18, lineHeight: 26, color: T.panel }}>
          온도를 지키는 본체,{"\n"}손안의 스마트벌통 관리
        </PretendardFont>
        <PretendardFont style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>제품 소개와 도입 문의는 공식 웹사이트에서 볼 수 있어요</PretendardFont>
      </Tap>
    </View>
  );
}

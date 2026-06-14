/**
 * 홈 화면 프로모 배너 (가로 슬라이더)
 * - HIVE / REPORT 2개 슬라이드, SLIDE_INTERVAL마다 자동 전환
 * - 각 슬라이드 내 카피는 COPY_INTERVAL마다 페이드 전환
 * - CopyDots: 카피 진행 인디케이터 / AnimatedTitle: 카피 페이드 / TossButton: 스프링 CTA 버튼
 * - 사용자가 수동 스크롤 시 타이머 리셋(resetSlideTimer)
 */
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Animated,
  Dimensions,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { PretendardFont } from "./PretendardFont";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const SLIDE_INTERVAL = 8000;
const COPY_INTERVAL = 2000;

const HIVE_COPIES = [
  { before: "벌이 더 열심히 일하게\n만들 수 있다면", hl: " 어떨까요?" },
  { before: "올해 수확량,\n", hl: "벌통이 결정합니다" },
  { before: "옆 농장이 나보다\n", hl: "착과율이 높은 이유" },
  { before: "내 벌통 상태,\n", hl: "지금 바로 확인해요" },
  { before: "벌통 환경이 바뀌면\n", hl: "착과율도 달라져요" },
];

const REPORT_COPIES = [
  { before: "고민 하나로\n", hl: "수익이 늘어난다면?" },
  { before: "지금 고민이\n", hl: "수익으로 바뀐다면?" },
  { before: "AI가 답 찾고\n", hl: "수익까지 계산해드려요" },
];

const IMG_HIVE = require("../../assets/images/1.png");
const IMG_REPORT = require("../../assets/images/2.png");

const SLIDES = [
  {
    id: "hive",
    image: IMG_HIVE,
    badge: "테스터 모집 중",
    copies: HIVE_COPIES,
    hlColor: "#92400E",
    dotActive: "#F59E0B",
    dotInactive: "rgba(146,64,14,0.2)",
    ctaColor: "#F59E0B",
    ctaLabel: "벌통 관리하기",
    route: "/hive-control",
  },
  {
    id: "report",
    image: IMG_REPORT,
    badge: "AI 리포트 베타",
    copies: REPORT_COPIES,
    hlColor: "#5f0634",
    dotActive: "#5f0634",
    dotInactive: "rgba(6,95,70,0.2)",
    ctaColor: "#5f0634",
    ctaLabel: "AI에게 물어보기",
    route: "/bee-chat",
  },
];

/* ── 카피 도트 ── */
function CopyDots({
  count,
  current,
  activeColor,
  inactiveColor,
}: {
  count: number;
  current: number;
  activeColor: string;
  inactiveColor: string;
}) {
  return (
    <View className="flex-row gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 15 : 7,
            height: 7,
            borderRadius: 10,
            backgroundColor: i === current ? activeColor : inactiveColor,
          }}
        />
      ))}
    </View>
  );
}

/* ── 카피 ── */
function AnimatedTitle({
  copy,
  hlColor,
}: {
  copy: { before: string; hl: string };
  hlColor: string;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [displayed, setDisplayed] = useState(copy);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setDisplayed(copy);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [copy]);

  return (
    <Animated.View>
      <PretendardFont
        weight="bold"
        className="text-3xl text-gray-900 leading-10"
      >
        {displayed.before}
        <Text>{displayed.hl}</Text>
      </PretendardFont>
    </Animated.View>
  );
}

/* ──  버튼 ── */
function TossButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className="self-start"
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 7,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.15)",
        }}
      >
        <PretendardFont weight="medium" style={{ color }}>
          {label} ›
        </PretendardFont>
      </Animated.View>
    </Pressable>
  );
}

/* ── 메인 ── */
export function PromoBanner() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [curSlide, setCurSlide] = useState(0);
  const [curCopies, setCurCopies] = useState([0, 0]);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetSlideTimer = () => {
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    slideTimerRef.current = setInterval(() => {
      setCurSlide((prev) => {
        const next = (prev + 1) % SLIDES.length;
        flatListRef.current?.scrollToIndex({
          index: next,
          animated: true,
          viewOffset: 16, // ← paddingHorizontal 값만큼 보정
        });
        return next;
      });
    }, SLIDE_INTERVAL);
  };

  useEffect(() => {
    resetSlideTimer();
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const copies = SLIDES[curSlide].copies;
    const t = setInterval(() => {
      setCurCopies((prev) => {
        const next = [...prev];
        next[curSlide] = (next[curSlide] + 1) % copies.length;
        return next;
      });
    }, COPY_INTERVAL);
    return () => clearInterval(t);
  }, [curSlide]);

  const onScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 16));
    if (idx !== curSlide) {
      setCurSlide(idx);
      resetSlideTimer();
    }
  };

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled={false}
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + 16}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 16,
          marginTop: 20,
        }}
        onMomentumScrollEnd={onScrollEnd}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ImageBackground
            source={item.image}
            style={{ width: BANNER_WIDTH, height: 250, overflow: "hidden" }}
            className="rounded-[18px]"
            imageStyle={{ borderRadius: 18 }}
            resizeMode="cover"
          >
            {/* 오렌지 닷 + 배지 */}
            <View className="px-[18px] pt-5">
              <View className="flex-row items-center gap-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <Text
                  style={{ fontFamily: "Pretendard-Bold" }}
                  className="text-base"
                >
                  {item.badge}
                </Text>
              </View>
            </View>

            {/* 타이틀 — 남은 공간 전체 */}
            <View className="flex-1 justify-center px-[20px]">
              <AnimatedTitle
                copy={item.copies[curCopies[index]]}
                hlColor={item.hlColor}
              />
            </View>

            {/* dot + 버튼 — 하단 고정 */}
            <View className="px-[22px] pb-6 gap-6">
              <CopyDots
                count={item.copies.length}
                current={curCopies[index]}
                activeColor={item.dotActive}
                inactiveColor={item.dotInactive}
              />
              <TossButton
                label={item.ctaLabel}
                color={item.ctaColor}
                onPress={() => router.push(item.route as any)}
              />
            </View>
          </ImageBackground>
        )}
      />

      {/* 슬라이드 인디케이터 */}
      <View className="flex-row justify-center items-center gap-1.5 mt-2.5">
        {SLIDES.map((s, i) => (
          <View
            key={s.id}
            style={{
              width: i === curSlide ? 16 : 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: i === curSlide ? s.dotActive : "#ddd",
            }}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * 홈 화면 바로가기 아이콘 그리드
 * - 상단 4개(25% 너비) + 하단 5개(20% 너비) 2행 구성
 * - 탭 시 스케일 bounce 애니메이션 + 라우트 이동
 * - 구분선으로 상단/하단 행 시각적 분리
 */
import { Image, Pressable, View, Animated } from "react-native";
import { useRef } from "react";
import { PretendardFont } from "./PretendardFont";
import { useRouter } from "expo-router";
import { C } from "@/constants/hive-colors";

const ICON_SIZE = { lg: "80%", md: "55%", sm: "45%" } as const;

const ITEMS = [
  { id: "hive-control", label: "벌통관리", icon: require("../../assets/homeIcons/bee.png"), size: "lg" },
  { id: "bee-chat",     label: "챗봇",     icon: require("../../assets/homeIcons/chat.png"), size: "lg" },
  { id: "fruit-price",  label: "시세확인",  icon: require("../../assets/homeIcons/trading.png"), size: "lg" },
  { id: "bee-news",     label: "농업뉴스",  icon: require("../../assets/homeIcons/news2.png"), size: "lg" },
  { id: "community",    label: "커뮤니티",  icon: require("../../assets/homeIcons/community.png"), size: "sm" },
  { id: "add-farm",     label: "농장추가",  icon: require("../../assets/homeIcons/house.png"), size: "sm" },
  { id: "pesticide",    label: "맞춤농약",  icon: require("../../assets/homeIcons/pesticide.png"), size: "md" },
  { id: "recommend",    label: "수정벌추천", icon: require("../../assets/homeIcons/recommend.png"), size: "sm" },
  { id: "inquiry",      label: "문의하기",  icon: require("../../assets/homeIcons/inquiry.png"), size: "md" },
] satisfies { id: string; label: string; icon: any; size: keyof typeof ICON_SIZE }[];

const TOP_ITEMS = ITEMS.slice(0, 4);
const BOTTOM_ITEMS = ITEMS.slice(4);
const ROW_ICON_HEIGHT = { top: 56, bottom: 44 };

function GridItem({
  id,
  label,
  icon,
  size,
  colWidth,
  iconHeight,
}: (typeof ITEMS)[number] & { colWidth: `${number}%`; iconHeight: number }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start();

  return (
    <Pressable
      onPress={() => router.push(`/${id}` as any)}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={{ width: colWidth }}
      className="items-center"
    >
      <View style={{ height: iconHeight, justifyContent: "center", alignItems: "center" }}>
        <Animated.View style={{ transform: [{ scale }], width: ICON_SIZE[size], aspectRatio: 1 }}>
          {icon ? (
            <Image source={icon} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
          ) : (
            <View className="w-[80%] h-[80%] rounded-xl bg-gray-100" />
          )}
        </Animated.View>
      </View>
      <PretendardFont weight="semibold" className="text-xs mb-3 pt-1.5" style={{ color: C.text }}>
        {label}
      </PretendardFont>
    </Pressable>
  );
}

export function HomeGridIcon() {
  return (
    <View className="mx-4 mt-5 mb-4 rounded-3xl bg-white px-2 py-3">
      <View className="flex-row">
        {TOP_ITEMS.map((item) => (
          <GridItem key={item.id} {...item} colWidth="25%" iconHeight={ROW_ICON_HEIGHT.top} />
        ))}
      </View>
      {/* 상단/하단 행 사이 여백만 유지, 구분선 제거 */}
      <View className="my-1" />
      <View className="flex-row">
        {BOTTOM_ITEMS.map((item) => (
          <GridItem key={item.id} {...item} colWidth="20%" iconHeight={ROW_ICON_HEIGHT.bottom} />
        ))}
      </View>
    </View>
  );
}

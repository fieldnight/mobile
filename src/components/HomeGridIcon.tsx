/**
 * 홈 화면 바로가기 아이콘 그리드
 * - 상단 4개(25% 너비) + 하단 5개(20% 너비) 2행 구성
 * - 탭 시 스케일 bounce 애니메이션 + 라우트 이동
 */
import { useRef } from "react";
import { Animated, Image, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { PretendardFont } from "./PretendardFont";
import { C } from "@/constants/hive-colors";

const ICON_SIZE = { lg: "80%", md: "55%", sm: "45%" } as const;

const ITEMS = [
  {
    id: "hive-control",
    route: "/hive-control",
    label: "벌통관리",
    icon: require("../../assets/homeIcons/bee.png"),
    size: "lg",
  },
  {
    id: "bee-chat",
    route: "/bee-chat",
    label: "챗봇",
    icon: require("../../assets/homeIcons/chat.png"),
    size: "lg",
  },
  {
    id: "fruit-price",
    route: "/fruit-price",
    label: "시세확인",
    icon: require("../../assets/homeIcons/trading.png"),
    size: "lg",
  },
  {
    id: "bee-news",
    route: "/bee-news",
    label: "농업뉴스",
    icon: require("../../assets/homeIcons/news2.png"),
    size: "lg",
  },
  {
    id: "community",
    route: "/community",
    label: "커뮤니티",
    icon: require("../../assets/homeIcons/community.png"),
    size: "sm",
  },
  {
    id: "add-farm",
    route: "/add-farm",
    label: "농장추가",
    icon: require("../../assets/homeIcons/house.png"),
    size: "sm",
  },
  {
    id: "pesticide",
    route: "/pesticide",
    label: "맞춤농약",
    icon: require("../../assets/homeIcons/pesticide.png"),
    size: "md",
  },
  {
    id: "recommend",
    route: "/recommend",
    label: "수정벌추천",
    icon: require("../../assets/homeIcons/recommend.png"),
    size: "sm",
  },
  {
    id: "inquiry",
    route: "/home",
    label: "문의하기",
    icon: require("../../assets/homeIcons/inquiry.png"),
    size: "md",
  },
] satisfies {
  id: string;
  route: `/${string}`;
  label: string;
  icon: any;
  size: keyof typeof ICON_SIZE;
}[];

const TOP_ITEMS = ITEMS.slice(0, 4);
const BOTTOM_ITEMS = ITEMS.slice(4);
const ROW_ICON_HEIGHT = { top: 56, bottom: 44 };

function GridItem({
  id,
  label,
  icon,
  size,
  route,
  colWidth,
  iconHeight,
  onInquiryPress,
}: (typeof ITEMS)[number] & {
  colWidth: `${number}%`;
  iconHeight: number;
  onInquiryPress?: () => void;
}) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.timing(scale, {
      toValue: 0.88,
      duration: 80,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.timing(scale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      onPress={() => {
        if (id === "inquiry" && onInquiryPress) {
          onInquiryPress();
          return;
        }
        router.push(route as any);
      }}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={{ width: colWidth }}
      className="items-center"
    >
      <View
        style={{
          height: iconHeight,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale }],
            width: ICON_SIZE[size],
            aspectRatio: 1,
          }}
        >
          <Image
            source={icon}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
      <PretendardFont
        weight="semibold"
        className="text-xs mb-3 pt-1.5"
        style={{ color: C.text }}
      >
        {label}
      </PretendardFont>
    </Pressable>
  );
}

export function HomeGridIcon({ onInquiryPress }: { onInquiryPress?: () => void }) {
  return (
    <View className="mx-4 mt-5 mb-4 rounded-3xl bg-white px-2 py-3">
      <View className="flex-row">
        {TOP_ITEMS.map((item) => (
          <GridItem
            key={item.id}
            {...item}
            colWidth="25%"
            iconHeight={ROW_ICON_HEIGHT.top}
            onInquiryPress={onInquiryPress}
          />
        ))}
      </View>
      <View className="my-1" />
      <View className="flex-row">
        {BOTTOM_ITEMS.map((item) => (
          <GridItem
            key={item.id}
            {...item}
            colWidth="20%"
            iconHeight={ROW_ICON_HEIGHT.bottom}
            onInquiryPress={onInquiryPress}
          />
        ))}
      </View>
    </View>
  );
}

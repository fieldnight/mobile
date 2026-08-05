/**
 * 홈 화면 바로가기 아이콘 그리드
 * - 내 농장 관리 / 영농 정보·추천 / 연결·지원 각 4개 구성
 * - 탭 시 스케일 bounce 애니메이션 + 라우트 이동
 */
import { useRef } from "react";
import { Animated, Image, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PretendardFont } from "./PretendardFont";
import { C } from "@/constants/hive-colors";

const ICON_SIZE = { lg: 1, md: 0.84, sm: 0.74 } as const;

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
    id: "report",
    route: "/report",
    label: "예측리포트",
    iconName: "file-text",
    iconColor: "#B88A47",
    iconBg: "transparent",
    size: "md",
  },
  {
    id: "bee-diagnosis",
    route: "/bee-diagnosis",
    label: "질병진단",
    icon: require("../../assets/homeIcons/diagnosis.png"),
    size: "lg",
  },
  {
    id: "market",
    route: "/market",
    label: "수정벌지도",
    iconName: "map-pin",
    iconColor: "#5483C2",
    iconBg: "transparent",
    size: "md",
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
  icon?: any;
  iconName?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  iconBg?: string;
  size: keyof typeof ICON_SIZE;
}[];

const GROUPS = [
  {
    id: "check",
    label: "내 농장 관리",
    itemIds: ["hive-control", "bee-chat", "report", "bee-diagnosis"],
  },
  {
    id: "cultivation",
    label: "영농 정보 · 추천",
    itemIds: ["fruit-price", "recommend", "bee-news", "pesticide"],
  },
  {
    id: "connection",
    label: "연결 · 지원",
    itemIds: ["community", "market", "add-farm", "inquiry"],
  },
] as const;

const GROUP_ICON_HEIGHT = 54;

function GridItem({
  id,
  label,
  icon,
  iconName,
  iconColor,
  iconBg,
  size,
  route,
  colWidth,
  iconHeight,
  onInquiryPress,
}: (typeof ITEMS)[number] & {
  colWidth: number | `${number}%`;
  iconHeight: number;
  onInquiryPress?: () => void;
}) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const iconDimension = Math.round(iconHeight * ICON_SIZE[size]);

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
            width: iconDimension,
            height: iconDimension,
            opacity: 0.9,
          }}
        >
          {icon ? (
            <Image
              source={icon}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          ) : iconName ? (
            <View
              className="items-center justify-center rounded-2xl"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: iconBg ?? "transparent",
              }}
            >
              <Feather name={iconName} size={28} color={iconColor ?? C.primary} />
            </View>
          ) : null}
        </Animated.View>
      </View>
      <PretendardFont
        weight="semibold"
        className="pt-1 text-xs"
        style={{ color: C.textAlt }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {label}
      </PretendardFont>
    </Pressable>
  );
}

export function HomeGridIcon({ onInquiryPress }: { onInquiryPress?: () => void }) {
  return (
    <View className="mx-4 mb-3 mt-4 rounded-3xl bg-white px-3 py-3">
      {GROUPS.map((group, groupIndex) => (
        <View key={group.id} className={groupIndex === 0 ? "" : "mt-2.5"}>
          <PretendardFont
            weight="semibold"
            className="mb-1 ml-1 text-[12px]"
            style={{ color: C.sec, lineHeight: 14 }}
          >
            {group.label}
          </PretendardFont>
          <View className="flex-row">
            {group.itemIds.map((itemId) => {
              const item = ITEMS.find((candidate) => candidate.id === itemId);
              if (!item) return null;

              return (
                <GridItem
                  key={item.id}
                  {...item}
                  colWidth="25%"
                  iconHeight={GROUP_ICON_HEIGHT}
                  onInquiryPress={onInquiryPress}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

import { Image, ImageSourcePropType, Platform, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import AppHeader from "@/components/AppHeader";
import { PretendardFont } from "@/components/PretendardFont";
import { HEADER_HEIGHT } from "@/hooks";

type FeatureHighlight = {
  title: string;
  description: string;
};

type FeatureRoute =
  | "/bee-news"
  | "/fruit-price"
  | "/pesticide"
  | "/recommend"
  | "/bee-chat"
  | "/hive-control";

type FeatureGuideItem = {
  label: string;
  summary: string;
  route: FeatureRoute;
  stepColor: string;
  iconBg: string;
  icon: ImageSourcePropType;
  highlights: FeatureHighlight[];
};

type ComingSoonItem = {
  label: string;
  description: string;
  icon: ImageSourcePropType;
};

const FEATURES: FeatureGuideItem[] = [
  {
    label: "관심 뉴스",
    summary: "내가 필요한 소식만 빠르게 모아서 볼 수 있어요.",
    route: "/bee-news",
    stepColor: "#16A34A",
    iconBg: "#DCFCE7",
    icon: require("../../assets/homeIcons/news2.png"),
    highlights: [
      {
        title: "맞춤 뉴스 모음",
        description: "기상, 정책, 현장 소식을 한 화면에서 가볍게 확인해요.",
      },
      {
        title: "관심 기사 저장",
        description: "나중에 다시 볼 소식은 따로 챙겨둘 수 있어요.",
      },
      {
        title: "바로 이동",
        description: "원하는 소식이 보이면 곧바로 상세 화면으로 들어가요.",
      },
    ],
  },
  {
    label: "농산물 시세",
    summary: "시세 흐름을 카드처럼 나눠서 한눈에 볼 수 있어요.",
    route: "/fruit-price",
    stepColor: "#2563EB",
    iconBg: "#DBEAFE",
    icon: require("../../assets/homeIcons/trading.png"),
    highlights: [
      {
        title: "실시간 확인",
        description: "과일과 채소 시세를 바로 확인해서 비교해요.",
      },
      {
        title: "흐름 비교",
        description: "오늘, 어제, 최근 변동을 나눠서 보기 좋게 정리해요.",
      },
      {
        title: "관심 품목 관리",
        description: "자주 보는 품목은 따로 두고 빠르게 열어볼 수 있어요.",
      },
    ],
  },
  {
    label: "농약 정보",
    summary: "작물에 맞는 농약 정보를 이해하기 쉽게 보여줘요.",
    route: "/pesticide",
    stepColor: "#7C3AED",
    iconBg: "#EDE9FE",
    icon: require("../../assets/homeIcons/pesticide.png"),
    highlights: [
      {
        title: "작물별 탐색",
        description: "작물 이름만 고르면 관련 정보를 바로 찾을 수 있어요.",
      },
      {
        title: "사용 가능 여부",
        description: "해당 작물에 쓸 수 있는지 먼저 확인해요.",
      },
      {
        title: "주의사항 확인",
        description: "혼용, 희석, 사용 시점 같은 핵심 정보도 함께 보여줘요.",
      },
    ],
  },
  {
    label: "수정벌 추천",
    summary: "상황에 맞는 수정벌 추천을 단계별 카드로 확인해요.",
    route: "/recommend",
    stepColor: "#D97706",
    iconBg: "#FEF3C7",
    icon: require("../../assets/homeIcons/recommend.png"),
    highlights: [
      {
        title: "작물 기반 추천",
        description: "선택한 작물과 환경을 바탕으로 추천을 받아요.",
      },
      {
        title: "추천 근거 확인",
        description: "왜 이 수정벌이 맞는지 설명도 함께 볼 수 있어요.",
      },
      {
        title: "결과 비교",
        description: "이전 추천과 비교하면서 더 잘 맞는 선택을 할 수 있어요.",
      },
    ],
  },
  {
    label: "AI 벌 채팅",
    summary: "궁금한 내용을 대화처럼 물어보고 바로 답을 받아요.",
    route: "/bee-chat",
    stepColor: "#0891B2",
    iconBg: "#CFFAFE",
    icon: require("../../assets/homeIcons/inquiry.png"),
    highlights: [
      {
        title: "질문 입력",
        description: "작업 중 궁금한 내용을 자연스럽게 적어보세요.",
      },
      {
        title: "연속 대화",
        description: "이전 대화를 이어서 물어보며 흐름을 놓치지 않아요.",
      },
      {
        title: "빠른 정리",
        description: "대화 결과를 바로 확인하고 필요한 부분만 챙겨요.",
      },
    ],
  },
  {
    label: "벌통 관리",
    summary: "벌통 상태와 제어 기능을 한 번에 확인할 수 있어요.",
    route: "/hive-control",
    stepColor: "#EA580C",
    iconBg: "#FFEDD5",
    icon: require("../../assets/homeIcons/beeHive1.png"),
    highlights: [
      {
        title: "벌통 연결",
        description: "등록된 벌통을 선택해 관리 화면으로 들어가요.",
      },
      {
        title: "상태 확인",
        description: "온도, 습도, 제어 상태를 카드 형태로 보기 쉽게 정리해요.",
      },
      {
        title: "제어 관리",
        description: "수동, 자동, 알림 설정을 한 화면에서 바로 다뤄요.",
      },
    ],
  },
];

const COMING_SOON: ComingSoonItem[] = [
  {
    label: "커뮤니티",
    description: "다른 사용자와 경험과 정보를 나누는 공간이에요.",
    icon: require("../../assets/homeIcons/community.png"),
  },
  {
    label: "벌통 통계",
    description: "벌통의 움직임과 변화 추이를 차트로 더 깊게 볼 수 있어요.",
    icon: require("../../assets/homeIcons/beeHive2.png"),
  },
  {
    label: "벌 건강 진단",
    description: "사진과 데이터를 바탕으로 벌 건강을 점검해요.",
    icon: require("../../assets/homeIcons/diagnosis.png"),
  },
  {
    label: "작업 기록",
    description: "작업 이력을 쌓아두고 나중에 다시 확인할 수 있어요.",
    icon: require("../../assets/homeIcons/house.png"),
  },
  {
    label: "마켓",
    description: "농산물과 농자재를 함께 살펴보는 거래 공간이에요.",
    icon: require("../../assets/homeIcons/trading.png"),
  },
];

function FeatureStepCard({
  index,
  title,
  description,
  color,
}: FeatureHighlight & { index: number; color: string }) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <View className="flex-row items-center gap-2">
        <View
          style={{ backgroundColor: `${color}18` }}
          className="h-7 w-7 items-center justify-center rounded-full"
        >
          <PretendardFont weight="bold" style={{ fontSize: 11, color }}>
            {index}
          </PretendardFont>
        </View>
        <PretendardFont weight="semibold" style={{ fontSize: 14, color }}>
          {title}
        </PretendardFont>
      </View>

      <PretendardFont
        weight="regular"
        style={{ marginTop: 8, fontSize: 13, lineHeight: 19, color: "#4B5563" }}
      >
        {description}
      </PretendardFont>
    </View>
  );
}

function FeatureGuideCard({
  feature,
  onPress,
}: {
  feature: FeatureGuideItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-[22px] border border-slate-200 bg-white p-4"
      style={({ pressed }) => ({
        opacity: pressed ? 0.86 : 1,
      })}
    >
      <View className="flex-row items-start gap-3">
        <View
          style={{ backgroundColor: feature.iconBg }}
          className="h-14 w-14 items-center justify-center rounded-2xl"
        >
          <Image
            source={feature.icon}
            style={{ height: 36, width: 36 }}
            resizeMode="contain"
          />
        </View>

        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <PretendardFont
                weight="bold"
                style={{ fontSize: 17, color: "#111827" }}
              >
                {feature.label}
              </PretendardFont>
              <PretendardFont
                weight="regular"
                style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: "#6B7280" }}
              >
                {feature.summary}
              </PretendardFont>
            </View>

            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </View>
        </View>
      </View>

      <View className="mt-4 gap-2">
        {feature.highlights.map((highlight, index) => (
          <FeatureStepCard
            key={`${feature.label}-${highlight.title}`}
            index={index + 1}
            title={highlight.title}
            description={highlight.description}
            color={feature.stepColor}
          />
        ))}
      </View>
    </Pressable>
  );
}

function ComingSoonCard({ item, isLast }: { item: ComingSoonItem; isLast: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-3 py-4 ${isLast ? "" : "border-b border-slate-100"}`}
    >
      <View className="h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100">
        <Image source={item.icon} style={{ height: 28, width: 28, opacity: 0.7 }} resizeMode="contain" />
      </View>

      <View className="flex-1">
        <PretendardFont weight="semibold" style={{ fontSize: 16, color: "#94A3B8" }}>
          {item.label}
        </PretendardFont>
        <PretendardFont
          weight="regular"
          style={{ marginTop: 3, fontSize: 13, lineHeight: 19, color: "#B8C0CC" }}
        >
          {item.description}
        </PretendardFont>
      </View>

      <View className="rounded-full bg-slate-100 px-3 py-1">
        <PretendardFont weight="medium" style={{ fontSize: 12, color: "#94A3B8" }}>
          준비 중
        </PretendardFont>
      </View>
    </View>
  );
}

export default function FeatureGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleFeaturePress = (route: FeatureRoute) => {
    haptic();
    router.push(route);
  };

  return (
    <View className="flex-1 bg-[#F4F5F7]">
      <AppHeader title="기능 가이드" onBack={() => router.back()} isScrolled={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + 20,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          gap: 24,
        }}
      >
        <Animated.View entering={FadeInDown.duration(300)}>
          <View className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5">
            <View className="mb-3 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
                <Feather name="zap" size={20} color="#16A34A" />
              </View>
              <PretendardFont weight="bold" style={{ fontSize: 20, color: "#111827" }}>
                농번기 필수 기능
              </PretendardFont>
            </View>

            <PretendardFont
              weight="regular"
              style={{ fontSize: 15, lineHeight: 23, color: "#4B5563" }}
            >
              WEBEE의 핵심 기능을 카드 단위로 나눠서 빠르게 확인하고,{"\n"}
              필요한 화면으로 바로 이동할 수 있어요.
            </PretendardFont>
          </View>
        </Animated.View>

        <View className="gap-3">
          <PretendardFont weight="bold" style={{ fontSize: 18, color: "#111827" }}>
            지금 바로 써볼 수 있어요
          </PretendardFont>

          {FEATURES.map((feature, index) => (
            <Animated.View
              key={feature.route}
              entering={FadeInDown.delay(index * 60).duration(280).springify()}
            >
              <FeatureGuideCard feature={feature} onPress={() => handleFeaturePress(feature.route)} />
            </Animated.View>
          ))}
        </View>

        <View className="gap-3">
          <PretendardFont weight="bold" style={{ fontSize: 18, color: "#111827" }}>
            곧 만나요
          </PretendardFont>

          <View className="rounded-[22px] border border-slate-200 bg-white px-4">
            {COMING_SOON.map((item, index) => (
              <ComingSoonCard key={item.label} item={item} isLast={index === COMING_SOON.length - 1} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

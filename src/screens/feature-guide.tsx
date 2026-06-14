import { View, ScrollView, Pressable, Platform, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import AppHeader from "@/components/AppHeader";
import { PretendardFont } from "@/components/PretendardFont";
import { HEADER_HEIGHT } from "@/hooks";

const FEATURES = [
  {
    label: "관심 뉴스",
    description: "수정벌·양봉 관련 최신 기사를 내가 설정한 키워드로 모아볼 수 있어요.",
    steps: ["상단 키워드 선택", "기사 확인", "관심 키워드 추가"],
    stepColor: "#16A34A",
    route: "/bee-news",
    iconBg: "#DCFCE7",
    icon: require("../../assets/homeIcons/news2.png"),
  },
  {
    label: "농산물 시세",
    description: "과일·채소 도매 가격을 실시간으로 확인하고 관심 시장을 등록할 수 있어요.",
    steps: ["시세 확인", "작물별 빠른검색", "맞춤시세 추가"],
    stepColor: "#2563EB",
    route: "/fruit-price",
    iconBg: "#DBEAFE",
    icon: require("../../assets/homeIcons/trading.png"),
  },
  {
    label: "농약 정보",
    description: "작물별 사용 가능한 농약과 희석 배수, 잔류 허용 기준을 쉽게 검색해요.",
    steps: ["작물명>용도>벌 종류 선택", "사용 가능 농약 확인", "검색"],
    stepColor: "#7C3AED",
    route: "/pesticide",
    iconBg: "#EDE9FE",
    icon: require("../../assets/homeIcons/pesticide.png"),
  },
  {
    label: "수정벌 추천",
    description: "재배 작물과 환경을 입력하면 AI가 최적의 수벌 종류를 추천해줘요.",
    steps: ["농지 기반 추천", "작물별 수정벌 팁 확인", "결과 확인 및 저장"],
    stepColor: "#D97706",
    route: "/recommend",
    iconBg: "#FEF3C7",
    icon: require("../../assets/homeIcons/recommend.png"),
  },
  {
    label: "AI 벌 채팅",
    description: "꿀벌·양봉·병해에 관한 궁금한 점을 전문 AI에게 언제든 물어보세요.",
    steps: ["수정벌 전문 챗봇", "전문가만큼 세밀한 답변", "유사케이스 축적"],
    stepColor: "#0891B2",
    route: "/bee-chat",
    iconBg: "#CFFAFE",
    icon: require("../../assets/homeIcons/inquiry.png"),
  },
  {
    label: "벌통 관리",
    description: "벌통 내부 온도·습도를 실시간으로 보고, 히터·환기 장치를 원격 제어해요.",
    steps: ["벌통 연결", "실시간 확인 및 조작", "통계/리포트 확인"],
    stepColor: "#EA580C",
    route: "/hive-control",
    iconBg: "#FFEDD5",
    icon: require("../../assets/homeIcons/beeHive1.png"),
  },
] as const;

const COMING_SOON = [
  {
    label: "농부들의 수다",
    description: "다른 농부들과 경험을 나누고 질문도 주고받는 커뮤니티",
    icon: require("../../assets/homeIcons/community.png"),
  },
  {
    label: "벌통 통계",
    description: "온도·습도·가스 데이터를 차트와 표로 한눈에 분석",
    icon: require("../../assets/homeIcons/beeHive2.png"),
  },
  {
    label: "벌 건강검진",
    description: "사진 한 장으로 꿀벌 병해를 AI가 자동으로 진단",
    icon: require("../../assets/homeIcons/diagnosis.png"),
  },
  {
    label: "내 농장 기록",
    description: "농장 작업 일지와 수확량을 기록하고 리포트로 확인",
    icon: require("../../assets/homeIcons/house.png"),
  },
  {
    label: "마켓",
    description: "양봉 용품과 농산물을 사고파는 거래 공간",
    icon: require("../../assets/homeIcons/trading.png"),
  },
] as const;

function StepFlow({ steps, color }: { steps: readonly string[]; color: string }) {
  const bg = color + "18";
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 4,
        marginTop: 10,
      }}
    >
      {steps.map((step, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: bg,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                width: 17,
                height: 17,
                borderRadius: 9,
                backgroundColor: color,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PretendardFont
                weight="bold"
                style={{ fontSize: 10, color: "#fff" }}
              >
                {i + 1}
              </PretendardFont>
            </View>
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 12, color: color }}
            >
              {step}
            </PretendardFont>
          </View>
          {i < steps.length - 1 && (
            <Feather name="chevron-right" size={12} color="#D1D5DB" />
          )}
        </View>
      ))}
    </View>
  );
}

export default function FeatureGuideScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const haptic = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleFeaturePress = (route: string) => {
    haptic();
    router.push(route as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
      <AppHeader
        title="기능 가이드"
        onBack={() => navigation.goBack()}
        isScrolled={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + 20,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          gap: 24,
        }}
      >
        {/* 히어로 배너 */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <View
            style={{
              backgroundColor: "#F0FDF4",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: "#BBF7D0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "#DCFCE7",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="zap" size={20} color="#16A34A" />
              </View>
              <PretendardFont
                weight="bold"
                style={{ fontSize: 20, color: "#111827" }}
              >
                농번기 필수 기능
              </PretendardFont>
            </View>
            <PretendardFont
              weight="regular"
              style={{ fontSize: 15, color: "#4B5563", lineHeight: 24 }}
            >
              WEBEE의 핵심 기능 6가지를 소개해드릴게요.{"\n"}
              탭하면 바로 해당 화면으로 이동할 수 있어요!
            </PretendardFont>
          </View>
        </Animated.View>

        {/* 사용 가능한 기능 */}
        <View style={{ gap: 12 }}>
          <PretendardFont
            weight="bold"
            style={{ fontSize: 18, color: "#111827" }}
          >
            지금 바로 사용해보세요
          </PretendardFont>

          {FEATURES.map((feature, i) => (
            <Animated.View
              key={feature.route}
              entering={FadeInDown.delay(i * 60)
                .duration(300)
                .springify()}
            >
              <Pressable
                onPress={() => handleFeaturePress(feature.route)}
                style={({ pressed }) => ({
                  backgroundColor: "#FFFFFF",
                  borderRadius: 18,
                  padding: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  opacity: pressed ? 0.85 : 1,
                  borderWidth: 1,
                  borderColor: "#E5E8EB",
                })}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 15,
                    backgroundColor: feature.iconBg,
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    source={feature.icon}
                    style={{ width: 36, height: 36 }}
                    resizeMode="contain"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <PretendardFont
                    weight="bold"
                    style={{ fontSize: 17, color: "#111827", marginBottom: 5 }}
                  >
                    {feature.label}
                  </PretendardFont>
                  <PretendardFont
                    weight="regular"
                    style={{ fontSize: 14, color: "#6B7280", lineHeight: 21 }}
                  >
                    {feature.description}
                  </PretendardFont>
                  <StepFlow steps={feature.steps} color={feature.stepColor} />
                </View>

              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* 개발 중 기능 */}
        <View style={{ gap: 12 }}>
          <PretendardFont
            weight="bold"
            style={{ fontSize: 18, color: "#111827" }}
          >
            곧 만나요 😊
          </PretendardFont>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              paddingHorizontal: 18,
              borderWidth: 1,
              borderColor: "#E5E8EB",
            }}
          >
            {COMING_SOON.map((item, i) => (
              <View
                key={item.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 16,
                  borderBottomWidth: i < COMING_SOON.length - 1 ? 1 : 0,
                  borderBottomColor: "#F3F4F6",
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 13,
                    backgroundColor: "#F3F4F6",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.6,
                    flexShrink: 0,
                  }}
                >
                  <Image
                    source={item.icon}
                    style={{ width: 30, height: 30 }}
                    resizeMode="contain"
                  />
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <PretendardFont
                    weight="semibold"
                    style={{ fontSize: 16, color: "#9CA3AF" }}
                  >
                    {item.label}
                  </PretendardFont>
                  <PretendardFont
                    weight="regular"
                    style={{ fontSize: 13, color: "#B0B8C1", lineHeight: 19 }}
                  >
                    {item.description}
                  </PretendardFont>
                </View>

                <View
                  style={{
                    backgroundColor: "#F3F4F6",
                    borderRadius: 20,
                    paddingHorizontal: 11,
                    paddingVertical: 5,
                    flexShrink: 0,
                  }}
                >
                  <PretendardFont
                    weight="medium"
                    style={{ fontSize: 13, color: "#9CA3AF" }}
                  >
                    준비 중
                  </PretendardFont>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

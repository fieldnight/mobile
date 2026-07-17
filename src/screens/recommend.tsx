import { useState, useCallback } from "react";
import {
  View,
  Alert,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFarmList } from "@/features/farm";
import {
  useAiRecommendation,
  useSaveRecommendation,
  getBeeTypeEnum,
} from "@/features/recommendation";
import { Card } from "@/components/hive/hive-shared";
import { NoticeBottomSheet } from "@/components/NoticeBottomSheet";
import { CropGuideSection } from "@/components/recommend/CropGuideSection";
import { PretendardFont } from "@/components/PretendardFont";
import { PageTitle } from "@/components/PageTitle";
import { C } from "@/constants/hive-colors";
import type {
  BeeRecommendationAiResponse,
  BeeRecommendationSaveRequest,
} from "@/types/recommendation";
import type { UserCrop } from "@/types/farm";
import { CULTIVATION_TYPE_LABELS, BEE_TYPE_INFO } from "@/constants/recommend";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import { useAuthStore } from "@/stores/useAuthStore";

// 날짜 포맷팅 헬퍼
function formatDateKorean(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function triggerHaptic(style: "light" | "medium") {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(
      style === "light"
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
  }
}

// ── 섹션 헤더 (얇은 액센트 바 + 제목) — 미니멀 ─────────────────────────────────
function SectionHeader({
  title,
  accent = C.primary,
}: {
  title: string;
  accent?: string;
}) {
  return (
    <View
      className="flex-row items-center"
      style={{ gap: 9, marginBottom: 16 }}
    >
      <View
        style={{
          width: 3.5,
          height: 16,
          borderRadius: 2,
          backgroundColor: accent,
        }}
      />
      <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
        {title}
      </PretendardFont>
    </View>
  );
}

function FarmMetaItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      className="flex-row items-center rounded-full border bg-white px-3 py-2"
      style={{ borderColor: C.border, gap: 6 }}
    >
      <Feather name={icon} size={13} color={C.sec} />
      <PretendardFont style={{ fontSize: 11.5, color: C.sec }}>
        {label}
      </PretendardFont>
      <PretendardFont weight="bold" style={{ fontSize: 12.5, color: C.text }}>
        {value}
      </PretendardFont>
    </View>
  );
}

type Tab = "farm" | "crop";

export default function RecommendScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [activeTab, setActiveTab] = useState<Tab>("crop");
  const [devNoticeVisible, setDevNoticeVisible] = useState(false);
  const [loginNoticeVisible, setLoginNoticeVisible] = useState(false);
  const [result, setResult] = useState<BeeRecommendationAiResponse | null>(
    null,
  );
  const [selectedCrop, setSelectedCrop] = useState<UserCrop | null>(null);

  const {
    data: crops,
    isLoading: cropsLoading,
    refetch: refetchFarms,
  } = useFarmList();
  const recommendMutation = useAiRecommendation();
  const saveMutation = useSaveRecommendation();

  const handleRefresh = useCallback(async () => {
    await refetchFarms();
  }, [refetchFarms]);

  const showLoginNotice = () => {
    triggerHaptic("light");
    setLoginNoticeVisible(true);
  };

  const goToLogin = () => {
    setLoginNoticeVisible(false);
    router.push({
      pathname: "/login",
      params: { redirect: pathname },
    });
  };

  const goToAddFarm = () => {
    if (!isAuthenticated) {
      showLoginNotice();
      return;
    }
    router.push("/add-farm");
  };

  const handleGetRecommendation = (crop: UserCrop) => {
    triggerHaptic("medium");
    setSelectedCrop(crop);
    const request = {
      name: crop.name || "",
      variety: crop.variety || undefined,
      cultivationType: crop.cultivationType,
      cultivationAddress: crop.cultivationAddress || "",
      cultivationArea: crop.cultivationArea,
      plantingDate: crop.plantingDate,
    };

    if (__DEV__) {
      console.log("[RecommendationAI] selected farm", crop);
      console.log("[RecommendationAI] request from farm", request);
    }

    recommendMutation.mutate(
      request,
      {
        onSuccess: (data) => {
          if (__DEV__) console.log("[RecommendationAI] screen success", data);
          setResult(data);
          triggerHaptic("medium");
        },
        onError: (error: any) => {
          if (__DEV__) console.error("[RecommendationAI] screen error", error);
          Alert.alert(
            "오류",
            error.response?.data?.message || "추천 요청에 실패했습니다",
          );
        },
      },
    );
  };

  const handleReset = () => {
    triggerHaptic("light");
    setResult(null);
    setSelectedCrop(null);
  };

  const beeInfo = result
    ? BEE_TYPE_INFO[result.beeType.toUpperCase()] || {
        icon: "zap",
        color: C.primary,
      }
    : null;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: C.bg }}
      edges={["bottom"]}
    >
      <AppHeader
        title="수정벌 추천"
        onBack={() => router.back()}
        isScrolled={isScrolled}
      />

      <PullToRefresh
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingTop: HEADER_HEIGHT + 16,
          paddingBottom: 100,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        {/* 탭 전환: 작물별 가이드를 먼저 보여주고, AI 추천은 두 번째에 배치합니다. */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#EDEFF2",
            borderRadius: 14,
            padding: 4,
          }}
        >
          {(
            [
              { key: "crop", label: "작물별 가이드" },
              { key: "farm", label: "농지 기반 AI 추천" },
            ] as { key: Tab; label: string }[]
          ).map(({ key, label }) => {
            const active = activeTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  if (key === "farm") {
                    setDevNoticeVisible(true);
                    triggerHaptic("light");
                    return;
                  }
                  setActiveTab(key);
                  triggerHaptic("light");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: active ? C.white : "transparent",
                  shadowColor: active ? "#64748B" : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: active ? 0.12 : 0,
                  shadowRadius: 4,
                  elevation: active ? 2 : 0,
                }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 13, color: active ? C.primary : C.sec }}
                >
                  {label}
                </PretendardFont>
              </Pressable>
            );
          })}
        </View>

        {/* ── 작물별 가이드 탭 ─────────────────────────────────────────── */}
        {activeTab === "crop" && (
          <CropGuideSection
            isAuthenticated={isAuthenticated}
            onRequireLogin={showLoginNotice}
          />
        )}

        {/* ── 농지 기반 AI 추천 탭 ─────────────────────────────────────── */}
        {activeTab === "farm" &&
          (!result ? (
            <>
              <PageTitle
                title={"농지 기반\nAI 수정벌 추천"}
                subtitle="등록된 농지 정보로 가장 알맞은 수정벌을 추천해드려요"
              />

              {/* 추천 기록 바로가기 */}
              <Pressable
                onPress={() => router.push("/recommend-history")}
                className="active:opacity-80"
              >
                <Card style={{ padding: 14 }}>
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: C.primarySoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="clock" size={20} color={C.primary} />
                    </View>
                    <View className="flex-1">
                      <PretendardFont
                        weight="bold"
                        style={{ fontSize: 15, color: C.text }}
                      >
                        지난 추천 기록
                      </PretendardFont>
                      <PretendardFont
                        style={{ fontSize: 12.5, color: C.sec, marginTop: 1 }}
                      >
                        이전에 받은 추천 결과를 다시 확인하세요
                      </PretendardFont>
                    </View>
                    <Feather name="chevron-right" size={20} color={C.ter} />
                  </View>
                </Card>
              </Pressable>

              {/* 농지 목록 */}
              {cropsLoading ? (
                <Card className="items-center" style={{ paddingVertical: 48 }}>
                  <ActivityIndicator size="large" color={C.primary} />
                  <PretendardFont
                    style={{ fontSize: 14, color: C.sec, marginTop: 14 }}
                  >
                    농지 정보를 불러오는 중...
                  </PretendardFont>
                </Card>
              ) : !crops || crops.length === 0 ? (
                <Card className="items-center" style={{ paddingVertical: 44 }}>
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: C.bg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <Feather name="map-pin" size={26} color={C.ter} />
                  </View>
                  <PretendardFont
                    weight="bold"
                    style={{ fontSize: 16, color: C.text, marginBottom: 6 }}
                  >
                    등록된 농지가 없어요
                  </PretendardFont>
                  <PretendardFont
                    style={{
                      fontSize: 13,
                      color: C.sec,
                      textAlign: "center",
                      marginBottom: 20,
                    }}
                  >
                    농지를 먼저 등록하면 AI 추천을 받을 수 있어요
                  </PretendardFont>
                  <Pressable
                    onPress={goToAddFarm}
                    className="flex-row items-center active:opacity-90"
                    style={{
                      gap: 6,
                      backgroundColor: C.primary,
                      paddingHorizontal: 22,
                      height: 48,
                      borderRadius: 14,
                    }}
                  >
                    <Feather name="plus" size={18} color={C.white} />
                    <PretendardFont
                      weight="bold"
                      style={{ fontSize: 14, color: C.white }}
                    >
                      농지 등록하기
                    </PretendardFont>
                  </Pressable>
                </Card>
              ) : (
                crops.map((crop, i) => {
                  const isPending =
                    recommendMutation.isPending && selectedCrop?.id === crop.id;
                  const hasVariety =
                    !!crop.variety &&
                    crop.variety !== "0" &&
                    crop.variety.trim() !== "";
                  const cropTypeLabel =
                    CULTIVATION_TYPE_LABELS[crop.cultivationType] ?? "재배";
                  return (
                    <Card key={crop.id} delay={i * 60}>
                      {/* 작물명과 품종을 카드 상단에서 명확하게 분리합니다. */}
                      <View className="mb-4 flex-row items-start justify-between" style={{ gap: 10 }}>
                        <View className="flex-1">
                          <PretendardFont
                            weight="bold"
                            style={{ fontSize: 20, color: C.text }}
                          >
                            {crop.name || "미지정"}
                          </PretendardFont>
                          <PretendardFont style={{ fontSize: 12.5, color: C.sec, marginTop: 3 }}>
                            등록 농지 정보 기반 추천
                          </PretendardFont>
                        </View>
                        {hasVariety && (
                          <View
                            className="rounded-full border px-3 py-1.5"
                            style={{ backgroundColor: C.bgAlt, borderColor: C.border }}
                          >
                            <PretendardFont
                              weight="semibold"
                              style={{ fontSize: 12.5, color: C.textAlt }}
                            >
                              {crop.variety}
                            </PretendardFont>
                          </View>
                        )}
                      </View>

                      {/* 작은 화면에서 날짜가 잘리지 않도록 정보는 wrap 가능한 칩으로 보여줍니다. */}
                      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                        <FarmMetaItem icon="layers" label="방식" value={cropTypeLabel} />
                        {crop.cultivationAddress && (
                          <FarmMetaItem icon="map-pin" label="지역" value={crop.cultivationAddress} />
                        )}
                        <FarmMetaItem
                          icon="maximize-2"
                          label="면적"
                          value={`${crop.cultivationArea.toLocaleString()}㎡`}
                        />
                        <FarmMetaItem icon="calendar" label="정식일" value={crop.plantingDate} />
                      </View>

                      {/* CTA: 농지 카드 내부에서 부담스럽지 않게 보이는 컴팩트 액션입니다. */}
                      <Pressable
                        onPress={() => handleGetRecommendation(crop)}
                        disabled={recommendMutation.isPending}
                        className="mt-4 flex-row items-center justify-between rounded-2xl border px-3.5 py-3 active:opacity-90"
                        style={{
                          backgroundColor: C.recommendCtaBg,
                          borderColor: C.recommendCtaBorder,
                          opacity: recommendMutation.isPending && !isPending ? 0.55 : 1,
                        }}
                      >
                        {isPending ? (
                          <View className="flex-row items-center" style={{ gap: 10 }}>
                            <View
                              className="h-9 w-9 items-center justify-center rounded-full"
                              style={{ backgroundColor: C.white }}
                            >
                              <ActivityIndicator size="small" color={C.primary} />
                            </View>
                            <PretendardFont
                              weight="bold"
                              style={{ fontSize: 14, color: C.text }}
                            >
                              AI가 추천 중이에요
                            </PretendardFont>
                          </View>
                        ) : (
                          <>
                            <View className="flex-1 flex-row items-center" style={{ gap: 10 }}>
                              <View
                                className="h-9 w-9 items-center justify-center rounded-full"
                                style={{ backgroundColor: C.white }}
                              >
                                <Feather name="zap" size={17} color={C.primary} />
                              </View>
                              <View>
                                <PretendardFont
                                  weight="bold"
                                  style={{ fontSize: 14, color: C.text }}
                                >
                                  AI 수정벌 추천받기
                                </PretendardFont>
                                <PretendardFont
                                  style={{ fontSize: 11.5, color: C.textAlt, marginTop: 1 }}
                                >
                                  AI 생성 추천이며 현장 확인이 필요해요
                                </PretendardFont>
                              </View>
                            </View>
                            <Feather name="arrow-right" size={18} color={C.primary} />
                          </>
                        )}
                      </Pressable>
                    </Card>
                  );
                })
              )}
            </>
          ) : (
            <>
              <PageTitle
                title="AI 추천 결과"
                subtitle={`${selectedCrop?.name ?? "작물"}에 가장 알맞은 수정벌이에요`}
              />

              {/* 추천 수정벌 (히어로) */}
              <Card>
                <View className="flex-row items-center" style={{ gap: 14 }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: `${beeInfo?.color}14`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather
                      name={beeInfo?.icon as any}
                      size={26}
                      color={beeInfo?.color}
                    />
                  </View>
                  <View className="flex-1">
                    <PretendardFont
                      style={{ fontSize: 13, color: C.sec, marginBottom: 3 }}
                    >
                      추천 수정벌
                    </PretendardFont>
                    <PretendardFont
                      weight="bold"
                      style={{ fontSize: 22, color: C.text }}
                    >
                      {result.beeType}
                    </PretendardFont>
                  </View>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: C.border,
                    marginVertical: 16,
                  }}
                />

                {/* 권장 투입 기간 */}
                <View className="flex-row items-center justify-between">
                  <PretendardFont
                    weight="semibold"
                    style={{ fontSize: 14, color: C.sec }}
                  >
                    권장 투입 기간
                  </PretendardFont>
                  <PretendardFont
                    weight="bold"
                    style={{ fontSize: 16, color: C.text }}
                  >
                    {formatDateKorean(result.inputStartDate)} ~{" "}
                    {formatDateKorean(result.inputEndDate)}
                  </PretendardFont>
                </View>
              </Card>

              {/* 수정벌 특징 */}
              <Card>
                <SectionHeader title="수정벌 특징" accent={C.success} />
                {result.characteristics.map((char, index) => (
                  <View
                    key={index}
                    className="flex-row items-start"
                    style={{
                      gap: 10,
                      marginBottom:
                        index === result.characteristics.length - 1 ? 0 : 13,
                    }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: C.success,
                        marginTop: 9,
                      }}
                    />
                    <PretendardFont
                      style={{
                        flex: 1,
                        fontSize: 15.5,
                        color: C.text,
                        lineHeight: 24,
                      }}
                    >
                      {char}
                    </PretendardFont>
                  </View>
                ))}
              </Card>

              {/* 사용 팁 */}
              <Card>
                <SectionHeader title="사용 팁" accent={C.primary} />
                {result.usageTip.map((tip, index) => (
                  <View
                    key={index}
                    className="flex-row items-start"
                    style={{
                      gap: 12,
                      marginBottom:
                        index === result.usageTip.length - 1 ? 0 : 13,
                    }}
                  >
                    <PretendardFont
                      weight="bold"
                      style={{
                        fontSize: 14,
                        color: C.primary,
                        width: 16,
                        lineHeight: 24,
                      }}
                    >
                      {index + 1}
                    </PretendardFont>
                    <PretendardFont
                      style={{
                        flex: 1,
                        fontSize: 15.5,
                        color: C.text,
                        lineHeight: 24,
                      }}
                    >
                      {tip}
                    </PretendardFont>
                  </View>
                ))}
              </Card>

              {/* 주의사항 */}
              <Card>
                <SectionHeader title="주의사항" accent={C.warning} />
                {result.caution.map((caution, index) => (
                  <View
                    key={index}
                    className="flex-row items-start"
                    style={{
                      gap: 10,
                      marginBottom: index === result.caution.length - 1 ? 0 : 12,
                    }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: C.warning,
                        marginTop: 9,
                      }}
                    />
                    <PretendardFont
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: C.text,
                        lineHeight: 23,
                      }}
                    >
                      {caution}
                    </PretendardFont>
                  </View>
                ))}
              </Card>

              {/* 저장 및 기타 */}
              <Card>
                <Pressable
                  onPress={() => {
                    if (!result || !selectedCrop) return;
                    const requestData: BeeRecommendationSaveRequest = {
                      cropName: selectedCrop.name || "",
                      cultivationAddress: selectedCrop.cultivationAddress || "",
                      cultivationType: selectedCrop.cultivationType,
                      beeType: getBeeTypeEnum(result.beeType),
                      characteristics: result.characteristics.join("\n"),
                      inputStartDate: result.inputStartDate,
                      inputEndDate: result.inputEndDate,
                      caution: result.caution.join("\n"),
                      usageTip: result.usageTip.join("\n"),
                    };
                    saveMutation.mutate(requestData, {
                      onSuccess: () => {
                        triggerHaptic("medium");
                        Alert.alert("저장 완료", "추천 결과가 저장되었습니다", [
                          { text: "확인", style: "cancel" },
                          {
                            text: "추천 기록 보기",
                            onPress: () => router.push("/recommend-history"),
                          },
                        ]);
                      },
                      onError: (error: any) => {
                        Alert.alert(
                          "오류",
                          error.response?.data?.message ||
                            "저장에 실패했습니다",
                        );
                      },
                    });
                  }}
                  disabled={saveMutation.isPending}
                  className="flex-row items-center justify-center active:opacity-90"
                  style={{
                    gap: 8,
                    height: 54,
                    borderRadius: 14,
                    backgroundColor: C.primary,
                  }}
                >
                  {saveMutation.isPending ? (
                    <ActivityIndicator size="small" color={C.white} />
                  ) : (
                    <>
                      <Feather name="bookmark" size={20} color={C.white} />
                      <PretendardFont
                        weight="bold"
                        style={{ fontSize: 16, color: C.white }}
                      >
                        추천 결과 저장하기
                      </PretendardFont>
                    </>
                  )}
                </Pressable>

                <View className="flex-row" style={{ gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      triggerHaptic("light");
                      router.push("/market");
                    }}
                    className="flex-1 flex-row items-center justify-center active:opacity-80"
                    style={{
                      gap: 6,
                      backgroundColor: C.bg,
                      height: 48,
                      borderRadius: 12,
                    }}
                  >
                    <Feather name="shopping-bag" size={17} color={C.sec} />
                    <PretendardFont
                      weight="semibold"
                      style={{ fontSize: 13.5, color: C.textAlt }}
                    >
                      구매처 찾기
                    </PretendardFont>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      triggerHaptic("light");
                      Alert.alert("공유하기", "공유 기능은 준비 중입니다");
                    }}
                    className="flex-1 flex-row items-center justify-center active:opacity-80"
                    style={{
                      gap: 6,
                      backgroundColor: C.bg,
                      height: 48,
                      borderRadius: 12,
                    }}
                  >
                    <Feather name="share-2" size={17} color={C.sec} />
                    <PretendardFont
                      weight="semibold"
                      style={{ fontSize: 13.5, color: C.textAlt }}
                    >
                      공유하기
                    </PretendardFont>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleReset}
                  className="items-center active:opacity-70"
                  style={{ marginTop: 14, paddingVertical: 4 }}
                >
                  <PretendardFont
                    weight="semibold"
                    style={{ fontSize: 13.5, color: C.sec }}
                  >
                    다른 농지로 새로 추천받기
                  </PretendardFont>
                </Pressable>
              </Card>
            </>
          ))}
      </PullToRefresh>

      <NoticeBottomSheet
        visible={devNoticeVisible}
        onClose={() => setDevNoticeVisible(false)}
        title="지금은 개발 중이에요"
        message="농지 기반 AI 추천은 더 정확하게 다듬는 중이에요. 지금은 작물별 가이드를 이용하거나 이전 화면으로 돌아가 주세요."
        icon="tool"
        snapHeight={0.42}
        actions={[
          { label: "작물별 가이드 보기", onPress: () => setDevNoticeVisible(false) },
          {
            label: "뒤로가기",
            variant: "secondary",
            onPress: () => {
              setDevNoticeVisible(false);
              router.back();
            },
          },
        ]}
      />

      <NoticeBottomSheet
        visible={loginNoticeVisible}
        onClose={() => setLoginNoticeVisible(false)}
        title="로그인이 필요해요"
        message="작물별 가이드 조회와 농지 등록은 로그인 후 이용할 수 있어요."
        icon="lock"
        snapHeight={0.4}
        actions={[
          { label: "로그인하기", onPress: goToLogin },
          {
            label: "계속 둘러보기",
            variant: "secondary",
            onPress: () => setLoginNoticeVisible(false),
          },
        ]}
      />
    </SafeAreaView>
  );
}

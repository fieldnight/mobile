import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFarmList } from "@/features/farm";
import {
  useAiRecommendation,
  useSaveRecommendation,
  getBeeTypeEnum,
} from "@/features/recommendation";
import { Card } from "@/components/Card";
import { CropGuideSection } from "@/components/recommend/CropGuideSection";
import { PretendardFont } from "@/components/PretendardFont";
import type {
  BeeRecommendationAiResponse,
  BeeRecommendationSaveRequest,
} from "@/types/recommendation";
import type { UserCrop } from "@/types/farm";
import { CULTIVATION_TYPE_LABELS, BEE_TYPE_INFO } from "@/constants/recommend";
import AppHeader from "@/components/AppHeader";

// 날짜 포맷팅 헬퍼
function formatDateKorean(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 작물 이모지 맵핑
function getCropEmoji(name: string): string {
  const emojiMap: Record<string, string> = {
    딸기: "🍓",
    토마토: "🍅",
    고추: "🌶️",
    오이: "🥒",
    호박: "🎃",
    수박: "🍉",
    참외: "🍈",
    멜론: "🍈",
    블루베리: "🫐",
    사과: "🍎",
    배: "🍐",
  };
  return emojiMap[name] || "🌱";
}

type Tab = "farm" | "crop";

export default function RecommendScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("farm");
  const [result, setResult] = useState<BeeRecommendationAiResponse | null>(
    null,
  );
  const [selectedCrop, setSelectedCrop] = useState<UserCrop | null>(null);

  // 사용자 농지 목록 조회 (최신순 정렬)
  const { data: crops, isLoading: cropsLoading } = useFarmList();

  // AI 추천 요청
  const recommendMutation = useAiRecommendation();

  // 추천 결과 저장
  const saveMutation = useSaveRecommendation();

  const triggerHaptic = (style: "light" | "medium") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        style === "light"
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium,
      );
    }
  };

  const handleGetRecommendation = (crop: UserCrop) => {
    triggerHaptic("medium");
    setSelectedCrop(crop);
    recommendMutation.mutate(
      {
        name: crop.name || "",
        variety: crop.variety || undefined,
        cultivationType: crop.cultivationType,
        cultivationAddress: crop.cultivationAddress || "",
        cultivationArea: crop.cultivationArea,
        plantingDate: crop.plantingDate,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          triggerHaptic("medium");
        },
        onError: (error: any) => {
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
        color: "#7C4DFF",
      }
    : null;

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={["bottom"]}>
      {/* Header */}
      <AppHeader title="수정벌 추천" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* 탭 전환 */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#F3F4F6',
            borderRadius: 14,
            padding: 4,
            marginBottom: 16,
          }}
        >
          {(
            [
              { key: "farm", label: "농지 기반 AI 추천" },
              { key: "crop", label: "작물별 가이드" },
            ] as { key: Tab; label: string }[]
          ).map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => {
                setActiveTab(key);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: activeTab === key ? '#FFFFFF' : 'transparent',
                shadowColor: activeTab === key ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === key ? 0.08 : 0,
                shadowRadius: 2,
                elevation: activeTab === key ? 2 : 0,
              }}
            >
              <PretendardFont
                weight="bold"
                style={{
                  fontSize: 13,
                  color: activeTab === key ? '#2563EB' : '#6B7280',
                }}
              >
                {label}
              </PretendardFont>
            </Pressable>
          ))}
        </View>

        {/* 작물별 가이드 탭 */}
        {activeTab === "crop" && <CropGuideSection />}

        {/* 농지 기반 AI 추천 탭 */}
        {activeTab === "farm" && (!result ? (
          <>
            {/* 추천 기록 바로가기 */}
            <Pressable
              onPress={() => router.push("/recommend-history")}
              className="active:scale-[0.98]"
            >
              <Card className="mb-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center mr-3">
                    <Feather name="clock" size={22} color="#7C4DFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      추천 기록
                    </Text>
                    <Text className="text-sm text-gray-500">
                      이전에 받은 추천 결과 보기
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#9CA3AF" />
                </View>
              </Card>
            </Pressable>

            {/* 농지 목록 또는 로딩 */}
            {cropsLoading ? (
              <Card className="items-center py-12">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-500 mt-4">
                  농지 정보를 불러오는 중...
                </Text>
              </Card>
            ) : !crops || crops.length === 0 ? (
              <Card className="items-center py-12">
                <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                  <Feather name="alert-circle" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-lg font-semibold text-gray-900 mb-2">
                  등록된 농지가 없습니다
                </Text>
                <Text className="text-gray-500 text-center mb-4">
                  농지를 먼저 등록해주세요
                </Text>
                <Pressable
                  onPress={() => router.push("/add-farm")}
                  className="bg-blue-600 px-6 py-3 rounded-xl"
                >
                  <Text className="text-white font-semibold">
                    농지 등록하기
                  </Text>
                </Pressable>
              </Card>
            ) : (
              <View className="gap-3">
                {crops.map((crop) => (
                  <Card key={crop.id}>
                    {/* 작물 정보 */}
                    <View className="flex-row items-center mb-4 pb-4 border-b border-gray-100">
                      <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mr-3">
                        <Text className="text-2xl">
                          {getCropEmoji(crop.name || "")}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-900">
                          {crop.name || "미지정"}
                        </Text>
                        {crop.variety &&
                          crop.variety !== "0" &&
                          crop.variety.trim() !== "" && (
                            <Text className="text-sm text-gray-500">
                              {crop.variety}
                            </Text>
                          )}
                      </View>
                    </View>

                    {/* 상세 정보 */}
                    <View className="gap-2 mb-4">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-gray-500">재배 방식</Text>
                        <Text className="text-sm font-medium text-gray-900">
                          {CULTIVATION_TYPE_LABELS[crop.cultivationType]}
                        </Text>
                      </View>
                      {crop.cultivationAddress && (
                        <View className="flex-row justify-between">
                          <Text className="text-sm text-gray-500">
                            재배 지역
                          </Text>
                          <Text className="text-sm font-medium text-gray-900">
                            {crop.cultivationAddress}
                          </Text>
                        </View>
                      )}
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-gray-500">재배 면적</Text>
                        <Text className="text-sm font-medium text-gray-900">
                          {crop.cultivationArea.toLocaleString()}㎡
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-gray-500">정식일</Text>
                        <Text className="text-sm font-medium text-gray-900">
                          {crop.plantingDate}
                        </Text>
                      </View>
                    </View>

                    {/* 추천 버튼 */}
                    <Pressable
                      onPress={() => handleGetRecommendation(crop)}
                      disabled={recommendMutation.isPending}
                      className="flex-row items-center justify-center gap-2 bg-blue-600 h-12 rounded-xl active:bg-blue-700"
                    >
                      {recommendMutation.isPending &&
                      selectedCrop?.id === crop.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text className="text-base font-semibold text-white">
                            AI 수정벌 추천 받기
                          </Text>
                          <Feather
                            name="arrow-right"
                            size={18}
                            color="#FFFFFF"
                          />
                        </>
                      )}
                    </Pressable>
                  </Card>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* 추천 결과: 수정벌 타입 */}
            <Card className="mb-4">
              <View className="flex-row items-center">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: `${beeInfo?.color}20` }}
                >
                  <Feather
                    name={beeInfo?.icon as any}
                    size={32}
                    color={beeInfo?.color}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">
                    추천 수정벌
                  </Text>
                  <Text className="text-2xl font-bold text-gray-900">
                    {result.beeType}
                  </Text>
                </View>
              </View>
            </Card>

            {/* 투입 기간 */}
            <Card className="mb-4 items-center">
              <View className="flex-row items-center gap-2 bg-blue-50 px-5 py-3 rounded-full">
                <Feather name="calendar" size={18} color="#3B82F6" />
                <Text className="text-base font-semibold text-blue-600">
                  {formatDateKorean(result.inputStartDate)} ~{" "}
                  {formatDateKorean(result.inputEndDate)}
                </Text>
              </View>
              <Text className="text-xs text-gray-500 mt-2">권장 투입 기간</Text>
            </Card>

            {/* 특징 */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                수정벌 특징
              </Text>
              {result.characteristics.map((char, index) => (
                <View key={index} className="flex-row items-start mb-3">
                  <View className="w-5 h-5 rounded-full bg-green-100 items-center justify-center mr-3 mt-0.5">
                    <Feather name="check" size={12} color="#10B981" />
                  </View>
                  <Text className="flex-1 text-base text-gray-700 leading-6">
                    {char}
                  </Text>
                </View>
              ))}
            </Card>

            {/* 사용 팁 */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                사용 팁
              </Text>
              {result.usageTip.map((tip, index) => (
                <View key={index} className="flex-row items-start mb-3">
                  <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center mr-3">
                    <Text className="text-xs font-semibold text-white">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 text-base text-gray-700 leading-6">
                    {tip}
                  </Text>
                </View>
              ))}
            </Card>

            {/* 주의사항 */}
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Feather name="alert-triangle" size={20} color="#F59E0B" />
                <Text className="text-lg font-semibold text-amber-600">
                  주의사항
                </Text>
              </View>
              {result.caution.map((caution, index) => (
                <View
                  key={index}
                  className="flex-row items-start bg-amber-50 p-3 rounded-lg mb-2"
                >
                  <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 mr-3" />
                  <Text className="flex-1 text-sm text-gray-700 leading-5">
                    {caution}
                  </Text>
                </View>
              ))}
            </Card>

            {/* 저장 및 기타 버튼 */}
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
                        error.response?.data?.message || "저장에 실패했습니다",
                      );
                    },
                  });
                }}
                disabled={saveMutation.isPending}
                className="flex-row items-center justify-center gap-2 bg-blue-600 h-14 rounded-xl active:bg-blue-700"
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="bookmark" size={22} color="#FFFFFF" />
                    <Text className="text-base font-bold text-white">
                      추천 결과 저장하기
                    </Text>
                  </>
                )}
              </Pressable>

              {/* 구매처 찾기, 공유하기 버튼 */}
              <View className="flex-row gap-3 mt-3">
                <Pressable
                  onPress={() => {
                    triggerHaptic("light");
                    router.push("/market");
                  }}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-gray-100 h-12 rounded-xl active:bg-gray-200"
                >
                  <Feather name="shopping-bag" size={18} color="#6B7280" />
                  <Text className="text-sm font-semibold text-gray-600">
                    구매처 찾기
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    triggerHaptic("light");
                    Alert.alert("공유하기", "공유 기능은 준비 중입니다");
                  }}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-gray-100 h-12 rounded-xl active:bg-gray-200"
                >
                  <Feather name="share-2" size={18} color="#6B7280" />
                  <Text className="text-sm font-semibold text-gray-600">
                    공유하기
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleReset}
                className="items-center mt-4 py-2"
              >
                <Text className="text-sm text-gray-500">새로운 추천받기</Text>
              </Pressable>
            </Card>
          </>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

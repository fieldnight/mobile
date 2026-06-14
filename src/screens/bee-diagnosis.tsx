import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type {
  BeeDiseaseType,
  BeeDiagnosisAnalyzeResponse,
  BeeDiagnosisAiResponse,
} from "@/types/bee-diagnosis";
import type { CultivationType } from "@/types/farm";
import { DISEASE_LABELS } from "@/types/bee-diagnosis";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";

const DISEASE_OPTIONS: { value: BeeDiseaseType | ""; label: string }[] = [
  { value: "", label: "질병 선택" },
  { value: "ADULT_DWV", label: "성충 날개불구바이러스감염증" },
  { value: "ADULT_MITE", label: "성충 응애" },
  { value: "LARVA_FOULBROOD", label: "유충 부저병" },
  { value: "LARVA_SACBROOD", label: "유충 낭충봉아부패병" },
  { value: "LARVA_MITE", label: "유충 응애" },
];

const CULTIVATION_TYPES: { value: CultivationType; label: string }[] = [
  { value: "CONTROLLED", label: "시설재배" },
  { value: "OPEN_FIELD", label: "노지" },
];

type Step = "upload" | "form" | "result";

interface FormData {
  selectedDisease: BeeDiseaseType | "";
  cultivationType: CultivationType;
  cropName: string;
  location: string;
  additionalInfo: string;
}

interface DiagnosisResult {
  diseaseType: BeeDiseaseType;
  confidence: number;
  imageUrl: string;
  description: string;
  symptoms: string[];
  cause: string;
  severity: "상" | "중" | "하";
  solutions: string[];
}

function ConfidenceCircle({
  confidence,
  size = 100,
  strokeWidth = 8,
}: {
  confidence: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressValue = (confidence / 100) * circumference;

  const getColor = (value: number) => {
    if (value >= 80) return "#10B981";
    if (value >= 50) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(confidence)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progressValue}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View className="items-center">
        <Text className="text-xl font-bold text-gray-900">
          {confidence.toFixed(1)}%
        </Text>
        <Text className="text-xs text-gray-500 mt-0.5">신뢰도</Text>
      </View>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const getColors = (s: string) => {
    switch (s) {
      case "상":
        return "bg-red-100 text-red-600";
      case "중":
        return "bg-orange-100 text-orange-600";
      case "하":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <View
      className={`self-start px-3 py-1.5 rounded-full ${getColors(severity).split(" ")[0]}`}
    >
      <Text
        className={`text-sm font-semibold ${getColors(severity).split(" ")[1]}`}
      >
        심각도: {severity}
      </Text>
    </View>
  );
}

export default function BeeDiagnosisScreen() {
  const router = useRouter();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [formData, setFormData] = useState<FormData>({
    selectedDisease: "",
    cultivationType: "OPEN_FIELD",
    cropName: "",
    location: "",
    additionalInfo: "",
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [analyzedImageUrl, setAnalyzedImageUrl] = useState<string>("");

  // 이미지 분석 API
  const analyzeMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formDataBody = new FormData();
      const filename = imageUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formDataBody.append("beeImage", {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await api.post<{ data: BeeDiagnosisAnalyzeResponse }>(
        "/api/v1/bee/diagnosis",
        formDataBody,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      setAnalyzedImageUrl(data.imageUrl);
      setFormData((prev) => ({ ...prev, selectedDisease: data.diseaseType }));
      triggerHaptic("medium");
      setStep("form");
    },
    onError: (error: any) => {
      Alert.alert(
        "오류",
        error.response?.data?.message || "이미지 분석에 실패했습니다",
      );
    },
  });

  // AI 대처 방안 API
  const aiMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: BeeDiagnosisAiResponse }>(
        "/api/v1/bee/diagnosis/ai",
        {
          imageUrl: analyzedImageUrl,
          diseaseType: formData.selectedDisease,
          cropName: formData.cropName,
          cultivationType: formData.cultivationType,
          cultivationAddress: formData.location || undefined,
          additionalInfo: formData.additionalInfo || undefined,
        },
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      setResult({
        diseaseType: data.diseaseType,
        confidence: analyzeMutation.data?.confidence || 0,
        imageUrl: analyzedImageUrl,
        description: data.description,
        symptoms: data.symptoms,
        cause: data.cause,
        severity: data.severity,
        solutions: data.solutions,
      });
      triggerHaptic("medium");
      setStep("result");
    },
    onError: (error: any) => {
      Alert.alert(
        "오류",
        error.response?.data?.message || "AI 분석에 실패했습니다",
      );
    },
  });

  // 저장 API
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("결과가 없습니다");

      const formDataBody = new FormData();
      const request = {
        diseaseType: result.diseaseType,
        confidence: result.confidence,
        cropName: formData.cropName,
        cultivationType: formData.cultivationType,
        cultivationAddress: formData.location || undefined,
        additionalInfo: formData.additionalInfo || undefined,
        description: result.description,
        symptoms: result.symptoms.join("\n"),
        cause: result.cause,
        severity: result.severity,
        solutions: result.solutions.join("\n"),
      };

      formDataBody.append("request", JSON.stringify(request));

      // 이미지가 URL인 경우 다운로드 후 업로드
      if (selectedImage) {
        const filename = selectedImage.split("/").pop() || "image.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formDataBody.append("beeImage", {
          uri: selectedImage,
          name: filename,
          type,
        } as any);
      }

      const response = await api.post(
        "/api/v1/bee/diagnosis/save",
        formDataBody,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      triggerHaptic("medium");
      Alert.alert("저장 완료", "진단 결과가 저장되었습니다", [
        { text: "확인", style: "cancel" },
        {
          text: "진단 기록 보기",
          onPress: () => router.push("/diagnose-history"),
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

  const triggerHaptic = (style: "light" | "medium") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        style === "light"
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium,
      );
    }
  };

  const pickImage = async () => {
    triggerHaptic("light");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleDiagnosisRequest = () => {
    if (!selectedImage) {
      Alert.alert("알림", "이미지를 선택해주세요");
      return;
    }
    triggerHaptic("medium");
    analyzeMutation.mutate(selectedImage);
  };

  const handleAiRequest = () => {
    if (!formData.selectedDisease) {
      Alert.alert("알림", "질병을 선택해주세요");
      return;
    }
    if (!formData.cropName) {
      Alert.alert("알림", "재배 작물을 입력해주세요");
      return;
    }
    triggerHaptic("medium");
    aiMutation.mutate();
  };

  const handleGoBack = () => {
    triggerHaptic("light");
    if (step === "form") {
      setStep("upload");
    } else if (step === "result") {
      setStep("form");
    } else {
      router.back();
    }
  };

  const handleNewDiagnosis = () => {
    setStep("upload");
    setSelectedImage(null);
    setFormData({
      selectedDisease: "",
      cultivationType: "OPEN_FIELD",
      cropName: "",
      location: "",
      additionalInfo: "",
    });
    setResult(null);
    setAnalyzedImageUrl("");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      {/* Header */}
      <AppHeader title="꿀벌 질병 진단 " onBack={handleGoBack} isScrolled={isScrolled} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: HEADER_HEIGHT + 16, paddingBottom: 100 }}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        {/* Step: Upload */}
        {step === "upload" && (
          <Card>
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              꿀벌 사진 업로드
            </Text>
            <Text className="text-sm text-gray-500 mb-4">
              진단할 꿀벌 사진을 선택해주세요
            </Text>

            <Pressable
              onPress={pickImage}
              className="h-40 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden"
            >
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-3">
                    <Feather name="camera" size={28} color="#3B82F6" />
                  </View>
                  <Text className="text-base font-medium text-gray-900">
                    탭하여 이미지 선택
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    JPG, PNG 파일 지원
                  </Text>
                </View>
              )}
            </Pressable>

            <View className="mt-5">
              <Text className="text-sm font-medium text-gray-500 mb-2">
                예시 이미지
              </Text>
              <View className="flex-row gap-2">
                {["예시 1", "예시 2", "예시 3"].map((label, index) => (
                  <View key={index} className="flex-1 items-center">
                    <View className="w-full aspect-square bg-gray-100 rounded-lg items-center justify-center border border-gray-200">
                      <Feather name="image" size={20} color="#9CA3AF" />
                    </View>
                    <Text className="text-xs text-gray-500 mt-1">{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Button
              onPress={handleDiagnosisRequest}
              loading={analyzeMutation.isPending}
              disabled={!selectedImage}
              className="mt-5"
            >
              진단 요청
            </Button>
          </Card>
        )}

        {/* Step: Form */}
        {step === "form" && (
          <Card>
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              추가 정보 입력
            </Text>
            <Text className="text-sm text-gray-500 mb-4">
              정확한 진단을 위해 정보를 입력해주세요
            </Text>

            {/* Disease Select */}
            <View className="mb-4">
              <View className="flex-row items-center mb-1">
                <Text className="text-sm font-medium text-gray-900">
                  질병 선택
                </Text>
                <Text className="text-sm text-red-500 ml-0.5">*</Text>
              </View>
              <Pressable
                onPress={() => setDropdownOpen(!dropdownOpen)}
                className="h-12 bg-gray-100 rounded-xl border border-gray-200 px-4 flex-row items-center justify-between"
              >
                <Text
                  className={`text-sm ${formData.selectedDisease ? "text-gray-900" : "text-gray-400"}`}
                >
                  {formData.selectedDisease
                    ? DISEASE_LABELS[formData.selectedDisease]
                    : "질병 선택"}
                </Text>
                <Feather
                  name={dropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#6B7280"
                />
              </Pressable>
              {dropdownOpen && (
                <View className="bg-white rounded-xl border border-gray-200 mt-1 overflow-hidden">
                  {DISEASE_OPTIONS.slice(1).map((option) => (
                    <Pressable
                      key={option.value}
                      className="px-4 py-3 border-b border-gray-100"
                      onPress={() => {
                        setFormData((prev) => ({
                          ...prev,
                          selectedDisease: option.value as BeeDiseaseType,
                        }));
                        setDropdownOpen(false);
                      }}
                    >
                      <Text className="text-sm text-gray-900">
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Cultivation Type */}
            <View className="mb-4">
              <View className="flex-row items-center mb-1">
                <Text className="text-sm font-medium text-gray-900">
                  재배 환경
                </Text>
                <Text className="text-sm text-red-500 ml-0.5">*</Text>
              </View>
              <View className="flex-row gap-2">
                {CULTIVATION_TYPES.map((type) => (
                  <Pressable
                    key={type.value}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        cultivationType: type.value,
                      }))
                    }
                    className={`flex-1 h-11 rounded-xl border items-center justify-center ${
                      formData.cultivationType === type.value
                        ? "bg-blue-50 border-blue-500"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        formData.cultivationType === type.value
                          ? "text-blue-600"
                          : "text-gray-500"
                      }`}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Crop Name */}
            <View className="mb-4">
              <View className="flex-row items-center mb-1">
                <Text className="text-sm font-medium text-gray-900">
                  재배 작물
                </Text>
                <Text className="text-sm text-red-500 ml-0.5">*</Text>
              </View>
              <TextInput
                className="h-12 bg-gray-100 rounded-xl border border-gray-200 px-4 text-sm text-gray-900"
                placeholder="예: 딸기, 블루베리"
                placeholderTextColor="#9CA3AF"
                value={formData.cropName}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, cropName: text }))
                }
              />
            </View>

            {/* Location */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-900 mb-1">
                농지 위치
              </Text>
              <TextInput
                className="h-12 bg-gray-100 rounded-xl border border-gray-200 px-4 text-sm text-gray-900"
                placeholder="예: 충청남도 논산시"
                placeholderTextColor="#9CA3AF"
                value={formData.location}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, location: text }))
                }
              />
            </View>

            {/* Additional Info */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-900 mb-1">
                추가 정보
              </Text>
              <TextInput
                className="h-20 bg-gray-100 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900"
                placeholder="특이사항이 있다면 작성해주세요"
                placeholderTextColor="#9CA3AF"
                value={formData.additionalInfo}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, additionalInfo: text }))
                }
                multiline
                textAlignVertical="top"
              />
            </View>

            <Button onPress={handleAiRequest} loading={aiMutation.isPending}>
              AI 진단 시작
            </Button>
          </Card>
        )}

        {/* Step: Result */}
        {step === "result" && result && (
          <>
            <Card className="mb-4">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-4">
                  <Text className="text-xl font-bold text-gray-900 mb-2 leading-7">
                    {DISEASE_LABELS[result.diseaseType]}
                  </Text>
                  <SeverityBadge severity={result.severity} />
                </View>
                <ConfidenceCircle confidence={result.confidence} />
              </View>
              <View className="h-px bg-gray-200 my-4" />
              <Text className="text-base text-gray-600 leading-6">
                {result.description}
              </Text>
            </Card>

            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                주요 증상
              </Text>
              {result.symptoms.map((symptom, index) => (
                <View key={index} className="flex-row items-start mb-3">
                  <View className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-3" />
                  <Text className="flex-1 text-base text-gray-900 leading-6">
                    {symptom}
                  </Text>
                </View>
              ))}
            </Card>

            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                원인
              </Text>
              <View className="flex-row items-start bg-yellow-50 p-4 rounded-xl">
                <Feather name="alert-circle" size={20} color="#F59E0B" />
                <Text className="flex-1 text-base text-gray-900 leading-6 ml-3">
                  {result.cause}
                </Text>
              </View>
            </Card>

            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                대처 방안
              </Text>
              {result.solutions.map((solution, index) => (
                <View key={index} className="flex-row items-start mb-3">
                  <View className="w-5 h-5 rounded-full bg-green-100 items-center justify-center mr-3">
                    <Feather name="check" size={12} color="#10B981" />
                  </View>
                  <Text className="flex-1 text-base text-gray-900 leading-6">
                    {solution}
                  </Text>
                </View>
              ))}
            </Card>

            <Card>
              <Pressable
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-row items-center justify-center h-13 bg-blue-50 rounded-xl"
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Feather name="bookmark" size={20} color="#3B82F6" />
                    <Text className="text-base font-semibold text-blue-600 ml-2">
                      진단 결과 저장하기
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={handleNewDiagnosis}
                className="items-center mt-4"
              >
                <Text className="text-sm text-gray-500">새로운 진단하기</Text>
              </Pressable>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

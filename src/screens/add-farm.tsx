import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCreateFarm } from "@/features/farm";
import { useKeyboard } from "@/hooks/useKeyboard";
import type { UserCropCreateRequest, CultivationType } from "@/types/farm";
import { CULTIVATION_TYPES } from "@/constants/farm";

export default function AddFarm() {
  const router = useRouter();
  const createFarmMutation = useCreateFarm();

  const [cropName, setCropName] = useState("");
  const [variety, setVariety] = useState("");
  const [cultivationType, setCultivationType] = useState<CultivationType | "">(
    "",
  );
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [plantingYear, setPlantingYear] = useState("");
  const [plantingMonth, setPlantingMonth] = useState("");
  const [plantingDay, setPlantingDay] = useState("");

  const isValidDate = () => {
    const year = parseInt(plantingYear, 10);
    const month = parseInt(plantingMonth, 10);
    const day = parseInt(plantingDay, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
    if (year < 2000 || year > 2030) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    return true;
  };

  const canSubmit = () => {
    return cultivationType !== "" && area.trim() !== "" && isValidDate();
  };

  const handleSubmit = () => {
    if (!canSubmit()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const requestData: UserCropCreateRequest = {
      cultivationType: cultivationType as CultivationType,
      cultivationArea: parseInt(area, 10),
      plantingDate: `${plantingYear}-${plantingMonth.padStart(2, "0")}-${plantingDay.padStart(2, "0")}`,
    };

    // Optional fields
    if (cropName.trim()) requestData.name = cropName.trim();
    if (variety.trim()) requestData.variety = variety.trim();
    if (address.trim()) requestData.cultivationAddress = address.trim();

    createFarmMutation.mutate(requestData, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("성공", "농지가 등록되었습니다.", [
          { text: "확인", onPress: () => router.back() },
        ]);
      },
      onError: (error: any) => {
        console.error("Farm registration error:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "오류",
          error.response?.data?.message ||
            error.message ||
            "농지 등록에 실패했습니다.",
        );
      },
    });
  };

  const isLoading = createFarmMutation.isPending;

  const insets = useSafeAreaInsets();
  const { isVisible: isKeyboardVisible, keyboardHeight } = useKeyboard();

  return (
    <View className="flex-1 bg-gray-100" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable
          onPress={() => router.back()}
          className="w-11 h-11 items-center justify-center"
        >
          <Feather name="x" size={24} color="#333" />
        </Pressable>
        <Text className="text-base font-semibold text-gray-900">농지 추가</Text>
        <View className="w-11 h-11" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 재배 방식 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <Text className="text-base font-bold text-gray-900">재배 방식</Text>
          <Text className="text-sm text-gray-600 mt-1 mb-4">
            시설 유형을 선택해주세요
          </Text>

          <View className="flex-row gap-3">
            {CULTIVATION_TYPES.map((type) => {
              const isSelected = cultivationType === type.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCultivationType(type.id);
                  }}
                  className={`flex-1 items-center p-4 rounded-2xl border-2 ${
                    isSelected
                      ? "bg-yellow-50 border-yellow-500"
                      : "bg-gray-50 border-transparent"
                  }`}
                >
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${
                      isSelected ? "bg-yellow-500" : "bg-gray-200"
                    }`}
                  >
                    <Feather
                      name={type.icon}
                      size={24}
                      color={isSelected ? "#FFF" : "#888"}
                    />
                  </View>
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? "text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {type.label}
                  </Text>
                  {isSelected && (
                    <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border-2 border-yellow-500 items-center justify-center">
                      <Feather name="check" size={14} color="#F59E0B" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 작물 정보 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <Text className="text-base font-bold text-gray-900 mb-4">
            작물 정보
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-600 mb-2">
              작물명
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3.5 text-base text-gray-900"
              value={cropName}
              onChangeText={setCropName}
              placeholder="예: 딸기, 토마토"
              placeholderTextColor="#C7C7CC"
            />
          </View>

          <View>
            <Text className="text-sm font-semibold text-gray-600 mb-2">
              품종 (선택)
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3.5 text-base text-gray-900"
              value={variety}
              onChangeText={setVariety}
              placeholder="예: 설향, 금실"
              placeholderTextColor="#C7C7CC"
            />
          </View>
        </View>

        {/* 농지 정보 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <Text className="text-base font-bold text-gray-900 mb-4">
            농지 정보
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-600 mb-2">
              재배 지역
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3.5 text-base text-gray-900"
              value={address}
              onChangeText={setAddress}
              placeholder="예: 충청남도 논산시 연무읍"
              placeholderTextColor="#C7C7CC"
            />
          </View>

          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-600">
                재배 면적
              </Text>
              <View className="bg-blue-100 px-2 py-0.5 rounded">
                <Text className="text-xs font-semibold text-blue-600">
                  필수
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TextInput
                className="flex-1 bg-gray-50 rounded-xl px-4 py-3.5 text-base text-gray-900"
                value={area}
                onChangeText={setArea}
                placeholder="0"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
              />
              <View className="bg-gray-200 px-4 py-3.5 rounded-xl">
                <Text className="text-base font-semibold text-gray-600">
                  평
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 정식일 */}
        <View className="bg-white rounded-2xl p-5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-base font-bold text-gray-900">정식일</Text>
            <View className="bg-blue-100 px-2 py-0.5 rounded">
              <Text className="text-xs font-semibold text-blue-600">필수</Text>
            </View>
          </View>
          <Text className="text-sm text-gray-600 mb-4">
            작물을 심은 날짜를 입력해주세요
          </Text>

          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center gap-1">
              <TextInput
                className="flex-1 bg-gray-50 rounded-xl px-3 py-3.5 text-base text-gray-900 text-center"
                value={plantingYear}
                onChangeText={setPlantingYear}
                placeholder="2024"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                maxLength={4}
              />
              <Text className="text-sm font-medium text-gray-600">년</Text>
            </View>
            <View className="flex-1 flex-row items-center gap-1">
              <TextInput
                className="flex-1 bg-gray-50 rounded-xl px-3 py-3.5 text-base text-gray-900 text-center"
                value={plantingMonth}
                onChangeText={setPlantingMonth}
                placeholder="01"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                maxLength={2}
              />
              <Text className="text-sm font-medium text-gray-600">월</Text>
            </View>
            <View className="flex-1 flex-row items-center gap-1">
              <TextInput
                className="flex-1 bg-gray-50 rounded-xl px-3 py-3.5 text-base text-gray-900 text-center"
                value={plantingDay}
                onChangeText={setPlantingDay}
                placeholder="01"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                maxLength={2}
              />
              <Text className="text-sm font-medium text-gray-600">일</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View
        className="absolute left-0 right-0 px-5 pt-3 bg-white border-t border-gray-100"
        style={{
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          paddingBottom: isKeyboardVisible ? 12 : insets.bottom + 16,
        }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit() || isLoading}
          className={`items-center justify-center py-4 rounded-2xl ${
            canSubmit() && !isLoading ? "bg-yellow-500" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-bold ${
              canSubmit() && !isLoading ? "text-white" : "text-gray-500"
            }`}
          >
            {isLoading ? "등록 중..." : "농지 등록"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

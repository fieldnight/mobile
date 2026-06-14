import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCreateFarm } from "@/features/farm";
import { useKeyboard } from "@/hooks/useKeyboard";
import type { UserCropCreateRequest, CultivationType } from "@/types/farm";
import { CULTIVATION_TYPES } from "@/constants/farm";

type PickerTarget = "harvestStart" | "harvestEnd";

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}년 ${m}월 ${d}일`;
};

const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

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

  const [harvestStartDate, setHarvestStartDate] = useState<Date | null>(null);
  const [harvestEndDate, setHarvestEndDate] = useState<Date | null>(null);

  // iOS 모달용 임시 날짜 (확인 누르기 전까지 반영 안 함)
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] =
    useState<PickerTarget>("harvestStart");

  // Android는 DateTimePicker가 직접 다이얼로그로 뜸
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);

  const openPicker = (target: PickerTarget) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current =
      target === "harvestStart"
        ? (harvestStartDate ?? new Date())
        : (harvestEndDate ?? new Date());
    setPickerTarget(target);
    setTempDate(current);
    if (Platform.OS === "ios") {
      setPickerVisible(true);
    } else {
      setAndroidPickerVisible(true);
    }
  };

  const confirmPicker = () => {
    if (pickerTarget === "harvestStart") {
      setHarvestStartDate(tempDate);
    } else {
      setHarvestEndDate(tempDate);
    }
    setPickerVisible(false);
  };

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setAndroidPickerVisible(false);
    if (event.type === "set" && selected) {
      if (pickerTarget === "harvestStart") {
        setHarvestStartDate(selected);
      } else {
        setHarvestEndDate(selected);
      }
    }
  };

  const isValidPlantingDate = () => {
    const year = parseInt(plantingYear, 10);
    const month = parseInt(plantingMonth, 10);
    const day = parseInt(plantingDay, 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
    if (year < 2000 || year > 2040) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  };

  const canSubmit = () =>
    cultivationType !== "" && area.trim() !== "" && isValidPlantingDate();

  const handleSubmit = () => {
    if (!canSubmit()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const requestData: UserCropCreateRequest = {
      cultivationType: cultivationType as CultivationType,
      cultivationArea: parseInt(area, 10),
      plantingDate: `${plantingYear}-${plantingMonth.padStart(2, "0")}-${plantingDay.padStart(2, "0")}`,
      harvestStartDate: "",
      harvestEndDate: ""
    };

    if (cropName.trim()) requestData.name = cropName.trim();
    if (variety.trim()) requestData.variety = variety.trim();
    if (address.trim()) requestData.cultivationAddress = address.trim();
    if (harvestStartDate)
      requestData.harvestStartDate = toISODate(harvestStartDate);
    if (harvestEndDate) requestData.harvestEndDate = toISODate(harvestEndDate);

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
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            재배 방식
          </Text>
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
          <Text
            className="text-base font-bold text-gray-900 mb-4"
            numberOfLines={1}
          >
            작물 정보
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-600 mb-2">
              작물명
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 text-base text-gray-900"
              style={{ height: 50, paddingVertical: 14 }}
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
              className="bg-gray-50 rounded-xl px-4 text-base text-gray-900"
              style={{ height: 50, paddingVertical: 14 }}
              value={variety}
              onChangeText={setVariety}
              placeholder="예: 설향, 금실"
              placeholderTextColor="#C7C7CC"
            />
          </View>
        </View>

        {/* 농지 정보 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <Text
            className="text-base font-bold text-gray-900 mb-4"
            numberOfLines={1}
          >
            농지 정보
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-600 mb-2">
              재배 지역
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 text-base text-gray-900"
              style={{ height: 50, paddingVertical: 14 }}
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
                className="flex-1 bg-gray-50 rounded-xl px-4 text-base text-gray-900"
                style={{ height: 50, paddingVertical: 14 }}
                value={area}
                onChangeText={setArea}
                placeholder="0"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
              />
              <View
                className="bg-gray-200 px-4 rounded-xl"
                style={{ height: 50, justifyContent: "center" }}
              >
                <Text className="text-base font-semibold text-gray-600">
                  평
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 정식일 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-base font-bold text-gray-900"
              numberOfLines={1}
            >
              정식일
            </Text>
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
                className="flex-1 bg-gray-50 rounded-xl px-3 text-base text-gray-900 text-center"
                style={{ height: 50, paddingVertical: 14 }}
                value={plantingYear}
                onChangeText={setPlantingYear}
                placeholder="2026"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                maxLength={4}
              />
              <Text className="text-sm font-medium text-gray-600">년</Text>
            </View>
            <View className="flex-1 flex-row items-center gap-1">
              <TextInput
                className="flex-1 bg-gray-50 rounded-xl px-3 text-base text-gray-900 text-center"
                style={{ height: 50, paddingVertical: 14 }}
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
                className="flex-1 bg-gray-50 rounded-xl px-3 text-base text-gray-900 text-center"
                style={{ height: 50, paddingVertical: 14 }}
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

        {/* 수확 기간 */}
        <View className="bg-white rounded-2xl p-5">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-base font-bold text-gray-900"
              numberOfLines={1}
            >
              수확 기간
            </Text>
            <View className="bg-gray-100 px-2 py-0.5 rounded">
              <Text className="text-xs font-semibold text-gray-500">선택</Text>
            </View>
          </View>
          <Text className="text-sm text-gray-600 mb-4">
            수확 시작일과 마감일을 선택해주세요 (나중에 추가 가능)
          </Text>

          <Text className="text-sm font-semibold text-gray-600 mb-2">
            수확 시작일
          </Text>
          <View className="flex-row items-center gap-2 mb-4">
            <Pressable
              onPress={() => openPicker("harvestStart")}
              className="flex-1 flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5 active:bg-gray-100"
            >
              <Text
                className={`text-base ${harvestStartDate ? "text-gray-900" : "text-gray-400"}`}
              >
                {harvestStartDate
                  ? formatDate(harvestStartDate)
                  : "날짜를 선택하세요"}
              </Text>
              <Feather name="calendar" size={18} color="#9CA3AF" />
            </Pressable>
            {harvestStartDate && (
              <Pressable
                onPress={() => setHarvestStartDate(null)}
                className="w-10 h-10 items-center justify-center bg-gray-50 rounded-xl active:bg-gray-100"
              >
                <Feather name="x" size={20} color="#EF4444" />
              </Pressable>
            )}
          </View>

          <Text className="text-sm font-semibold text-gray-600 mb-2">
            수확 마감일
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => openPicker("harvestEnd")}
              className="flex-1 flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5 active:bg-gray-100"
            >
              <Text
                className={`text-base ${harvestEndDate ? "text-gray-900" : "text-gray-400"}`}
              >
                {harvestEndDate
                  ? formatDate(harvestEndDate)
                  : "날짜를 선택하세요"}
              </Text>
              <Feather name="calendar" size={18} color="#9CA3AF" />
            </Pressable>
            {harvestEndDate && (
              <Pressable
                onPress={() => setHarvestEndDate(null)}
                className="w-10 h-10 items-center justify-center bg-gray-50 rounded-xl active:bg-gray-100"
              >
                <Feather name="x" size={20} color="#EF4444" />
              </Pressable>
            )}
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
          className={`w-full items-center justify-center py-4 rounded-2xl ${
            canSubmit() && !isLoading ? "bg-yellow-500" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-bold ${
              canSubmit() && !isLoading ? "text-white" : "text-gray-500"
            }`}
            numberOfLines={1}
          >
            {isLoading ? "등록 중..." : "농지 등록"}
          </Text>
        </Pressable>
      </View>

      {/* iOS 날짜 선택 모달 */}
      {Platform.OS === "ios" && (
        <Modal
          visible={pickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerVisible(false)}
        >
          <Pressable
            className="flex-1 bg-black/40"
            onPress={() => setPickerVisible(false)}
          />
          <View className="bg-white" style={{ paddingBottom: insets.bottom }}>
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <Pressable onPress={() => setPickerVisible(false)}>
                <Text className="text-base text-gray-500">취소</Text>
              </Pressable>
              <Text className="text-base font-semibold text-gray-900">
                {pickerTarget === "harvestStart"
                  ? "수확 시작일"
                  : "수확 마감일"}
              </Text>
              <Pressable onPress={confirmPicker}>
                <Text className="text-base font-semibold text-yellow-500">
                  확인
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              locale="ko-KR"
              onChange={(_: DateTimePickerEvent, selected?: Date) => {
                if (selected) setTempDate(selected);
              }}
              style={{ height: 200 }}
            />
          </View>
        </Modal>
      )}

      {/* Android 날짜 선택기 */}
      {Platform.OS === "android" && androidPickerVisible && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={onAndroidChange}
        />
      )}
    </View>
  );
}

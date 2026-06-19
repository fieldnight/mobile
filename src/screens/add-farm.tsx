import { useState } from "react";
import {
  View,
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
import { CULTIVATION_TYPES, FC } from "@/constants/farm";
import { PretendardFont } from "@/components/PretendardFont";

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

/** 섹션 카드 래퍼 */
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl p-5 mb-4"
      style={{ backgroundColor: FC.white }}
    >
      {children}
    </View>
  );
}

/** 섹션 타이틀 + 선택/필수 뱃지 */
function SectionTitle({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: "required" | "optional";
}) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-0.5">
        <PretendardFont weight="bold" className="text-[17px]" style={{ color: FC.text }}>
          {title}
        </PretendardFont>
        {badge === "required" && (
          <View className="px-2 py-0.5 rounded" style={{ backgroundColor: FC.requiredBg }}>
            <PretendardFont weight="semibold" className="text-[12px]" style={{ color: FC.requiredText }}>
              필수
            </PretendardFont>
          </View>
        )}
        {badge === "optional" && (
          <View className="px-2 py-0.5 rounded" style={{ backgroundColor: FC.optionalBg }}>
            <PretendardFont weight="semibold" className="text-[12px]" style={{ color: FC.optionalText }}>
              선택
            </PretendardFont>
          </View>
        )}
      </View>
      {subtitle && (
        <PretendardFont weight="medium" className="text-[14px]" style={{ color: FC.textSub }}>
          {subtitle}
        </PretendardFont>
      )}
    </View>
  );
}

/** 라벨 + TextInput 묶음 */
function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  maxLength,
  textAlign,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
  maxLength?: number;
  textAlign?: "center";
}) {
  return (
    <View>
      <PretendardFont weight="semibold" className="text-[14px] mb-2" style={{ color: FC.textSub }}>
        {label}
      </PretendardFont>
      <TextInput
        className="rounded-xl px-4"
        style={{
          height: 52,
          backgroundColor: FC.bg,
          color: FC.text,
          fontSize: 16,
          fontFamily: "Pretendard-Medium",
          textAlign: textAlign ?? "left",
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={FC.placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
}

export default function AddFarm() {
  const router = useRouter();
  const createFarmMutation = useCreateFarm();

  const [cropName, setCropName] = useState("");
  const [variety, setVariety] = useState("");
  const [cultivationType, setCultivationType] = useState<CultivationType | "">("");
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
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>("harvestStart");
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const { isVisible: isKeyboardVisible, keyboardHeight } = useKeyboard();

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
    if (pickerTarget === "harvestStart") setHarvestStartDate(tempDate);
    else setHarvestEndDate(tempDate);
    setPickerVisible(false);
  };

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setAndroidPickerVisible(false);
    if (event.type === "set" && selected) {
      if (pickerTarget === "harvestStart") setHarvestStartDate(selected);
      else setHarvestEndDate(selected);
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
      harvestEndDate: "",
    };

    if (cropName.trim()) requestData.name = cropName.trim();
    if (variety.trim()) requestData.variety = variety.trim();
    if (address.trim()) requestData.cultivationAddress = address.trim();
    if (harvestStartDate) requestData.harvestStartDate = toISODate(harvestStartDate);
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
          error.response?.data?.message || error.message || "농지 등록에 실패했습니다.",
        );
      },
    });
  };

  const isLoading = createFarmMutation.isPending;

  return (
    <View className="flex-1" style={{ backgroundColor: FC.bg, paddingTop: insets.top }}>
      {/* 헤더 */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{ backgroundColor: FC.white, borderBottomColor: FC.border }}
      >
        <Pressable onPress={() => router.back()} className="w-11 h-11 items-center justify-center">
          <Feather name="x" size={24} color={FC.text} />
        </Pressable>
        <PretendardFont weight="bold" className="text-[17px]" style={{ color: FC.text }}>
          농지 추가
        </PretendardFont>
        <View className="w-11 h-11" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 재배 방식 */}
        <SectionCard>
          <SectionTitle title="재배 방식" subtitle="시설 유형을 선택해주세요" />
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
                  className="flex-1 items-center p-4 rounded-2xl border-2"
                  style={{
                    backgroundColor: isSelected ? FC.accentBg : FC.bg,
                    borderColor: isSelected ? FC.accentBorder : "transparent",
                  }}
                >
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: isSelected ? FC.accent : FC.border }}
                  >
                    <Feather
                      name={type.icon}
                      size={24}
                      color={isSelected ? FC.accentIcon : FC.unselIcon}
                    />
                  </View>
                  <PretendardFont
                    weight="semibold"
                    className="text-[15px]"
                    style={{ color: isSelected ? FC.text : FC.textSub }}
                  >
                    {type.label}
                  </PretendardFont>
                  {/* 선택 체크 뱃지 */}
                  {isSelected && (
                    <View
                      className="absolute top-2 right-2 w-6 h-6 rounded-full items-center justify-center border-2"
                      style={{ backgroundColor: FC.white, borderColor: FC.accent }}
                    >
                      <Feather name="check" size={14} color={FC.accent} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* 작물 정보 */}
        <SectionCard>
          <SectionTitle title="작물 정보" />
          <View className="gap-4">
            <LabeledInput
              label="작물명"
              value={cropName}
              onChangeText={setCropName}
              placeholder="예: 딸기, 토마토"
            />
            <LabeledInput
              label="품종 (선택)"
              value={variety}
              onChangeText={setVariety}
              placeholder="예: 설향, 금실"
            />
          </View>
        </SectionCard>

        {/* 농지 정보 */}
        <SectionCard>
          <SectionTitle title="농지 정보" />
          <View className="gap-4">
            <LabeledInput
              label="재배 지역"
              value={address}
              onChangeText={setAddress}
              placeholder="예: 충청남도 논산시 연무읍"
            />
            {/* 재배 면적 — 필수 뱃지 인라인 */}
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <PretendardFont weight="semibold" className="text-[14px]" style={{ color: FC.textSub }}>
                  재배 면적
                </PretendardFont>
                <View className="px-2 py-0.5 rounded" style={{ backgroundColor: FC.requiredBg }}>
                  <PretendardFont weight="semibold" className="text-[12px]" style={{ color: FC.requiredText }}>
                    필수
                  </PretendardFont>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 rounded-xl px-4"
                  style={{
                    height: 52,
                    backgroundColor: FC.bg,
                    color: FC.text,
                    fontSize: 16,
                    fontFamily: "Pretendard-Medium",
                  }}
                  value={area}
                  onChangeText={setArea}
                  placeholder="0"
                  placeholderTextColor={FC.placeholder}
                  keyboardType="numeric"
                />
                <View
                  className="rounded-xl px-4 items-center justify-center"
                  style={{ height: 52, backgroundColor: FC.border }}
                >
                  <PretendardFont weight="semibold" className="text-[16px]" style={{ color: FC.textSub }}>
                    평
                  </PretendardFont>
                </View>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* 정식일 */}
        <SectionCard>
          <SectionTitle
            title="정식일"
            subtitle="작물을 심은 날짜를 입력해주세요"
            badge="optional"
          />
          <View className="flex-row items-center gap-2">
            {/* 년 */}
            <View className="flex-1 flex-row items-center gap-1">
              <TextInput
                className="flex-1 rounded-xl px-3"
                style={{
                  height: 52,
                  backgroundColor: FC.bg,
                  color: FC.text,
                  fontSize: 16,
                  fontFamily: "Pretendard-Medium",
                  textAlign: "center",
                }}
                value={plantingYear}
                onChangeText={setPlantingYear}
                placeholder="2026"
                placeholderTextColor={FC.placeholder}
                keyboardType="numeric"
                maxLength={4}
              />
              <PretendardFont weight="medium" className="text-[14px]" style={{ color: FC.textSub }}>
                년
              </PretendardFont>
            </View>
            {/* 월 */}
            <View className="flex-1 flex-row items-center gap-1">
              <TextInput
                className="flex-1 rounded-xl px-3"
                style={{
                  height: 52,
                  backgroundColor: FC.bg,
                  color: FC.text,
                  fontSize: 16,
                  fontFamily: "Pretendard-Medium",
                  textAlign: "center",
                }}
                value={plantingMonth}
                onChangeText={setPlantingMonth}
                placeholder="01"
                placeholderTextColor={FC.placeholder}
                keyboardType="numeric"
                maxLength={2}
              />
              <PretendardFont weight="medium" className="text-[14px]" style={{ color: FC.textSub }}>
                월
              </PretendardFont>
            </View>
            {/* 일 */}
            <View className="flex-1 flex-row items-center gap-1">
              <TextInput
                className="flex-1 rounded-xl px-3"
                style={{
                  height: 52,
                  backgroundColor: FC.bg,
                  color: FC.text,
                  fontSize: 16,
                  fontFamily: "Pretendard-Medium",
                  textAlign: "center",
                }}
                value={plantingDay}
                onChangeText={setPlantingDay}
                placeholder="01"
                placeholderTextColor={FC.placeholder}
                keyboardType="numeric"
                maxLength={2}
              />
              <PretendardFont weight="medium" className="text-[14px]" style={{ color: FC.textSub }}>
                일
              </PretendardFont>
            </View>
          </View>
        </SectionCard>

        {/* 수확 기간 */}
        <SectionCard>
          <SectionTitle
            title="수확 기간"
            subtitle="수확 시작일과 마감일을 선택해주세요 (나중에 추가 가능)"
            badge="optional"
          />

          {/* 수확 시작일 */}
          <PretendardFont weight="semibold" className="text-[14px] mb-2" style={{ color: FC.textSub }}>
            수확 시작일
          </PretendardFont>
          <View className="flex-row items-center gap-2 mb-4">
            <Pressable
              onPress={() => openPicker("harvestStart")}
              className="flex-1 flex-row items-center justify-between rounded-xl px-4"
              style={{ height: 52, backgroundColor: FC.bg }}
            >
              <PretendardFont
                weight="medium"
                className="text-[16px]"
                style={{ color: harvestStartDate ? FC.text : FC.placeholder }}
              >
                {harvestStartDate ? formatDate(harvestStartDate) : "날짜를 선택하세요"}
              </PretendardFont>
              <Feather name="calendar" size={18} color={FC.calIcon} />
            </Pressable>
            {harvestStartDate && (
              <Pressable
                onPress={() => setHarvestStartDate(null)}
                className="w-[52px] h-[52px] items-center justify-center rounded-xl"
                style={{ backgroundColor: FC.bg }}
              >
                <Feather name="x" size={20} color={FC.error} />
              </Pressable>
            )}
          </View>

          {/* 수확 마감일 */}
          <PretendardFont weight="semibold" className="text-[14px] mb-2" style={{ color: FC.textSub }}>
            수확 마감일
          </PretendardFont>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => openPicker("harvestEnd")}
              className="flex-1 flex-row items-center justify-between rounded-xl px-4"
              style={{ height: 52, backgroundColor: FC.bg }}
            >
              <PretendardFont
                weight="medium"
                className="text-[16px]"
                style={{ color: harvestEndDate ? FC.text : FC.placeholder }}
              >
                {harvestEndDate ? formatDate(harvestEndDate) : "날짜를 선택하세요"}
              </PretendardFont>
              <Feather name="calendar" size={18} color={FC.calIcon} />
            </Pressable>
            {harvestEndDate && (
              <Pressable
                onPress={() => setHarvestEndDate(null)}
                className="w-[52px] h-[52px] items-center justify-center rounded-xl"
                style={{ backgroundColor: FC.bg }}
              >
                <Feather name="x" size={20} color={FC.error} />
              </Pressable>
            )}
          </View>
        </SectionCard>
      </ScrollView>

      {/* 하단 등록 버튼 */}
      <View
        className="absolute left-0 right-0 px-5 pt-3 border-t"
        style={{
          backgroundColor: FC.white,
          borderTopColor: FC.border,
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          paddingBottom: isKeyboardVisible ? 12 : insets.bottom + 16,
        }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit() || isLoading}
          className="w-full items-center justify-center py-4 rounded-2xl"
          style={{ backgroundColor: canSubmit() && !isLoading ? FC.accent : FC.border }}
        >
          <PretendardFont
            weight="bold"
            className="text-[17px]"
            style={{ color: canSubmit() && !isLoading ? FC.white : FC.textSub }}
          >
            {isLoading ? "등록 중..." : "농지 등록"}
          </PretendardFont>
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
          <Pressable className="flex-1 bg-black/40" onPress={() => setPickerVisible(false)} />
          <View style={{ backgroundColor: FC.white, paddingBottom: insets.bottom }}>
            <View
              className="flex-row items-center justify-between px-4 py-3 border-b"
              style={{ borderBottomColor: FC.border }}
            >
              <Pressable onPress={() => setPickerVisible(false)}>
                <PretendardFont weight="medium" className="text-[16px]" style={{ color: FC.textSub }}>
                  취소
                </PretendardFont>
              </Pressable>
              <PretendardFont weight="bold" className="text-[16px]" style={{ color: FC.text }}>
                {pickerTarget === "harvestStart" ? "수확 시작일" : "수확 마감일"}
              </PretendardFont>
              <Pressable onPress={confirmPicker}>
                <PretendardFont weight="bold" className="text-[16px]" style={{ color: FC.accent }}>
                  확인
                </PretendardFont>
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

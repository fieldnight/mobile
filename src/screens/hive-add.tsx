import { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useHiveStore } from "@/stores/useHiveStore";
import { PretendardFont } from "@/components/PretendardFont";
import AppHeader from "@/components/AppHeader";
import { BeeBoxCard } from "@/components/BeeboxCard";
import { FieldLabel } from "@/components/BottomSheet";
import { C } from "@/constants/hive-colors";
import { useAppToast } from "@/components/ToastContext";

export default function HiveAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addHive = useHiveStore((state) => state.addHive);
  const { show: showToast } = useAppToast();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [memo, setMemo] = useState("");
  const [replacedAt, setReplacedAt] = useState<Date | null>(null);
  const [draftReplacedAt, setDraftReplacedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const canSubmit = name.trim() !== "" && location.trim() !== "";

  const handleSubmit = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addHive(name.trim(), location.trim(), memo.trim(), replacedAt ? formatDate(replacedAt) : undefined);
    showToast(`${name.trim()} 벌통을 추가했어요.`, "success");
    router.back();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: C.bg }}>
      <AppHeader title="벌통 추가" onBack={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 56 + 20,
          paddingHorizontal: 20,
          paddingBottom: 120,
          gap: 18,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="rounded-3xl p-5"
          style={{
            backgroundColor: C.primarySoft,
            borderWidth: 1,
            borderColor: "rgba(237, 119, 57, 0.12)",
          }}
        >
          <PretendardFont
            weight="bold"
            style={{ fontSize: 18, color: C.primary, lineHeight: 26 }}
          >
            새 벌통을 추가해보세요
          </PretendardFont>
          <PretendardFont
            style={{ marginTop: 8, fontSize: 14, color: C.sec, lineHeight: 20 }}
          >
            위치와 이름을 입력하면 내 벌통 목록에 바로 등록됩니다.
          </PretendardFont>
        </View>

        <BeeBoxCard>
          <FieldLabel label="벌통 이름" />
          <TextInput
            className="rounded-2xl px-4 py-3 text-base"
            style={{
              backgroundColor: C.bgAlt,
              color: C.text,
              fontFamily: "Pretendard-Regular",
            }}
            placeholder="예: 벌통 4호"
            placeholderTextColor={C.ter}
            value={name}
            onChangeText={setName}
          />
        </BeeBoxCard>

        <BeeBoxCard>
          <FieldLabel label="위치" />
          <TextInput
            className="rounded-2xl px-4 py-3 text-base"
            style={{
              backgroundColor: C.bgAlt,
              color: C.text,
              fontFamily: "Pretendard-Regular",
            }}
            placeholder="예: 남쪽 창고 옆"
            placeholderTextColor={C.ter}
            value={location}
            onChangeText={setLocation}
          />
        </BeeBoxCard>

        <BeeBoxCard>
          <FieldLabel label="메모" />
          <TextInput
            className="min-h-[120px] rounded-2xl px-4 py-3 text-base"
            style={{
              backgroundColor: C.bgAlt,
              color: C.text,
              fontFamily: "Pretendard-Regular",
            }}
            placeholder="벌통 상태, 특징, 점검 메모 등을 적어주세요"
            placeholderTextColor={C.ter}
            value={memo}
            onChangeText={setMemo}
            multiline
          />
        </BeeBoxCard>

        <BeeBoxCard style={{ backgroundColor: C.bgAlt }}>
          <FieldLabel label="등록일" />
          <PretendardFont style={{ fontSize: 14, color: C.sec }}>
            현재 날짜로 자동 등록됩니다.
          </PretendardFont>
        </BeeBoxCard>

        <BeeBoxCard>
          <View className="flex-row items-center mb-2" style={{ marginTop: 0 }}>
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
              교체일
            </PretendardFont>
            <PretendardFont style={{ fontSize: 12, color: C.ter }}>{"  "}(선택사항)</PretendardFont>
          </View>
          <Pressable
            onPress={() => {
              setDraftReplacedAt(replacedAt ?? new Date());
              setShowDatePicker(true);
            }}
            className="flex-row items-center justify-between rounded-2xl px-4 py-3 active:opacity-70"
            style={{ backgroundColor: C.bgAlt }}
          >
            <PretendardFont style={{ fontSize: 14, color: replacedAt ? C.text : C.ter }}>
              {replacedAt ? formatDate(replacedAt) : "날짜를 선택하세요"}
            </PretendardFont>
            <Feather name="calendar" size={16} color={C.ter} />
          </Pressable>

          {Platform.OS === "ios" && showDatePicker && (
            <Modal transparent animationType="slide">
              <View
                className="flex-1 justify-end"
                style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
              >
                <View style={{ backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
                  <View className="flex-row justify-between items-center mb-2">
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <PretendardFont style={{ fontSize: 16, color: C.ter }}>취소</PretendardFont>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setReplacedAt(draftReplacedAt);
                        setShowDatePicker(false);
                      }}
                    >
                      <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.primary }}>확인</PretendardFont>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={draftReplacedAt}
                    mode="date"
                    display="inline"
                    maximumDate={new Date()}
                    onChange={(_, date) => {
                      if (date) setDraftReplacedAt(date);
                    }}
                    locale="ko-KR"
                  />
                </View>
              </View>
            </Modal>
          )}

          {Platform.OS === "android" && showDatePicker && (
            <DateTimePicker
              value={replacedAt ?? new Date()}
              mode="date"
              display="calendar"
              maximumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (event.type === "set" && date) setReplacedAt(date);
              }}
            />
          )}
        </BeeBoxCard>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-white px-4 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="items-center justify-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: canSubmit ? C.primary : C.border }}
        >
          <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.white }}>
            등록하기
          </PretendardFont>
        </Pressable>
      </View>
    </View>
  );
}

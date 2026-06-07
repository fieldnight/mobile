import { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useHiveStore } from "@/stores/useHiveStore";
import { PretendardFont } from "@/components/PretendardFont";
import AppHeader from "@/components/AppHeader";
import { BeeBoxCard } from "@/components/BeeboxCard";
import { C } from "@/constants/hive-colors";

export default function HiveAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addHive = useHiveStore((state) => state.addHive);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [memo, setMemo] = useState("");

  const canSubmit = name.trim() !== "" && location.trim() !== "";

  const handleSubmit = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addHive(name.trim(), location.trim(), memo.trim());
    Alert.alert("등록 완료", "새 벌통이 추가되었습니다.", [
      { text: "확인", onPress: () => router.back() },
    ]);
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

        <BeeBoxCard delay={100}>
          <View className="flex-row items-center gap-3">
            <PretendardFont
              weight="semibold"
              style={{ width: 80, fontSize: 14, color: C.text }}
            >
              벌통 이름
            </PretendardFont>
            <TextInput
              className="flex-1 rounded-2xl border px-4 py-3 text-base"
              style={{
                backgroundColor: C.bgAlt,
                borderColor: C.border,
                borderWidth: 1,
                color: C.text,
                fontFamily: "Pretendard-Regular",
              }}
              placeholder="예: 벌통 4호"
              placeholderTextColor={C.ter}
              value={name}
              onChangeText={setName}
            />
          </View>
        </BeeBoxCard>

        <BeeBoxCard delay={150}>
          <View className="flex-row items-center gap-3">
            <PretendardFont
              weight="semibold"
              style={{ width: 80, fontSize: 14, color: C.text }}
            >
              위치
            </PretendardFont>
            <TextInput
              className="flex-1 rounded-2xl border px-4 py-3 text-base"
              style={{
                backgroundColor: C.bgAlt,
                borderColor: C.border,
                borderWidth: 1,
                color: C.text,
                fontFamily: "Pretendard-Regular",
              }}
              placeholder="예: 남쪽 창고 옆"
              placeholderTextColor={C.ter}
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </BeeBoxCard>

        <BeeBoxCard delay={200}>
          <Text
            className="text-sm font-semibold mb-2"
            style={{ color: C.text }}
          >
            메모
          </Text>
          <TextInput
            className="min-h-[120px] rounded-2xl border px-4 py-3 text-base"
            style={{
              backgroundColor: C.bgAlt,
              borderColor: C.border,
              borderWidth: 1,
              color: C.text,
            }}
            placeholder="벌통 상태, 특징, 점검 메모 등을 적어주세요"
            placeholderTextColor={C.ter}
            value={memo}
            onChangeText={setMemo}
            multiline
          />
        </BeeBoxCard>

        <BeeBoxCard
          delay={250}
          style={{ backgroundColor: C.bgAlt, borderColor: C.border }}
        >
          <Text
            className="text-sm font-semibold mb-1"
            style={{ color: C.text }}
          >
            등록일
          </Text>
          <Text className="text-sm" style={{ color: C.sec }}>
            현재 날짜로 자동 등록됩니다.
          </Text>
        </BeeBoxCard>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="rounded-2xl items-center justify-center py-4"
          style={{ backgroundColor: canSubmit ? C.primary : C.border }}
        >
          <Text className="text-base font-semibold text-white">등록하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

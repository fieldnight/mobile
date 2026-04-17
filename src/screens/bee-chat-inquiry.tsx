import { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Modal,
  Alert,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

// ── Props ─────────────────────────────────────────────
interface InquiryModalProps {
  visible: boolean;
  onClose: () => void;
}

// ── 컴포넌트 ──────────────────────────────────────────
export default function InquiryModal({ visible, onClose }: InquiryModalProps) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [work, setWork] = useState("");
  const [interest, setInterest] = useState("");
  const [extra, seTextra] = useState("");
  const [consent, setConsent] = useState(false);

  const canSubmit = name.trim() !== "" && email.trim() !== "" && consent;

  const handleClose = () => {
    setName("");
    setEmail("");
    setWork("");
    setInterest("");
    seTextra("");
    setConsent(false);
    onClose();
  };

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert(
      "접수 완료",
      "문의가 접수되었습니다.\n확인 후 빠르게 답변드리겠습니다.",
    );
    handleClose();
  }, [canSubmit]);

  // 공통 인풋 스타일
  const inputStyle =
    "border border-[#E5E8EB] rounded-xl px-3.5 py-3 text-base text-[#191F28] mb-[18px] bg-white";

  // 공통 라벨 스타일
  const labelStyle = "text-[13px] font-semibold text-[#8B95A1] mb-2 tracking-wide";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
        {/* 배경 탭 → 닫기 */}
        <Pressable className="flex-1" onPress={handleClose} />

        <View
          className="bg-white"
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "90%",
          }}
        >
          {/* 핸들 + 닫기 버튼 */}
          <View
            className="flex-row items-center justify-between px-6 pt-5 pb-1"
          >
            {/* 핸들 (중앙 고정) */}
            <View
              className="absolute bg-[#DDE0E4]"
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                left: "50%",
                top: 10,
                transform: [{ translateX: -18 }],
              }}
            />
            {/* 왼쪽 spacer */}
            <View className="w-8" />
            {/* 닫기 */}
            <Pressable
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-[#F4F5F7] items-center justify-center"
              data-testid="button-close-inquiry"
            >
              <Feather name="x" size={18} color="#8B95A1" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            {/* 타이틀 */}
            <Text className="text-[22px] font-bold text-[#191F28] leading-[30px] mb-1.5">
              Webee가 궁금하신가요?
            </Text>
            <Text className="text-sm text-[#8B95A1] leading-[21px] mb-7">
              도입 문의나 궁금한 점을 남겨주시면,{"\n"}확인 후 빠르게 답변드릴게요.
            </Text>

            {/* 이름 */}
            <Text className={labelStyle}>이름</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="홍길동"
              placeholderTextColor="#CDD1D6"
              className={inputStyle}
              data-testid="input-inquiry-name"
            />

            {/* 이메일 */}
            <Text className={labelStyle}>이메일</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor="#CDD1D6"
              keyboardType="email-address"
              autoCapitalize="none"
              className={inputStyle}
              data-testid="input-inquiry-email"
            />

            {/* 하고 계신 일 */}
            <Text className={labelStyle}>하고 계신 일은 무엇인가요?</Text>
            <TextInput
              value={work}
              onChangeText={setWork}
              placeholder="예: 딸기 농장 운영"
              placeholderTextColor="#CDD1D6"
              className={inputStyle}
              data-testid="input-inquiry-work"
            />

            {/* 관심 활용 방안 */}
            <Text className={labelStyle}>관심 있는 활용 방안이 있다면 적어주세요</Text>
            <TextInput
              value={interest}
              onChangeText={setInterest}
              placeholder="예: 스마트벌통 모니터링, 수정벌 추천"
              placeholderTextColor="#CDD1D6"
              className={inputStyle}
              data-testid="input-inquiry-interest"
            />

            {/* 추가 내용 */}
            <Text className={labelStyle}>추가로 남기고 싶은 내용</Text>
            <TextInput
              value={extra}
              onChangeText={seTextra}
              placeholder="도입 배경, 궁금한 점 등을 자유롭게 남겨주세요"
              placeholderTextColor="#CDD1D6"
              multiline
              textAlignVertical="top"
              className="border border-[#E5E8EB] rounded-xl px-3.5 py-3 text-base text-[#191F28] mb-6 bg-white min-h-[100px]"
              data-testid="input-inquiry-extra"
            />

            {/* 동의 체크박스 */}
            <Pressable
              onPress={() => setConsent((v) => !v)}
              className="flex-row items-start gap-2.5 mb-6"
              data-testid="button-inquiry-consent"
            >
              <View
                className="items-center justify-center mt-[1px]"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: consent ? 0 : 1.5,
                  borderColor: "#CDD1D6",
                  backgroundColor: consent ? "#191F28" : "#FFFFFF",
                }}
              >
                {consent && <Feather name="check" size={14} color="#FFFFFF" />}
              </View>
              <View className="flex-1">
                <Text className="text-[13px] text-[#191F28] leading-[19px]">
                  (필수) 문의 답변 및 관련 안내 수신에 동의합니다.
                </Text>
                <Text className="text-xs text-[#B0B8C1] leading-[17px] mt-0.5">
                  동의해주셔야 문의 접수가 가능합니다.
                </Text>
              </View>
            </Pressable>

            {/* 제출 버튼 */}
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              className={`items-center rounded-xl py-4 ${canSubmit ? "bg-[#191F28]" : "bg-[#E5E8EB]"}`}
              data-testid="button-submit-inquiry"
            >
              <Text
                className={`text-base font-semibold ${canSubmit ? "text-white" : "text-[#B0B8C1]"}`}
              >
                문의 보내기
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
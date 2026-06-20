import { useState, useCallback } from "react";
import {
  Image,
  Linking,
  View,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { submitSuggestion } from "@/features/feedback/api";

const KAKAO_OPEN_CHAT_URL = "https://open.kakao.com/o/g6FQjhAi";
const QR_IMAGE = require("../../assets/images/qr.png");

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
  const [extra, setExtra] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    name.trim() !== "" &&
    email.trim() !== "" &&
    extra.trim() !== "" &&
    consent &&
    !isSubmitting;
  const inputStyle = {
    borderColor: C.border,
    color: C.text,
    fontFamily: "Pretendard-Medium",
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setExtra("");
    setConsent(false);
    setIsSubmitting(false);
    onClose();
  };

  const openKakaoChat = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const supported = await Linking.canOpenURL(KAKAO_OPEN_CHAT_URL);
    if (!supported) {
      Alert.alert("링크를 열 수 없어요", "잠시 후 다시 시도해 주세요.");
      return;
    }
    Linking.openURL(KAKAO_OPEN_CHAT_URL);
  }, []);

  const handleSubmit = useCallback(async () => {
    console.log("[Inquiry Modal] 문의 제출 클릭", {
      hasName: name.trim() !== "",
      hasEmail: email.trim() !== "",
      contentLength: extra.trim().length,
      consent,
      isSubmitting,
      canSubmit,
    });

    if (!canSubmit) {
      console.warn("[Inquiry Modal] 문의 제출 차단", {
        reason: "required-field-or-consent-missing",
        hasName: name.trim() !== "",
        hasEmail: email.trim() !== "",
        hasContent: extra.trim() !== "",
        consent,
        isSubmitting,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 피드백 API는 content만 받으므로 폼 필드를 관리자 메일용 텍스트로 합쳐 보낸다.
      const content = [
        `이름: ${name.trim()}`,
        `이메일: ${email.trim()}`,
        `내용: ${extra.trim()}`,
      ].join("\n");

      console.log("[Inquiry Modal] 문의 content 조립 완료", {
        contentLength: content.length,
        lineCount: content.split("\n").length,
      });

      await submitSuggestion({ content });

      console.log("[Inquiry Modal] 문의 전송 성공");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "접수 완료",
        "문의가 접수되었습니다.\n확인 후 빠르게 답변드리겠습니다.",
      );
      handleClose();
    } catch (error) {
      console.error("[Inquiry Modal] 문의 전송 실패", { error });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert(
        "전송 실패",
        error instanceof Error
          ? error.message
          : "잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, email, extra, name]);

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
            minHeight: "80%",
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
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: C.bg }}
              data-testid="button-close-inquiry"
            >
              <Feather name="x" size={18} color={C.sec} />
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
            {/* 오픈톡방 안내: 소식과 실시간 소통을 가장 먼저 안내합니다. */}
            <View
              className="rounded-3xl border p-4"
              style={{ backgroundColor: C.bgAlt, borderColor: C.border }}
            >
              <View className="flex-row items-start" style={{ gap: 14 }}>
                <Image
                  source={QR_IMAGE}
                  className="h-24 w-24 rounded-2xl"
                  resizeMode="cover"
                />
                <View className="flex-1">
                  <PretendardFont weight="bold" style={{ fontSize: 20, color: C.text, lineHeight: 28 }}>
                    Webee 오픈톡방에 들어오세요
                  </PretendardFont>
                  <PretendardFont style={{ fontSize: 13.5, color: C.textAlt, lineHeight: 21, marginTop: 6 }}>
                    새소식과 업데이트를 빠르게 보고, 관리자나 다른 사용자들과 실시간으로 소통할 수 있어요.
                  </PretendardFont>
                </View>
              </View>

              <Pressable
                onPress={openKakaoChat}
                className="mt-4 flex-row items-center justify-center rounded-2xl py-3.5 active:opacity-80"
                style={{ backgroundColor: C.primary, gap: 8 }}
              >
                <Feather name="message-circle" size={18} color={C.white} />
                <PretendardFont weight="bold" style={{ fontSize: 15, color: C.white }}>
                  카카오톡 오픈톡방 이동
                </PretendardFont>
              </Pressable>
            </View>

            {/* B2G/B2B 도입문의 폼 */}
            <View className="mt-6">
              <PretendardFont weight="bold" style={{ fontSize: 22, color: C.text, lineHeight: 30 }}>
                도입 문의가 필요하신가요?
              </PretendardFont>
              <PretendardFont style={{ fontSize: 14, color: C.sec, lineHeight: 21, marginTop: 4, marginBottom: 22 }}>
                B2G·B2B 도입 문의나 궁금한 점을 남겨주시면 확인 후 빠르게 답변드릴게요.
              </PretendardFont>
            </View>

            <FormLabel label="이름" />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="홍길동"
              placeholderTextColor={C.ter}
              className="mb-4 rounded-xl border bg-white px-3.5 py-3 text-base"
              style={inputStyle}
              data-testid="input-inquiry-name"
            />

            <FormLabel label="이메일" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="webee@example.com"
              placeholderTextColor={C.ter}
              keyboardType="email-address"
              autoCapitalize="none"
              className="mb-4 rounded-xl border bg-white px-3.5 py-3 text-base"
              style={inputStyle}
              data-testid="input-inquiry-email"
            />

            <FormLabel label="문의 내용" />
            <TextInput
              value={extra}
              onChangeText={setExtra}
              placeholder="도입 배경, 궁금한 점 등을 자유롭게 남겨주세요"
              placeholderTextColor={C.ter}
              multiline
              textAlignVertical="top"
              className="mb-6 min-h-[220px] rounded-xl border bg-white px-3.5 py-3 text-base"
              style={inputStyle}
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
                  borderColor: C.border,
                  backgroundColor: consent ? C.text : C.white,
                }}
              >
                {consent && <Feather name="check" size={14} color={C.white} />}
              </View>
              <View className="flex-1">
                <PretendardFont style={{ fontSize: 13, color: C.text, lineHeight: 19 }}>
                  (필수) 문의 답변 및 관련 안내 수신에 동의합니다.
                </PretendardFont>
                <PretendardFont style={{ fontSize: 12, color: C.ter, lineHeight: 17, marginTop: 2 }}>
                  동의해주셔야 문의 접수가 가능합니다.
                </PretendardFont>
              </View>
            </Pressable>

            {/* 제출 버튼 */}
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              className="items-center rounded-xl py-4"
              style={{ backgroundColor: canSubmit ? C.text : C.border }}
              data-testid="button-submit-inquiry"
            >
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 16, color: canSubmit ? C.white : C.ter }}
              >
                {isSubmitting ? "전송 중..." : "문의 보내기"}
              </PretendardFont>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** 문의 폼의 라벨 스타일을 한 곳에서 맞춥니다. */
function FormLabel({ label }: { label: string }) {
  return (
    <PretendardFont
      weight="semibold"
      style={{ fontSize: 13, color: C.sec, marginBottom: 8 }}
    >
      {label}
    </PretendardFont>
  );
}

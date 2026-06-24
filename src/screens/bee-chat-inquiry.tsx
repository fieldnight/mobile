import { useCallback, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { C } from "@/constants/hive-colors";
import { submitSuggestion } from "@/features/feedback/api";

const KAKAO_OPEN_CHAT_URL = "https://open.kakao.com/o/g6FQjhAi";
const QR_IMAGE = require("../../assets/images/qr.png");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InquiryModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function InquiryModal({ visible, onClose }: InquiryModalProps) {
  const insets = useSafeAreaInsets();
  const { show: showToast } = useAppToast();
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedEmail = email.trim();
  const trimmedContent = content.trim();
  const isEmailValid = EMAIL_PATTERN.test(trimmedEmail);
  const canSubmit = isEmailValid && trimmedContent.length > 0 && consent;

  const emailHelperText = useMemo(() => {
    if (trimmedEmail.length === 0) return "";
    return isEmailValid ? "" : "이메일 형식을 확인해 주세요.";
  }, [isEmailValid, trimmedEmail.length]);

  const resetForm = useCallback(() => {
    setEmail("");
    setContent("");
    setConsent(false);
    setIsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;

    resetForm();
    onClose();
  }, [isSubmitting, onClose, resetForm]);

  const openKakaoChat = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const supported = await Linking.canOpenURL(KAKAO_OPEN_CHAT_URL);

      if (!supported) {
        showToast("링크를 열 수 없어요. 잠시 후 다시 시도해 주세요.", "error");
        return;
      }

      await Linking.openURL(KAKAO_OPEN_CHAT_URL);
    } catch (error) {
      console.error("[Inquiry UI] 오픈톡 링크 열기 실패", { error });
      showToast("링크를 열 수 없어요. 잠시 후 다시 시도해 주세요.", "error");
    }
  }, [showToast]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    if (!isEmailValid) {
      showToast("답변 받을 이메일을 정확히 입력해 주세요.", "info");
      return;
    }

    if (trimmedContent.length === 0) {
      showToast("문의 내용을 입력해 주세요.", "info");
      return;
    }

    if (!consent) {
      showToast("답변 안내 수신 동의가 필요해요.", "info");
      return;
    }

    setIsSubmitting(true);
    console.log("[Inquiry UI] 피드백 제출 시작", {
      email: trimmedEmail,
      contentLength: trimmedContent.length,
    });

    try {
      await submitSuggestion({
        email: trimmedEmail,
        content: trimmedContent,
      });

      console.log("[Inquiry UI] 피드백 제출 완료", {
        email: trimmedEmail,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showToast("문의가 접수됐어요. 확인 후 빠르게 답변드릴게요.", "success");
      resetForm();
      onClose();
    } catch (error) {
      console.error("[Inquiry UI] 피드백 제출 실패", { error });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      showToast(
        error instanceof Error
          ? error.message
          : "잠시 후 다시 시도해 주세요.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    consent,
    isEmailValid,
    isSubmitting,
    onClose,
    resetForm,
    showToast,
    trimmedContent,
    trimmedEmail,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="flex-1" onPress={handleClose} />

        <View className="max-h-[90%] rounded-t-[28px] bg-white">
          <View className="items-center px-5 pb-1 pt-3">
            <View className="h-1 w-10 rounded-full bg-[#DDE0E4]" />

            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              className="absolute right-5 top-4 h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F7] active:opacity-70"
              data-testid="button-close-inquiry"
            >
              <Feather name="x" size={19} color={C.sec} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom + 20, 32),
            }}
          >
            <PretendardFont
              weight="bold"
              style={{ color: C.text, fontSize: 25, lineHeight: 34 }}
            >
              문의하기
            </PretendardFont>
            <PretendardFont
              style={{
                color: C.textAlt,
                fontSize: 14,
                lineHeight: 21,
                marginTop: 6,
              }}
            >
              서비스 사용 중 불편한 점이나 도입 문의를 남겨 주세요.
            </PretendardFont>

            <View
              className="mt-5 rounded-2xl border p-4"
              style={{ backgroundColor: C.bgAlt, borderColor: C.border }}
            >
              <View className="flex-row items-start gap-3">
                <Image
                  source={QR_IMAGE}
                  className="h-24 w-24 rounded-xl"
                  resizeMode="cover"
                />

                <View className="flex-1">
                  <PretendardFont
                    weight="bold"
                    style={{ color: C.text, fontSize: 17, lineHeight: 24 }}
                  >
                    Webee 오픈톡방
                  </PretendardFont>
                  <PretendardFont
                    style={{
                      color: C.textAlt,
                      fontSize: 13,
                      lineHeight: 19,
                      marginTop: 4,
                    }}
                  >
                    빠른 소식이나 간단한 질문은 오픈톡방에서도 확인할 수 있어요.
                  </PretendardFont>
                </View>
              </View>

              <Pressable
                onPress={openKakaoChat}
                className="mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-80"
                style={{ backgroundColor: C.primary }}
              >
                <Feather name="message-circle" size={18} color={C.white} />
                <PretendardFont
                  weight="bold"
                  style={{ color: C.white, fontSize: 15 }}
                >
                  카카오톡 오픈톡방 이동
                </PretendardFont>
              </Pressable>
            </View>

            <View className="mt-7">
              <FormLabel label="답변 받을 이메일" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="webee@example.com"
                placeholderTextColor={C.ter}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="rounded-xl border bg-white px-4 py-3.5 text-base"
                style={{
                  borderColor: emailHelperText ? C.error : C.border,
                  color: C.text,
                  fontFamily: "Pretendard-Medium",
                }}
                data-testid="input-inquiry-email"
              />
              {emailHelperText ? (
                <PretendardFont
                  style={{
                    color: C.error,
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 6,
                  }}
                >
                  {emailHelperText}
                </PretendardFont>
              ) : null}
            </View>

            <View className="mt-5">
              <FormLabel label="문의 내용" />
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="수정벌 추천 기능에 대해 건의 드립니다."
                placeholderTextColor={C.ter}
                multiline
                textAlignVertical="top"
                className="min-h-[190px] rounded-xl border bg-white px-4 py-3.5 text-base"
                style={{
                  borderColor: C.border,
                  color: C.text,
                  fontFamily: "Pretendard-Medium",
                  lineHeight: 22,
                }}
                data-testid="input-inquiry-content"
              />
            </View>

            {/* 관리자 답변을 받을 수 있도록 사용자가 직접 수신 동의합니다. */}
            <Pressable
              onPress={() => setConsent((value) => !value)}
              className="mt-5 flex-row items-start gap-3 active:opacity-80"
              data-testid="button-inquiry-consent"
            >
              <View
                className="mt-0.5 h-6 w-6 items-center justify-center rounded-md border"
                style={{
                  backgroundColor: consent ? C.text : C.white,
                  borderColor: consent ? C.text : C.border,
                }}
              >
                {consent ? (
                  <Feather name="check" size={16} color={C.white} />
                ) : null}
              </View>

              <View className="flex-1">
                <PretendardFont
                  weight="semibold"
                  style={{ color: C.text, fontSize: 13.5, lineHeight: 20 }}
                >
                  답변 및 관련 안내 수신에 동의합니다.
                </PretendardFont>
                <PretendardFont
                  style={{
                    color: C.ter,
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 2,
                  }}
                >
                  문의 답변을 보내기 위한 용도로만 사용돼요.
                </PretendardFont>
              </View>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="mt-7 items-center rounded-xl py-4 active:opacity-80"
              style={{
                backgroundColor: canSubmit && !isSubmitting ? C.text : C.border,
              }}
              data-testid="button-submit-inquiry"
            >
              <PretendardFont
                weight="bold"
                style={{
                  color: canSubmit && !isSubmitting ? C.white : C.ter,
                  fontSize: 16,
                }}
              >
                {isSubmitting ? "전송 중..." : "문의 보내기"}
              </PretendardFont>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FormLabel({ label }: { label: string }) {
  return (
    <PretendardFont
      weight="semibold"
      style={{
        color: C.text,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
      }}
    >
      {label}
    </PretendardFont>
  );
}

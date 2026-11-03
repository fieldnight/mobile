import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, PanResponder, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import type { NfcDoorCardConfig } from "./nfcDoorCards";
import { NfcCardCarousel } from "./nfc-card-carousel/NfcCardCarousel";
import {
  setActiveHceCard,
  subscribeHceResult,
  toHceCardPayload,
  type HceResultEvent,
} from "../model/webeeHce";

interface NfcDoorCardModalProps {
  card: NfcDoorCardConfig | null;
  cards: NfcDoorCardConfig[];
  visible: boolean;
  onClose: () => void;
  onActivated?: (card: NfcDoorCardConfig) => void;
}

/**
 * 카드만 좌우로 순환하고 NFC 안내는 화면에 고정되는 전체화면 플로팅 UX입니다.
 * 포커스가 바뀐 뒤에만 HCE 활성 카드를 교체해 스와이프 도중 잘못된 카드가 적용되지 않게 합니다.
 */
export function NfcDoorCardModal({
  card,
  cards,
  visible,
  onClose,
  onActivated,
}: NfcDoorCardModalProps) {
  const insets = useSafeAreaInsets();
  const { show: showToast } = useAppToast();
  const translateY = useRef(new Animated.Value(0)).current;
  const resultToastShownRef = useRef(false);
  const [focusedCard, setFocusedCard] = useState<NfcDoorCardConfig | null>(card);
  const [hceResult, setHceResult] = useState<HceResultEvent | null>(null);
  const [hceActivateError, setHceActivateError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !card) return;
    setFocusedCard(card);
    translateY.setValue(0);
  }, [card, translateY, visible]);

  useEffect(() => {
    if (!visible || !focusedCard) return;

    setHceResult(null);
    setHceActivateError(null);
    resultToastShownRef.current = false;

    const subscription = subscribeHceResult((event) => {
      setHceResult(event);
      if (event.status !== "ok" && event.status !== "error") return;
      if (resultToastShownRef.current) return;

      resultToastShownRef.current = true;
      if (event.status === "ok") {
        showToast(`${focusedCard.title} 카드 명령을 개폐기가 접수했어요.`, "success", 5_000);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        showToast("NFC 카드 적용에 실패했어요.", "error", 5_000);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    });

    const activate = async () => {
      const activated = await setActiveHceCard(focusedCard);
      if (!activated) {
        setHceActivateError("이 기기에서는 HCE NFC를 사용할 수 없어요.");
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.warn("[NFC Door Card Modal] HCE 카드 활성화 실패");
        return;
      }

      onActivated?.(focusedCard);
      console.log(
        "[NFC Door Card Modal] HCE 카드 활성화 완료",
        toHceCardPayload(focusedCard),
      );
    };

    activate().catch((error: unknown) => {
      setHceActivateError(
        error instanceof Error ? error.message : "NFC 카드 설정을 확인해주세요.",
      );
    });

    return () => {
      subscription.remove();
      console.log("[NFC Door Card Modal] HCE 결과 구독 해제");
    };
  }, [focusedCard, onActivated, showToast, visible]);

  const hceStatus = useMemo(
    () => getHceStatus(hceResult, hceActivateError),
    [hceActivateError, hceResult],
  );

  const closeWithSlide = () => {
    Animated.timing(translateY, {
      toValue: 520,
      duration: 260,
      useNativeDriver: true,
    }).start(onClose);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        gesture.dy > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 110 || gesture.vy > 0.85) {
          closeWithSlide();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 16,
          bounciness: 4,
        }).start();
      },
    }),
  ).current;

  if (!card || !focusedCard || cards.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={closeWithSlide}
    >
      <Animated.View
        {...panResponder.panHandlers}
        className="flex-1 bg-[#080A0D]"
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 18),
          transform: [{ translateY }],
        }}
      >
        <View className="mb-4 flex-row items-center justify-between px-5">
          <View>
            <PretendardFont weight="bold" style={{ fontSize: 20, color: "#FFFFFF" }}>
              개폐기 NFC 카드
            </PretendardFont>
            <PretendardFont style={{ marginTop: 3, fontSize: 12.5, color: "#9CA3AF" }}>
              카드를 넘기면 선택한 카드가 바로 활성화돼요
            </PretendardFont>
          </View>
          <Pressable
            onPress={closeWithSlide}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="NFC 카드 닫기"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          >
            <Feather name="x" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="flex-1 justify-center">
          <NfcCardCarousel
            cards={cards}
            initialCard={card}
            onActiveCardChange={setFocusedCard}
            pulsing={hceResult?.status !== "ok"}
          />
        </View>

        <NfcInstructionPanel
          completed={hceResult?.status === "ok"}
          statusMessage={hceStatus.message}
          statusColor={hceStatus.color}
        />
      </Animated.View>
    </Modal>
  );
}

function NfcInstructionPanel({
  completed,
  statusMessage,
  statusColor,
}: {
  completed: boolean;
  statusMessage: string;
  statusColor: string;
}) {
  return (
    <View className="items-center px-7 pb-1 pt-3">
      <View className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-white/10">
        <Feather name={completed ? "check" : "radio"} size={21} color="#FFFFFF" />
      </View>
      <PretendardFont
        weight="bold"
        style={{ fontSize: 18.5, lineHeight: 25, color: "#FFFFFF", textAlign: "center" }}
      >
        {completed
          ? "개폐기가 카드 명령을 접수했어요"
          : "개폐기 NFC 리더기에\n휴대폰을 가까이 대주세요"}
      </PretendardFont>
      <PretendardFont
        weight="semibold"
        style={{ marginTop: 7, fontSize: 14, lineHeight: 20, color: statusColor, textAlign: "center" }}
      >
        {statusMessage}
      </PretendardFont>
      <PretendardFont
        style={{
          marginTop: 7,
          fontSize: 12,
          lineHeight: 18,
          color: "rgba(255,255,255,0.68)",
          textAlign: "center",
        }}
      >
        알림이 안 오면 휴대폰을 떼고 2초 이상 기다린 뒤 다시 대주세요.{"\n"}
        알림을 못 받아도 이미 적용됐을 수 있어요.
      </PretendardFont>
    </View>
  );
}

function getHceStatus(result: HceResultEvent | null, activateError: string | null) {
  if (activateError) return { message: activateError, color: "#FFE1E1" };
  if (!result) {
    return {
      message: "통신에 시간이 걸릴 수 있어요.\n적용 완료 알림이 올 때까지\n휴대폰을 떼지 말고 대고 있어주세요.",
      color: "rgba(255,255,255,0.78)",
    };
  }
  if (result.status === "ok") {
    return { message: "통계도 받으려면 잠시 더 대고 있어주세요.", color: "#DDFBEA" };
  }
  if (result.status === "error") {
    const errorMessage = result.detail || result.command || "처리 오류";
    return { message: `개폐기 적용 실패: ${errorMessage}`, color: "#FFE1E1" };
  }
  return {
    message: `개폐기 응답: ${result.result}`,
    color: "rgba(255,255,255,0.78)",
  };
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  View,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { C } from "@/constants/hive-colors";
import type { NfcDoorCardConfig } from "./nfcDoorCards";
import {
  setActiveHceCard,
  subscribeHceResult,
  toHceCardPayload,
  type HceResultEvent,
} from "../model/webeeHce";

const SCREEN_W = Dimensions.get("window").width;
const ACTIVE_CARD_W = SCREEN_W - 42;
const ACTIVE_CARD_H = 276;
const LABEL_BG = "#EEF2F6";

export function NfcDoorCardModal({
  card,
  visible,
  onClose,
}: {
  card: NfcDoorCardConfig | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { show: showToast } = useAppToast();
  const translateY = useRef(new Animated.Value(0)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const [hceResult, setHceResult] = useState<HceResultEvent | null>(null);
  const [hceActivateError, setHceActivateError] = useState<string | null>(null);
  const rippleAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const hapticTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultToastShownRef = useRef(false);

  const stopRipple = () => {
    rippleAnimRef.current?.stop();
    rippleAnimRef.current = null;
    if (hapticTimerRef.current) {
      clearInterval(hapticTimerRef.current);
      hapticTimerRef.current = null;
    }
  };

  const startRipple = () => {
    const makeRipple = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );

    ripple1.setValue(0);
    ripple2.setValue(0);
    ripple3.setValue(0);

    const anim = Animated.parallel([
      makeRipple(ripple1, 0),
      makeRipple(ripple2, 460),
      makeRipple(ripple3, 920),
    ]);
    rippleAnimRef.current = anim;
    anim.start();

    hapticTimerRef.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 1400);
  };

  // 선택된 카드를 네이티브 HCE 서비스에 저장하고 ESP32 적용 결과 이벤트를 기다립니다.
  useEffect(() => {
    if (!visible || !card) return;

    setHceResult(null);
    setHceActivateError(null);
    resultToastShownRef.current = false;
    translateY.setValue(0);

    let hceSubscription: ReturnType<typeof subscribeHceResult> | null = null;

    const activate = async () => {
      // ripple·진동은 HCE 결과와 무관하게 모달이 열리면 바로 시작
      startRipple();

      const ok = await setActiveHceCard(card);

      if (!ok) {
        setHceActivateError("이 기기에서는 HCE NFC를 사용할 수 없어요.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.warn("[NFC Door Card Modal] HCE 카드 활성화 실패");
        return;
      }

      console.log("[NFC Door Card Modal] HCE 카드 활성화 완료", toHceCardPayload(card));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      hceSubscription = subscribeHceResult((event) => {
        setHceResult(event);
        if (event.status === "ok" || event.status === "error") {
          stopRipple();

          if (!resultToastShownRef.current) {
            resultToastShownRef.current = true;
            if (event.status === "ok") {
              showToast(`${card.title} 카드가 개폐기에 적용됐어요.`, "success");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              showToast("NFC 카드 적용에 실패했어요.", "error");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          }
        }
      });
    };

    activate();

    return () => {
      stopRipple();
      hceSubscription?.remove();
      console.log("[NFC Door Card Modal] HCE 결과 구독 해제");
    };
  }, [card, showToast, visible]);

  const hceStatus = useMemo(
    () => getHceStatus(hceResult, hceActivateError),
    [hceResult, hceActivateError],
  );

  const closeWithSlide = () => {
    Animated.timing(translateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(onClose);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8,
      onMoveShouldSetPanResponderCapture: (_, gesture) => gesture.dy > 8,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 72 || gesture.vy > 0.7) {
          closeWithSlide();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 7,
        }).start();
      },
    }),
  ).current;

  if (!card) return null;

  const makeRippleStyle = (anim: Animated.Value, baseSize: number) => ({
    position: "absolute" as const,
    width: baseSize,
    height: baseSize / 2,
    borderTopLeftRadius: baseSize,
    borderTopRightRadius: baseSize,
    backgroundColor: C.white,
    opacity: anim.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.22, 0.12, 0] }),
    transform: [
      { translateX: -baseSize / 2 },
      { scaleX: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) },
      { scaleY: anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.2] }) },
    ],
    bottom: 0,
    left: "50%" as any,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeWithSlide}
    >
      <View
        {...panResponder.panHandlers}
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
      >
        <Pressable
          style={{ position: "absolute", inset: 0 }}
          onPress={closeWithSlide}
        />

        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: "absolute",
            top: "28%",
            width: ACTIVE_CARD_W,
            transform: [{ translateY }],
          }}
        >
          <View
            style={{
              height: ACTIVE_CARD_H,
              borderRadius: 14,
              padding: 20,
              backgroundColor: "#b7d8f6",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.72)",
              elevation: 12,
              overflow: "hidden",
              shadowColor: C.shadow,
              shadowOpacity: 0.28,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 14 },
            }}
          >
            <RadialGradientFill />

            {/* 반원 ripple — 카드 상단 중앙에서 퍼져나가는 애니메이션 */}
            {([ripple1, ripple2, ripple3] as Animated.Value[]).map((anim, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={makeRippleStyle(anim, ACTIVE_CARD_W * (0.85 + i * 0.2))}
              />
            ))}

            <View className="flex-row items-center justify-between">
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 46, height: 46, backgroundColor: LABEL_BG }}
              >
                <Feather name="radio" size={22} color="#1D4ED8" />
              </View>

              <View
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: LABEL_BG }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 13, color: C.textAlt }}
                >
                  NFC 활성화
                </PretendardFont>
              </View>
            </View>

            <View style={{ marginTop: 66 }}>
              <PretendardFont
                weight="bold"
                style={{ fontSize: 31, lineHeight: 36, color: C.text }}
              >
                {card.title}
              </PretendardFont>
              <PretendardFont
                weight="semibold"
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  color: C.textAlt,
                  marginTop: 3,
                }}
              >
                {card.description}
              </PretendardFont>

              {card.detail ? (
                <View
                  className="mt-4 rounded-2xl px-4 py-3"
                  style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
                >
                  <PretendardFont
                    weight="semibold"
                    style={{
                      fontSize: 13,
                      lineHeight: 20,
                      color: C.textAlt,
                    }}
                  >
                    {card.detail}
                  </PretendardFont>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ marginTop: 28, alignItems: "center", paddingHorizontal: 24, gap: 8 }}>
            <PretendardFont
              weight="bold"
              style={{ fontSize: 17, color: C.white, textAlign: "center" }}
            >
              개폐기 NFC 리더기에{"\n"}휴대폰을 가까이 대주세요
            </PretendardFont>
            <PretendardFont
              weight="semibold"
              style={{
                fontSize: 13,
                color: hceStatus.color,
                lineHeight: 19,
                textAlign: "center",
              }}
            >
              {hceStatus.message}
            </PretendardFont>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getHceStatus(result: HceResultEvent | null, activateError: string | null) {
  if (activateError) {
    return { message: activateError, color: "#FFE1E1" };
  }

  if (!result) {
    return {
      message: "카드를 전송한 뒤 개폐기 적용 결과를 기다리고 있어요",
      color: "rgba(255,255,255,0.78)",
    };
  }

  if (result.status === "ok") {
    return {
      message: "개폐기에 적용됐어요",
      color: "#DDFBEA",
    };
  }

  if (result.status === "error") {
    const errorMessage = result.detail || result.command || "처리 오류";
    return {
      message: `개폐기 적용 실패: ${errorMessage}`,
      color: "#FFE1E1",
    };
  }

  return {
    message: `개폐기 응답: ${result.result}`,
    color: "rgba(255,255,255,0.78)",
  };
}

function RadialGradientFill() {
  return (
    <Svg
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0 }}
      width={ACTIVE_CARD_W}
      height={ACTIVE_CARD_H}
    >
      <Defs>
        <RadialGradient id="baseBlue" cx="32%" cy="38%" rx="78%" ry="86%">
          <Stop offset="0" stopColor="#D8F4FF" stopOpacity="1" />
          <Stop offset="0.48" stopColor="#A9D2F8" stopOpacity="1" />
          <Stop offset="1" stopColor="#5D89D6" stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id="yellowBloom" cx="70%" cy="54%" rx="48%" ry="58%">
          <Stop offset="0" stopColor="#F4EC55" stopOpacity="0.92" />
          <Stop offset="0.46" stopColor="#F4EC55" stopOpacity="0.42" />
          <Stop offset="1" stopColor="#F4EC55" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="mintBloom" cx="96%" cy="12%" rx="50%" ry="60%">
          <Stop offset="0" stopColor="#B7F3E5" stopOpacity="0.8" />
          <Stop offset="0.56" stopColor="#B7F3E5" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#B7F3E5" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect
        width={ACTIVE_CARD_W}
        height={ACTIVE_CARD_H}
        fill="url(#baseBlue)"
      />
      <Rect
        width={ACTIVE_CARD_W}
        height={ACTIVE_CARD_H}
        fill="url(#yellowBloom)"
      />
      <Rect
        width={ACTIVE_CARD_W}
        height={ACTIVE_CARD_H}
        fill="url(#mintBloom)"
      />
    </Svg>
  );
}

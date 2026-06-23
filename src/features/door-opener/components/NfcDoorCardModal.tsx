import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  View,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PretendardFont } from "@/components/PretendardFont";
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
const ACTIVE_CARD_H = 232;
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
  const translateY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [hceResult, setHceResult] = useState<HceResultEvent | null>(null);

  // 선택된 카드를 네이티브 HCE 서비스에 저장하고 ESP32 적용 결과 이벤트를 기다립니다.
  useEffect(() => {
    if (!visible || !card) return;

    setHceResult(null);
    translateY.setValue(0);
    pulse.setValue(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveHceCard(card);
    console.log("[NFC Door Card Modal] HCE 카드 활성화", toHceCardPayload(card));

    const hceSubscription = subscribeHceResult((event) => {
      setHceResult(event);
    });

    const pulseOnce = () => {
      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 720,
          useNativeDriver: true,
        }),
      ]).start();
    };

    pulseOnce();
    const timer = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      pulseOnce();
    }, 1400);

    return () => {
      clearInterval(timer);
      hceSubscription.remove();
      console.log("[NFC Door Card Modal] HCE 결과 구독 해제");
    };
  }, [card, pulse, translateY, visible]);

  const hceStatus = useMemo(() => getHceStatus(hceResult), [hceResult]);

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

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.12],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.22],
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
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 200,
            width: ACTIVE_CARD_W * 0.9,
            height: ACTIVE_CARD_W * 0.46,
            borderTopLeftRadius: ACTIVE_CARD_W,
            borderTopRightRadius: ACTIVE_CARD_W,
            backgroundColor: C.white,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          }}
        />

        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: "absolute",
            top: 200 + ACTIVE_CARD_W * 0.46 - 70,
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
                style={{ fontSize: 25, color: C.text }}
              >
                {card.title}
              </PretendardFont>
              <PretendardFont
                weight="semibold"
                numberOfLines={2}
                style={{
                  fontSize: 14,
                  lineHeight: 21,
                  color: C.textAlt,
                  marginTop: 3,
                }}
              >
                {card.description}
              </PretendardFont>
            </View>
          </View>

          <View className="mt-7 items-center px-6">
            <PretendardFont
              weight="bold"
              style={{ fontSize: 18, color: C.white, textAlign: "center" }}
            >
              개폐기 NFC 리더기에 휴대폰을 가까이 대주세요
            </PretendardFont>
            <PretendardFont
              weight="semibold"
              style={{
                fontSize: 13,
                color: hceStatus.color,
                lineHeight: 19,
                marginTop: 8,
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

function getHceStatus(result: HceResultEvent | null) {
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

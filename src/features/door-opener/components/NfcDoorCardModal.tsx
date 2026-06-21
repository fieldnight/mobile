import { useEffect, useRef } from "react";
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
import { setActiveHceCard, toHceCardPayload } from "../model/webeeHce";

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

  // ---- NFC 활성 상태 효과 ----
  // 모달이 열려 있는 동안 느린 햅틱과 상단 반원 펄스를 반복합니다.
  useEffect(() => {
    if (!visible || !card) return;

    translateY.setValue(0);
    pulse.setValue(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveHceCard(card);
    console.log("[NFC Door Card Modal] HCE 카드 활성화", toHceCardPayload(card));

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

    return () => clearInterval(timer);
  }, [card, pulse, translateY, visible]);

  // ---- 닫기 애니메이션 ----
  const closeWithSlide = () => {
    Animated.timing(translateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(onClose);
  };

  // ---- 전체 영역 드래그 닫기 ----
  // 카드 안쪽이나 아래쪽을 잡아도 아래로 밀어 닫을 수 있게 루트와 카드에 함께 연결합니다.
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

              {/* NFC 추가 모달의 선택 라벨과 같은 밝은 패널 톤으로 통일합니다. */}
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

          <View className="mt-7 items-center">
            <PretendardFont
              weight="bold"
              style={{ fontSize: 18, color: C.white, textAlign: "center" }}
            >
              개폐기 NFC 리더기에 휴대폰을 가까이 대주세요
            </PretendardFont>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---- 카드 배경 그라데이션 ----
// Android에서 원형 도형처럼 보이지 않도록 카드 전체에 방사형 색을 겹쳐 깔아줍니다.
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

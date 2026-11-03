/**
 * 앱 전체에서 사용하는 토스트입니다.
 * - 토스트를 Modal 창으로 띄우면 Android에서 떠 있는 동안 화면 터치가 모두 막힙니다.
 *   그래서 일반 View로 겹쳐 그리고, 토스트 밖의 터치는 아래 화면으로 그대로 전달합니다.
 * - 화면 전체를 덮는 투명 레이어는 Android(새 아키텍처)에서 box-none이어도 터치를 삼키는 경우가 있어
 *   두지 않습니다. 토스트가 있는 윗줄만 차지하고, 그 줄에서도 토스트 밖은 통과시킵니다.
 * - 누르면 닫히고, 옆으로 밀면 그 방향으로 빠르게 밀려나며 닫힙니다.
 * - 바텀시트(Modal) 위에서는 시트 안의 ToastOutlet이 토스트를 대신 그립니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  duration?: number;
  onHide: () => void;
  /** true면 iOS에서도 현재 창(예: 바텀시트 Modal) 안에 그대로 그립니다. */
  inline?: boolean;
}

const DEFAULT_TOAST_DURATION_MS = 5_000;
// 옆으로 이만큼 밀거나 이 속도보다 빠르게 튕기면 닫습니다.
const SWIPE_DISMISS_DISTANCE = 70;
const SWIPE_DISMISS_VELOCITY = 0.6;
const SWIPE_OUT_DISTANCE = 480;
const CONFIG: Record<ToastType, { icon: keyof typeof Feather.glyphMap; iconColor: string }> = {
  success: { icon: "check-circle", iconColor: C.success },
  error: { icon: "alert-circle", iconColor: C.error },
  info: { icon: "info", iconColor: C.primary },
};

export function Toast({
  message,
  type = "success",
  visible,
  duration = DEFAULT_TOAST_DURATION_MS,
  onHide,
  inline = false,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(onHide);
  }, [onHide, opacity, translateY]);

  /** 민 방향(direction: 1=오른쪽, -1=왼쪽)으로 빠르게 밀어내며 닫습니다. */
  const swipeAway = useCallback((direction: 1 | -1) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    Animated.parallel([
      Animated.timing(translateX, { toValue: direction * SWIPE_OUT_DISTANCE, duration: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(onHide);
  }, [onHide, opacity, translateX]);

  // 가로로 미는 동작만 가져가고, 그냥 누르는 건 아래 Pressable(닫기)에 맡깁니다.
  const swipeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => translateX.setValue(gesture.dx),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > SWIPE_DISMISS_DISTANCE || Math.abs(gesture.vx) > SWIPE_DISMISS_VELOCITY) {
        swipeAway(gesture.dx > 0 ? 1 : -1);
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
  }), [swipeAway, translateX]);

  useEffect(() => {
    if (!visible) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    translateY.setValue(-120);
    translateX.setValue(0);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 17,
        bounciness: 4,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [dismiss, duration, message, opacity, translateX, translateY, type, visible]);

  if (!visible) return null;
  const { icon, iconColor } = CONFIG[type];

  const content = (
    <Animated.View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        top: insets.top + 20,
        zIndex: 99999,
        alignItems: "center",
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Animated.View {...swipeResponder.panHandlers} style={{ maxWidth: "100%", transform: [{ translateX }] }}>
        <Pressable
          onPress={dismiss}
          accessibilityRole="alert"
          className="max-w-full flex-row items-center gap-2.5 rounded-full bg-white px-5 py-3.5 active:opacity-75"
          style={{
            shadowColor: C.shadow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 18,
            elevation: 24,
          }}
        >
          <Feather name={icon} size={20} color={iconColor} />
          <PretendardFont
            weight="semibold"
            style={{ flexShrink: 1, fontSize: 15, lineHeight: 21, color: C.text }}
          >
            {message}
          </PretendardFont>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );

  // iOS FullWindowOverlay는 토스트 밖 터치를 아래로 넘깁니다.
  if (Platform.OS === "ios" && !inline) {
    return <FullWindowOverlay>{content}</FullWindowOverlay>;
  }

  return content;
}

export function useToast() {
  const [state, setState] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: "", type: "success" });

  const show = useCallback((message: string, type: ToastType = "success") => {
    setState({ visible: true, message, type });
  }, []);

  const hide = useCallback(() => {
    setState((current) => ({ ...current, visible: false }));
  }, []);

  return { toastState: state, show, hide };
}

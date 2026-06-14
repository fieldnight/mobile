/**
 * 전역 토스트 알림 컴포넌트
 * - pill 형태 흰 카드, 위에서 슬라이드인
 * - 탭하면 즉시 닫힘 / duration 후 자동 닫힘
 * - SafeArea inset 자동 반영 (노치·상태바 아래 배치)
 * - ToastContext(useAppToast)를 통해 어디서든 호출 가능
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
}

const CONFIG: Record<ToastType, { icon: string; iconColor: string }> = {
  success: { icon: "check-circle", iconColor: C.success },
  error:   { icon: "alert-circle", iconColor: C.error },
  info:    { icon: "info",         iconColor: C.primary },
};

export function Toast({
  message,
  type = "success",
  visible,
  duration = 2000,
  onHide,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 220, useNativeDriver: true }),
    ]).start(() => onHide());
  }, [onHide]);

  useEffect(() => {
    if (!visible) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    // 위에서 내려오는 슬라이드인 + 페이드인
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 5 }),
      Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(dismiss, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const { icon, iconColor } = CONFIG[type];

  return (
    <Animated.View
      style={{
        position: "absolute",
        // SafeArea 상단 inset 기준, 탭바 높이(약 48) + 여백을 더해 탭바 아래에 위치
        top: insets.top + 56,
        left: 24,
        right: 24,
        zIndex: 9999,
        alignItems: "center",
        transform: [{ translateY }],
        opacity,
      }}
    >
      {/* 탭하면 즉시 닫히는 pill 카드 */}
      <Pressable
        onPress={dismiss}
        className="flex-row items-center active:opacity-75"
        style={{
          backgroundColor: C.white,
          borderRadius: 999,
          paddingHorizontal: 20,
          paddingVertical: 14,
          gap: 10,
          shadowColor: C.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.14,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <Feather name={icon as any} size={20} color={iconColor} />
        <PretendardFont weight="semibold" style={{ fontSize: 15, color: C.text }}>
          {message}
        </PretendardFont>
      </Pressable>
    </Animated.View>
  );
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
    setState((s) => ({ ...s, visible: false }));
  }, []);

  return { toastState: state, show, hide };
}

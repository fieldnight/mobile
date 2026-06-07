/**
 * 범용 토스트 알림 컴포넌트
 * 화면 최상단에서 잠깐 떴다 사라지는 안내 메시지.
 *
 * useToast()  : { toastState, show, hide } 반환하는 훅.
 *               show("메시지", "success" | "error" | "info") 로 호출.
 *
 * [사용법]
 * const { toastState, show, hide } = useToast();
 * show("저장됐어요!", "success");
 * <Toast visible={toastState.visible} message={toastState.message}
 *        type={toastState.type} onHide={hide} />
 */

import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  duration?: number;
  onHide: () => void;
}

const CONFIG: Record<ToastType, { bg: string; icon: string; color: string }> = {
  success: { bg: "#1A1A1A", icon: "check-circle", color: "#4ADE80" },
  error:   { bg: "#1A1A1A", icon: "alert-circle",  color: "#F87171" },
  info:    { bg: "#1A1A1A", icon: "info",           color: "#60A5FA" },
};

export function Toast({
  message,
  type = "success",
  visible,
  duration = 2500,
  onHide,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 6,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -80,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const { bg, icon, color } = CONFIG[type];

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View
        style={{
          backgroundColor: bg,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <Feather name={icon as any} size={18} color={color} />
        <PretendardFont weight="semibold" style={{ color: "#FFFFFF", fontSize: 14, flex: 1 }}>
          {message}
        </PretendardFont>
      </View>
    </Animated.View>
  );
}

import { useState, useCallback } from "react";

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

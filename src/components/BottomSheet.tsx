/**
 * 공용 바텀시트 컴포넌트
 * - 아래에서 위로 슬라이드업 / 드래그 다운으로 닫기
 * - 사용처: 개폐기 카드 추가·삭제, 벌통 추가 등
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

const { height: SCREEN_H } = Dimensions.get("window");
const DRAG_CLOSE_THRESHOLD = 80;
const DRAG_VEL_THRESHOLD = 0.6;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  snapHeight?: number;
  contentScrollEnabled?: boolean;
  stickyHeaderIndices?: number[];
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  snapHeight = 0.9,
  contentScrollEnabled = true,
  stickyHeaderIndices,
}: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  // 내부 wheel 스크롤 중에는 외부 ScrollView 스크롤 차단
  const [outerScrollEnabled, setOuterScrollEnabled] = useState(true);

  const open = () =>
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 18,
    }).start();

  const close = (cb?: () => void) =>
    Animated.timing(translateY, {
      toValue: SCREEN_H,
      duration: 220,
      useNativeDriver: true,
    }).start(() => cb?.());

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_H);
      open();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DRAG_CLOSE_THRESHOLD || g.vy > DRAG_VEL_THRESHOLD) {
          close(onClose);
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 5 }).start();
        }
      },
    }),
  ).current;

  const handleClose = () => close(onClose);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {/* 딤 배경 80% 불투명 */}
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
      >
        <Pressable className="absolute inset-0" onPress={handleClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Animated.View
              style={{
                maxHeight: SCREEN_H * snapHeight,
                backgroundColor: C.white,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                transform: [{ translateY }],
                overflow: "hidden",
              }}
            >
              {/* 드래그 핸들 */}
              <View {...panResponder.panHandlers} className="items-center pb-1 pt-3">
                <View className="h-1 w-10 rounded-full" style={{ backgroundColor: C.border }} />
              </View>

              {/* 헤더 */}
              <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
                <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
                  {title}
                </PretendardFont>
                <Pressable onPress={handleClose} hitSlop={12} className="active:opacity-60">
                  <Feather name="x" size={20} color={C.ter} />
                </Pressable>
              </View>

              {/* 콘텐츠
                  scrollEnabled: wheel 터치 중 외부 스크롤 차단 (Android에서 부모가 수직 제스처 선점하는 문제 방지)
                  setOuterScrollEnabled는 WheelColumn에서 onTouchStart/onTouchEnd로 호출 */}
              <BottomSheetScrollContext.Provider value={setOuterScrollEnabled}>
                {contentScrollEnabled ? (
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={outerScrollEnabled}
                    stickyHeaderIndices={stickyHeaderIndices}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                  >
                    {children}
                  </ScrollView>
                ) : (
                  <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
                    {children}
                  </View>
                )}
              </BottomSheetScrollContext.Provider>
            </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

import { createContext, useContext } from "react";

const BottomSheetScrollContext = createContext<((enabled: boolean) => void) | null>(null);

export function useBottomSheetScroll() {
  return useContext(BottomSheetScrollContext);
}

/**
 * 확인/취소 두 버튼짜리 경고 바텀시트
 */
interface ConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
}

export function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  destructive = false,
  confirmDisabled = false,
  onConfirm,
}: ConfirmSheetProps) {
  const confirmingRef = useRef(false);

  useEffect(() => {
    if (visible) confirmingRef.current = false;
  }, [visible]);

  const handleConfirm = () => {
    if (confirmingRef.current || confirmDisabled) return;
    confirmingRef.current = true;
    try {
      onConfirm();
      onClose();
    } finally {
      confirmingRef.current = false;
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      snapHeight={0.4}
      contentScrollEnabled={false}
    >
      {message && (
        <PretendardFont style={{ fontSize: 14, color: C.sec, marginBottom: 24, lineHeight: 22 }}>
          {message}
        </PretendardFont>
      )}

      <View className="gap-3">
        <Pressable
          onPress={handleConfirm}
          disabled={confirmDisabled}
          className="items-center rounded-2xl py-4 active:opacity-70"
          style={{
            backgroundColor: destructive ? C.error : C.primary,
            opacity: confirmDisabled ? 0.5 : 1,
          }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 15, color: C.white }}>
            {confirmLabel}
          </PretendardFont>
        </Pressable>
        <Pressable
          onPress={onClose}
          className="items-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: C.bgAlt }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 15, color: C.textAlt }}>
            {cancelLabel}
          </PretendardFont>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

/**
 * 바텀시트 내 폼 필드 라벨
 * - BottomSheet를 사용하는 폼에서 공통 사용
 */
export function FieldLabel({ label }: { label: string }) {
  return (
    <View
      className="mb-2 mt-5 self-start rounded-full px-3 py-1.5"
      style={{ backgroundColor: "#EEF2F6" }}
    >
      <PretendardFont weight="bold" style={{ fontSize: 13, color: C.textAlt }}>
        {label}
      </PretendardFont>
    </View>
  );
}

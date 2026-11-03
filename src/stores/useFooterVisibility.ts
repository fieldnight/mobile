import { useCallback, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { create } from "zustand";

/**
 * 하단 탭바 표시 여부
 * - 스크롤 화면이 내리는 중이면 숨기고, 올리거나 맨 위에 오면 다시 보여줍니다.
 * - Footer는 라우트가 바뀔 때 항상 다시 보이게 되돌립니다.
 */
interface FooterVisibilityState {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

export const useFooterVisibility = create<FooterVisibilityState>((set) => ({
  visible: true,
  setVisible: (visible) => set((state) => (state.visible === visible ? state : { visible })),
}));

// 작은 흔들림에는 반응하지 않도록 이만큼 움직였을 때만 바꿉니다.
const DIRECTION_THRESHOLD = 12;
// 맨 위 근처에서는 항상 보여줍니다.
const TOP_ZONE = 40;

/** ScrollView의 onScroll에 넘기면 스크롤 방향에 따라 하단 탭바를 숨기거나 보여줍니다. */
export function useHideFooterOnScroll() {
  const setVisible = useFooterVisibility((state) => state.setVisible);
  const lastY = useRef(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const y = contentOffset.y;
      const dy = y - lastY.current;
      // 바운스로 끝을 넘어선 값은 방향 판단에 쓰지 않습니다.
      const atBottom = y + layoutMeasurement.height >= contentSize.height - 4;
      if (y <= TOP_ZONE) {
        setVisible(true);
        lastY.current = y;
      } else if (Math.abs(dy) >= DIRECTION_THRESHOLD && !atBottom) {
        setVisible(dy < 0);
        lastY.current = y;
      }
    },
    [setVisible],
  );

  return { onScroll, scrollEventThrottle: 16 as const };
}

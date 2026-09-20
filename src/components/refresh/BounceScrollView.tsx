/**
 * 당겨서 새로고침 대신 쓰는 순수 시각 효과 스크롤뷰.
 * - 최상단에서 아래로, 최하단에서 위로 당기면 콘텐츠가 당긴 만큼 늘어나고
 *   (범퍼 스트레치), 손을 떼면 원래 크기로 부드럽게 돌아옵니다(오버슈트 없음).
 * - 실제 데이터 재조회는 하지 않습니다(순수 UX 피드백).
 */
import { forwardRef, useRef } from "react";
import {
  PanResponder,
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const MAX_STRETCH = 48;
const DRAG_RESISTANCE = 0.45;
// damping을 stiffness 대비 충분히 높여(임계 감쇠에 가깝게) 튕기지 않고
// 한 번에 부드럽게 0으로 멈추도록 합니다 — "또잉" 하는 오버슈트 방지.
const SPRING_CONFIG = { damping: 30, stiffness: 180, mass: 0.6 };

interface BounceScrollViewProps extends ScrollViewProps {
  children?: React.ReactNode;
}

export const BounceScrollView = forwardRef<ScrollView, BounceScrollViewProps>(
  ({ children, onScroll, onContentSizeChange, onLayout, ...props }, ref) => {
    // stretch > 0: 위에서 아래로 당김, stretch < 0: 아래에서 위로 당김
    const stretch = useSharedValue(0);
    const scrollOffset = useRef(0);
    const contentHeight = useRef(0);
    const viewportHeight = useRef(0);
    const dragDirection = useRef<1 | -1 | null>(null);
    const scrollEnabledRef = useRef(props.scrollEnabled !== false);
    scrollEnabledRef.current = props.scrollEnabled !== false;

    const atTop = () => scrollOffset.current <= 0;
    const atBottom = () =>
      scrollOffset.current >= contentHeight.current - viewportHeight.current - 0.5;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          if (!scrollEnabledRef.current || Math.abs(gesture.dy) <= 4) return false;
          if (Math.abs(gesture.dy) <= Math.abs(gesture.dx)) return false;
          if (gesture.dy > 0 && atTop()) return true;
          if (gesture.dy < 0 && atBottom() && contentHeight.current > viewportHeight.current) return true;
          return false;
        },
        onPanResponderGrant: () => {
          dragDirection.current = null;
        },
        onPanResponderMove: (_, gesture) => {
          if (dragDirection.current === null) {
            dragDirection.current = gesture.dy > 0 ? 1 : -1;
          }

          if (dragDirection.current === 1) {
            if (!atTop()) return;
            const resisted = Math.min(MAX_STRETCH, Math.max(0, gesture.dy) * DRAG_RESISTANCE);
            stretch.value = resisted;
          } else {
            if (!atBottom()) return;
            const resisted = Math.min(MAX_STRETCH, Math.max(0, -gesture.dy) * DRAG_RESISTANCE);
            stretch.value = -resisted;
          }
        },
        onPanResponderRelease: () => {
          dragDirection.current = null;
          stretch.value = withSpring(0, SPRING_CONFIG);
        },
        onPanResponderTerminate: () => {
          dragDirection.current = null;
          stretch.value = withSpring(0, SPRING_CONFIG);
        },
      }),
    ).current;

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.current = event.nativeEvent.contentOffset.y;
      viewportHeight.current = event.nativeEvent.layoutMeasurement.height;
      onScroll?.(event);
    };

    const handleContentSizeChange = (width: number, height: number) => {
      contentHeight.current = height;
      onContentSizeChange?.(width, height);
    };

    const handleLayout = (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      onLayout?.(event);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: stretch.value * 0.5 },
        { scaleY: 1 + Math.abs(stretch.value) / 400 },
      ],
    }));

    return (
      <ScrollView
        ref={ref}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        scrollEventThrottle={props.scrollEventThrottle ?? 16}
        {...panResponder.panHandlers}
        {...props}
      >
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      </ScrollView>
    );
  },
);

BounceScrollView.displayName = "BounceScrollView";

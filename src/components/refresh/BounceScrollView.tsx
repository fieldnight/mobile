/**
 * 당겨서 새로고침 대신 쓰는 순수 시각 효과 스크롤뷰.
 * - 최상단에서 아래로 당기면 콘텐츠가 당긴 만큼 늘어나고(범퍼 스트레치),
 *   손을 떼면 스프링으로 원래 크기로 튕겨 돌아옵니다.
 * - 실제 데이터 재조회는 하지 않습니다(순수 UX 피드백).
 */
import { forwardRef, useRef } from "react";
import {
  PanResponder,
  ScrollView,
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
const SPRING_CONFIG = { damping: 14, stiffness: 180 };

interface BounceScrollViewProps extends ScrollViewProps {
  children?: React.ReactNode;
}

export const BounceScrollView = forwardRef<ScrollView, BounceScrollViewProps>(
  ({ children, onScroll, ...props }, ref) => {
    const stretch = useSharedValue(0);
    const scrollOffset = useRef(0);
    const scrollEnabledRef = useRef(props.scrollEnabled !== false);
    scrollEnabledRef.current = props.scrollEnabled !== false;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          scrollEnabledRef.current && scrollOffset.current <= 0 && gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (scrollOffset.current > 0) return;
          const resisted = Math.min(MAX_STRETCH, Math.max(0, gesture.dy) * DRAG_RESISTANCE);
          stretch.value = resisted;
        },
        onPanResponderRelease: () => {
          stretch.value = withSpring(0, SPRING_CONFIG);
        },
        onPanResponderTerminate: () => {
          stretch.value = withSpring(0, SPRING_CONFIG);
        },
      }),
    ).current;

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: stretch.value * 0.5 },
        { scaleY: 1 + stretch.value / 400 },
      ],
    }));

    return (
      <ScrollView
        ref={ref}
        onScroll={handleScroll}
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

/**
 * 커스텀 당겨서 새로고침 컴포넌트
 * - PullToRefresh: ScrollView 래퍼, onRefresh 완료까지 스피너 유지
 *   - isRefreshingRef로 중복 호출 방지
 *   - isRefreshing을 deps에서 제거 → handleRefresh 재생성 방지 (스피너 사라짐 버그 회피)
 *   - Android: progressViewOffset=56 으로 AppHeader 아래에 스피너 표시
 * - RotatingRefreshIcon: 헤더 우측 등에 사용하는 단독 회전 아이콘
 */
import React, { useCallback, useRef, forwardRef } from "react";
import {
  View,
  ScrollView,
  ScrollViewProps,
  RefreshControl as RNRefreshControl,
  Platform,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface PullToRefreshProps extends ScrollViewProps {
  onRefresh: () => Promise<void> | void;
  refreshing?: boolean;
  children?: React.ReactNode;
}

export const PullToRefresh = forwardRef<ScrollView, PullToRefreshProps>(
  ({ onRefresh, refreshing = false, children, ...props }, ref) => {
    const [isRefreshing, setIsRefreshing] = React.useState(refreshing);
    const isRefreshingRef = useRef(false);
    const rotateValue = useSharedValue(0);

    React.useEffect(() => {
      setIsRefreshing(refreshing);
      if (!refreshing) {
        cancelAnimation(rotateValue);
        rotateValue.value = withTiming(0, { duration: 200 });
      }
    }, [refreshing, rotateValue]);

    const startAnimation = useCallback(() => {
      rotateValue.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false,
      );
    }, [rotateValue]);

    const stopAnimation = useCallback(() => {
      cancelAnimation(rotateValue);
      rotateValue.value = withTiming(0, { duration: 200 });
    }, [rotateValue]);

    // isRefreshing을 deps에서 제거 → 새로고침 중 handleRefresh가 재생성되지 않음
    // 재생성되면 RNRefreshControl이 unmount/remount 되어 스피너가 사라지는 버그 발생
    const handleRefresh = useCallback(async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      startAnimation();

      if (Platform.OS !== "web") {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }

      try {
        await Promise.resolve(onRefresh());
      } catch (error) {
        console.error("새로고침 오류:", error);
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
        stopAnimation();

        if (Platform.OS !== "web") {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch {}
        }
      }
    }, [onRefresh, startAnimation, stopAnimation]);

    const animatedStyle = useAnimatedStyle(
      () => ({ transform: [{ rotate: `${rotateValue.value}deg` }] }),
      [rotateValue],
    );

    return (
      <ScrollView
        ref={ref}
        scrollEnabled={!isRefreshing}
        refreshControl={
          <RNRefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#EA580C"
            titleColor="#111827"
            progressBackgroundColor="#FFFFFF"
            colors={["#EA580C"]}
            // Android: AppHeader(56px)가 absolute로 떠 있으므로 스피너를 헤더 아래에 표시
            progressViewOffset={56}
          />
        }
        {...props}
      >
        {children}
      </ScrollView>
    );
  }
);

PullToRefresh.displayName = "PullToRefresh";

interface RotatingRefreshIconProps {
  isAnimating: boolean;
  size?: number;
  color?: string;
  onPress?: () => void;
}

export function RotatingRefreshIcon({
  isAnimating,
  size = 24,
  color = "#EA580C",
  onPress,
}: RotatingRefreshIconProps) {
  const rotateValue = useSharedValue(0);

  React.useEffect(() => {
    if (isAnimating) {
      rotateValue.value = withRepeat(
        withTiming(360, { duration: 800, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotateValue);
      rotateValue.value = 0;
    }
  }, [isAnimating, rotateValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Feather name="refresh-cw" size={size} color={color} onPress={onPress} />
    </Animated.View>
  );
}

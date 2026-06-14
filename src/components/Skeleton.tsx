/**
 * 스켈레톤 로딩 컴포넌트
 * - Skeleton: 단일 블록 shimmer (opacity 루프 애니메이션)
 * - NewsCardSkeleton: 뉴스 카드 전체 스켈레톤
 * - KeywordChipSkeleton: 키워드 칩 목록 스켈레톤
 */
import { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// ── 단일 스켈레톤 블록 (shimmer 효과)
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── 뉴스 카드 스켈레톤
export function NewsCardSkeleton() {
  return (
    <View className="bg-white rounded-xl p-4 mb-3 gap-3">
      <Skeleton height={18} width="85%" />
      <Skeleton height={14} width="55%" />
      <View className="flex-row items-center gap-2">
        <Skeleton height={22} width={60} borderRadius={6} />
        <Skeleton height={14} width={80} />
      </View>
    </View>
  );
}

// ── 키워드 칩 스켈레톤
export function KeywordChipSkeleton() {
  return (
    <View className="flex-row gap-2 px-4 py-2.5">
      {[70, 55, 65, 50].map((w, i) => (
        <Skeleton key={i} height={34} width={w} borderRadius={999} />
      ))}
    </View>
  );
}
/**
 * 접근성 폰트 크기 적용 Text 컴포넌트
 * - 설정(useSettingsStore.fontOffset)에 따라 fontSize를 동적으로 오프셋 적용
 * - Tailwind 클래스(text-xs~text-3xl)를 파싱해 기준 크기를 자동 추출
 */
import { Text as RNText, TextProps } from 'react-native';
import { useSettingsStore } from '@/stores/useSettingsStore';

const TAILWIND_SIZES: Record<string, number> = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
};

export default function Text({ className, style, ...props }: TextProps) {
  const fontOffset = useSettingsStore((s) => s.fontOffset);

  const baseSize = className
    ? Object.entries(TAILWIND_SIZES).find(([cls]) => className.includes(cls))?.[1]
    : undefined;
  const fontFamily = className?.includes('font-bold')
    ? 'Pretendard-Bold'
    : className?.includes('font-semibold')
      ? 'Pretendard-SemiBold'
      : className?.includes('font-medium')
        ? 'Pretendard-Medium'
        : 'Pretendard-Regular';

  return (
    <RNText
      className={className}
      style={[{ fontFamily }, baseSize != null && { fontSize: baseSize + fontOffset }, style]}
      {...props}
    />
  );
}

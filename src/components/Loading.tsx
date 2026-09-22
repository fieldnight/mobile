/**
 * 전체 화면 로딩 인디케이터
 * - 데이터 패칭 중 화면 중앙에 스피너 + 선택적 텍스트 표시
 */
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { PretendardFont } from '@/components/PretendardFont';

interface LoadingProps {
  text?: string;
}

export function Loading({ text }: LoadingProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#2563eb" />
      {text && (
        <PretendardFont className="text-gray-600 mt-4">{text}</PretendardFont>
      )}
    </View>
  );
}

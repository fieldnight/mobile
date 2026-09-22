/**
 * 준비 중 화면 컴포넌트
 * - 아직 개발되지 않은 페이지에 임시로 표시
 * - title / message prop으로 메시지 커스텀 가능
 */
import React from 'react';
import { View, Text } from 'react-native';
import { PretendardFont } from '@/components/PretendardFont';

interface ComingSoonProps {
  title?: string;
  message?: string;
}

export function ComingSoon({
  title = '개발 중',
  message = '이 기능은 현재 개발 중입니다.'
}: ComingSoonProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-6">
        <Text className="text-5xl">🚧</Text>
      </View>
      <PretendardFont weight="bold" className="text-2xl text-gray-900 mb-3 text-center">
        {title}
      </PretendardFont>
      <PretendardFont className="text-base text-gray-600 text-center">
        {message}
      </PretendardFont>
    </View>
  );
}

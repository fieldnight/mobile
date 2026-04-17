import React from 'react';
import { View, Text } from 'react-native';

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
      <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
        {title}
      </Text>
      <Text className="text-base text-gray-600 text-center">
        {message}
      </Text>
    </View>
  );
}

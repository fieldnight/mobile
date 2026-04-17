import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingProps {
  text?: string;
}

export function Loading({ text }: LoadingProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#2563eb" />
      {text && (
        <Text className="text-gray-600 mt-4">{text}</Text>
      )}
    </View>
  );
}

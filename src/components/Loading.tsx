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

import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { clsx } from 'clsx';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  containerClassName,
  className,
  ...props
}: InputProps) {
  return (
    <View className={clsx('w-full', containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">
          {label}
        </Text>
      )}
      <TextInput
        className={clsx(
          'w-full h-12 px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900',
          'focus:border-blue-500 focus:bg-white',
          error && 'border-red-500',
          className
        )}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && (
        <Text className="text-sm text-red-500 mt-1">
          {error}
        </Text>
      )}
    </View>
  );
}

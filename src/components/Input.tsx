import React from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import { clsx } from 'clsx';
import { PretendardFont } from '@/components/PretendardFont';

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
        <PretendardFont weight="medium" className="text-sm text-gray-700 mb-2">
          {label}
        </PretendardFont>
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
        <PretendardFont className="text-sm text-red-500 mt-1">
          {error}
        </PretendardFont>
      )}
    </View>
  );
}

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { clsx } from 'clsx';

interface CardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  className?: string;
}

export function Card({
  title,
  description,
  children,
  onPress,
  className,
}: CardProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      className={clsx(
        'bg-white rounded-2xl p-5 shadow-sm',
        onPress && 'active:scale-98',
        className
      )}
    >
      {title && (
        <Text className="text-lg font-bold text-gray-900 mb-2">
          {title}
        </Text>
      )}
      {description && (
        <Text className="text-sm text-gray-600 mb-3">
          {description}
        </Text>
      )}
      {children}
    </Container>
  );
}

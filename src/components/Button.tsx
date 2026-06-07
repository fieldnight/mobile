import React from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { PretendardFont } from '@/components/PretendardFont';
import { clsx } from 'clsx';

interface ButtonProps {
  onPress?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
}: ButtonProps) {
  const baseStyles = 'rounded-full items-center justify-center active:scale-95 transition-transform';

  const variantStyles = {
    primary: 'bg-blue-600 active:bg-blue-700',
    secondary: 'bg-gray-600 active:bg-gray-700',
    outline: 'bg-transparent border-2 border-blue-600 active:bg-blue-50',
  };

  const sizeStyles = {
    sm: 'h-10 px-4',
    md: 'h-12 px-6',
    lg: 'h-14 px-8',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const textColorStyles = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-blue-600',
  };

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-50',
        className
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#2563eb' : '#ffffff'} />
      ) : (
        <PretendardFont
          weight="semibold"
          className={clsx(
            textSizeStyles[size],
            textColorStyles[variant]
          )}
        >
          {children}
        </PretendardFont>
      )}
    </Pressable>
  );
}

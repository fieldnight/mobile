/**
 * Card
 * - 재사용 가능한 카드형 레이아웃 컴포넌트입니다.
 * - title / description / children을 받아 카드 내부 콘텐츠를 구성합니다.
 * - onPress가 전달되면 Pressable로 동작하여 클릭 가능한 카드가 됩니다.
 * - 주로 진단, 추천, 추천 상세, 상담 기록 등의 화면에서 사용됩니다.
 */
import React from "react";
import { View, Pressable } from "react-native";
import { clsx } from "clsx";
import { PretendardFont } from "@/components/PretendardFont";

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
        "bg-white rounded-2xl p-5 shadow-sm",
        onPress && "active:scale-98",
        className,
      )}
    >
      {title && (
        <PretendardFont weight="bold" className="text-lg text-gray-900 mb-2">
          {title}
        </PretendardFont>
      )}
      {description && (
        <PretendardFont className="text-sm text-gray-600 mb-3">
          {description}
        </PretendardFont>
      )}
      {children}
    </Container>
  );
}

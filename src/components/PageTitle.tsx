/**
 * 페이지 상단 타이틀 컴포넌트
 * - title: 굵고 큰 메인 제목 (줄바꿈 \n 지원)
 * - subtitle: 제목 아래 작은 안내 문구 (선택)
 * - right: 제목 우측에 띄울 노드 (선택, 예: 지역명·배지 등)
 * - size: "large"(기본, 22px) | "medium"(섹션 제목용, 18px)
 */
import React from "react";
import { View, type TextStyle } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

interface PageTitleProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  size?: "large" | "medium";
  titleStyle?: TextStyle;
}

export function PageTitle({
  title,
  subtitle,
  right,
  size = "large",
  titleStyle,
}: PageTitleProps) {
  const fontSize = size === "large" ? 22 : 18;
  const lineHeight = size === "large" ? 30 : 26;

  return (
    <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <PretendardFont
          weight="bold"
          style={[{ fontSize, color: C.text, lineHeight, flex: 1 }, titleStyle]}
        >
          {title}
        </PretendardFont>
        {right && <View style={{ marginTop: 4 }}>{right}</View>}
      </View>
      {subtitle && (
        <PretendardFont style={{ fontSize: 14, color: C.sec, marginTop: 2 }}>
          {subtitle}
        </PretendardFont>
      )}
    </View>
  );
}

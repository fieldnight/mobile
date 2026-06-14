/**
 * 리포트 기간/보기 선택 카드
 * - 기간: 일간/주간/월간 데이터 범위를 고릅니다.
 * - 보기: 차트/통합/표 표시 방식을 고릅니다.
 */
import type { ReactNode } from "react";
import { Platform, Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { VIEW_MODES } from "@/features/hive-status/constants";
import { C } from "@/constants/hive-colors";
import type { Period } from "@/types";

const PERIODS: Period[] = ["일간", "주간", "월간"];

interface PeriodCardProps {
  period: Period;
  onSelect: (period: Period) => void;
  viewMode: "chart" | "combined" | "table";
  onViewModeChange: (mode: "chart" | "combined" | "table") => void;
  weatherContent: ReactNode;
  children?: ReactNode;
}

function triggerHaptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function OptionRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-3 flex-row items-stretch">
      <View className="mr-3 items-center justify-center ">
        <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
          {label}
        </PretendardFont>
      </View>
      <View className="flex-1 flex-row gap-3">{children}</View>
    </View>
  );
}

function OptionButton({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center rounded-lg py-2.5"
      style={{
        backgroundColor: active ? C.text : C.white,
        borderWidth: 1,
        borderColor: active ? C.text : C.border,
      }}
      data-testid={testID}
    >
      <PretendardFont
        weight={active ? "bold" : "medium"}
        style={{
          fontSize: 13,
          color: active ? C.white : C.sec,
        }}
        numberOfLines={1}
      >
        {label}
      </PretendardFont>
    </Pressable>
  );
}

export function PeriodCard({
  period,
  onSelect,
  viewMode,
  onViewModeChange,
  weatherContent,
  children,
}: PeriodCardProps) {
  return (
    <Card
      delay={25}
      className="mx-[-14] pb-10 elevation-none"
      style={{ backgroundColor: "rgba(255,255,255,0.643)" }}
    >
      <OptionRow label="기간선택">
        {PERIODS.map((item) => (
          <OptionButton
            key={item}
            label={item}
            active={period === item}
            testID={`button-period-${item}`}
            onPress={() => {
              triggerHaptic();
              onSelect(item);
            }}
          />
        ))}
      </OptionRow>

      <OptionRow label="보기방식">
        {VIEW_MODES.map((item) => (
          <OptionButton
            key={item.key}
            label={item.label}
            active={viewMode === item.key}
            testID={`button-view-${item.key}`}
            onPress={() => {
              triggerHaptic();
              onViewModeChange(item.key);
            }}
          />
        ))}
      </OptionRow>

      <View className="mb-10 rounded-lg p-4" style={{ backgroundColor: C.bg }}>
        {weatherContent}
      </View>
      {children}
    </Card>
  );
}

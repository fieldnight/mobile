/**
 * 리포트 기간/보기 선택 카드
 * - 기간: 일간/주간/월간 데이터 범위를 고릅니다.
 * - 보기: 차트/통합/표 표시 방식을 고릅니다.
 */
import { useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card, SolidToggleButton } from "@/components/hive/hive-shared";
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

function OptionRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-2" accessibilityLabel={label}>
      <View className="flex-row gap-2">{children}</View>
    </View>
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
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const lastHapticAt = useRef(0);

  function triggerHaptic() {
    if (Platform.OS === "web") return;
    const now = Date.now();
    if (now - lastHapticAt.current < 80) return;
    lastHapticAt.current = now;
    void Haptics.selectionAsync().catch(() => undefined);
  }

  return (
    <Card
      delay={25}
      translucent
      style={{
        paddingHorizontal: 10,
        paddingTop: 6,
        paddingBottom: 6,
      }}
    >
      <OptionRow label="조회 기간">
        {PERIODS.map((item) => (
          <SolidToggleButton
            key={item}
            label={item}
            active={period === item}
            testID={`button-period-${item}`}
            onPress={() => {
              if (period !== item) triggerHaptic();
              onSelect(item);
            }}
          />
        ))}
      </OptionRow>

      <OptionRow label="보기 방식">
        {VIEW_MODES.map((item) => (
          <SolidToggleButton
            key={item.key}
            label={item.label}
            active={viewMode === item.key}
            testID={`button-view-${item.key}`}
            onPress={() => {
              if (viewMode !== item.key) triggerHaptic();
              onViewModeChange(item.key);
            }}
          />
        ))}
      </OptionRow>

      {children}
      <View className="mt-2 border-t" style={{ borderColor: C.border }}>
        <Pressable
          onPress={() => setWeatherExpanded((expanded) => !expanded)}
          accessibilityRole="button"
          accessibilityLabel="지역 날씨"
          accessibilityState={{ expanded: weatherExpanded }}
          className="flex-row items-center justify-between"
          style={{ minHeight: 40 }}
        >
          <View className="flex-row items-center gap-2">
            <Feather name="cloud" size={16} color={C.sec} />
            <PretendardFont weight="medium" style={{ fontSize: 14, color: C.sec }}>
              지역 날씨 함께 보기
            </PretendardFont>
          </View>
          <Feather name={weatherExpanded ? "chevron-up" : "chevron-down"} size={18} color={C.sec} />
        </Pressable>
        {weatherExpanded && (
          <View className="rounded-lg p-3" style={{ backgroundColor: C.bg }}>
            {weatherContent}
          </View>
        )}
      </View>
    </Card>
  );
}

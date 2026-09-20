/**
 * 리포트 기간/보기 선택 카드
 * - 기간: 일간/주간/월간 데이터 범위를 고릅니다.
 * - 보기: 차트/통합/표 표시 방식을 고릅니다.
 */
import { useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
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

function OptionRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="flex-row items-center" style={{ minHeight: 44, marginBottom: 2 }}>
      <PretendardFont
        weight="medium"
        style={{ width: 64, fontSize: 12, color: C.sec }}
      >
        {label}
      </PretendardFont>
      <View className="flex-1 flex-row gap-2">{children}</View>
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: "center",
        borderRadius: 8,
        paddingVertical: 10,
        minHeight: 44,
        justifyContent: "center",
        backgroundColor: active ? C.text : C.white,
        borderWidth: 1,
        borderColor: active ? C.text : C.border,
        opacity: pressed ? 0.55 : 1,
      })}
      testID={testID}
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
      style={{
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 10,
        backgroundColor: "rgba(255,255,255,0.72)",
        elevation: 0,
      }}
    >
      <OptionRow label="조회 기간">
        {PERIODS.map((item) => (
          <OptionButton
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
          <OptionButton
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
      <View className="mt-4 border-t" style={{ borderColor: C.border }}>
        <Pressable
          onPress={() => setWeatherExpanded((expanded) => !expanded)}
          accessibilityRole="button"
          accessibilityLabel="지역 날씨"
          accessibilityState={{ expanded: weatherExpanded }}
          className="flex-row items-center justify-between"
          style={{ minHeight: 48 }}
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

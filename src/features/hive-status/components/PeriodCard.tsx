import { View, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import type { ReactNode } from "react";
import type { Period } from "@/types";
import { C } from "@/constants/hive-colors";

const PERIODS: Period[] = ["일간", "주간", "월간"];

interface PeriodCardProps {
  period: Period;
  onSelect: (p: Period) => void;
  weatherContent: ReactNode;
  children?: ReactNode;
}

export function PeriodCard({
  period,
  onSelect,
  weatherContent,
  children,
}: PeriodCardProps) {
  return (
    <Card delay={25}>
      <View className="space-y-5">
        <View className="flex-row rounded-[10px] gap-1 bg-white p-1">
          {PERIODS.map((p) => {
            const active = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => {
                  if (Platform.OS !== "web")
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(p);
                }}
                className="flex-1 items-center py-2.5 rounded-lg"
                style={{
                  backgroundColor: active ? C.primary : C.white,
                  borderWidth: 1,
                  borderColor: active ? C.primary : C.border,
                }}
                data-testid={`button-period-${p}`}
              >
                <PretendardFont
                  weight={active ? "semibold" : "medium"}
                  style={{
                    fontSize: 14,
                    color: active ? C.buttonActiveText : C.sec,
                  }}
                >
                  {p}
                </PretendardFont>
              </Pressable>
            );
          })}
        </View>
        {weatherContent}
      </View>
      {children}
    </Card>
  );
}

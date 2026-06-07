import { View, Text } from "react-native";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

const GUIDE_ITEMS = [
  {
    label: "온도",
    value: "20~27°C",
    desc: "이 범위를 벗어나면 벌 활동이 줄어들어요",
  },
  {
    label: "습도",
    value: "50~70%",
    desc: "너무 건조하거나 습하면 밀랍 관리가 어려워요",
  },
  {
    label: "CO₂",
    value: "500ppm 이하",
    desc: "환기가 잘 되고 있다면 안심이에요",
  },
];

/**
 * HiveEnvironmentGuide
 * - 벌통 통계 화면에서 적정 환경 가이드를 카드로 표시합니다.
 * - 온도 / 습도 / CO₂ 기준을 한눈에 보여줍니다.
 */
export function HiveEnvironmentGuide() {
  return (
    <Card delay={300}>
      <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
        🌡️ 적정 환경 가이드
      </PretendardFont>
      <View className="mt-2 space-y-2">
        {GUIDE_ITEMS.map((item) => (
          <View key={item.label} className="flex-row gap-2 items-start">
            <View className="min-w-[44px] px-2 py-1 rounded-lg bg-primary-soft items-center justify-center">
              <Text className="text-xs font-semibold text-primary">
                {item.label}
              </Text>
            </View>
            <View className="flex-1">
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 14, color: C.text }}
              >
                {item.value}
              </PretendardFont>
              <Text className="text-xs text-[#8A99A8] mt-1">{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

import { View } from "react-native";
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
    <Card
      delay={300}
      className="mb-10"
      style={{
        marginHorizontal: -14,
        backgroundColor: "rgba(255,255,255,0.643)",
        elevation: 0,
      }}
    >
      <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
        적정 환경 가이드
      </PretendardFont>
      <View className="mt-3 gap-3">
        {GUIDE_ITEMS.map((item) => (
          <View key={item.label} className="flex-row gap-3 items-start">
            {/* 항목 레이블 뱃지 */}
            <View
              className="min-w-[48px] px-2.5 py-1.5 rounded-lg items-center justify-center"
              style={{ backgroundColor: C.bg }}
            >
              <PretendardFont
                weight="bold"
                style={{ fontSize: 13, color: C.text }}
              >
                {item.label}
              </PretendardFont>
            </View>
            <View className="flex-1">
              <PretendardFont
                weight="bold"
                style={{ fontSize: 15, color: C.text }}
              >
                {item.value}
              </PretendardFont>
              {/* 설명 텍스트: 더 잘 보이도록 sec 색 사용 */}
              <PretendardFont
                style={{ fontSize: 13, color: C.sec, marginTop: 3 }}
              >
                {item.desc}
              </PretendardFont>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

/** 앱 기능과 벌통 관리에 관한 짧은 팁. 앱에 실제로 있는 기준과 기능만 적습니다. */
const TIPS = [
  "수정벌 권장 내부 온도는 24~27°C예요. 홈 다이얼의 초록 구간이 이 범위예요.",
  "끝난 시간대 기록은 한 번 받으면 휴대폰에 저장돼서, 다음엔 바로 열려요.",
  "10초 간격은 기록이 많아 처음엔 조금 걸려요. 1분 간격이 가장 빨리 열려요.",
  "표를 좌우로 밀면 팬·펠티어·전류·센서 상태까지 볼 수 있어요. 시간 열은 그대로 남아요.",
  "목표 온도를 바꾸면 벌통이 펠티어로 냉각하거나 가열해서 그 온도를 맞춰요.",
  "리포트에서 기간별로 권장 온도를 얼마나 지켰는지 한눈에 볼 수 있어요.",
  "벌 교체 후 45일이 지나면 전체보기 카드에 빨간색으로 알려드려요.",
];
const ROTATE_MS = 4000;

/** 기록을 처음 불러오는 동안 스피너와 함께 팁을 번갈아 보여줍니다. */
export function LoadingTips() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setIndex((current) => (current + 1) % TIPS.length);
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [opacity]);

  return (
    <View accessibilityLiveRegion="polite" style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 8 }}>
      <ActivityIndicator color={C.textAlt} />
      <PretendardFont style={{ marginTop: 12, fontSize: 13, color: C.sec }}>기록을 불러오고 있어요</PretendardFont>
      <Animated.View style={{ opacity, marginTop: 20, alignSelf: "stretch", borderRadius: 16, padding: 16, backgroundColor: "#F5F6F8" }}>
        <PretendardFont weight="bold" style={{ fontSize: 12, color: "#2B7DA3" }}>알아두면 좋아요</PretendardFont>
        <PretendardFont style={{ marginTop: 6, fontSize: 14, lineHeight: 21, color: C.text }}>{TIPS[index]}</PretendardFont>
      </Animated.View>
    </View>
  );
}

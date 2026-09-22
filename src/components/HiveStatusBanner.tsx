/**
 * 홈 화면 벌통 상태 배너
 * - 좌: 내 벌통 현황 카드 (온라인/오프라인 수, 점검 필요 여부)
 * - 우: 기능 가이드 카드 ("처음이라면" 배지)
 * - 탭 시 스케일 애니메이션 + 각각 페이지 이동
 */
import { View, Pressable, Animated } from "react-native";
import { useRef } from "react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "./PretendardFont";
import { useHiveStore } from "@/stores/useHiveStore";
import { C } from "@/constants/hive-colors";

export function HiveStatusBanner() {
  const router = useRouter();
  const hives = useHiveStore((s) => s.hives);

  const offlineCount = hives.filter((h) => h.status === "offline").length;
  const statusLabel =
    hives.length === 0
      ? "벌통을 등록해보세요"
      : offlineCount === 0
        ? `${hives.length}대 모두 정상`
        : `${offlineCount}대 점검 필요`;
  const statusColor = offlineCount > 0 ? C.error : C.success;

  const hiveScale = useRef(new Animated.Value(1)).current;
  const guideScale = useRef(new Animated.Value(1)).current;
  const press = (v: Animated.Value, to: number) =>
    Animated.timing(v, { toValue: to, duration: to < 1 ? 80 : 120, useNativeDriver: true }).start();

  return (
    <View className="mb-4">
      <View className="px-5 mb-2">
        <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
          농장 한 바퀴 둘러볼까요?
        </PretendardFont>
      </View>

      <View className="flex-row px-4" style={{ gap: 10 }}>
        {/* 벌통 현황 */}
        <Animated.View style={{ flex: 1, transform: [{ scale: hiveScale }] }}>
          <Pressable
            onPress={() => router.push("/hive-control")}
            onPressIn={() => press(hiveScale, 0.97)}
            onPressOut={() => press(hiveScale, 1)}
            className="bg-white rounded-2xl p-4"
            style={{
              minHeight: 96,
            }}
          >
            <View className="flex-row items-center gap-1.5 mb-2">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
              <PretendardFont weight="bold" style={{ fontSize: 13, color: statusColor }}>
                {offlineCount > 0 ? "점검 필요" : "정상"}
              </PretendardFont>
            </View>
            <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
              내 벌통 현황
            </PretendardFont>
            <PretendardFont weight="medium" style={{ fontSize: 13, color: C.sec, marginTop: 3 }}>
              {statusLabel}
            </PretendardFont>
          </Pressable>
        </Animated.View>

        {/* 기능 가이드 */}
        <Animated.View style={{ flex: 1, transform: [{ scale: guideScale }] }}>
          <Pressable
            onPress={() => router.push("/feature-guide")}
            onPressIn={() => press(guideScale, 0.97)}
            onPressOut={() => press(guideScale, 1)}
            className="rounded-2xl p-4"
            style={{
              minHeight: 96,
              backgroundColor: "#EBF4FF",
            }}
          >
            <View className="flex-row items-center gap-1.5 mb-2">
              <View className="bg-orange-400 px-2 py-0.5 rounded-full">
                <PretendardFont weight="bold" style={{ fontSize: 10, color: "#fff" }}>
                  처음이라면
                </PretendardFont>
              </View>
            </View>
            <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
              기능 가이드
            </PretendardFont>
            <PretendardFont weight="medium" style={{ fontSize: 13, color: C.sec, marginTop: 3 }}>
              농번기 필수 기능
            </PretendardFont>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

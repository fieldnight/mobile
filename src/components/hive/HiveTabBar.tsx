/**
 * 벌통 화면 공통 탭바
 * - 스마트벌통 / 리포트 / 전체보기 / 설정 탭
 * - 현재 라우트 기준 활성 탭 자동 감지 (useSegments)
 * - 탭 전환 시 햅틱 피드백 + router.replace로 이동
 * - 활성 탭은 하단 선(3px)으로 표시
 */
import { Platform, Pressable, View, type ViewStyle } from "react-native";
import { router, useSegments } from "expo-router";
import * as Haptics from "expo-haptics";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

const TABS = [
  { label: "스마트벌통", route: "/hive-control" },
  { label: "리포트", route: "/hive-stats" },
  { label: "전체보기", route: "/hive-overview" },
  { label: "설정", route: "/hive-setting" },
] as const;

function HiveTabButton({
  label,
  route,
  active,
}: {
  label: string;
  route: string;
  active: boolean;
}) {
  const handlePress = () => {
    if (active) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.replace(route as never);
  };

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ color: "#F2F4F6", borderless: false }}
      className="h-16 flex-1 items-center justify-center"
      style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
    >
      <PretendardFont
        weight={active ? "bold" : "semibold"}
        className="text-[16px]"
        style={{ color: active ? C.text : C.ter }}
      >
        {label}
      </PretendardFont>

      {/* 활성 탭을 하단 선 하나로 표시해, 버튼형 탭보다 가볍게 페이지 위치를 보여줍니다. */}
      <View
        className="absolute bottom-0 h-[3px] rounded-full"
        style={{
          width: active ? 68 : 0,
          backgroundColor: active ? C.text : "transparent",
        }}
      />
    </Pressable>
  );
}

export function HiveTabBar({ style }: { style?: ViewStyle }) {
  const segments = useSegments();
  const currentRoute = segments[0] ?? "";

  return (
    <View
      className="bg-white"
      style={[
        {
          borderBottomWidth: 1,
          borderBottomColor: "#EEF0F2",
        },
        style,
      ]}
    >
      {/* 공통 상단바 높이에 맞춘 텍스트 탭입니다. */}
      <View className="h-16 flex-row items-end px-2">
        {TABS.map((tab) => {
          const routeKey = tab.route.replace("/", "");
          return (
            <HiveTabButton
              key={tab.route}
              label={tab.label}
              route={tab.route}
              active={currentRoute === routeKey}
            />
          );
        })}
      </View>
    </View>
  );
}

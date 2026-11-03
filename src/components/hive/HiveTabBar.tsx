/**
 * 벌통 화면 공통 탭바
 * - 스마트벌통 / 리포트 / 전체보기 / 설정 탭
 * - 현재 라우트 기준 활성 탭 자동 감지 (useSegments)
 * - 탭 전환 시 햅틱 피드백 + router.replace로 이동
 * - 같은 너비의 버튼 네 개. 선택된 탭은 벌통 카드와 같은 남색으로 채워 한눈에 현재 위치를 보여줍니다.
 *   기간·보기 선택(회색 트랙 + 흰 선택)과 겹쳐 보이지 않도록 채움 방식을 다르게 했습니다.
 */
import { Platform, View, type ViewStyle } from "react-native";
import { router, useSegments } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { T } from "@/features/hive-home/theme";

const TABS = [
  { label: "스마트벌통", route: "/hive-control" },
  { label: "리포트", route: "/hive-stats" },
  { label: "전체보기", route: "/hive-overview" },
  { label: "설정", route: "/hive-setting" },
] as const;

function HiveTabButton({ label, route, active }: { label: string; route: string; active: boolean }) {
  const handlePress = () => {
    if (active) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
    router.replace(route as never);
  };

  return (
    <Tap
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => ({
        flex: 1,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? T.ink : pressed ? T.keyPressed : "transparent",
      })}
    >
      <PretendardFont
        weight={active ? "bold" : "semibold"}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{ fontSize: 15, letterSpacing: -0.2, color: active ? T.panel : T.inkSoft }}
      >
        {label}
      </PretendardFont>
    </Tap>
  );
}

export function HiveTabBar({ style }: { style?: ViewStyle }) {
  const segments = useSegments();
  const currentRoute = segments[0] ?? "";

  return (
    <View
      accessibilityRole="tablist"
      style={[{ flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }, style]}
    >
      {TABS.map((tab) => (
        <HiveTabButton
          key={tab.route}
          label={tab.label}
          route={tab.route}
          active={currentRoute === tab.route.replace("/", "")}
        />
      ))}
    </View>
  );
}

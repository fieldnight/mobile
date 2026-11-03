import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { T } from "../theme";

export interface QuickAction {
  id: string;
  label: string;
  caption: string;
  icon: keyof typeof Feather.glyphMap;
  /** 켜짐 상태(예: 실시간 수신 중)면 아이콘 원을 브랜드색으로 칠합니다. */
  active?: boolean;
  /** 한 줄에서 가장 먼저 눌러야 할 버튼. 크기는 같고 색으로만 강조합니다. */
  emphasis?: boolean;
  onPress: () => void;
}

const LIVE_DOT = "#8BE3A8";

/**
 * 강조 여부에 따른 색 묶음
 * - 강조: 벌통 화면의 선택 카드·확인 버튼과 같은 남색 면(흰 글자 대비 약 16:1)
 * - 기본: 흰 면 + 회색 아이콘 원
 */
function getPalette(action: QuickAction) {
  if (action.emphasis) {
    return {
      bg: T.ink,
      bgPressed: "#333B45",
      iconBg: "rgba(255,255,255,0.18)",
      icon: T.panel,
      label: T.panel,
      caption: "rgba(255,255,255,0.86)",
      dot: LIVE_DOT,
    };
  }
  return {
    bg: T.panel,
    bgPressed: T.keyPressed,
    iconBg: action.active ? T.brand : T.key,
    icon: action.active ? T.panel : T.ink,
    label: T.ink,
    caption: action.active ? T.good : T.muted,
    dot: T.good,
  };
}

/** 리모컨 버튼처럼 한 줄에 나란히 놓는 바로가기 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <View className="flex-row gap-2">
      {actions.map((action) => {
        const palette = getPalette(action);
        return (
          <Tap
            key={action.id}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}, ${action.caption}`}
            onPress={action.onPress}
            className="flex-1 min-h-[96px] rounded-[20px] py-3.5 px-2 items-center justify-center"
            style={({ pressed }) => ({ backgroundColor: pressed ? palette.bgPressed : palette.bg })}
          >
            <View className="w-[38px] h-[38px] rounded-full items-center justify-center" style={{ backgroundColor: palette.iconBg }}>
              <Feather name={action.icon} size={18} color={palette.icon} />
            </View>
            <PretendardFont weight="bold" numberOfLines={1} style={{ marginTop: 8, fontSize: 14, color: palette.label }}>
              {action.label}
            </PretendardFont>
            <View className="flex-row items-center gap-1 mt-0.5 max-w-full">
              {action.active && action.emphasis ? (
                <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.dot }} />
              ) : null}
              <PretendardFont numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: palette.caption }}>
                {action.caption}
              </PretendardFont>
            </View>
          </Tap>
        );
      })}
    </View>
  );
}

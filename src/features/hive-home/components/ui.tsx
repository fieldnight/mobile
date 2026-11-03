/**
 * 벌통 화면 공용 UI 조각
 * - Panel: 회색 캔버스 위 흰 면. 그림자·테두리 없이 면 대비로만 구분합니다.
 * - Segmented: iOS식 분할 선택. 기간·보기·간격처럼 하나만 고르는 값에 씁니다.
 * - SectionHeader: 섹션 제목과 오른쪽 보조 요소.
 * - RiseIn: 화면에 들어올 때 섹션이 아래에서 떠오르는 등장 모션.
 */
import { Platform, View, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "@/lib/haptics";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { R, T } from "../theme";

/** 벌통 탭 섹션 등장 모션. 설정 탭 카드(0.3초)보다 50% 빠르게, 섹션마다 조금씩 늦게 떠오릅니다. */
export const RISE_DURATION_MS = 150;
const RISE_STAGGER_MS = 50;

export function riseDelay(index: number) {
  return index * RISE_STAGGER_MS;
}

/**
 * 화면 전환 직후 섹션이 한꺼번에 툭 나타나는 대신 아래에서 차례로 떠오르게 합니다.
 * 벌통을 바꿀 때 다시 그려지는 내용은 이 래퍼 안쪽에 두면(래퍼는 그대로) 처음 들어올 때만 움직입니다.
 */
export function RiseIn({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Animated.View entering={FadeInDown.delay(riseDelay(index)).duration(RISE_DURATION_MS).springify()} style={style}>
      {children}
    </Animated.View>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ backgroundColor: T.panel, borderRadius: R.panel, padding: 20 }, style]}>{children}</View>;
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
  compact = false,
}: {
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  /** 화면 낭독기에 읽히는 그룹 이름 */
  label: string;
  compact?: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: "row", padding: 3, borderRadius: 12, backgroundColor: "#E8EBEF" }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Tap
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
              onChange(option.value);
            }}
            hitSlop={compact ? { top: 4, bottom: 4 } : undefined}
            style={({ pressed }) => ({
              flex: compact ? undefined : 1,
              minHeight: compact ? 36 : 40,
              paddingHorizontal: compact ? 14 : 8,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? T.panel : pressed ? "#DDE1E6" : "transparent",
            })}
          >
            <PretendardFont weight={active ? "bold" : "medium"} style={{ fontSize: 14, color: active ? T.ink : T.inkSoft }}>
              {option.label}
            </PretendardFont>
          </Tap>
        );
      })}
    </View>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 36 }}>
      <PretendardFont accessibilityRole="header" weight="bold" style={{ fontSize: 17, color: T.ink }}>
        {title}
      </PretendardFont>
      {right}
    </View>
  );
}

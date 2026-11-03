import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { ScrollView, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import type { HiveData } from "@/types/hive-control";
import { formatValue, getHiveCondition } from "../model/hiveCondition";
import { T } from "../theme";

const CARD_W = 140;
const CARD_H = 104;
const GAP = 10;
const SIDE = 16;
// 선택 카드 왼쪽에 이전 카드가 살짝 보이도록 남기는 여백
const PEEK = 24;

function offsetFor(progress: number) {
  return Math.max(0, progress * (CARD_W + GAP) - SIDE - PEEK);
}

export interface HiveCardRailHandle {
  /** 아래 페이저의 넘김 위치(0, 0.5, 1 …)에 맞춰 카드 줄을 애니메이션 없이 옮깁니다. */
  follow: (progress: number) => void;
}

/**
 * 상단 벌통 카드 줄
 * - 카드 한 장이 벌통 하나입니다. 누르면 아래 상태·조작·리포트가 그 벌통으로 바뀝니다.
 * - followsPager면 아래 페이저가 넘어가는 위치를 follow로 받아 같은 속도로 따라 움직입니다(따로 애니메이션하지 않음).
 * - 아니면 선택이 바뀔 때 선택 카드가 보이도록 스스로 스크롤합니다.
 * - compact면 연결 점과 이름만 있는 한 줄 칩으로 그립니다(실시간 확인처럼 기록을 많이 보여야 하는 화면용).
 */
export const HiveCardRail = forwardRef<HiveCardRailHandle, {
  hives: HiveData[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** 없으면 추가 카드를 그리지 않습니다. */
  onAdd?: () => void;
  /** 위치를 페이저가 follow로 맞춰주는 화면이면 true */
  followsPager?: boolean;
  compact?: boolean;
}>(function HiveCardRail({ hives, selectedId, onSelect, onAdd, followsPager = false, compact = false }, ref) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const selectedIndex = Math.max(0, hives.findIndex((hive) => hive.id === selectedId));
  // 처음 그릴 때는 선택 카드 위치에서 시작합니다.
  const initialOffsetRef = useRef(offsetFor(selectedIndex));

  useEffect(() => {
    if (followsPager) return;
    scrollRef.current?.scrollTo({ x: offsetFor(selectedIndex), animated: true });
  }, [followsPager, selectedIndex]);

  useImperativeHandle(ref, () => ({
    follow: (progress) => scrollRef.current?.scrollTo({ x: offsetFor(progress), animated: false }),
  }), []);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      contentOffset={{ x: initialOffsetRef.current, y: 0 }}
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP }}
    >
      {hives.map((hive) => {
        const active = hive.id === selectedId;
        const online = hive.status === "online";
        const condition = getHiveCondition(hive);
        const fg = active ? T.panel : T.ink;
        const sub = active ? "rgba(255,255,255,0.68)" : T.muted;
        if (compact) {
          return (
            <Tap
              key={hive.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${hive.name}, ${online ? "실시간" : "오프라인"}`}
              onPress={() => {
                if (!active) onSelect(hive.id);
              }}
              className="h-10 px-3.5 flex-row items-center gap-1.5 rounded-full"
              style={({ pressed }) => ({ backgroundColor: active ? T.ink : pressed ? T.keyPressed : T.panel })}
            >
              <View className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: online ? condition.color : T.off }} />
              <PretendardFont weight="semibold" numberOfLines={1} style={{ maxWidth: 160, fontSize: 14, color: fg }}>
                {hive.name}
              </PretendardFont>
            </Tap>
          );
        }
        return (
          <Tap
            key={hive.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${hive.name}, 내부 ${formatValue(hive.temperature)}도, ${condition.message}`}
            onPress={() => {
              if (!active) onSelect(hive.id);
            }}
            style={({ pressed }) => ({
              width: CARD_W,
              height: CARD_H,
              padding: 14,
              borderRadius: 20,
              justifyContent: "space-between",
              backgroundColor: active ? T.ink : pressed ? T.keyPressed : T.panel,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: online ? condition.color : T.off }} />
              <PretendardFont style={{ fontSize: 12, color: sub }}>{online ? "실시간" : "오프라인"}</PretendardFont>
            </View>
            <View>
              <PretendardFont weight="semibold" numberOfLines={1} style={{ fontSize: 14.5, color: fg }}>
                {hive.name}
              </PretendardFont>
              <PretendardFont
                weight="semibold"
                style={{ marginTop: 2, fontSize: 22, letterSpacing: -0.6, color: online ? fg : sub, fontVariant: ["tabular-nums"] }}
              >
                {formatValue(hive.temperature)}
                <PretendardFont style={{ fontSize: 13, color: sub }}> °C</PretendardFont>
              </PretendardFont>
            </View>
          </Tap>
        );
      })}

      {onAdd ? <Tap
        accessibilityRole="button"
        accessibilityLabel="벌통 추가"
        onPress={onAdd}
        style={({ pressed }) => ({
          width: 104,
          height: CARD_H,
          borderRadius: 20,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: "#C9CFD6",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: pressed ? T.keyPressed : "transparent",
        })}
      >
        <Feather name="plus" size={20} color={T.inkSoft} />
        <PretendardFont weight="semibold" style={{ fontSize: 13, color: T.inkSoft }}>벌통 추가</PretendardFont>
      </Tap> : null}
    </ScrollView>
  );
});

import { useEffect, useRef, useState } from "react";
import { FlatList, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import type { HiveData } from "@/types/hive-control";
import { useTargetTemperature } from "../hooks/useTargetTemperature";
import { T } from "../theme";
import { HiveStatusPanel } from "./HiveStatusPanel";

/**
 * 벌통 상태 패널을 좌우로 넘기는 페이저
 * - 넘기는 동안 onScrollProgress로 위치(0, 0.5, 1 …)를 알려 상단 카드 줄이 같은 속도로 따라오게 합니다.
 * - 페이지가 절반을 넘는 순간 해당 벌통을 선택해 아래 섹션도 같은 타이밍에 바뀝니다.
 * - 상단 카드를 누르면 그 페이지로 이동하고, 이동 중 지나치는 벌통은 선택하지 않습니다.
 * - 다이얼을 잡고 있는 동안에는 넘김을 잠그고 onDialDragChange로 바깥에도 알립니다.
 */
export function HiveStatusPager({
  hives,
  selectedId,
  onSelect,
  onScrollProgress,
  onDialDragChange,
}: {
  hives: HiveData[];
  selectedId: string;
  onSelect: (id: string) => void;
  onScrollProgress?: (progress: number) => void;
  onDialDragChange?: (dragging: boolean) => void;
}) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<HiveData>>(null);
  const selectedIndex = Math.max(0, hives.findIndex((hive) => hive.id === selectedId));
  const shownIndexRef = useRef(selectedIndex);
  // 카드 선택으로 이동 중일 때의 목적지. 도착하거나 사용자가 직접 넘기면 비웁니다.
  const jumpTargetRef = useRef<number | null>(null);
  const [dialDragging, setDialDragging] = useState(false);

  // 카드 선택이나 목록 순서 변경으로 선택이 바뀌면 해당 페이지로 이동합니다.
  useEffect(() => {
    if (shownIndexRef.current === selectedIndex) return;
    shownIndexRef.current = selectedIndex;
    jumpTargetRef.current = selectedIndex;
    listRef.current?.scrollToOffset({ offset: selectedIndex * width, animated: true });
  }, [selectedIndex, width]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const progress = event.nativeEvent.contentOffset.x / width;
    onScrollProgress?.(progress);

    const jumpTarget = jumpTargetRef.current;
    if (jumpTarget != null) {
      if (Math.abs(progress - jumpTarget) < 0.01) jumpTargetRef.current = null;
      return;
    }
    const index = Math.max(0, Math.min(Math.round(progress), hives.length - 1));
    if (index === shownIndexRef.current) return;
    shownIndexRef.current = index;
    onSelect(hives[index].id);
  };

  const handleDialDrag = (dragging: boolean) => {
    setDialDragging(dragging);
    onDialDragChange?.(dragging);
  };

  return (
    <View>
      <FlatList
        ref={listRef}
        data={hives}
        keyExtractor={(hive) => hive.id}
        horizontal
        pagingEnabled
        scrollEnabled={!dialDragging}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={selectedIndex}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          jumpTargetRef.current = null;
        }}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 16 }}>
            <StatusPage hive={item} onDialDragChange={handleDialDrag} />
          </View>
        )}
      />
      {hives.length > 1 ? (
        <View
          accessible
          accessibilityLabel={`${hives.length}개 중 ${selectedIndex + 1}번째 벌통. 좌우로 넘기거나 위 카드를 눌러 바꿀 수 있어요`}
          className="flex-row justify-center gap-1.5 mt-3"
        >
          {hives.map((hive, index) => (
            <View
              key={hive.id}
              className="h-1.5 rounded-full"
              style={{
                width: index === selectedIndex ? 16 : 6,
                backgroundColor: index === selectedIndex ? T.ink : "#C9CFD6",
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** 페이지마다 해당 벌통의 목표 온도를 조회하고 다이얼에서 바로 조작합니다. 페이지 key가 벌통 id라 초안이 섞이지 않습니다. */
function StatusPage({ hive, onDialDragChange }: { hive: HiveData; onDialDragChange: (dragging: boolean) => void }) {
  const control = useTargetTemperature(hive.id);
  return <HiveStatusPanel hive={hive} targetTemperature={control.saved} control={control} onDialDragChange={onDialDragChange} />;
}

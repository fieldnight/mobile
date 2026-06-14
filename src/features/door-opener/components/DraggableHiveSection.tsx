/**
 * 벌통 현황 섹션 (드래그 순서 변경)
 * - 벌통 카드 2열 그리드, 롱프레스로 순서 변경
 * - 벌통 추가: HiveAddSheet (바텀시트) — router.push 대체
 */
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Platform,
  UIManager,
  View,
} from "react-native";
import { AddHiveCard } from "./AddHiveCard";
import { DoorOpenerHiveCard } from "./DoorOpenerHiveCard";
import { DoorOpenerSectionHeader } from "./DoorOpenerSectionHeader";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import { useRouter } from "expo-router";
import type { HiveData } from "@/types/hive-control";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GRID_GAP = 16;
const GRID_COLUMNS = 2;

export function DraggableHiveSection({
  hives,
  cardWidth,
  onReorder,
}: {
  hives: HiveData[];
  cardWidth: number;
  onReorder: (nextHives: HiveData[]) => void;
}) {
  const router = useRouter();
  const [draggingHiveId, setDraggingHiveId] = useState<string | null>(null);
  const [addingHive, setAddingHive]         = useState(false);

  const dragOffset          = useRef(new Animated.ValueXY()).current;
  const hivesRef            = useRef(hives);
  const draggingHiveIdRef   = useRef<string | null>(null);
  const dragStartIndexRef   = useRef(0);
  const dragCurrentIndexRef = useRef(0);
  hivesRef.current = hives;

  const cell = useMemo(
    () => ({ width: cardWidth + GRID_GAP, height: cardWidth * 0.64 + GRID_GAP }),
    [cardWidth],
  );
  const cellRef = useRef(cell);
  cellRef.current = cell;

  const reorderHives = (fromIndex: number, toIndex: number) => {
    LayoutAnimation.configureNext({
      duration: 280,
      create: { type: "easeInEaseOut", property: "scaleXY" },
      update: { type: "spring", springDamping: 0.75 },
    });
    const next = [...hivesRef.current];
    const [moving] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moving);
    onReorder(next);
  };

  const finishDrag = () => {
    Animated.spring(dragOffset, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      tension: 180,
      friction: 18,
    }).start(() => {
      setDraggingHiveId(null);
      draggingHiveIdRef.current = null;
      dragStartIndexRef.current = 0;
      dragCurrentIndexRef.current = 0;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => draggingHiveIdRef.current != null,
      onPanResponderGrant: () => { dragOffset.setValue({ x: 0, y: 0 }); },
      onPanResponderMove: (_, gesture) => {
        if (!draggingHiveIdRef.current) return;
        const currentCell = cellRef.current;
        const colDelta = Math.round(gesture.dx / currentCell.width);
        const rowDelta = Math.round(gesture.dy / currentCell.height);
        const targetIndex = Math.max(
          0,
          Math.min(hivesRef.current.length - 1, dragStartIndexRef.current + rowDelta * GRID_COLUMNS + colDelta),
        );
        if (targetIndex !== dragCurrentIndexRef.current) {
          reorderHives(dragCurrentIndexRef.current, targetIndex);
          dragCurrentIndexRef.current = targetIndex;
        }
        const startCol   = dragStartIndexRef.current % GRID_COLUMNS;
        const startRow   = Math.floor(dragStartIndexRef.current / GRID_COLUMNS);
        const currentCol = dragCurrentIndexRef.current % GRID_COLUMNS;
        const currentRow = Math.floor(dragCurrentIndexRef.current / GRID_COLUMNS);
        dragOffset.setValue({
          x: gesture.dx - (currentCol - startCol) * currentCell.width,
          y: gesture.dy - (currentRow - startRow) * currentCell.height,
        });
      },
      onPanResponderRelease: finishDrag,
      onPanResponderTerminate: finishDrag,
    }),
  ).current;

  const startDrag = (hive: HiveData) => {
    const index = hivesRef.current.findIndex((item) => item.id === hive.id);
    if (index < 0) return;
    dragStartIndexRef.current = index;
    dragCurrentIndexRef.current = index;
    draggingHiveIdRef.current = hive.id;
    setDraggingHiveId(hive.id);
  };

  return (
    <View>
      <DoorOpenerSectionHeader title="벌통 현황" count={hives.length} />

      <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
        {hives.map((hive) => {
          const dragging = draggingHiveId === hive.id;
          return (
            <DoorOpenerHiveCard
              key={hive.id}
              hive={hive}
              size={cardWidth}
              dragging={dragging}
              panHandlers={panResponder.panHandlers}
              dragOffset={dragging ? dragOffset : undefined}
              onLongPress={() => startDrag(hive)}
              onPress={() => {
                if (draggingHiveIdRef.current) return;
                router.push({ pathname: "/hive-control", params: { selectedHiveId: hive.id } });
              }}
            />
          );
        })}

        {/* 벌통 추가 버튼 — 바텀시트 열기 */}
        <AddHiveCard size={cardWidth} onPress={() => setAddingHive(true)} />
      </View>

      {/* 벌통 추가 바텀시트 */}
      <HiveAddSheet visible={addingHive} onClose={() => setAddingHive(false)} />
    </View>
  );
}

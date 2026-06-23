import { useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { AddHiveCard } from "./AddHiveCard";
import { DoorOpenerHiveCard } from "./DoorOpenerHiveCard";
import { DoorOpenerSectionHeader } from "./DoorOpenerSectionHeader";
import { ConfirmSheet } from "@/components/BottomSheet";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import { useAppToast } from "@/components/ToastContext";
import { HIVE_QUERY_KEYS, getHiveDetail, useDeleteHive } from "@/features/hive";
import { useHiveStore } from "@/stores/useHiveStore";
import type { HiveData } from "@/types/hive-control";

const GRID_GAP = 16;
const GRID_COLUMNS = 2;

function getApiErrorMessage(error: any, fallback: string) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message ?? error?.message ?? "";
  const isRelationBlocked =
    status === 406 ||
    message.includes("DataIntegrityViolationException") ||
    message.includes("foreign key") ||
    message.includes("hive_replacement_history");

  if (isRelationBlocked) {
    return "교체 기록이 있는 벌통은 삭제할 수 없어요. 먼저 교체 기록을 삭제해 주세요.";
  }

  return message || fallback;
}

function isLocalFallbackHive(hive: HiveData) {
  return (
    (hive.id === "1" && hive.macAddress === "AA:BB:CC:DD:EE:FF") ||
    (hive.id === "2" && hive.macAddress === "11:22:33:44:55:66")
  );
}

/**
 * 개폐기 화면의 벌통 현황 섹션
 * - 벌통 카드 정렬은 기존처럼 롱프레스 드래그로 처리합니다.
 * - 수정/삭제는 카드 우측 액션 버튼과 ConfirmSheet로 처리합니다.
 */
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
  const queryClient = useQueryClient();
  const deleteHiveLocally = useHiveStore((state) => state.deleteHive);
  const deleteHiveMutation = useDeleteHive();
  const { show: showToast } = useAppToast();

  const [draggingHiveId, setDraggingHiveId] = useState<string | null>(null);
  const [addingHive, setAddingHive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingHive, setEditingHive] = useState<HiveData | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HiveData | null>(null);

  const dragOffset = useRef(new Animated.ValueXY()).current;
  const hivesRef = useRef(hives);
  const draggingHiveIdRef = useRef<string | null>(null);
  const dragStartIndexRef = useRef(0);
  const dragCurrentIndexRef = useRef(0);
  hivesRef.current = hives;

  const cell = useMemo(
    () => ({ width: cardWidth + GRID_GAP, height: cardWidth * 0.64 + GRID_GAP }),
    [cardWidth],
  );
  const cellRef = useRef(cell);
  cellRef.current = cell;

  const reorderHives = (fromIndex: number, toIndex: number) => {
    // 드래그 중 카드 위치가 바뀔 때 주변 카드가 자연스럽게 밀리도록 레이아웃 애니메이션 적용
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

  const stopDragging = () => {
    setDraggingHiveId(null);
    draggingHiveIdRef.current = null;
    dragOffset.setValue({ x: 0, y: 0 });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => draggingHiveIdRef.current != null,
      onPanResponderGrant: () => {
        dragOffset.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        if (!draggingHiveIdRef.current) return;
        const currentCell = cellRef.current;
        const colDelta = Math.round(gesture.dx / currentCell.width);
        const rowDelta = Math.round(gesture.dy / currentCell.height);
        const targetIndex = Math.max(
          0,
          Math.min(
            hivesRef.current.length - 1,
            dragStartIndexRef.current + rowDelta * GRID_COLUMNS + colDelta,
          ),
        );

        if (targetIndex !== dragCurrentIndexRef.current) {
          reorderHives(dragCurrentIndexRef.current, targetIndex);
          dragCurrentIndexRef.current = targetIndex;
        }

        const startCol = dragStartIndexRef.current % GRID_COLUMNS;
        const startRow = Math.floor(dragStartIndexRef.current / GRID_COLUMNS);
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

  const confirmDelete = () => {
    if (!pendingDelete) return;

    if (isLocalFallbackHive(pendingDelete)) {
      // 서버에 아직 등록되지 않은 fallback 벌통은 API 요청 없이 로컬에서만 제거합니다.
      deleteHiveLocally(pendingDelete.id);
      showToast(`${pendingDelete.name} 벌통을 삭제했어요`, "success");
      setPendingDelete(null);
      return;
    }

    deleteHiveMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        // 서버 삭제 성공 후에만 로컬 store를 갱신해 화면과 서버 상태가 엇갈리지 않게 합니다.
        deleteHiveLocally(pendingDelete.id);
        showToast(`${pendingDelete.name} 벌통을 삭제했어요`, "success");
        setPendingDelete(null);
      },
      onError: (error) => {
        showToast(getApiErrorMessage(error, "벌통 삭제에 실패했어요"), "error");
        setPendingDelete(null);
      },
    });
  };

  const openHiveDetail = (hive: HiveData) => {
    // IoT 화면에서 벌통을 탭하면 상세조회 API를 먼저 호출해 콘솔에서 응답을 확인합니다.
    queryClient
      .fetchQuery({
        queryKey: HIVE_QUERY_KEYS.detail(hive.id),
        queryFn: () => getHiveDetail(hive.id),
      })
      .catch((error) => {
        showToast(getApiErrorMessage(error, "벌통 상세 조회에 실패했어요"), "error");
      });

    router.push({
      pathname: "/hive-control",
      params: { selectedHiveId: hive.id },
    });
  };

  return (
    <View>
      <DoorOpenerSectionHeader
        title="벌통 현황"
        count={hives.length}
        actionLabel={deleting ? "완료" : "삭제"}
        actionActive={deleting}
        onActionPress={() => {
          if (deleting) stopDragging();
          setDeleting((value) => !value);
        }}
      />

      <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
        {hives.map((hive) => {
          const dragging = draggingHiveId === hive.id;
          return (
            <DoorOpenerHiveCard
              key={hive.id}
              hive={hive}
              size={cardWidth}
              editable={deleting}
              dragging={dragging}
              panHandlers={panResponder.panHandlers}
              dragOffset={dragging ? dragOffset : undefined}
              onEdit={() => setEditingHive(hive)}
              onDelete={() => setPendingDelete(hive)}
              onLongPress={() => startDrag(hive)}
              onPressOut={() => {
                if (draggingHiveIdRef.current === hive.id) finishDrag();
              }}
              onPress={() => {
                if (draggingHiveIdRef.current || deleting) return;
                openHiveDetail(hive);
              }}
            />
          );
        })}

        <AddHiveCard size={cardWidth} onPress={() => setAddingHive(true)} />
      </View>

      <HiveAddSheet visible={addingHive} onClose={() => setAddingHive(false)} />
      <HiveAddSheet
        visible={editingHive != null}
        hive={editingHive}
        onClose={() => setEditingHive(null)}
      />

      <ConfirmSheet
        visible={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="벌통 삭제"
        message={`${pendingDelete?.name ?? "선택한 벌통"}을 삭제할까요?`}
        confirmLabel="삭제"
        cancelLabel="취소"
        destructive
        onConfirm={confirmDelete}
      />
    </View>
  );
}

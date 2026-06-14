/**
 * 개폐기 NFC 카드 섹션
 * - 카드 목록 표시 (2열 그리드, 드래그 순서 변경)
 * - 추가: AddNfcDoorCardModal (바텀시트)
 * - 삭제: ConfirmSheet (바텀시트) — Alert.alert 대체
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
import { AddNfcDoorCardModal } from "./AddNfcDoorCardModal";
import { DoorOpenerSectionHeader } from "./DoorOpenerSectionHeader";
import { AddNfcDoorCardButton, NfcDoorCard } from "./NfcDoorCard";
import { NfcDoorCardModal } from "./NfcDoorCardModal";
import { ConfirmSheet } from "@/components/BottomSheet";
import { useAppToast } from "@/components/ToastContext";
import {
  DEFAULT_NFC_DOOR_CARDS,
  createCustomDoorCard,
  type NfcDoorCardConfig,
} from "./nfcDoorCards";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GRID_GAP = 16;
const GRID_COLUMNS = 2;

export function NfcDoorCardSection({
  cardWidth,
  deleting,
  onToggleDeleting,
}: {
  cardWidth: number;
  deleting: boolean;
  onToggleDeleting: () => void;
}) {
  const { show: showToast } = useAppToast();

  const [cards, setCards]               = useState<NfcDoorCardConfig[]>(DEFAULT_NFC_DOOR_CARDS);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [activeCard, setActiveCard]     = useState<NfcDoorCardConfig | null>(null);
  const [adding, setAdding]             = useState(false);
  /** 삭제 확인 중인 카드 */
  const [pendingDelete, setPendingDelete] = useState<NfcDoorCardConfig | null>(null);

  const dragOffset           = useRef(new Animated.ValueXY()).current;
  const draggingCardIdRef    = useRef<string | null>(null);
  const dragStartIndexRef    = useRef(0);
  const dragCurrentIndexRef  = useRef(0);
  const cardsRef             = useRef(cards);
  cardsRef.current = cards;

  const cell = useMemo(
    () => ({ width: cardWidth + GRID_GAP, height: cardWidth * 0.4 + GRID_GAP }),
    [cardWidth],
  );
  const cellRef = useRef(cell);
  cellRef.current = cell;

  const reorderCards = (fromIndex: number, toIndex: number) => {
    LayoutAnimation.configureNext({
      duration: 280,
      create: { type: "easeInEaseOut", property: "scaleXY" },
      update: { type: "spring", springDamping: 0.75 },
    });
    setCards((prev) => {
      const next = [...prev];
      const [moving] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moving);
      return next;
    });
  };

  const finishDrag = () => {
    Animated.spring(dragOffset, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      tension: 180,
      friction: 18,
    }).start(() => {
      setDraggingCardId(null);
      draggingCardIdRef.current = null;
      dragStartIndexRef.current = 0;
      dragCurrentIndexRef.current = 0;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => draggingCardIdRef.current != null,
      onPanResponderGrant: () => { dragOffset.setValue({ x: 0, y: 0 }); },
      onPanResponderMove: (_, gesture) => {
        if (!draggingCardIdRef.current) return;
        const currentCell = cellRef.current;
        const colDelta = Math.round(gesture.dx / currentCell.width);
        const rowDelta = Math.round(gesture.dy / currentCell.height);
        const targetIndex = Math.max(
          0,
          Math.min(cardsRef.current.length - 1, dragStartIndexRef.current + rowDelta * GRID_COLUMNS + colDelta),
        );
        if (targetIndex !== dragCurrentIndexRef.current) {
          reorderCards(dragCurrentIndexRef.current, targetIndex);
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

  const addCard = (cardInput: Parameters<typeof createCustomDoorCard>[0]) => {
    setCards((prev) => [...prev, createCustomDoorCard(cardInput)]);
    showToast(`${cardInput.title} 카드를 추가했어요.`, "success");
  };

  /** 삭제 요청 — ConfirmSheet 열기 */
  const requestDelete = (card: NfcDoorCardConfig) => {
    setPendingDelete(card);
  };

  /** 삭제 확정 */
  const confirmDelete = () => {
    if (!pendingDelete) return;
    setCards((prev) => prev.filter((item) => item.id !== pendingDelete.id));
    showToast(`${pendingDelete.title} 카드를 삭제했어요.`, "error");
  };

  const startDrag = (card: NfcDoorCardConfig) => {
    const index = cardsRef.current.findIndex((item) => item.id === card.id);
    if (index < 0) return;
    dragStartIndexRef.current = index;
    dragCurrentIndexRef.current = index;
    draggingCardIdRef.current = card.id;
    setDraggingCardId(card.id);
  };

  const handleCardPress = (card: NfcDoorCardConfig) => {
    if (deleting || draggingCardIdRef.current) return;
    setActiveCard(card);
  };

  const stopDragging = () => {
    setDraggingCardId(null);
    draggingCardIdRef.current = null;
    dragOffset.setValue({ x: 0, y: 0 });
  };

  return (
    <View className="mb-8">
      <DoorOpenerSectionHeader
        title="개폐기 NFC 카드"
        count={cards.length}
        actionLabel={deleting ? "완료" : "삭제"}
        actionActive={deleting}
        onActionPress={() => {
          if (deleting) stopDragging();
          onToggleDeleting();
        }}
      />

      <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
        {cards.map((card) => {
          const dragging = draggingCardId === card.id;
          return (
            <NfcDoorCard
              key={card.id}
              card={card}
              size={cardWidth}
              editable={deleting}
              dragging={dragging}
              dragOffset={dragging ? dragOffset : undefined}
              panHandlers={panResponder.panHandlers}
              onPress={() => handleCardPress(card)}
              onLongPress={() => startDrag(card)}
              onDelete={() => requestDelete(card)}
            />
          );
        })}

        <AddNfcDoorCardButton size={cardWidth} onPress={() => setAdding(true)} />
      </View>

      {/* 카드 활성화 모달 (NFC 태깅 뷰) */}
      <NfcDoorCardModal card={activeCard} visible={activeCard != null} onClose={() => setActiveCard(null)} />

      {/* 카드 추가 — 바텀시트 */}
      <AddNfcDoorCardModal visible={adding} onClose={() => setAdding(false)} onSubmit={addCard} />

      {/* 카드 삭제 확인 — ConfirmSheet (Alert 대체) */}
      <ConfirmSheet
        visible={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="카드 삭제"
        message={`${pendingDelete?.title} 카드를 삭제할까요?`}
        confirmLabel="삭제"
        cancelLabel="취소"
        destructive
        onConfirm={confirmDelete}
      />
    </View>
  );
}

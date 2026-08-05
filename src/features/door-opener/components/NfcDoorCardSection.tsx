/**
 * 개폐기 NFC 카드 섹션
 * - 카드 목록 표시 (2열 그리드, 드래그 순서 변경)
 * - 추가: AddNfcDoorCardModal (바텀시트)
 * - 삭제: ConfirmSheet (바텀시트) — Alert.alert 대체
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Animated,
  LayoutAnimation,
  PanResponder,
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
import {
  getDoorOpenerRuntimeText,
  isDoorOpenerRuntimeActive,
  type DoorOpenerRuntimeState,
} from "../model/doorOpenerRuntime";
import {
  enqueueGateActionCreate,
  enqueueGateActionDelete,
  loadStoredNfcDoorCards,
  saveStoredNfcDoorCards,
  syncGateActionsWithServer,
} from "../model/gateActionSync";

const GRID_GAP = 16;
const GRID_COLUMNS = 2;
const SYNC_THROTTLE_MS = 10000;

export type GateActionAppConnectionStatus =
  | "idle"
  | "syncing"
  | "online"
  | "offline";

export function NfcDoorCardSection({
  cardWidth,
  deleting,
  onToggleDeleting,
  onHceCardActivated,
  runtimeState,
  runtimeText,
  hiveId,
  onSyncStatusChange,
  refreshKey = 0,
  onRefreshEnd,
}: {
  cardWidth: number;
  deleting: boolean;
  onToggleDeleting: () => void;
  onHceCardActivated?: (card: NfcDoorCardConfig) => void;
  runtimeState?: DoorOpenerRuntimeState | null;
  runtimeText?: string | null;
  hiveId?: string | number;
  onSyncStatusChange?: (status: GateActionAppConnectionStatus) => void;
  refreshKey?: number;
  onRefreshEnd?: () => void;
}) {
  const { show: showToast } = useAppToast();

  const [cards, setCards]               = useState<NfcDoorCardConfig[]>(DEFAULT_NFC_DOOR_CARDS);
  const [cardsHydrated, setCardsHydrated] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [activeCard, setActiveCard]     = useState<NfcDoorCardConfig | null>(null);
  const [adding, setAdding]             = useState(false);
  const [pendingReplacement, setPendingReplacement] = useState<NfcDoorCardConfig | null>(null);
  /** 삭제 확인 중인 카드 */
  const [pendingDelete, setPendingDelete] = useState<NfcDoorCardConfig | null>(null);

  const dragOffset           = useRef(new Animated.ValueXY()).current;
  const draggingCardIdRef    = useRef<string | null>(null);
  const dragStartIndexRef    = useRef(0);
  const dragCurrentIndexRef  = useRef(0);
  const cardsRef             = useRef(cards);
  const syncingRef = useRef(false);
  const lastSyncAtRef = useRef(0);
  cardsRef.current = cards;

  useEffect(() => {
    let cancelled = false;

    const restoreCards = async () => {
      try {
        const restored = await loadStoredNfcDoorCards();
        if (!cancelled) setCards(restored);
      } catch (error) {
        console.warn("[NFC Door Cards] 저장된 카드 복구 실패", error);
      } finally {
        if (!cancelled) setCardsHydrated(true);
      }
    };

    restoreCards();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cardsHydrated) return;
    saveStoredNfcDoorCards(cards).catch((error) => {
      console.warn("[NFC Door Cards] 카드 저장 실패", error);
    });
  }, [cards, cardsHydrated]);

  const syncWithServer = useCallback(async (force = false) => {
    if (!hiveId || !cardsHydrated || syncingRef.current) return;
    const now = Date.now();
    if (!force && now - lastSyncAtRef.current < SYNC_THROTTLE_MS) return;

    syncingRef.current = true;
    lastSyncAtRef.current = now;
    onSyncStatusChange?.("syncing");

    try {
      const result = await syncGateActionsWithServer({
        hiveId,
        cards: cardsRef.current,
      });
      cardsRef.current = result.cards;
      setCards(result.cards);
      onSyncStatusChange?.(result.synced ? "online" : "offline");
    } catch (error) {
      onSyncStatusChange?.("offline");
      // 예시 벌통은 서버에 등록되어 있지 않을 수 있으므로
      // 화면 진입 시 자동 동기화 실패를 사용자 메시지로 노출하지 않습니다.
      console.warn("[NFC Door Cards] 서버 동기화 실패", error);
    } finally {
      syncingRef.current = false;
    }
  }, [cardsHydrated, hiveId, onSyncStatusChange]);

  useEffect(() => {
    syncWithServer(true);
  }, [cardsHydrated, hiveId, syncWithServer]);

  useFocusEffect(
    useCallback(() => {
      syncWithServer(true);
    }, [syncWithServer]),
  );

  useEffect(() => {
    if (refreshKey <= 0) return;
    syncWithServer(true).finally(onRefreshEnd);
  }, [onRefreshEnd, refreshKey, syncWithServer]);

  const cell = useMemo(
    () => ({ width: cardWidth + GRID_GAP, height: cardWidth * 0.66 + GRID_GAP }),
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

  const addCard = async (cardInput: Parameters<typeof createCustomDoorCard>[0]) => {
    const card = createCustomDoorCard(cardInput);
    const nextCards = [...cardsRef.current, card];

    cardsRef.current = nextCards;
    setCards(nextCards);

    try {
      await saveStoredNfcDoorCards(nextCards);
      await enqueueGateActionCreate(hiveId, card);
      showToast(`${cardInput.title} 카드를 추가했어요.`, "success");
      syncWithServer(true);
    } catch (error) {
      console.warn("[NFC Door Cards] 카드 추가 저장 실패", error);
      showToast("카드 정보를 저장하지 못했어요.", "error");
    }
  };

  /** 삭제 요청 — ConfirmSheet 열기 */
  const requestDelete = (card: NfcDoorCardConfig) => {
    const isAppliedCard =
      isDoorOpenerRuntimeActive(runtimeState ?? null) &&
      runtimeState?.cardId === card.id;
    if (isAppliedCard) {
      showToast("현재 개폐기에 적용 중인 카드는 삭제할 수 없어요. 새 카드를 추가해 적용해 주세요.", "error");
      return;
    }
    setPendingDelete(card);
  };

  /** 삭제 확정 */
  const confirmDelete = async () => {
    const targetCard = pendingDelete;
    if (!targetCard) return;

    const nextCards = cardsRef.current.filter((item) => item.id !== targetCard.id);
    cardsRef.current = nextCards;
    setCards(nextCards);
    setPendingDelete(null);

    try {
      await saveStoredNfcDoorCards(nextCards);
      await enqueueGateActionDelete(hiveId, targetCard);
      showToast(`${targetCard.title} 카드를 삭제했어요.`, "success");
      syncWithServer(true);
    } catch (error) {
      console.warn("[NFC Door Cards] 카드 삭제 저장 실패", error);
      showToast("카드 삭제 정보를 저장하지 못했어요.", "error");
    }
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
    const currentCardId = runtimeState?.cardId;
    const hasRunningCard = isDoorOpenerRuntimeActive(runtimeState ?? null) && currentCardId;
    if (hasRunningCard && currentCardId !== card.id && card.mode !== "count_status") {
      setPendingReplacement(card);
      return;
    }
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
        {cards.filter((card) => card.mode !== "count_status").map((card) => {
          const dragging = draggingCardId === card.id;
          const active =
            isDoorOpenerRuntimeActive(runtimeState ?? null) &&
            runtimeState?.cardId === card.id;
          const cardRuntimeText = active
            ? runtimeText ?? getDoorOpenerRuntimeText(runtimeState ?? null)
            : null;
          return (
            <NfcDoorCard
              key={card.id}
              card={card}
              size={cardWidth}
              editable={deleting && !active}
              dragging={dragging}
              active={active}
              runtimeLabel={cardRuntimeText}
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
      <NfcDoorCardModal
        card={activeCard}
        visible={activeCard != null}
        onClose={() => setActiveCard(null)}
        onActivated={onHceCardActivated}
      />

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

      <ConfirmSheet
        visible={pendingReplacement != null}
        onClose={() => setPendingReplacement(null)}
        title="진행 중인 설정을 바꿀까요?"
        message={`${runtimeText ?? "현재 설정"}을/를 멈추고 ${pendingReplacement?.title ?? "새 카드"}로 바꿉니다. 새 카드가 개폐기에 적용되면 이전 시간 설정은 해제돼요.`}
        confirmLabel="새 카드로 바꾸기"
        cancelLabel="유지하기"
        onConfirm={() => {
          setActiveCard(pendingReplacement);
          setPendingReplacement(null);
        }}
      />
    </View>
  );
}

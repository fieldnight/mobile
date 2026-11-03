/**
 * 개폐기 NFC 카드 섹션
 * - 카드 목록 표시 (2열 그리드, 드래그 순서 변경)
 * - 추가: AddNfcDoorCardModal (바텀시트)
 * - 삭제: ConfirmSheet (바텀시트) — Alert.alert 대체
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { executeGateCard, getGateConnection } from "../api/gateCommandsApi";
import { getGateDeviceErrorMessage } from "../api/gateDeviceApi";
import {
  createGateCountCard,
  createGateTimeCard,
  deleteGateCountCard,
  deleteGateTimeCard,
} from "../api/gateCardsApi";
import {
  buildGateCountCardRequest,
  buildGateTimeCardRequest,
  isServerStorableCard,
} from "../model/gateCardRequest";
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Pressable,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AddNfcDoorCardModal } from "./AddNfcDoorCardModal";
import { CollapsibleSectionHeader } from "./CollapsibleSectionHeader";
import { CountControlDetailModal } from "./CountControlDetailModal";
import { GateSelectSheet } from "./GateSelectSheet";
import { NfcDoorCard } from "./NfcDoorCard";
import { NfcDoorCardModal } from "./NfcDoorCardModal";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { ConfirmSheet } from "@/components/BottomSheet";
import { useAppToast } from "@/components/ToastContext";
import { useGateModeStore, type GateOperatingMode } from "@/stores/useGateModeStore";
import type { GateData } from "@/types/gate-control";
import {
  DEFAULT_NFC_DOOR_CARDS,
  createCustomDoorCard,
  isSameCardSettings,
  type NfcDoorCardConfig,
} from "./nfcDoorCards";
import { buildDoorOpenerRuntimeState } from "../model/doorOpenerRuntime";
import { useDoorDeviceState } from "@/stores/useDoorDeviceState";
import { normalizeGateMac } from "../model/deviceCardState";
import {
  loadStoredNfcDoorCards,
  saveStoredNfcDoorCards,
} from "../model/gateActionSync";
import {
  assignCardToGates,
  loadGateCardAssignments,
  saveGateCardAssignments,
  type GateCardAssignments,
} from "../model/gateCardAssignments";

/** 카드 그리드 간격. 부모(iot-home)의 CARD_W 계산과 같은 값이어야 합니다. */
const GRID_GAP = 12;
const GRID_COLUMNS = 2;

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
  hiveId,
  onSyncStatusChange,
  gateMode,
  gates,
}: {
  cardWidth: number;
  deleting: boolean;
  onToggleDeleting: () => void;
  onHceCardActivated?: (card: NfcDoorCardConfig) => void;
  hiveId?: string | number;
  onSyncStatusChange?: (status: GateActionAppConnectionStatus) => void;
  gateMode: GateOperatingMode;
  gates: GateData[];
}) {
  const { show: showToast } = useAppToast();
  const setLastSelectedGateIds = useGateModeStore((s) => s.setLastSelectedGateIds);

  const [cards, setCards]               = useState<NfcDoorCardConfig[]>(DEFAULT_NFC_DOOR_CARDS);
  const [cardsHydrated, setCardsHydrated] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [activeCard, setActiveCard]     = useState<NfcDoorCardConfig | null>(null);
  const [adding, setAdding]             = useState(false);
  /** 삭제 확인 중인 카드 */
  const [pendingDelete, setPendingDelete] = useState<NfcDoorCardConfig | null>(null);
  /** 온라인 모드에서 "적용할 개폐기 선택" 시트를 띄울 카드 */
  const [gateSelectCard, setGateSelectCard] = useState<NfcDoorCardConfig | null>(null);
  const [gateAssignments, setGateAssignments] = useState<GateCardAssignments>({});
  /** 스마트싱스 방(room) 헤더처럼, 두 섹션(개폐기 카드 / 벌 마릿수 제어)을 각각 접고 펼 수 있습니다. */
  const [gridCollapsed, setGridCollapsed] = useState(false);
  const [countControlCollapsed, setCountControlCollapsed] = useState(false);
  /** 마릿수 제어 카드의 상세(전체화면 바텀시트)를 보여줄 대상 */
  const [countDetailCard, setCountDetailCard] = useState<NfcDoorCardConfig | null>(null);

  const dragOffset           = useRef(new Animated.ValueXY()).current;
  const draggingCardIdRef    = useRef<string | null>(null);
  const dragStartIndexRef    = useRef(0);
  const dragCurrentIndexRef  = useRef(0);
  const cardsRef             = useRef(cards);
  const commandPendingRef = useRef(false);
  const [commandPending, setCommandPending] = useState(false);

  cardsRef.current = cards;

  useEffect(() => {
    if (gateMode === "online") setActiveCard(null);
    else setGateSelectCard(null);
  }, [gateMode]);

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
    let cancelled = false;

    loadGateCardAssignments().then((restored) => {
      if (!cancelled) setGateAssignments(restored);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cardsHydrated) return;
    for (const [cardId, ids] of Object.entries(gateAssignments)) {
      const card = cards.find(item => item.id === cardId);
      if (!card || card.mode === "count_status") continue;
      for (const id of ids) {
        const gate = gates.find(item => item.id === id);
        const mac = normalizeGateMac(gate?.macAddress);
        if (!mac || useDoorDeviceState.getState().records[mac]) continue;
        const runtime = buildDoorOpenerRuntimeState(card, { status: "ok", result: "legacy:online", deviceId: mac });
        runtime.activatedAt = 0;
        useDoorDeviceState.getState().confirm({ deviceId: mac, runtime, source: "online", confirmedAt: 0 });
      }
    }
  }, [cardsHydrated, gateAssignments, cards, gates]);

  useEffect(() => {
    if (!cardsHydrated) return;
    saveStoredNfcDoorCards(cards).catch((error) => {
      console.warn("[NFC Door Cards] 카드 저장 실패", error);
    });
  }, [cards, cardsHydrated]);

  // 서버 카드 CRUD(PR #195)는 30분 단위 등 일부 설정을 표현하지 못해,
  // 카드 원본은 계속 로컬(AsyncStorage)에 전체 정보로 보관합니다.
  const cell = useMemo(
    () => ({ width: cardWidth + GRID_GAP, height: cardWidth * 0.66 + GRID_GAP }),
    [cardWidth],
  );
  const cellRef = useRef(cell);
  cellRef.current = cell;

  // 벌 마릿수 제어 카드는 개폐기 카드와 같은 그리드 스타일로 그리되, 별도 섹션에 두고
  // 탭하면 전체화면 상세(CountControlDetailModal)가 뜹니다. 위쪽 그리드의 드래그 순서
  // 변경 대상에서는 제외됩니다.
  const countControlCards = useMemo(
    () => cards.filter((card) => card.mode === "count_control"),
    [cards],
  );

  /**
   * 드래그 재정렬은 그리드에 실제로 보이는 카드(시간제어 카드, count_status/count_control 제외)만
   * 대상으로 합니다. fromIndex/toIndex는 그리드 안에서의 인덱스이고, 재정렬한 결과를
   * 전체 cards 배열에서 그 카드들의 원래 자리에 순서대로 되돌려 끼워 넣습니다 — 이렇게 하면
   * 배열 중간에 마릿수 제어 카드가 섞여 있어도 그리드 순서 변경이 엉뚱한 카드를 건드리지 않습니다.
   */
  const reorderCards = (fromIndex: number, toIndex: number) => {
    LayoutAnimation.configureNext({
      duration: 280,
      create: { type: "easeInEaseOut", property: "scaleXY" },
      update: { type: "spring", springDamping: 0.75 },
    });
    setCards((prev) => {
      const isGridCard = (card: NfcDoorCardConfig) =>
        card.mode !== "count_status" && card.mode !== "count_control";
      const gridCards = prev.filter(isGridCard);
      if (fromIndex < 0 || fromIndex >= gridCards.length) return prev;

      const reorderedGridCards = [...gridCards];
      const [moving] = reorderedGridCards.splice(fromIndex, 1);
      reorderedGridCards.splice(toIndex, 0, moving);

      let gridCursor = 0;
      return prev.map((card) => (isGridCard(card) ? reorderedGridCards[gridCursor++] : card));
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
        const gridCardCount = cardsRef.current.filter(
          (card) => card.mode !== "count_status" && card.mode !== "count_control",
        ).length;
        const colDelta = Math.round(gesture.dx / currentCell.width);
        const rowDelta = Math.round(gesture.dy / currentCell.height);
        const targetIndex = Math.max(
          0,
          Math.min(gridCardCount - 1, dragStartIndexRef.current + rowDelta * GRID_COLUMNS + colDelta),
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
    let card = createCustomDoorCard(cardInput);

    const isDuplicate = cardsRef.current.some((existing) => isSameCardSettings(existing, card));
    if (isDuplicate) {
      showToast("이미 같은 설정의 카드가 있어요. 카드를 다시 확인해 주세요.", "error");
      return;
    }

    // 온라인 모드에서는 카드를 서버에 저장해둡니다(개폐기 무관 공용 카드).
    // 실행 시 대상 개폐기는 별도로 고릅니다. 24시간 교대는 저장 API가 아직
    // 표현하지 못해 로컬에만 남깁니다.
    if (gateMode === "online" && isServerStorableCard(card)) {
      try {
        if (card.mode === "count_control") {
          const saved = await createGateCountCard(buildGateCountCardRequest(card));
          card = { ...card, serverCardId: saved.id };
        } else {
          const saved = await createGateTimeCard(buildGateTimeCardRequest(card));
          card = { ...card, serverCardId: saved.id };
        }
      } catch (error) {
        console.warn("[NFC Door Cards] 카드 서버 저장 실패", error);
        showToast(getGateDeviceErrorMessage(error, "카드를 서버에 저장하지 못했어요. 휴대폰에는 저장돼요."), "error");
      }
    }

    const nextCards = [...cardsRef.current, card];

    cardsRef.current = nextCards;
    setCards(nextCards);

    try {
      await saveStoredNfcDoorCards(nextCards);
      showToast(`${cardInput.title} 카드를 추가했어요.`, "success");
    } catch (error) {
      console.warn("[NFC Door Cards] 카드 추가 저장 실패", error);
      showToast("카드 정보를 저장하지 못했어요.", "error");
    }
  };

  /** 삭제 요청 — ConfirmSheet 열기 */
  const requestDelete = (card: NfcDoorCardConfig) => {
    const isAppliedCard = Object.values(useDoorDeviceState.getState().records)
      .some(record => record.runtime?.cardId === card.id);
    if (isAppliedCard) {
      showToast("개폐기에 마지막으로 적용한 카드는 삭제할 수 없어요. 다른 카드를 적용한 뒤 삭제해주세요.", "error");
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

    if (targetCard.serverCardId != null) {
      try {
        if (targetCard.mode === "count_control") {
          await deleteGateCountCard(targetCard.serverCardId);
        } else {
          await deleteGateTimeCard(targetCard.serverCardId);
        }
      } catch (error) {
        console.warn("[NFC Door Cards] 카드 서버 삭제 실패", error);
        showToast(getGateDeviceErrorMessage(error, "서버에 저장된 카드를 지우지 못했어요."), "error");
      }
    }

    try {
      await saveStoredNfcDoorCards(nextCards);
      showToast(`${targetCard.title} 카드를 삭제했어요.`, "success");
    } catch (error) {
      console.warn("[NFC Door Cards] 카드 삭제 저장 실패", error);
      showToast("카드 삭제 정보를 저장하지 못했어요.", "error");
    }
  };

  const startDrag = (card: NfcDoorCardConfig) => {
    const gridCards = cardsRef.current.filter(
      (item) => item.mode !== "count_status" && item.mode !== "count_control",
    );
    const index = gridCards.findIndex((item) => item.id === card.id);
    if (index < 0) return;
    dragStartIndexRef.current = index;
    dragCurrentIndexRef.current = index;
    draggingCardIdRef.current = card.id;
    setDraggingCardId(card.id);
  };

  const handleCardPress = (card: NfcDoorCardConfig) => {
    if (deleting || draggingCardIdRef.current || commandPendingRef.current) return;
    // 온라인 모드에서는 NFC 태깅 대신 "적용할 개폐기"를 먼저 고릅니다.
    // 온라인 모드에서는 NFC를 활성화하지 않습니다.
    if (gateMode === "online") {
      setGateSelectCard(card);
      return;
    }
    setActiveCard(card);
  };

  /**
   * 벌 마릿수 제어 카드는 그리드에서 탭해도 바로 NFC/적용 흐름으로 들어가지 않고,
   * 먼저 전체화면 상세(CountControlDetailModal)를 보여줍니다. 실제 적용은 그 안의
   * "적용하기" 버튼에서 handleCardPress를 호출해 시작됩니다.
   */
  const handleCountCardPress = (card: NfcDoorCardConfig) => {
    if (deleting || draggingCardIdRef.current || commandPendingRef.current) return;
    setCountDetailCard(card);
  };

  /** Only record assignments after the device result is SUCCESS. */
  const confirmGateSelection = async (selectedGateIds: string[]) => {
    const targetCard = gateSelectCard;
    if (!targetCard || commandPendingRef.current || selectedGateIds.length === 0) return;
    commandPendingRef.current = true;
    setCommandPending(true);
    setGateSelectCard(null);
    setLastSelectedGateIds(selectedGateIds);
    showToast("개폐기의 현재 설정과 처리 결과를 확인하고 있어요.", "info");
    try {
      const results = await Promise.allSettled(selectedGateIds.map(async id => {
        const gate = gates.find(item => item.id === id);
        if (!gate) throw new Error("등록된 개폐기를 찾지 못했어요.");
        // Older servers may not support connection lookup; keep their command path.
        const connection = await getGateConnection(gate).catch(() => null);
        if (connection && !connection.isConnected) {
          throw new Error("개폐기가 Wi-Fi에 연결되어 있지 않아요. 개폐기의 Wi-Fi 연결을 확인하거나 NFC로 사용해주세요.");
        }
        const result = await executeGateCard(gate, targetCard);
        if (targetCard.mode !== "count_status") {
          const confirmedAt = Date.now();
          const previous = useDoorDeviceState.getState().records[normalizeGateMac(gate.macAddress) ?? ""];
          const runtime = buildDoorOpenerRuntimeState(targetCard, {
            result: `online:${result.commandId}`, status: "ok", deviceId: gate.macAddress,
          });
          if (result.detail === "ALREADY_APPLIED" && previous?.runtime) runtime.activatedAt = previous.runtime.activatedAt;
          useDoorDeviceState.getState().confirm({ deviceId: gate.macAddress, runtime, source: "online", confirmedAt });
        }
        return { id, deferred: result.detail === "SERVO_DEFERRED", already: result.detail === "ALREADY_APPLIED" };
      }));
      const succeeded = results.flatMap(result => result.status === "fulfilled" ? [result.value.id] : []);
      if (succeeded.length && targetCard.mode !== "count_status") {
        const next = assignCardToGates(gateAssignments, targetCard.id, succeeded);
        setGateAssignments(next);
        await saveGateCardAssignments(next);
      }
      const deferred = results.filter(result => result.status === "fulfilled" && result.value.deferred).length;
      const already = results.filter(result => result.status === "fulfilled" && result.value.already).length;
      const deferredMessage = deferred ? ` ${deferred}곳은 통로 센서 감지로 문 움직임을 기다리고 있어요.` : "";
      const failed = results.find(result => result.status === "rejected");
      if (failed?.status === "rejected") {
        showToast(`${succeeded.length}/${selectedGateIds.length}곳 적용 확인. ${getGateDeviceErrorMessage(failed.reason, failed.reason?.message || "응답을 확인하지 못했어요.")}${deferredMessage}`, "error");
      } else if (deferred) {
        showToast(`명령을 접수했어요.${deferredMessage}`, "info");
      } else {
        const existingMessage = targetCard.mode === "open_now" ? "이미 열려 있어요."
          : targetCard.mode === "close_now" ? "이미 닫혀 있어요." : "이미 같은 설정이 적용돼 있어요.";
        showToast(already === selectedGateIds.length ? existingMessage
          : `${selectedGateIds.length}곳에서 ${targetCard.title} 명령 처리를 확인했어요.${already ? ` ${already}곳은 이미 같은 설정이에요.` : ""}`, "success");
      }
    } catch (error) {
      showToast(getGateDeviceErrorMessage(error, "결과 기록을 저장하지 못했어요."), "error");
    } finally {
      commandPendingRef.current = false;
      setCommandPending(false);
    }
  };

  const stopDragging = () => {
    setDraggingCardId(null);
    draggingCardIdRef.current = null;
    dragOffset.setValue({ x: 0, y: 0 });
  };

  const gridCards = cards.filter(
    (card) => card.mode !== "count_status" && card.mode !== "count_control",
  );

  const headerAccessory = (
    <View className="flex-row items-center" style={{ gap: 8 }}>
      <Pressable
        onPress={() => {
          if (deleting) stopDragging();
          onToggleDeleting();
        }}
        hitSlop={6}
        className="items-center justify-center rounded-lg active:opacity-75"
        style={{
          height: 32,
          paddingHorizontal: 12,
          backgroundColor: deleting ? C.gatePrimary : C.white,
        }}
      >
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 13.5, color: deleting ? C.white : C.text }}
        >
          {deleting ? "완료" : "삭제"}
        </PretendardFont>
      </Pressable>
      <Pressable
        onPress={() => setAdding(true)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="추가하기"
        className="items-center justify-center rounded-lg active:opacity-75"
        style={{ width: 32, height: 32, backgroundColor: C.white }}
      >
        <Feather name="plus" size={18} color={C.text} />
      </Pressable>
    </View>
  );

  return (
    <View>
      {commandPending ? (
        <PretendardFont style={{ marginBottom: 12, fontSize: 13, color: C.sec }}>
          개폐기 응답을 확인하고 있어요. 잠시 기다려주세요.
        </PretendardFont>
      ) : null}
      <CollapsibleSectionHeader
        title="개폐기 카드"
        count={gridCards.length}
        collapsed={gridCollapsed}
        onToggleCollapsed={() => setGridCollapsed((prev) => !prev)}
        accessory={headerAccessory}
      />

      {!gridCollapsed ? (
        <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
          {gridCards.map((card) => {
            const dragging = draggingCardId === card.id;
            const active = false;
            const cardRuntimeText = null;
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
        </View>
      ) : null}

      {countControlCards.length > 0 ? (
        <View className="mt-5">
          <CollapsibleSectionHeader
            title="벌 마릿수 제어"
            count={countControlCards.length}
            collapsed={countControlCollapsed}
            onToggleCollapsed={() => setCountControlCollapsed((prev) => !prev)}
          />

          {!countControlCollapsed ? (
            <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
              {countControlCards.map((card) => {
                const dragging = false;
                const active = false;
                const cardRuntimeText = null;
                return (
                  <NfcDoorCard
                    key={card.id}
                    card={card}
                    size={cardWidth}
                    editable={deleting && !active}
                    dragging={dragging}
                    active={active}
                    runtimeLabel={cardRuntimeText}
                    onPress={() => handleCountCardPress(card)}
                    onDelete={() => requestDelete(card)}
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 벌 마릿수 제어 카드 상세(전체화면 바텀시트) */}
      <CountControlDetailModal
        card={countDetailCard}
        visible={countDetailCard != null}
        active={false}
        onClose={() => setCountDetailCard(null)}
        onApply={() => {
          const card = countDetailCard;
          setCountDetailCard(null);
          if (card) handleCardPress(card);
        }}
        onDelete={() => {
          const card = countDetailCard;
          setCountDetailCard(null);
          if (card) requestDelete(card);
        }}
      />

      {/* 카드 활성화 모달 (NFC 태깅 뷰) */}
      <NfcDoorCardModal
        card={activeCard}
        cards={cards}
        visible={activeCard != null}
        onClose={() => setActiveCard(null)}
        onActivated={onHceCardActivated}
      />

      {/* 온라인 모드 — 카드를 적용할 개폐기 선택 */}
      <GateSelectSheet
        visible={gateSelectCard != null}
        card={gateSelectCard}
        gates={gates}
        onClose={() => setGateSelectCard(null)}
        onConfirm={confirmGateSelection}
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


    </View>
  );
}

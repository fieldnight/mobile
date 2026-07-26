import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createGateAction,
  deleteGateAction,
  getGateActions,
  updateGateAction,
  type GateAction,
  type GateActionRequest,
  type GateActionType,
} from "../api";
import {
  DEFAULT_NFC_DOOR_CARDS,
  isBeeCountLimitFunction,
  type NfcDoorCardConfig,
  type NfcDoorFunction,
  type NfcDoorMode,
} from "../components/nfcDoorCards";

const NFC_DOOR_CARDS_STORAGE_KEY = "ourbee:nfc-door-cards:v1";
const LEGACY_NFC_DOOR_CARDS_STORAGE_KEY = "webee:nfc-door-cards:v1";
const GATE_ACTION_SYNC_BACKLOG_KEY = "ourbee:gate-action-sync-backlog:v1";
const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const SUPPORTED_MODES = new Set<NfcDoorMode>([
  "open_now",
  "close_now",
  "open_at",
  "close_at",
  "window",
  "alternate_24h",
  "lock_days",
  "count_status",
  "activity_boost",
  "overpollination_guard",
  "return_limit",
]);

type GateActionBacklogType = "create" | "update" | "delete";

export interface GateActionBacklogItem {
  id: string;
  type: GateActionBacklogType;
  hiveId: string;
  localCardId: string;
  serverActionId?: number;
  card?: NfcDoorCardConfig;
  createdAt: number;
  retryCount: number;
}

export interface GateActionSyncResult {
  cards: NfcDoorCardConfig[];
  backlogCount: number;
  synced: boolean;
}

export async function loadStoredNfcDoorCards() {
  const raw =
    (await AsyncStorage.getItem(NFC_DOOR_CARDS_STORAGE_KEY)) ??
    (await AsyncStorage.getItem(LEGACY_NFC_DOOR_CARDS_STORAGE_KEY));

  if (!raw) return DEFAULT_NFC_DOOR_CARDS;

  try {
    const parsed = JSON.parse(raw) as { cards?: unknown };
    const cards = Array.isArray(parsed.cards)
      ? mergeCurrentDefaults(parsed.cards.filter(isStoredCard))
      : DEFAULT_NFC_DOOR_CARDS;
    await saveStoredNfcDoorCards(cards);
    return cards;
  } catch (error) {
    console.warn("[Gate Action Sync] 저장된 NFC 카드 복구 실패", error);
    return DEFAULT_NFC_DOOR_CARDS;
  }
}

export async function saveStoredNfcDoorCards(cards: NfcDoorCardConfig[]) {
  await AsyncStorage.setItem(
    NFC_DOOR_CARDS_STORAGE_KEY,
    JSON.stringify({ version: 1, cards }),
  );
}

export async function enqueueGateActionCreate(
  hiveId: string | number | undefined,
  card: NfcDoorCardConfig,
) {
  if (!hiveId || !card.removable) return;
  await appendBacklog({
    type: "create",
    hiveId: String(hiveId),
    localCardId: card.id,
    card,
  });
}

export async function enqueueGateActionDelete(
  hiveId: string | number | undefined,
  card: NfcDoorCardConfig,
) {
  if (!hiveId || !card.removable) return;

  const backlog = await loadBacklog();
  const withoutPendingCreate = backlog.filter(
    (item) => !(item.type === "create" && item.localCardId === card.id),
  );

  if (!card.serverActionId) {
    await saveBacklog(withoutPendingCreate);
    return;
  }

  await saveBacklog([
    ...withoutPendingCreate,
    createBacklogItem({
      type: "delete",
      hiveId: String(hiveId),
      localCardId: card.id,
      serverActionId: card.serverActionId,
    }),
  ]);
}

export async function syncGateActionsWithServer({
  hiveId,
  cards,
}: {
  hiveId: string | number;
  cards: NfcDoorCardConfig[];
}): Promise<GateActionSyncResult> {
  const normalizedHiveId = String(hiveId);
  let nextCards = [...cards];
  const backlog = await loadBacklog();
  const remainingBacklog: GateActionBacklogItem[] = [];

  console.log("[Gate Action Sync] 동기화 시작", {
    hiveId: normalizedHiveId,
    backlogCount: backlog.length,
  });

  for (const item of backlog) {
    if (item.hiveId !== normalizedHiveId) {
      remainingBacklog.push(item);
      continue;
    }

    try {
      nextCards = await flushBacklogItem(normalizedHiveId, item, nextCards);
    } catch (error) {
      remainingBacklog.push({ ...item, retryCount: item.retryCount + 1 });
      remainingBacklog.push(
        ...backlog.slice(backlog.indexOf(item) + 1).filter((next) => next.id !== item.id),
      );
      await saveBacklog(remainingBacklog);
      console.warn("[Gate Action Sync] 백로그 처리 중단", {
        hiveId: normalizedHiveId,
        item,
        error,
      });
      return { cards: nextCards, backlogCount: remainingBacklog.length, synced: false };
    }
  }

  await saveBacklog(remainingBacklog);

  const serverActions = await getGateActions(normalizedHiveId);
  const serverCards = serverActions.map(gateActionToCard);
  nextCards = mergeServerCardsWithLocal(nextCards, serverCards, remainingBacklog);

  await saveStoredNfcDoorCards(nextCards);

  console.log("[Gate Action Sync] 동기화 완료", {
    hiveId: normalizedHiveId,
    serverCount: serverActions.length,
    backlogCount: remainingBacklog.length,
  });

  return { cards: nextCards, backlogCount: remainingBacklog.length, synced: true };
}

function isStoredCard(value: unknown): value is NfcDoorCardConfig {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<NfcDoorCardConfig>;
  return (
    typeof card.id === "string" &&
    typeof card.title === "string" &&
    typeof card.description === "string" &&
    typeof card.mode === "string" &&
    SUPPORTED_MODES.has(card.mode as NfcDoorMode)
  );
}

function mergeCurrentDefaults(storedCards: NfcDoorCardConfig[]) {
  const defaultsById = new Map(DEFAULT_NFC_DOOR_CARDS.map((card) => [card.id, card]));
  const merged = storedCards.map((card) => defaultsById.get(card.id) ?? card);
  const storedIds = new Set(merged.map((card) => card.id));

  for (const card of DEFAULT_NFC_DOOR_CARDS) {
    if (!storedIds.has(card.id)) merged.push(card);
  }
  return merged;
}

async function flushBacklogItem(
  hiveId: string,
  item: GateActionBacklogItem,
  cards: NfcDoorCardConfig[],
) {
  if (item.type === "delete") {
    if (item.serverActionId) {
      await deleteGateAction(hiveId, item.serverActionId);
    }
    return cards.filter((card) => card.id !== item.localCardId);
  }

  const card = item.card ?? cards.find((candidate) => candidate.id === item.localCardId);
  if (!card) return cards;

  const body = cardToGateActionRequest(card);
  if (item.type === "create") {
    const created = await createGateAction(hiveId, body);
    return cards.map((candidate) =>
      candidate.id === item.localCardId
        ? { ...candidate, serverActionId: created.id }
        : candidate,
    );
  }

  if (item.serverActionId) {
    await updateGateAction(hiveId, item.serverActionId, body);
  }
  return cards;
}

function mergeServerCardsWithLocal(
  localCards: NfcDoorCardConfig[],
  serverCards: NfcDoorCardConfig[],
  backlog: GateActionBacklogItem[],
) {
  const pendingDeleteServerIds = new Set(
    backlog
      .filter((item) => item.type === "delete" && item.serverActionId != null)
      .map((item) => item.serverActionId),
  );
  const visibleServerCards = serverCards.filter(
    (card) =>
      card.serverActionId == null || !pendingDeleteServerIds.has(card.serverActionId),
  );
  const serverIds = new Set(visibleServerCards.map((card) => card.serverActionId));
  const pendingCreateIds = new Set(
    backlog.filter((item) => item.type === "create").map((item) => item.localCardId),
  );

  /* The server API currently represents only one actionTime. Keep the richer
   * local card configuration (window end time, repeat, threshold) after the
   * server confirms that the same card exists. */
  const localCardsByServerId = new Map(
    localCards
      .filter((card) => card.serverActionId != null)
      .map((card) => [card.serverActionId, card] as const),
  );
  const syncedCards = visibleServerCards.map((serverCard) => {
    const localCard = localCardsByServerId.get(serverCard.serverActionId);
    return localCard
      ? { ...localCard, serverActionId: serverCard.serverActionId }
      : serverCard;
  });

  // 삭제 요청이 서버에 아직 반영되지 않았더라도 로컬 화면에서는 되살리지 않는다.
  const unsyncedLocalCards = localCards.filter((card) => {
    if (!card.removable) return false;
    if (pendingCreateIds.has(card.id)) return true;
    return card.serverActionId == null || !serverIds.has(card.serverActionId);
  });

  return preserveLocalCardOrder(
    mergeCurrentDefaults([...syncedCards, ...unsyncedLocalCards]),
    localCards,
  );
}

/* Server CRUD has no order column. Keep the farmer's drag order from
 * AsyncStorage instead of replacing it with the API response order. */
function preserveLocalCardOrder(
  cards: NfcDoorCardConfig[],
  localCards: NfcDoorCardConfig[],
) {
  const localIndexById = new Map(localCards.map((card, index) => [card.id, index]));
  const localIndexByServerId = new Map(
    localCards
      .filter((card) => card.serverActionId != null)
      .map((card, index) => [card.serverActionId, index]),
  );

  return [...cards].sort((left, right) => {
    const leftIndex =
      localIndexById.get(left.id) ??
      localIndexByServerId.get(left.serverActionId) ??
      Number.MAX_SAFE_INTEGER;
    const rightIndex =
      localIndexById.get(right.id) ??
      localIndexByServerId.get(right.serverActionId) ??
      Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

function gateActionToCard(action: GateAction): NfcDoorCardConfig {
  const mode = actionTypeToMode(action.actionType);
  const time = timeToHHMM(action.actionTime);

  return {
    id: `server-gate-action-${action.id}`,
    title: action.title,
    description: `${actionTypeLabel(action.actionType)} · ${formatTimeLabel(time)} · ${
      action.repeatEnabled ? "반복" : "한 번"
    }`,
    detail: `${formatTimeLabel(time)} · ${action.repeatEnabled ? "반복" : "한 번"}`,
    icon: mode === "close_at" ? "lock" : mode === "open_at" ? "unlock" : "repeat",
    removable: true,
    functionType: modeToFunctionType(mode),
    mode,
    start: mode === "close_at" ? "" : time,
    end: mode === "close_at" ? time : "",
    repeat: action.repeatEnabled,
    serverActionId: action.id,
  };
}

function cardToGateActionRequest(card: NfcDoorCardConfig): GateActionRequest {
  return {
    title: card.title,
    actionType: modeToActionType(card.mode),
    actionTime: cardTimeToServerTime(card),
    repeatEnabled: card.repeat ?? false,
  };
}

function modeToActionType(mode: NfcDoorMode): GateActionType {
  switch (mode) {
    case "open_at":
    case "open_now":
      return "OPEN_ONLY";
    case "close_at":
    case "close_now":
      return "CLOSE_ONLY";
    case "window":
      return "WINDOW";
    case "alternate_24h":
      return "ALTERNATE_24H";
    case "lock_days":
      return "LOCK_DAYS";
    case "count_status":
      return "COUNT_STATUS";
    case "activity_boost":
      return "ACTIVITY_BOOST";
    case "overpollination_guard":
      return "OVERPOLLINATION_GUARD";
    case "return_limit":
      return "RETURN_LIMIT";
  }
}

function actionTypeToMode(actionType: string): NfcDoorMode {
  switch (actionType) {
    case "CLOSE_ONLY":
      return "close_at";
    case "WINDOW":
      return "window";
    case "ALTERNATE_24H":
      return "alternate_24h";
    case "LOCK_DAYS":
      return "lock_days";
    case "COUNT_STATUS":
      return "count_status";
    case "ACTIVITY_BOOST":
      return "activity_boost";
    case "OVERPOLLINATION_GUARD":
      return "overpollination_guard";
    case "RETURN_LIMIT":
      return "return_limit";
    case "OPEN_ONLY":
    default:
      return "open_at";
  }
}

function modeToFunctionType(mode: NfcDoorMode): NfcDoorFunction | undefined {
  if (mode === "open_at" || mode === "close_at" || mode === "window" || mode === "alternate_24h") {
    return mode;
  }
  return isBeeCountLimitFunction(mode as NfcDoorFunction)
    ? (mode as NfcDoorFunction)
    : undefined;
}

function cardTimeToServerTime(card: NfcDoorCardConfig) {
  const time =
    card.mode === "close_at"
      ? card.end
      : card.mode === "window" || card.mode === "open_at"
        ? card.start
        : undefined;
  return `${normalizeHHMM(time)}:00`;
}

function normalizeHHMM(value?: string) {
  return value && HH_MM_PATTERN.test(value) ? value : "00:00";
}

function timeToHHMM(value?: string) {
  return normalizeHHMM(value?.slice(0, 5));
}

function formatTimeLabel(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const meridiem = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${meridiem} ${displayHour}:${minuteText}`;
}

function actionTypeLabel(actionType: string) {
  const labels: Record<string, string> = {
    OPEN_ONLY: "열기 예약",
    CLOSE_ONLY: "닫기 예약",
    WINDOW: "시간대 운영",
    ALTERNATE_24H: "24시간 교대",
    LOCK_DAYS: "잠금",
    COUNT_STATUS: "카운트 확인",
    ACTIVITY_BOOST: "활동량 강제증가",
    OVERPOLLINATION_GUARD: "과수정 방지",
    RETURN_LIMIT: "귀소량 제한",
  };
  return labels[actionType] ?? actionType;
}

async function appendBacklog(
  input: Omit<GateActionBacklogItem, "id" | "createdAt" | "retryCount">,
) {
  const backlog = await loadBacklog();
  await saveBacklog([...backlog, createBacklogItem(input)]);
}

function createBacklogItem(
  input: Omit<GateActionBacklogItem, "id" | "createdAt" | "retryCount">,
): GateActionBacklogItem {
  return {
    ...input,
    id: `gate-action-backlog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    retryCount: 0,
  };
}

async function loadBacklog() {
  try {
    const raw = await AsyncStorage.getItem(GATE_ACTION_SYNC_BACKLOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items?: unknown };
    return Array.isArray(parsed.items)
      ? parsed.items.filter(isBacklogItem)
      : [];
  } catch (error) {
    console.warn("[Gate Action Sync] 백로그 복구 실패", error);
    return [];
  }
}

async function saveBacklog(items: GateActionBacklogItem[]) {
  await AsyncStorage.setItem(
    GATE_ACTION_SYNC_BACKLOG_KEY,
    JSON.stringify({ version: 1, items }),
  );
}

function isBacklogItem(value: unknown): value is GateActionBacklogItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<GateActionBacklogItem>;
  return (
    typeof item.id === "string" &&
    (item.type === "create" || item.type === "update" || item.type === "delete") &&
    typeof item.hiveId === "string" &&
    typeof item.localCardId === "string" &&
    typeof item.createdAt === "number" &&
    typeof item.retryCount === "number"
  );
}

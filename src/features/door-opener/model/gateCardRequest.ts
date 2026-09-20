import type { NfcDoorCardConfig, RepeatDays } from "../components/nfcDoorCards";
import type {
  GateCountCardRequest,
  GateTimeActionType,
  GateTimeCardRequest,
} from "../api/gateCardsApi";

const DAY_BITS: Array<[keyof RepeatDays, number]> = [
  ["sun", 1 << 0],
  ["mon", 1 << 1],
  ["tue", 1 << 2],
  ["wed", 1 << 3],
  ["thu", 1 << 4],
  ["fri", 1 << 5],
  ["sat", 1 << 6],
];

/** RepeatDays -> 서버 비트마스크 (bit 0=일, 1=월, ... 6=토). */
export function encodeRepeatDaysBitmask(days: RepeatDays): number {
  return DAY_BITS.reduce((mask, [key, bit]) => (days[key] ? mask | bit : mask), 0);
}

function hourFromHHMM(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^([01]\d|2[0-3]|24):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  // 서버는 정수 시(0~24)만 받으므로, 분은 버리지 않고 반올림해 가장 가까운 정시로 맞춥니다.
  const minute = Number(match[2]);
  return minute >= 30 ? Math.min(24, hour + 1) : hour;
}

const TIME_ACTION_TYPES: Record<string, GateTimeActionType> = {
  open_at: "OPEN_AT",
  close_at: "CLOSE_AT",
  window: "WINDOW",
};

/**
 * 시간 제어 카드(open_at/close_at/window)를 저장 API 요청으로 변환합니다.
 * alternate_24h는 이 스펙으로 표현할 수 없어 호출하지 않습니다(호출부에서 걸러냅니다).
 */
export function buildGateTimeCardRequest(card: NfcDoorCardConfig): GateTimeCardRequest {
  const actionType = TIME_ACTION_TYPES[card.mode];
  if (!actionType) {
    throw new Error("이 카드는 온라인 저장을 지원하지 않아요.");
  }
  return {
    actionType,
    startHour: hourFromHHMM(card.start),
    endHour: hourFromHHMM(card.end),
    repeatEnabled: Boolean(card.repeat),
    memo: card.memo?.trim() || undefined,
  };
}

export function buildGateCountCardRequest(card: NfcDoorCardConfig): GateCountCardRequest {
  const config = card.countControl;
  if (card.mode !== "count_control" || !config) {
    throw new Error("벌 마릿수 카드의 설정이 없습니다. 카드를 다시 추가해주세요.");
  }
  return {
    repeatDays: encodeRepeatDaysBitmask(config.repeatDays),
    minCount: config.low,
    maxCount: config.high,
    startHour: hourFromHHMM(config.timeWindowStart),
    endHour: hourFromHHMM(config.timeWindowEnd),
    withinEntranceOpen: config.within.entranceOpen,
    withinExitOpen: config.within.exitOpen,
    aboveEntranceOpen: config.above.entranceOpen,
    aboveExitOpen: config.above.exitOpen,
    memo: card.memo?.trim() || undefined,
  };
}

/** 카드가 온라인 저장 API로 표현 가능한지(24시간 교대만 제외). */
export function isServerStorableCard(card: NfcDoorCardConfig): boolean {
  return (
    card.mode === "open_at" ||
    card.mode === "close_at" ||
    card.mode === "window" ||
    card.mode === "count_control"
  );
}

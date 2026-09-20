import type { GateOpenState, NfcDoorCardConfig } from "../components/nfcDoorCards";

/** ASCII only, conservatively below the RC522 single-frame limit. */
export const NFC_WIRE_MAX_BYTES = 48;
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error("카드 설정의 숫자 범위를 확인해주세요.");
  }
  return value;
}

function minutes(value: string | undefined, allowEndOfDay = false): number {
  if (allowEndOfDay && value === "24:00") return 1440;
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error("카드 설정의 시간을 확인해주세요.");
  }
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function gateBits(state: GateOpenState): number {
  if (!state || typeof state.entranceOpen !== "boolean" || typeof state.exitOpen !== "boolean") {
    throw new Error("카드 설정의 입구·출구 상태를 확인해주세요.");
  }
  return (state.entranceOpen ? 1 : 0) | (state.exitOpen ? 2 : 0);
}

/** NFC-local wire format, deliberately separate from the online JSON contract. */
export function encodeNfcCard(card: NfcDoorCardConfig): string {
  const repeat = card.repeat ? 1 : 0;
  let fields: Array<string | number>;
  switch (card.mode) {
    case "open_now": fields = ["O"]; break;
    case "close_now": fields = ["F"]; break;
    case "count_status": fields = ["S"]; break;
    case "open_at": fields = ["A", minutes(card.start), repeat]; break;
    case "close_at": fields = ["Z", minutes(card.end, true), repeat]; break;
    case "window": {
      const start = minutes(card.start);
      const end = minutes(card.end, true);
      // Old local cards can contain an overnight or equal-time (24 h) window.
      fields = ["W", start, end, repeat];
      break;
    }
    case "alternate_24h":
      if (card.start !== "close_first" && card.start !== "open_first") {
        throw new Error("24시간 교대의 시작 방향을 확인해주세요.");
      }
      fields = ["T", card.start === "close_first" ? 0 : 1, repeat];
      break;
    case "lock_days":
      if (!/^[1-9]\d*$/.test(card.start ?? "")) throw new Error("잠금 일수를 확인해주세요.");
      fields = ["L", integer(Number(card.start), 1, 365)];
      break;
    case "count_control": {
      const config = card.countControl;
      if (!config) throw new Error("벌 마릿수 카드의 설정이 없습니다. 카드를 다시 추가해주세요.");
      const low = integer(config.low, 0, 99);
      const high = integer(config.high, low, 99);
      const start = minutes(config.timeWindowStart);
      const end = minutes(config.timeWindowEnd, true);
      if (start >= end || start % 30 !== 0 || end % 30 !== 0) {
        throw new Error("감시 시간은 시작보다 늦은 종료 시각으로 30분 단위로 설정해주세요.");
      }
      const dayMask = DAYS.reduce((mask, day, index) => {
        if (typeof config.repeatDays?.[day] !== "boolean") throw new Error("반복 요일을 확인해주세요.");
        return mask | (config.repeatDays[day] ? 1 << index : 0);
      }, 0);
      fields = ["C", low, high, dayMask, start, end, gateBits(config.within), gateBits(config.above)];
      break;
    }
    default: throw new Error("지원하지 않는 NFC 카드입니다.");
  }
  const wire = ["WB2", ...fields].join("|");
  if (wire.length > NFC_WIRE_MAX_BYTES) throw new Error("NFC 카드 데이터가 너무 깁니다.");
  return wire;
}

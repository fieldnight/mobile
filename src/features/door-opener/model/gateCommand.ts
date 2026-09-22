import type { NfcDoorCardConfig } from "../components/nfcDoorCards";
import { encodeNfcCard } from "./nfcWire";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const TYPES = {
  open_now: "OPEN_NOW", close_now: "CLOSE_NOW", count_status: "COUNT_STATUS",
  open_at: "OPEN_AT", close_at: "CLOSE_AT", window: "WINDOW",
  alternate_24h: "ALTERNATE_24H", count_control: "COUNT_CONTROL",
} as const;

/** PR #195: path uses numeric DB ID, envelope uses MAC. operation 생략 시 EXECUTE. */
export function buildGateCommand(card: NfcDoorCardConfig, macAddress: string) {
  const gateId = macAddress.trim().toUpperCase();
  if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(gateId)) throw new Error("개폐기 MAC 주소를 확인해주세요.");
  if (!(card.mode in TYPES)) throw new Error("이 카드는 아직 온라인 실행을 지원하지 않아요. NFC로 적용해주세요.");
  encodeNfcCard(card); // Shared bounds: exact 99, complete days/time/gate configuration.
  if (!card.title.trim() || [...card.title].length > 40 || [...(card.memo ?? "")].length > 40) {
    throw new Error("카드 제목과 메모는 40자 이내로 입력해주세요.");
  }
  const cardType = TYPES[card.mode as keyof typeof TYPES];
  let payload: object | undefined;
  switch (card.mode) {
    case "open_at": payload = { start: card.start, repeat: !!card.repeat }; break;
    case "close_at": payload = { end: card.end, repeat: !!card.repeat }; break;
    case "window": payload = { start: card.start, end: card.end, repeat: !!card.repeat }; break;
    case "alternate_24h": payload = { start: card.start, repeat: !!card.repeat }; break;
    case "count_control": {
      const c = card.countControl!;
      payload = {
        days: DAYS.filter(day => c.repeatDays[day]),
        countRange: { low: c.low, high: c.high },
        timeWindow: { start: c.timeWindowStart, end: c.timeWindowEnd },
        rules: { within: c.within, above: c.above },
      };
    }
  }
  return { gateId, cardType, title: card.title, ...(card.memo?.trim() ? { memo: card.memo.trim() } : {}), ...(payload ? { payload } : {}) };
}

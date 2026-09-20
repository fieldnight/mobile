import { api } from "@/lib/api";

/**
 * 개폐기 카드 저장(CRUD) API 클라이언트.
 * - PR #195 기준: /api/v1/cards/time, /api/v1/cards/count (개폐기 무관, 사용자 소유 공용 카드)
 *   카드는 특정 개폐기에 종속되지 않고, 실행 시에만 개폐기(MAC 주소)를 선택해 명령을 보냅니다.
 * - ALTERNATE_24H(24시간 교대)는 "닫기부터/열기부터" 방향을 담을 필드가 이 스펙에 없어
 *   저장 대상에서 제외합니다(실행 API는 지원, 저장만 제외).
 */

export type GateTimeActionType = "OPEN_AT" | "CLOSE_AT" | "WINDOW";

export interface GateTimeCardRequest {
  actionType: GateTimeActionType;
  startHour: number | null;
  endHour: number | null;
  repeatEnabled: boolean;
  memo?: string;
}

export interface GateTimeCardResponse {
  id: number;
  actionType: GateTimeActionType;
  startHour: number | null;
  endHour: number | null;
  repeatEnabled: boolean;
  memo?: string | null;
}

export interface GateCountCardRequest {
  repeatDays: number;
  minCount: number;
  maxCount: number;
  startHour: number | null;
  endHour: number | null;
  withinEntranceOpen: boolean;
  withinExitOpen: boolean;
  aboveEntranceOpen: boolean;
  aboveExitOpen: boolean;
  memo?: string;
}

export interface GateCountCardResponse {
  id: number;
  repeatDays: number;
  minCount: number;
  maxCount: number;
  startHour: number | null;
  endHour: number | null;
  withinEntranceOpen: boolean;
  withinExitOpen: boolean;
  aboveEntranceOpen: boolean;
  aboveExitOpen: boolean;
  memo?: string | null;
}

interface Envelope<T> {
  data: T;
}

export async function createGateTimeCard(body: GateTimeCardRequest) {
  const res = await api.post<Envelope<GateTimeCardResponse>>(`/api/v1/cards/time`, body);
  return res.data.data;
}

export async function deleteGateTimeCard(cardId: number) {
  await api.delete(`/api/v1/cards/time/${cardId}`);
}

export async function createGateCountCard(body: GateCountCardRequest) {
  const res = await api.post<Envelope<GateCountCardResponse>>(`/api/v1/cards/count`, body);
  return res.data.data;
}

export async function deleteGateCountCard(cardId: number) {
  await api.delete(`/api/v1/cards/count/${cardId}`);
}

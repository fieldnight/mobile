/**
 * 관심 농약 API 레이어
 *
 * GET    /api/v1/interest-pesticides           → 관심 농약 목록 조회
 * POST   /api/v1/interest-pesticides           → 관심 농약 등록
 * DELETE /api/v1/interest-pesticides/:id       → 관심 농약 삭제
 *
 * 비즈니스 에러:
 *   409 INTEREST_PESTICIDE_ALREADY_EXISTS → 저장 중복 감지용으로 상위에서 처리
 *   404 INTEREST_PESTICIDE_NOT_FOUND      → 삭제 대상 없음으로 상위에서 처리
 */

import { api } from "@/lib/api";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface InterestPesticide {
  interestPesticideId: number;
  pesticideApplicationNo: string;
  brandName: string;
  productName: string;
  contentInfo: string;
  safeSprayInterval: string;
  cropName: string;
  insectName: string;
  usageName: string;
  targetPestName: string;
}

export type AddInterestPesticideBody = Omit<
  InterestPesticide,
  "interestPesticideId"
>;

// 관심 농약 목록 조회 — size 100으로 고정해 전량 조회 (페이지네이션 UI 불필요)
export async function getInterestPesticides(): Promise<InterestPesticide[]> {
  const res = await api.get<ApiResponse<{ content: InterestPesticide[] }>>(
    "/api/v1/interest-pesticides",
    { params: { page: 0, size: 100 } },
  );
  return res.data.data.content;
}

// 관심 농약 등록 — 409 중복 시 상위에서 처리, 그 외 에러는 console.log
export async function addInterestPesticide(
  body: AddInterestPesticideBody,
): Promise<{ interestPesticideId: number }> {
  const res = await api.post<ApiResponse<{ interestPesticideId: number }>>(
    "/api/v1/interest-pesticides",
    body,
  );
  return res.data.data;
}

// 관심 농약 삭제 — 404 미존재 시 상위에서 처리, 그 외 에러는 console.log
export async function deleteInterestPesticide(id: number): Promise<void> {
  await api.delete(`/api/v1/interest-pesticides/${id}`);
}

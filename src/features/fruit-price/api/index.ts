/**
 * 도매시장 시세 + 관심시장 API 레이어
 *
 * [구성]
 * - apiFetch()         : 공공데이터포털 도매시장 시세 조회 (기존)
 * - getInterestMarkets : GET  /api/v1/interest-markets       → 저장된 바로가기 목록
 * - addInterestMarket  : POST /api/v1/interest-markets       → 바로가기 저장
 * - deleteInterestMarket: DELETE /api/v1/interest-markets/:id → 바로가기 삭제
 *
 * [타입]
 * InterestMarket.cropMajorCode = 화면의 largeCode(gds_lclsf_cd)와 동일한 값
 */

import axios from "axios";
import type { Row } from "@/types";
import qs from "qs";
import { api } from "@/lib/api";

export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL!;
export const SERVICE_KEY = process.env.EXPO_PUBLIC_SERVICE_KEY!;
const PAGE_SIZE = 300;

// ── 공공 API ─────────────────────────────────────────────────────────────────

interface TradePage {
  rows: Row[];
  totalCount: number;
}

export function parseRows(data: any): { rows: Row[]; totalCount: number } {
  const resultCode = data?.response?.header?.resultCode;
  if (resultCode !== "0")
    throw new Error(data?.response?.header?.resultMsg ?? "API 오류");
  const raw = data?.response?.body?.items?.item;
  return {
    rows: !raw ? [] : Array.isArray(raw) ? raw : [raw],
    totalCount: data?.response?.body?.totalCount ?? 0,
  };
}

function serializeTradeParams(params: Record<string, string | number>) {
  const { serviceKey, ...rest } = params;
  return `serviceKey=${encodeURIComponent(serviceKey)}&${qs.stringify(rest, { encode: false })}`;
}

async function fetchTradePage(
  params: Record<string, string>,
  pageNo = 1,
  pageSize = PAGE_SIZE,
): Promise<TradePage> {
  const t0 = Date.now();
  console.log("[시세 API] 요청 시작", { params, pageNo, pageSize });

  const { data } = await axios.get(BASE_URL, {
    timeout: 15_000,
    params: {
      serviceKey: SERVICE_KEY,
      returnType: "json",
      numOfRows: String(pageSize),
      pageNo,
      ...params,
    },
    paramsSerializer: serializeTradeParams,
  });

  const result = parseRows(data);
  console.log(`[시세 API] 완료 ${Date.now() - t0}ms`, { totalCount: result.totalCount, rows: result.rows.length });
  return result;
}

export async function apiFetch(params: Record<string, string>): Promise<TradePage> {
  try {
    // 화면 첫 진입 속도를 위해 공공 API는 한 페이지만 조회합니다.
    // 특정 작물은 빠른 검색처럼 서버 필터 조건을 붙여 별도로 조회하는 방식이 더 안정적입니다.
    return await fetchTradePage(params);
  } catch (e: any) {
    const msg = e?.response?.data?.resultMsg ?? e?.message ?? "네트워크 오류";
    throw new Error(msg);
  }
}

// ── 관심 시장 API ─────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface InterestMarket {
  interestMarketId: number;
  marketCode: string;
  cropMajorCode: string;   // = gds_lclsf_cd
  cropMidName: string;     // 중분류명
  cropMinorName: string;   // 소분류명
}

// GET /api/v1/interest-markets
export async function getInterestMarkets(): Promise<InterestMarket[]> {
  const res = await api.get<ApiResponse<InterestMarket[]>>(
    "/api/v1/interest-markets"
  );
  return res.data.data;
}

// POST /api/v1/interest-markets
export async function addInterestMarket(
  body: Omit<InterestMarket, "interestMarketId">
): Promise<{ interestMarketId: number }> {
  const res = await api.post<ApiResponse<{ interestMarketId: number }>>(
    "/api/v1/interest-markets",
    body
  );
  return res.data.data;
}

// DELETE /api/v1/interest-markets/{interestMarketId}
export async function deleteInterestMarket(id: number): Promise<void> {
  await api.delete(`/api/v1/interest-markets/${id}`);
}

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
const PAGE_SIZE = 1000;
const MAX_PAGE_COUNT = 20;
const PAGE_BATCH_SIZE = 4;

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
  pageNo: number,
): Promise<TradePage> {
  const { data } = await axios.get(BASE_URL, {
    timeout: 15_000,
    params: {
      serviceKey: SERVICE_KEY,
      returnType: "json",
      numOfRows: String(PAGE_SIZE),
      pageNo,
      ...params,
    },
    paramsSerializer: serializeTradeParams,
  });

  return parseRows(data);
}

async function fetchTradePagesInBatches(
  params: Record<string, string>,
  startPage: number,
  endPage: number,
) {
  const pages: TradePage[] = [];

  // 공공 API에 한꺼번에 요청을 몰아치지 않도록 4페이지 단위로 병렬 조회합니다.
  for (let pageNo = startPage; pageNo <= endPage; pageNo += PAGE_BATCH_SIZE) {
    const pageNumbers = Array.from(
      { length: Math.min(PAGE_BATCH_SIZE, endPage - pageNo + 1) },
      (_, index) => pageNo + index,
    );
    pages.push(
      ...(await Promise.all(
        pageNumbers.map((nextPageNo) => fetchTradePage(params, nextPageNo)),
      )),
    );
  }

  return pages;
}

export async function apiFetch(params: Record<string, string>): Promise<TradePage> {
  try {
    // 드롭다운 옵션은 조회된 rows에서 파생되므로 첫 페이지만 받으면 일부 작물이 누락됩니다.
    const firstPage = await fetchTradePage(params, 1);
    const totalPages = Math.min(
      MAX_PAGE_COUNT,
      Math.ceil(firstPage.totalCount / PAGE_SIZE),
    );

    if (totalPages <= 1) return firstPage;

    const restPages = await fetchTradePagesInBatches(params, 2, totalPages);

    return {
      rows: [...firstPage.rows, ...restPages.flatMap((page) => page.rows)],
      totalCount: firstPage.totalCount,
    };
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

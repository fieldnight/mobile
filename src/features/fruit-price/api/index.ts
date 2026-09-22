import axios from "axios";
import qs from "qs";
import { api } from "@/lib/api";
import { PUBLIC_CONFIG } from "@/lib/publicConfig";
import type { Row } from "@/types";

export const BASE_URL = PUBLIC_CONFIG.fruitPriceBaseUrl;
export const SERVICE_KEY = PUBLIC_CONFIG.fruitPriceServiceKey;

const PAGE_SIZE = 300;

interface TradePage {
  rows: Row[];
  totalCount: number;
}

function assertTradeApiConfig() {
  if (!BASE_URL) {
    throw new Error("시세 API 주소가 설정되지 않았습니다.");
  }
  if (!SERVICE_KEY) {
    throw new Error("시세 API 인증키가 설정되지 않았습니다.");
  }
}

export function parseRows(data: unknown): { rows: Row[]; totalCount: number } {
  if (typeof data !== "object" || data === null) {
    throw new Error("시세 API 응답 형식이 올바르지 않습니다.");
  }

  const response = (data as any).response;
  const resultCode = response?.header?.resultCode;
  if (resultCode !== "0") {
    throw new Error(response?.header?.resultMsg ?? "시세 API 오류");
  }

  const raw = response?.body?.items?.item;
  return {
    rows: !raw ? [] : Array.isArray(raw) ? raw : [raw],
    totalCount: Number(response?.body?.totalCount ?? 0),
  };
}

function serializeTradeParams(params: Record<string, string | number>) {
  const { serviceKey, ...rest } = params;
  return `serviceKey=${encodeURIComponent(String(serviceKey ?? ""))}&${qs.stringify(rest, { encode: false })}`;
}

async function fetchTradePage(
  params: Record<string, string>,
  pageNo = 1,
  pageSize = PAGE_SIZE,
): Promise<TradePage> {
  assertTradeApiConfig();

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

  return parseRows(data);
}

export async function apiFetch(
  params: Record<string, string>,
): Promise<TradePage> {
  try {
    return await fetchTradePage(params);
  } catch (error: any) {
    const message =
      error?.response?.data?.response?.header?.resultMsg ??
      error?.response?.data?.resultMsg ??
      error?.message ??
      "시세 API 요청에 실패했습니다.";
    throw new Error(message);
  }
}

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface InterestMarket {
  interestMarketId: number;
  marketCode: string;
  cropMajorCode: string;
  cropMidName: string;
  cropMinorName: string;
}

export async function getInterestMarkets(): Promise<InterestMarket[]> {
  const res = await api.get<ApiResponse<InterestMarket[]>>(
    "/api/v1/interest-markets",
  );
  return res.data.data;
}

export async function addInterestMarket(
  body: Omit<InterestMarket, "interestMarketId">,
): Promise<{ interestMarketId: number }> {
  const res = await api.post<ApiResponse<{ interestMarketId: number }>>(
    "/api/v1/interest-markets",
    body,
  );
  return res.data.data;
}

export async function deleteInterestMarket(id: number): Promise<void> {
  await api.delete(`/api/v1/interest-markets/${id}`);
}

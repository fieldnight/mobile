import axios from "axios";
import type { Row } from "@/types";
import qs from "qs";

export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL!;
export const SERVICE_KEY = process.env.EXPO_PUBLIC_SERVICE_KEY!;

export function parseRows(data: any): { rows: Row[]; totalCount: number } {
  const resultCode = data?.response?.header?.resultCode;
  if (resultCode !== "0")
    throw new Error(data?.response?.header?.resultMsg ?? "API 오류");
  const raw = data?.response?.body?.items?.item;
  console.log("전체", data?.response?.body.totalCount);

  return {
    rows: !raw ? [] : Array.isArray(raw) ? raw : [raw],
    totalCount: data?.response?.body?.totalCount ?? 0,
  };
}

export async function apiFetch(params: Record<string, string>) {
  try {
    const { data, config } = await axios.get(BASE_URL, {
      timeout: 15_000,
      params: {
        serviceKey: SERVICE_KEY,
        returnType: "json",
        numOfRows: "300",
        pageNo: "1",
        ...params,
      },
      paramsSerializer: (p) => {
        const { serviceKey, ...rest } = p;
        return `serviceKey=${encodeURIComponent(serviceKey)}&${qs.stringify(rest, { encode: false })}`;
      },
    });
    console.log(
      "실제 URL:",
      config.url +
        "?" +
        qs.stringify(config.params, { encode: true, encodeValuesOnly: true }),
    );

    return parseRows(data);
  } catch (e: any) {
    const msg = e?.response?.data?.resultMsg ?? e?.message ?? "네트워크 오류";
    throw new Error(msg);
  }
}
/*https://apis.data.go.kr/B552845/katRealTime2/trades2?serviceKey=xNPW3bBwt8j3dOB9niigELSJ6hRgpxaeIun8XdyUN93%2FDJTyc%2BvpMpAcoCjcesOF96l0wsLx65PrA9fHgZYzMQ%3D%3D&pageNo=1&numOfRows=10&returnType=json&cond[whsl_mrkt_cd::EQ]=110001&cond[trd_clcln_ymd::EQ]=2026-03-21 */

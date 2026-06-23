import { api } from "@/lib/api";
import { AxiosError } from "axios";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface HiveReplacementHistory {
  replacementHistoryId: number;
  replacedAt: string;
  usageDays: number;
}

export interface HiveReplacementHistoryPage {
  first: boolean;
  size: number;
  content: HiveReplacementHistory[];
  number: number;
  numberOfElements: number;
  last: boolean;
  empty: boolean;
}

export interface HiveReplacementHistoryRequest {
  replacedAt: string;
}

export interface HiveReplacementHistoryCreateResponse {
  replacementHistoryId: number;
}

export interface GetHiveReplacementHistoryListParams {
  hiveId: string | number;
  page?: number;
  size?: number;
  sort?: "asc" | "desc";
}

function getApiErrorDetail(error: unknown) {
  if (error instanceof AxiosError) {
    return {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    };
  }

  return error;
}

function sortLatestFirst(items: HiveReplacementHistory[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.replacedAt).getTime() - new Date(a.replacedAt).getTime(),
  );
}

export async function getHiveReplacementHistoryList({
  hiveId,
  page = 0,
  size = 20,
  sort = "desc",
}: GetHiveReplacementHistoryListParams): Promise<HiveReplacementHistoryPage> {
  try {
    console.log("[Hive Replacement API] 목록 조회 요청", {
      hiveId,
      page,
      size,
      sort,
    });

    const res = await api.get<ApiResponse<HiveReplacementHistoryPage>>(
      `/api/v1/hives/${hiveId}/replacement-history`,
      {
        params: {
          page,
          size,
          sort,
        },
      },
    );

    const data = {
      ...res.data.data,
      content: sortLatestFirst(res.data.data.content ?? []),
    };

    console.log("[Hive Replacement API] 목록 조회 성공", {
      hiveId,
      count: data.content.length,
      latest: data.content[0],
    });

    return data;
  } catch (error) {
    console.error("[Hive Replacement API] 목록 조회 실패", {
      hiveId,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

export async function createHiveReplacementHistory(
  hiveId: string | number,
  body: HiveReplacementHistoryRequest,
): Promise<HiveReplacementHistoryCreateResponse> {
  try {
    console.log("[Hive Replacement API] 등록 요청", { hiveId, body });

    const res = await api.post<ApiResponse<HiveReplacementHistoryCreateResponse>>(
      `/api/v1/hives/${hiveId}/replacement-history`,
      body,
    );

    console.log("[Hive Replacement API] 등록 성공", {
      hiveId,
      body,
      data: res.data.data,
    });

    return res.data.data;
  } catch (error) {
    console.error("[Hive Replacement API] 등록 실패", {
      hiveId,
      body,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

export async function getHiveReplacementHistoryDetail({
  hiveId,
  historyId,
}: {
  hiveId: string | number;
  historyId: string | number;
}): Promise<HiveReplacementHistory> {
  try {
    console.log("[Hive Replacement API] 상세 조회 요청", { hiveId, historyId });

    const res = await api.get<ApiResponse<HiveReplacementHistory>>(
      `/api/v1/hives/${hiveId}/replacement-history/${historyId}`,
    );

    console.log("[Hive Replacement API] 상세 조회 성공", {
      hiveId,
      historyId,
      data: res.data.data,
    });

    return res.data.data;
  } catch (error) {
    console.error("[Hive Replacement API] 상세 조회 실패", {
      hiveId,
      historyId,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

export async function updateHiveReplacementHistory({
  hiveId,
  historyId,
  body,
}: {
  hiveId: string | number;
  historyId: string | number;
  body: HiveReplacementHistoryRequest;
}): Promise<void> {
  try {
    console.log("[Hive Replacement API] 수정 요청", { hiveId, historyId, body });

    await api.patch(
      `/api/v1/hives/${hiveId}/replacement-history/${historyId}`,
      body,
    );

    console.log("[Hive Replacement API] 수정 성공", { hiveId, historyId, body });
  } catch (error) {
    console.error("[Hive Replacement API] 수정 실패", {
      hiveId,
      historyId,
      body,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

export async function deleteHiveReplacementHistory({
  hiveId,
  historyId,
}: {
  hiveId: string | number;
  historyId: string | number;
}): Promise<void> {
  try {
    console.log("[Hive Replacement API] 삭제 요청", { hiveId, historyId });

    await api.delete(
      `/api/v1/hives/${hiveId}/replacement-history/${historyId}`,
    );

    console.log("[Hive Replacement API] 삭제 성공", { hiveId, historyId });
  } catch (error) {
    console.warn("[Hive Replacement API] 삭제 응답 에러, 목록 조회로 반영 여부 확인", {
      hiveId,
      historyId,
      error: getApiErrorDetail(error),
    });

    const page = await getHiveReplacementHistoryList({
      hiveId,
      page: 0,
      size: 100,
      sort: "desc",
    });
    const deleted = !page.content.some(
      (item) => String(item.replacementHistoryId) === String(historyId),
    );

    if (deleted) {
      console.log("[Hive Replacement API] 삭제 반영 확인 성공", {
        hiveId,
        historyId,
      });
      return;
    }

    console.warn("[Hive Replacement API] 삭제 실패", {
      hiveId,
      historyId,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

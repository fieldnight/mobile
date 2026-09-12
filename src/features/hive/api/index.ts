import { api } from "@/lib/api";
import { getApiErrorLogData } from "../utils";
import type { HiveData } from "@/types/hive-control";

/**
 * 벌통 관리 API 레이어
 * - 화면과 React Query hook은 이 파일의 함수만 호출합니다.
 * - 성공/실패 로그를 여기서 남기고, 에러는 다시 throw해서 React Query가 받을 수 있게 합니다.
 */
interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface HiveCreateRequest {
  macAddress: string;
  name: string;
  region: string;
  location: string;
  memo?: string;
}

export interface HiveUpdateRequest {
  name: string;
  region: string;
  location: string;
  memo?: string;
}

export interface HiveListItem {
  hiveId: number;
  name: string;
  region: string;
  location: string;
  macAddress: string;
  memo?: string | null;
  createdAt: string;
}

export interface HiveDetail extends HiveListItem {
  connectionStatus?: "ONLINE" | "OFFLINE" | string;
  lastConnectedAt?: string | null;
}

export interface HiveConnectionResponse {
  isConnected: boolean;
  lastConnectedAt: string | null;
}

export interface HiveListResponse {
  totalCount: number;
  hives: HiveListItem[];
}

function stripEmptyMemo<T extends { memo?: string | null }>(body: T) {
  const { memo, ...rest } = body;
  return memo?.trim() ? { ...rest, memo: memo.trim() } : rest;
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function isUpdateApplied(detail: HiveDetail, body: HiveUpdateRequest) {
  return (
    normalizeText(detail.name) === normalizeText(body.name) &&
    normalizeText(detail.region) === normalizeText(body.region) &&
    normalizeText(detail.location) === normalizeText(body.location) &&
    normalizeText(detail.memo) === normalizeText(body.memo)
  );
}


/** 벌통 기본 정보를 등록합니다. */
export async function createHive(
  body: HiveCreateRequest,
): Promise<{ hiveId: number }> {
  const requestBody = stripEmptyMemo(body);

  try {
    const res = await api.post<ApiResponse<{ hiveId: number }>>(
      "/api/v1/hives",
      requestBody,
    );
    console.log("[Hive API] 벌통 등록 성공", {
      body: requestBody,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    console.error("[Hive API] 벌통 등록 실패", {
      body: requestBody,
      error,
    });
    throw error;
  }
}

/** 사용자의 전체 벌통 목록을 조회합니다. */
export async function getHives(): Promise<HiveListResponse> {
  try {
    const res = await api.get<ApiResponse<HiveListResponse>>("/api/v1/hives");
    console.log("[Hive API] 벌통 전체 조회 성공", res.data.data);
    return res.data.data;
  } catch (error) {
    console.error("[Hive API] 벌통 전체 조회 실패", error);
    throw error;
  }
}

/** 특정 벌통의 상세 정보를 조회합니다. */
export async function getHiveDetail(hiveId: string | number): Promise<HiveDetail> {
  try {
    const res = await api.get<ApiResponse<HiveDetail>>(`/api/v1/hives/${hiveId}`);
    console.log("[Hive API] 벌통 상세 조회 성공", {
      hiveId,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    console.error("[Hive API] 벌통 상세 조회 실패", { hiveId, error });
    throw error;
  }
}

/** 벌통 기본 정보를 수정합니다. 서버가 에러를 줘도 상세 조회로 실제 반영 여부를 한 번 더 확인합니다. */
export async function updateHive(
  hiveId: string | number,
  body: HiveUpdateRequest,
): Promise<string> {
  const requestBody = stripEmptyMemo(body);

  try {
    const res = await api.patch<ApiResponse<string>>(
      `/api/v1/hives/${hiveId}`,
      requestBody,
    );
    console.log("[Hive API] 벌통 수정 성공", {
      hiveId,
      body: requestBody,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    // 현재 서버가 DB 반영 후 400을 주는 케이스가 있어, 상세 조회로 성공 여부를 한 번 더 검증합니다.
    console.warn("[Hive API] 벌통 수정 응답 에러, 상세 조회로 반영 여부 확인", {
      hiveId,
      body: requestBody,
      error,
    });
    const detail = await getHiveDetail(hiveId);

    if (isUpdateApplied(detail, body)) {
      console.log("[Hive API] 벌통 수정 반영 확인 성공", {
        hiveId,
        detail,
      });
      return "OK";
    }

    console.error("[Hive API] 벌통 수정 실패", {
      hiveId,
      body: requestBody,
      error,
    });
    throw error;
  }
}

/** 벌통을 삭제합니다. 서버가 에러를 줘도 목록 조회로 실제 삭제 여부를 한 번 더 확인합니다. */
export async function deleteHive(hiveId: string | number): Promise<string> {
  try {
    const res = await api.delete<ApiResponse<string>>(`/api/v1/hives/${hiveId}`);
    console.log("[Hive API] 벌통 삭제 성공", {
      hiveId,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    // 현재 서버가 DB 삭제 후 500을 주는 케이스가 있어, 목록 조회로 성공 여부를 한 번 더 검증합니다.
    console.warn("[Hive API] 벌통 삭제 응답 에러, 전체 조회로 반영 여부 확인", {
      hiveId,
      error: getApiErrorLogData(error),
    });
    const list = await getHives();
    const deleted = !list.hives.some(
      (hive) => String(hive.hiveId) === String(hiveId),
    );

    if (deleted) {
      console.log("[Hive API] 벌통 삭제 반영 확인 성공", { hiveId });
      return "OK";
    }

    console.warn("[Hive API] 벌통 삭제 실패", {
      hiveId,
      error: getApiErrorLogData(error),
    });
    throw error;
  }
}

/** 벌통 연동 상태(연결됨 / 오프라인)를 조회합니다. */
export async function getHiveConnection(
  hiveId: string | number,
): Promise<HiveConnectionResponse> {
  try {
    const res = await api.get<ApiResponse<HiveConnectionResponse>>(
      `/api/v1/hives/${hiveId}/connection`,
    );
    console.log("[Hive API] 연동 상태 조회 성공", { hiveId, data: res.data.data });
    return res.data.data;
  } catch (error) {
    console.error("[Hive API] 연동 상태 조회 실패", { hiveId, error });
    throw error;
  }
}

/** 서버 날짜 문자열을 화면에서 쓰는 yyyy-MM-dd 형태로 정리합니다. */
function formatDateLabel(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * 서버 벌통 모델을 기존 화면 컴포넌트가 쓰는 HiveData로 변환합니다.
 * 일서/API가 아직 분리되어 있어 온습도는 임시 표시값을 유지합니다.
 */
export function toHiveData(hive: HiveListItem | HiveDetail): HiveData {
  const online =
    "connectionStatus" in hive ? hive.connectionStatus === "ONLINE" : false;

  return {
    id: String(hive.hiveId),
    macAddress: hive.macAddress,
    name: hive.name,
    region: hive.region,
    location: hive.location,
    memo: hive.memo ?? "",
    registeredAt: formatDateLabel(hive.createdAt),
    status: online ? "online" : "offline",
    // REST 연결 상태는 센서 측정값이 아닙니다. 실측 전에는 UI에서 수신 대기를 표시합니다.
    temperature: 0,
    humidity: 0,
    externalTemperature: 0,
    externalHumidity: 0,
    connectionCheckedAt: "connectionStatus" in hive && hive.connectionStatus != null ? Date.now() : undefined,
    weight: 28,
    beeActivity: online ? "medium" : "low",
    lastUpdate: "측정값 수신 대기",
  };
}

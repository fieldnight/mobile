import { api } from "@/lib/api";
import type { HiveData } from "@/types/hive-control";

/**
 * 벌통 관리 API 레이어
 * - 화면과 React Query hook은 이 파일의 함수만 호출합니다.
 * - 서버 응답 래퍼(code/message/data)를 벗겨서 실제 data만 반환합니다.
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
  const res = await api.post<ApiResponse<{ hiveId: number }>>(
    "/api/v1/hives",
    stripEmptyMemo(body),
  );
  return res.data.data;
}

/** 사용자의 전체 벌통 목록을 조회합니다. */
export async function getHives(): Promise<HiveListResponse> {
  const res = await api.get<ApiResponse<HiveListResponse>>("/api/v1/hives");
  console.log("[Hive API] 전체 조회", res.data.data);
  return res.data.data;
}

/** 특정 벌통의 상세 정보를 조회합니다. */
export async function getHiveDetail(hiveId: string | number): Promise<HiveDetail> {
  const res = await api.get<ApiResponse<HiveDetail>>(`/api/v1/hives/${hiveId}`);
  console.log("[Hive API] 상세 조회", res.data.data);
  return res.data.data;
}

/** 벌통 기본 정보를 수정합니다. 서버가 반영 후 에러를 주는 경우 상세조회로 실제 반영 여부를 확인합니다. */
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
    return res.data.data;
  } catch (error) {
    // 현재 서버가 DB 반영 후에도 400 응답을 주는 케이스가 있어, 상세조회로 성공 여부를 한 번 더 검증합니다.
    console.warn("[Hive API] 수정 응답 에러, 상세조회로 반영 여부 확인", error);
    const detail = await getHiveDetail(hiveId);

    if (isUpdateApplied(detail, body)) {
      return "OK";
    }

    throw error;
  }
}

/** 벌통을 삭제합니다. */
export async function deleteHive(hiveId: string | number): Promise<string> {
  try {
    const res = await api.delete<ApiResponse<string>>(`/api/v1/hives/${hiveId}`);
    return res.data.data;
  } catch (error) {
    // 현재 서버가 DB 삭제 후에도 500 응답을 주는 케이스가 있어, 목록 조회로 실제 삭제 여부를 확인합니다.
    console.warn("[Hive API] 삭제 응답 에러, 전체조회로 반영 여부 확인", error);
    const list = await getHives();
    const deleted = !list.hives.some((hive) => String(hive.hiveId) === String(hiveId));

    if (deleted) {
      return "OK";
    }

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
 * 센서값 API가 아직 분리되어 있어 온습도는 임시 표시값을 유지합니다.
 */
export function toHiveData(hive: HiveListItem | HiveDetail): HiveData {
  const online =
    "connectionStatus" in hive
      ? hive.connectionStatus === "ONLINE"
      : true;

  return {
    id: String(hive.hiveId),
    macAddress: hive.macAddress,
    name: hive.name,
    region: hive.region,
    location: hive.location,
    memo: hive.memo ?? "",
    registeredAt: formatDateLabel(hive.createdAt),
    status: online ? "online" : "offline",
    temperature: online ? 34.5 : 0,
    humidity: online ? 62 : 0,
    externalTemperature: online ? 22.1 : 0,
    externalHumidity: online ? 48 : 0,
    weight: 28,
    beeActivity: online ? "medium" : "low",
    lastUpdate: online ? "방금" : "오프라인",
  };
}

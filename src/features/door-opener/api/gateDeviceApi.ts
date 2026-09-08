import { api } from "@/lib/api";
import type { Period } from "@/types";

/**
 * 개폐기 "하드웨어" 등록/리포트 API 레이어 (POST /api/v1/gates 등)
 * - src/features/door-opener/api/gateActionsApi.ts의 "Gate Action"과는 다른 백엔드 리소스입니다.
 *   그쪽은 벌통에 딸린 개폐기 스케줄 카드(HiveGateActionApi)이고, 이 파일은 개폐기 하드웨어
 *   자체(등록, 온습도/벌 카운트 리포트)를 다룹니다. 이름 충돌을 피하기 위해 GateDevice 접두어를
 *   사용합니다.
 */
interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export type GateDevicePeriod = "DAY" | "WEEK" | "MONTH";
export type GateDeviceSensorType = "TEMPERATURE" | "HUMIDITY";

export interface RegisterGateDeviceRequest {
  name: string;
  region?: string;
  location?: string;
  macAddress: string;
  memo?: string;
}

export interface GateTelemetryPoint {
  label: string;
  value: number | null;
}

export interface GateTelemetryResponse {
  sensorType: GateDeviceSensorType;
  period: GateDevicePeriod;
  data: GateTelemetryPoint[];
}

export interface GateBeeCountPoint {
  label: string;
  entranceIn: number | null;
  entranceOut: number | null;
  exitIn: number | null;
  exitOut: number | null;
}

export interface GateBeeCountResponse {
  period: GateDevicePeriod;
  data: GateBeeCountPoint[];
}

const PERIOD_TO_API: Record<Period, GateDevicePeriod> = {
  일간: "DAY",
  주간: "WEEK",
  월간: "MONTH",
};

export function getGateDeviceErrorLog(error: unknown) {
  const apiError = error as any;
  return {
    status: apiError?.response?.status,
    code: apiError?.response?.data?.code,
    message: apiError?.response?.data?.message ?? apiError?.message,
  };
}

export function getGateDeviceErrorMessage(error: unknown, fallback: string) {
  const apiError = error as any;
  const code = apiError?.response?.data?.code;
  const serverMessage = apiError?.response?.data?.message;

  if (code === "GATE_MAC_ADDRESS_ALREADY_EXISTS") {
    return typeof serverMessage === "string" && serverMessage.trim()
      ? serverMessage.trim()
      : "이미 등록된 개폐기 번호에요. 번호를 다시 확인해주세요!";
  }

  return typeof serverMessage === "string" && serverMessage.trim()
    ? serverMessage.trim()
    : fallback;
}

export function isGateNotFoundError(error: unknown) {
  return (error as any)?.response?.data?.code === "GATE_NOT_FOUND";
}

/** 개폐기 하드웨어를 등록합니다. */
export async function registerGateDevice(
  body: RegisterGateDeviceRequest,
): Promise<{ gateId: number }> {
  try {
    const res = await api.post<ApiResponse<{ gateId: number }>>(
      "/api/v1/gates",
      body,
    );
    console.log("[Gate Device API] 개폐기 등록 성공", {
      body,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    console.error("[Gate Device API] 개폐기 등록 실패", {
      body,
      error: getGateDeviceErrorLog(error),
    });
    throw error;
  }
}

/** 개폐기의 온습도 센서 데이터를 기간별로 조회합니다. */
export async function getGateDeviceTelemetry({
  gateId,
  period,
  sensorType,
}: {
  gateId: string | number;
  period: Period;
  sensorType: GateDeviceSensorType;
}): Promise<GateTelemetryResponse> {
  const apiPeriod = PERIOD_TO_API[period];

  console.log("[Gate Device API] 센서 데이터 조회 요청", {
    gateId,
    endpoint: `/api/v1/gates/${gateId}/telemetry`,
    period: apiPeriod,
    sensorType,
  });

  try {
    const res = await api.get<ApiResponse<GateTelemetryResponse>>(
      `/api/v1/gates/${gateId}/telemetry`,
      { params: { period: apiPeriod, sensorType } },
    );

    console.log("[Gate Device API] 센서 데이터 조회 성공", {
      gateId,
      period: res.data.data.period,
      sensorType: res.data.data.sensorType,
      count: res.data.data.data.length,
    });

    return res.data.data;
  } catch (error) {
    console.error("[Gate Device API] 센서 데이터 조회 실패", {
      gateId,
      period: apiPeriod,
      sensorType,
      error: getGateDeviceErrorLog(error),
    });
    throw error;
  }
}

/** 개폐기의 벌 카운트 데이터를 기간별로 조회합니다. */
export async function getGateDeviceBeeCount({
  gateId,
  period,
}: {
  gateId: string | number;
  period: Period;
}): Promise<GateBeeCountResponse> {
  const apiPeriod = PERIOD_TO_API[period];

  console.log("[Gate Device API] 벌 카운트 조회 요청", {
    gateId,
    endpoint: `/api/v1/gates/${gateId}/bee-count`,
    period: apiPeriod,
  });

  try {
    const res = await api.get<ApiResponse<GateBeeCountResponse>>(
      `/api/v1/gates/${gateId}/bee-count`,
      { params: { period: apiPeriod } },
    );

    console.log("[Gate Device API] 벌 카운트 조회 성공", {
      gateId,
      period: res.data.data.period,
      count: res.data.data.data.length,
    });

    return res.data.data;
  } catch (error) {
    console.error("[Gate Device API] 벌 카운트 조회 실패", {
      gateId,
      period: apiPeriod,
      error: getGateDeviceErrorLog(error),
    });
    throw error;
  }
}

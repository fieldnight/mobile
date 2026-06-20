import { api } from "@/lib/api";
import { AxiosError } from "axios";

/**
 * 스마트벌통 제어 API 레이어
 * - POST 응답은 MCU에 명령을 보냈다는 의미이고, 실제 처리 결과는 SSE로 따로 들어옵니다.
 * - 이 파일은 HTTP 요청만 담당하고 화면 상태 변경은 hooks/screen에서 처리합니다.
 */
interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
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

export type HiveControlType =
  | "TEMPERATURE"
  | "HUMIDITY"
  | "CO2"
  | "FAN"
  | "HEATER"
  | "DOOR";

export interface AutoControlSetting {
  type: HiveControlType;
  enabled: boolean;
}

export interface ManualControlSetting {
  type: HiveControlType;
  isOn: boolean;
}

export interface HiveControlSettingsResponse {
  auto: AutoControlSetting[];
  manual: ManualControlSetting[];
}

export interface ControlResultEvent {
  commandId: string;
  hiveId: number;
  type: HiveControlType;
  success: boolean;
  autoEnabled: boolean | null;
  manualEnabled: boolean | null;
  isOn: boolean | null;
  message: string | null;
}

export interface AutoControlRequest {
  type: HiveControlType;
  enabled: boolean;
}

export interface ManualControlRequest {
  type: HiveControlType;
  /** 수동 제어 활성화 여부 — isOn이 유효하려면 반드시 true */
  enabled: boolean;
  isOn: boolean;
}

export async function getHiveControlSettings(
  hiveId: string | number,
): Promise<HiveControlSettingsResponse> {
  try {
    const res = await api.get<ApiResponse<HiveControlSettingsResponse>>(
      `/api/v1/hives/${hiveId}/control`,
    );
    console.log("[Hive Control API] 제어 설정 조회 성공", {
      hiveId,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    console.error("[Hive Control API] 제어 설정 조회 실패", { hiveId, error });
    throw error;
  }
}

export async function requestAutoControl(
  hiveId: string | number,
  body: AutoControlRequest,
): Promise<string> {
  try {
    const res = await api.post<ApiResponse<string>>(
      `/api/v1/hives/${hiveId}/control/auto`,
      body,
    );
    console.log("[Hive Control API] 자동 제어 요청 성공", {
      hiveId,
      body,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    console.error("[Hive Control API] 자동 제어 요청 실패", {
      hiveId,
      body,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

export async function requestManualControl(
  hiveId: string | number,
  body: ManualControlRequest,
): Promise<string> {
  try {
    const res = await api.post<ApiResponse<string>>(
      `/api/v1/hives/${hiveId}/control/manual`,
      body,
    );
    console.log("[Hive Control API] 수동 제어 요청 성공", {
      hiveId,
      body,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    console.error("[Hive Control API] 수동 제어 요청 실패", {
      hiveId,
      body,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

import { api } from "@/lib/api";
import { AxiosError } from "axios";

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

export type ControlType = "TEMPERATURE" | "HUMIDITY";

export interface HiveControlEntry {
  type: ControlType;
  targetValue: number | null;
}

export interface HiveControlSettingsResponse {
  controls: HiveControlEntry[];
}

export interface ControlResultEvent {
  success: boolean;
  targetTemperature: number | null;
  targetHumidity: number | null;
  message: string | null;
}

export interface ManualControlRequest {
  targetTemperature?: number;
  targetHumidity?: number;
}

export interface HiveAutoControlSchedule {
  scheduleId: number;
  startTime: string;
  endTime: string;
}

export interface HiveAutoControlScheduleCreateRequest {
  startTime: string;
  endTime: string;
}

export interface HiveAutoControlScheduleCreateResponse {
  scheduleId: number;
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
    console.error("[Hive Control API] 제어 설정 조회 실패", {
      hiveId,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

export async function requestManualControl(
  hiveId: string | number,
  body: ManualControlRequest,
): Promise<void> {
  try {
    await api.post<ApiResponse<void>>(
      `/api/v1/hives/${hiveId}/control/manual`,
      body,
    );
    console.log("[Hive Control API] 수동 제어 요청 성공", { hiveId, body });
  } catch (error) {
    console.error("[Hive Control API] 수동 제어 요청 실패", {
      hiveId,
      body,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

export async function getHiveAutoControlSchedules(
  hiveId: string | number,
): Promise<HiveAutoControlSchedule[]> {
  try {
    const res = await api.get<ApiResponse<HiveAutoControlSchedule[]>>(
      `/api/v1/hives/${hiveId}/control/auto/schedules`,
    );
    console.log("[Hive Control Schedule API] 목록 조회 성공", {
      hiveId,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    console.error("[Hive Control Schedule API] 목록 조회 실패", {
      hiveId,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

export async function createHiveAutoControlSchedule(
  hiveId: string | number,
  body: HiveAutoControlScheduleCreateRequest,
): Promise<HiveAutoControlScheduleCreateResponse> {
  try {
    const res = await api.post<ApiResponse<HiveAutoControlScheduleCreateResponse>>(
      `/api/v1/hives/${hiveId}/control/auto/schedules`,
      body,
    );
    console.log("[Hive Control Schedule API] 등록 성공", {
      hiveId,
      body,
      data: res.data.data,
    });
    return res.data.data;
  } catch (error) {
    console.error("[Hive Control Schedule API] 등록 실패", {
      hiveId,
      body,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

export async function deleteHiveAutoControlSchedule({
  hiveId,
  scheduleId,
}: {
  hiveId: string | number;
  scheduleId: string | number;
}): Promise<void> {
  try {
    await api.delete<ApiResponse<void>>(
      `/api/v1/hives/${hiveId}/control/auto/schedules/${scheduleId}`,
    );
    console.log("[Hive Control Schedule API] 삭제 성공", { hiveId, scheduleId });
  } catch (error) {
    console.error("[Hive Control Schedule API] 삭제 실패", {
      hiveId,
      scheduleId,
      error: getApiErrorDetail(error),
    });
    throw error;
  }
}

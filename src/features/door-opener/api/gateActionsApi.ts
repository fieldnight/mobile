import { api } from "@/lib/api";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export type GateActionType =
  | "OPEN_ONLY"
  | "CLOSE_ONLY"
  | "WINDOW"
  | "ALTERNATE_24H"
  | "LOCK_DAYS"
  | "COUNT_STATUS"
  | "ACTIVITY_BOOST"
  | "OVERPOLLINATION_GUARD"
  | "RETURN_LIMIT";

export interface GateAction {
  id: number;
  title: string;
  actionType: GateActionType | string;
  actionTime: string;
  repeatEnabled: boolean;
}

export interface GateActionRequest {
  title: string;
  actionType: GateActionType | string;
  actionTime: string;
  repeatEnabled: boolean;
}

export function getGateActionErrorMessage(error: unknown) {
  const apiError = error as any;
  const status = apiError?.response?.status;
  const serverMessage = apiError?.response?.data?.message;

  if (status === 404 && typeof serverMessage === "string" && serverMessage.trim()) {
    return serverMessage.trim();
  }
  return "문제가 생겼어요.";
}

export function hasGateActionServerResponse(error: unknown) {
  return Boolean((error as any)?.response);
}

export function getGateActionErrorLog(error: unknown) {
  const apiError = error as any;
  return {
    status: apiError?.response?.status,
    code: apiError?.response?.data?.code,
    message: apiError?.response?.data?.message ?? apiError?.message,
  };
}

export async function getGateActions(hiveId: string | number) {
  try {
    const response = await api.get<ApiResponse<GateAction[]>>(
      `/api/v1/hives/${hiveId}/gate/actions`,
    );
    console.log("[Gate Action API] 목록 조회 성공", {
      hiveId,
      count: response.data.data.length,
    });
    return response.data.data;
  } catch (error) {
    console.warn("[Gate Action API] 목록 조회 실패", {
      hiveId,
      error: getGateActionErrorLog(error),
    });
    throw error;
  }
}

export async function createGateAction(
  hiveId: string | number,
  body: GateActionRequest,
) {
  try {
    const response = await api.post<ApiResponse<{ id: number }>>(
      `/api/v1/hives/${hiveId}/gate/actions`,
      body,
    );
    console.log("[Gate Action API] 등록 성공", {
      hiveId,
      body,
      data: response.data.data,
    });
    return response.data.data;
  } catch (error) {
    console.warn("[Gate Action API] 등록 실패", {
      hiveId,
      body,
      error: getGateActionErrorLog(error),
    });
    throw error;
  }
}

export async function updateGateAction(
  hiveId: string | number,
  actionId: string | number,
  body: GateActionRequest,
) {
  try {
    const response = await api.patch<ApiResponse<GateAction | string>>(
      `/api/v1/hives/${hiveId}/gate/actions/${actionId}`,
      body,
    );
    console.log("[Gate Action API] 수정 성공", { hiveId, actionId, body });
    return response.data.data;
  } catch (error) {
    console.warn("[Gate Action API] 수정 실패", {
      hiveId,
      actionId,
      body,
      error: getGateActionErrorLog(error),
    });
    throw error;
  }
}

export async function deleteGateAction(
  hiveId: string | number,
  actionId: string | number,
) {
  try {
    const response = await api.delete<ApiResponse<string>>(
      `/api/v1/hives/${hiveId}/gate/actions/${actionId}`,
    );
    console.log("[Gate Action API] 삭제 성공", {
      hiveId,
      actionId,
      data: response.data.data,
    });
    return response.data.data;
  } catch (error) {
    console.warn("[Gate Action API] 삭제 실패", {
      hiveId,
      actionId,
      error: getGateActionErrorLog(error),
    });
    throw error;
  }
}

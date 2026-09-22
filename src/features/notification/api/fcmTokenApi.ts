import axios from "axios";

import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

interface RegisterFcmTokenRequest {
  token: string;
  deviceInfo: string;
}

function maskValue(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function registerFcmToken({
  token,
  deviceInfo,
}: RegisterFcmTokenRequest): Promise<void> {
  console.log("[FCM Token API] 등록 요청", {
    token: maskValue(token),
    deviceInfo: maskValue(deviceInfo),
  });

  try {
    const response = await api.post<ApiResponse<string>>("/api/v1/fcm-tokens", {
      token,
      deviceInfo,
    });

    console.log("[FCM Token API] 등록 성공", {
      code: response.data.code,
      data: response.data.data,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("[FCM Token API] 등록 실패", {
        status: error.response?.status,
        code: error.response?.data?.code,
        message: error.response?.data?.message ?? error.message,
      });
    } else {
      console.error("[FCM Token API] 등록 실패", { error });
    }
    throw error;
  }
}

export async function deleteFcmToken(deviceInfo: string): Promise<void> {
  console.log("[FCM Token API] 삭제 요청", {
    deviceInfo: maskValue(deviceInfo),
  });

  try {
    const response = await api.delete<ApiResponse<string>>("/api/v1/fcm-tokens", {
      params: { deviceInfo },
    });

    console.log("[FCM Token API] 삭제 성공", {
      code: response.data.code,
      data: response.data.data,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("[FCM Token API] 삭제 실패", {
        status: error.response?.status,
        code: error.response?.data?.code,
        message: error.response?.data?.message ?? error.message,
      });
    } else {
      console.error("[FCM Token API] 삭제 실패", { error });
    }
    throw error;
  }
}

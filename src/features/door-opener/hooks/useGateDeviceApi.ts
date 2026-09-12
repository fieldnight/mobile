import { useMutation, useQuery } from "@tanstack/react-query";
import type { Period } from "@/types";
import {
  getGateDeviceBeeCount,
  getGateDeviceTelemetry,
  registerGateDevice,
  type GateBeeCountResponse,
  type GateTelemetryPoint,
  type RegisterGateDeviceRequest,
} from "../api";

/**
 * 개폐기 하드웨어 query key 모음
 * - 리포트(텔레메트리/벌 카운트) 캐시 키를 한곳에서 관리해 invalidate 실수를 줄입니다.
 */
export const GATE_DEVICE_QUERY_KEYS = {
  telemetry: (gateId: string | number, period: Period) =>
    ["gate-device", "telemetry", gateId, period] as const,
  beeCount: (gateId: string | number, period: Period) =>
    ["gate-device", "bee-count", gateId, period] as const,
};

/** 개폐기 등록 mutation hook */
export function useRegisterGateDevice() {
  return useMutation({
    mutationFn: (body: RegisterGateDeviceRequest) => registerGateDevice(body),
  });
}

export interface GateDeviceTelemetryData {
  temperature: GateTelemetryPoint[];
  humidity: GateTelemetryPoint[];
}

/**
 * 개폐기 리포트 화면의 온습도 센서 데이터 hook.
 * 온도, 습도를 병렬 조회한 뒤 화면에서 바로 쓸 수 있는 형태로 묶어줍니다.
 */
export function useGateDeviceTelemetry({
  gateId,
  period,
}: {
  gateId: string;
  period: Period;
}) {
  return useQuery({
    queryKey: GATE_DEVICE_QUERY_KEYS.telemetry(gateId, period),
    enabled: gateId !== "",
    retry: 1,
    queryFn: async (): Promise<GateDeviceTelemetryData> => {
      const [temperatureResult, humidityResult] = await Promise.allSettled([
        getGateDeviceTelemetry({ gateId, period, sensorType: "TEMPERATURE" }),
        getGateDeviceTelemetry({ gateId, period, sensorType: "HUMIDITY" }),
      ]);

      if (temperatureResult.status === "rejected") {
        console.error("[Gate Device Telemetry Hook] 온도 조회 실패", {
          gateId,
          period,
          reason: temperatureResult.reason,
        });
      }
      if (humidityResult.status === "rejected") {
        console.error("[Gate Device Telemetry Hook] 습도 조회 실패", {
          gateId,
          period,
          reason: humidityResult.reason,
        });
      }

      return {
        temperature:
          temperatureResult.status === "fulfilled"
            ? temperatureResult.value.data
            : [],
        humidity:
          humidityResult.status === "fulfilled" ? humidityResult.value.data : [],
      };
    },
  });
}

/** 개폐기 리포트 화면의 벌 카운트 데이터 hook. */
export function useGateDeviceBeeCount({
  gateId,
  period,
}: {
  gateId: string;
  period: Period;
}) {
  return useQuery<GateBeeCountResponse>({
    queryKey: GATE_DEVICE_QUERY_KEYS.beeCount(gateId, period),
    enabled: gateId !== "",
    retry: 1,
    queryFn: () => getGateDeviceBeeCount({ gateId, period }),
  });
}

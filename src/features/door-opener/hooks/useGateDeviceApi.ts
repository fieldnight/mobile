import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Period } from "@/types";
import type { GateData } from "@/types/gate-control";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGateStore } from "@/stores/useGateStore";
import {
  deleteGateDevice,
  getGateDeviceBeeCount,
  getGateDeviceList,
  getGateDeviceTelemetry,
  registerGateDevice,
  updateGateDevice,
  type GateBeeCountResponse,
  type GateListResponse,
  type GateSummary,
  type GateTelemetryPoint,
  type RegisterGateDeviceRequest,
  type UpdateGateDeviceRequest,
} from "../api";

/** 서버 GateSummary를 화면에서 쓰는 GateData로 변환합니다. */
function toGateData(summary: GateSummary): GateData {
  return {
    id: String(summary.gateId),
    gateId: summary.gateId,
    macAddress: summary.macAddress,
    name: summary.name,
    region: summary.region ?? undefined,
    location: summary.location ?? "",
    memo: summary.memo ?? "",
    registeredAt: summary.createdAt,
    isConnected: summary.isConnected,
  };
}

/**
 * 개폐기 하드웨어 query key 모음
 * - 목록/리포트(텔레메트리/벌 카운트) 캐시 키를 한곳에서 관리해 invalidate 실수를 줄입니다.
 */
export const GATE_DEVICE_QUERY_KEYS = {
  list: () => ["gate-device", "list"] as const,
  telemetry: (gateId: string | number, period: Period) =>
    ["gate-device", "telemetry", gateId, period] as const,
  beeCount: (gateId: string | number, period: Period) =>
    ["gate-device", "bee-count", gateId, period] as const,
};

/** 개폐기 등록 mutation hook */
export function useRegisterGateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterGateDeviceRequest) => registerGateDevice(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GATE_DEVICE_QUERY_KEYS.list() });
    },
  });
}

/** 내 개폐기 전체 목록 조회 query hook */
export function useGateDeviceList() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<GateListResponse>({
    queryKey: GATE_DEVICE_QUERY_KEYS.list(),
    queryFn: getGateDeviceList,
    enabled: isAuthenticated,
  });
}

/**
 * 서버 개폐기 목록을 조회하고 기존 Zustand store(useGateStore)에 동기화합니다.
 * - 기존 화면들이 useGateStore를 바라보고 있어 점진 연동을 위해 둔 bridge hook입니다.
 * - 서버 요청 실패 시 기존 로컬(AsyncStorage 캐시) 개폐기 목록은 그대로 유지됩니다.
 */
export function useSyncGateList() {
  const setGates = useGateStore((state) => state.setGates);
  const query = useGateDeviceList();

  useEffect(() => {
    if (!query.data?.gates) return;
    setGates(query.data.gates.map(toGateData));
  }, [query.data, setGates]);

  return query;
}

/** 개폐기 정보 수정 mutation hook */
export function useUpdateGateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      gateId,
      body,
    }: {
      gateId: string | number;
      body: UpdateGateDeviceRequest;
    }) => updateGateDevice(gateId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GATE_DEVICE_QUERY_KEYS.list() });
    },
  });
}

/** 개폐기 삭제 mutation hook */
export function useDeleteGateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gateId: string | number) => deleteGateDevice(gateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GATE_DEVICE_QUERY_KEYS.list() });
    },
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

      if (temperatureResult.status === "rejected") throw temperatureResult.reason;
      if (humidityResult.status === "rejected") throw humidityResult.reason;

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

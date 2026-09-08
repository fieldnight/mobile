import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHiveAutoControlSchedule,
  deleteHiveAutoControlSchedule,
  getHiveAutoControlSchedules,
  getHiveControlSettings,
  requestManualControl,
  type ControlResultEvent,
  type HiveAutoControlScheduleCreateRequest,
  type ManualControlRequest,
} from "../api";
import {
  subscribeHiveEvents,
  type HiveTelemetryEvent,
} from "../model/sseClient";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * 스마트벌통 제어 query key 모음
 */
export const HIVE_CONTROL_QUERY_KEYS = {
  settings: (hiveId: string | number | undefined) =>
    ["hive-control", "settings", hiveId] as const,
  schedules: (hiveId: string | number | undefined) =>
    ["hive-control", "auto-schedules", hiveId] as const,
};

/** 현재 벌통의 제어 설정(목표 온도/습도)을 조회합니다. */
export function useHiveControlSettings(hiveId: string | number | undefined) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: HIVE_CONTROL_QUERY_KEYS.settings(hiveId),
    queryFn: () => getHiveControlSettings(hiveId!),
    enabled: isAuthenticated && hiveId !== undefined && hiveId !== "",
  });
}

/** 수동 제어 명령 전송 hook */
export function useRequestManualControl() {
  return useMutation({
    mutationFn: ({
      hiveId,
      body,
    }: {
      hiveId: string | number;
      body: ManualControlRequest;
    }) => requestManualControl(hiveId, body),
  });
}

/** 현재 벌통에 등록된 자동제어 스케줄 목록을 조회합니다. */
export function useHiveAutoControlSchedules(hiveId: string | number | undefined) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: HIVE_CONTROL_QUERY_KEYS.schedules(hiveId),
    queryFn: () => getHiveAutoControlSchedules(hiveId!),
    enabled: isAuthenticated && hiveId !== undefined && hiveId !== "",
  });
}

/** 자동제어 스케줄을 등록하고 목록 캐시를 갱신합니다. */
export function useCreateHiveAutoControlSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      hiveId,
      body,
    }: {
      hiveId: string | number;
      body: HiveAutoControlScheduleCreateRequest;
    }) => createHiveAutoControlSchedule(hiveId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: HIVE_CONTROL_QUERY_KEYS.schedules(variables.hiveId),
      });
    },
  });
}

/** 자동제어 스케줄을 삭제하고 목록 캐시를 갱신합니다. */
export function useDeleteHiveAutoControlSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHiveAutoControlSchedule,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: HIVE_CONTROL_QUERY_KEYS.schedules(variables.hiveId),
      });
    },
  });
}

/**
 * 앱 전역 SSE 구독 hook
 * - 로그인된 상태에서만 연결하고, 제어 결과 이벤트를 받으면 호출자에게 넘깁니다.
 * - 화면을 벗어나면 cleanup에서 즉시 연결을 닫습니다.
 */
export function useHiveControlSse({
  enabled,
  onResult,
}: {
  enabled: boolean;
  onResult: (event: ControlResultEvent) => void;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // onResult가 리렌더마다 새로 만들어져도 구독을 유지하기 위해 ref로 최신 콜백만 갱신합니다.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!enabled || !isAuthenticated || !accessToken) return;

    return subscribeHiveEvents({
      accessToken,
      onControlResult: (event) => onResultRef.current(event),
      onError: (error) => {
        console.error("[Hive Control SSE] hook 오류", error);
      },
    });
  }, [accessToken, enabled, isAuthenticated]);
}

/** 로그인된 상태에서 벌통 센서 SSE 이벤트를 구독합니다. */
export function useHiveTelemetrySse({
  enabled,
  onTelemetry,
}: {
  enabled: boolean;
  onTelemetry: (event: HiveTelemetryEvent) => void;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // onTelemetry가 리렌더마다 새로 만들어져도 구독을 유지하기 위해 ref로 최신 콜백만 갱신합니다.
  const onTelemetryRef = useRef(onTelemetry);
  onTelemetryRef.current = onTelemetry;

  useEffect(() => {
    if (!enabled || !isAuthenticated || !accessToken) return;

    return subscribeHiveEvents({
      accessToken,
      onTelemetry: (event) => onTelemetryRef.current(event),
      onError: (error) => {
        console.error("[Hive Telemetry SSE] hook 오류", error);
      },
    });
  }, [accessToken, enabled, isAuthenticated]);
}

export type HiveSseConnectionStatus = "connected" | "reconnecting" | "disconnected";

/**
 * 벌통 SSE(실시간) 연결 상태를 노출하는 hook.
 * - 최초 연결 전에는 "disconnected", 연결되면 "connected",
 *   끊겨서 재연결을 시도하는 동안은 "reconnecting"으로 바뀝니다.
 * - 화면에서 이 상태 전환을 보고 재연결 안내 토스트 등을 띄우는 데 사용합니다.
 */
export function useHiveSseConnectionStatus({ enabled }: { enabled: boolean }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [status, setStatus] = useState<HiveSseConnectionStatus>("disconnected");

  useEffect(() => {
    if (!enabled || !isAuthenticated || !accessToken) {
      setStatus("disconnected");
      return;
    }

    return subscribeHiveEvents({
      accessToken,
      onOpen: () => setStatus("connected"),
      onReconnecting: () => setStatus("reconnecting"),
      onError: () => {
        // onReconnecting이 곧바로 뒤따라 재연결 상태로 바뀌므로 여기서는 로그만 남깁니다.
        console.error("[Hive SSE] 연결 상태 hook 오류");
      },
    });
  }, [accessToken, enabled, isAuthenticated]);

  return status;
}

export type { HiveTelemetryEvent } from "../model/sseClient";

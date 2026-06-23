import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHiveAutoControlSchedule,
  deleteHiveAutoControlSchedule,
  getHiveAutoControlSchedules,
  getHiveControlSettings,
  requestAutoControl,
  requestManualControl,
  type AutoControlRequest,
  type ControlResultEvent,
  type HiveAutoControlScheduleCreateRequest,
  type ManualControlRequest,
} from "../api";
import { subscribeHiveControlResult } from "../model/sseClient";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * 스마트벌통 제어 query key 모음
 * - 자동/수동 제어 요청 후 관련 조회 캐시만 정확히 다시 가져오기 위해 한곳에 모읍니다.
 */
export const HIVE_CONTROL_QUERY_KEYS = {
  settings: (hiveId: string | number | undefined) =>
    ["hive-control", "settings", hiveId] as const,
  schedules: (hiveId: string | number | undefined) =>
    ["hive-control", "auto-schedules", hiveId] as const,
};

/** 현재 벌통의 자동/수동 제어 설정을 조회합니다. */
export function useHiveControlSettings(hiveId: string | number | undefined) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: HIVE_CONTROL_QUERY_KEYS.settings(hiveId),
    queryFn: () => getHiveControlSettings(hiveId!),
    enabled: isAuthenticated && hiveId !== undefined && hiveId !== "",
  });
}

/** 자동 제어 명령 전송 hook */
export function useRequestAutoControl() {
  return useMutation({
    mutationFn: ({
      hiveId,
      body,
    }: {
      hiveId: string | number;
      body: AutoControlRequest;
    }) => requestAutoControl(hiveId, body),
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

  useEffect(() => {
    if (!enabled || !isAuthenticated || !accessToken) return;

    return subscribeHiveControlResult({
      accessToken,
      onResult,
      onError: (error) => {
        console.error("[Hive Control SSE] hook 오류", error);
      },
    });
  }, [accessToken, enabled, isAuthenticated, onResult]);
}

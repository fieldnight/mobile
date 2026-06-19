import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHive,
  deleteHive,
  getHiveDetail,
  getHives,
  toHiveData,
  updateHive,
  type HiveCreateRequest,
  type HiveUpdateRequest,
} from "../api";
import { useHiveStore } from "@/stores/useHiveStore";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * 벌통 query key 모음
 * - 목록/상세 캐시 키를 한곳에서 관리해 invalidate 실수를 줄입니다.
 */
export const HIVE_QUERY_KEYS = {
  list: ["hives"] as const,
  detail: (hiveId: string | number | undefined) =>
    ["hives", "detail", hiveId] as const,
};

/** 벌통 전체 목록 조회 hook */
export function useHiveList() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: HIVE_QUERY_KEYS.list,
    queryFn: getHives,
    enabled: isAuthenticated,
  });
}

/**
 * 서버 벌통 목록을 조회하고 기존 Zustand store에 동기화합니다.
 * - 기존 화면들이 useHiveStore를 바라보고 있어 점진 연동을 위해 둔 bridge hook입니다.
 * - 서버 요청 실패 시 기존 로컬 벌통 목록은 그대로 유지됩니다.
 */
export function useSyncHiveList() {
  const setHives = useHiveStore((state) => state.setHives);
  const query = useHiveList();

  useEffect(() => {
    if (!query.data?.hives) return;
    setHives(query.data.hives.map(toHiveData));
  }, [query.data, setHives]);

  return query;
}

/** 벌통 상세 조회 hook */
export function useHiveDetail(hiveId: string | number | undefined) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: HIVE_QUERY_KEYS.detail(hiveId),
    queryFn: () => getHiveDetail(hiveId!),
    enabled: isAuthenticated && hiveId !== undefined && hiveId !== "",
  });
}

/** 벌통 등록 mutation hook */
export function useCreateHive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: HiveCreateRequest) => createHive(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HIVE_QUERY_KEYS.list });
    },
  });
}

/** 벌통 수정 mutation hook */
export function useUpdateHive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      hiveId,
      body,
    }: {
      hiveId: string | number;
      body: HiveUpdateRequest;
    }) => updateHive(hiveId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: HIVE_QUERY_KEYS.list });
      queryClient.invalidateQueries({
        queryKey: HIVE_QUERY_KEYS.detail(variables.hiveId),
      });
    },
  });
}

/** 벌통 삭제 mutation hook */
export function useDeleteHive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hiveId: string | number) => deleteHive(hiveId),
    onSuccess: (_, hiveId) => {
      queryClient.invalidateQueries({ queryKey: HIVE_QUERY_KEYS.list });
      queryClient.removeQueries({ queryKey: HIVE_QUERY_KEYS.detail(hiveId) });
    },
  });
}

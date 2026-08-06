import { useEffect, useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHive,
  deleteHive,
  getHiveConnection,
  getHiveDetail,
  getHives,
  toHiveData,
  updateHive,
  type HiveListResponse,
  type HiveCreateRequest,
  type HiveUpdateRequest,
} from "../api";
import { getApiErrorLogData } from "../utils";
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
  connection: (hiveId: string | number | undefined) =>
    ["hives", "connection", hiveId] as const,
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
    const mapped = query.data.hives.map(toHiveData);
    console.log("[useSyncHiveList] 서버 hive 목록:", mapped.map((h) => ({ id: h.id, name: h.name })));
    setHives(mapped);
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
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: HIVE_QUERY_KEYS.list });
      await queryClient.cancelQueries({
        queryKey: HIVE_QUERY_KEYS.detail(variables.hiveId),
      });

      const previousList = queryClient.getQueryData<HiveListResponse>(
        HIVE_QUERY_KEYS.list,
      );
      const previousHives = useHiveStore.getState().hives;

      queryClient.setQueryData<HiveListResponse>(
        HIVE_QUERY_KEYS.list,
        (current) => {
          if (!current) return current;

          return {
            ...current,
            hives: current.hives.map((hive) =>
              String(hive.hiveId) === String(variables.hiveId)
                ? {
                    ...hive,
                    name: variables.body.name,
                    region: variables.body.region,
                    location: variables.body.location,
                    memo: variables.body.memo ?? null,
                  }
                : hive,
            ),
          };
        },
      );

      useHiveStore.getState().updateHive(String(variables.hiveId), {
        name: variables.body.name,
        region: variables.body.region,
        location: variables.body.location,
        memo: variables.body.memo ?? "",
      });

      console.log("[Hive UI] 벌통 수정 낙관적 반영", variables);

      return { previousList, previousHives };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: HIVE_QUERY_KEYS.detail(variables.hiveId),
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(HIVE_QUERY_KEYS.list, context.previousList);
      }
      if (context?.previousHives) {
        useHiveStore.getState().setHives(context.previousHives);
      }

      console.error("[Hive UI] 벌통 수정 낙관적 반영 롤백", {
        hiveId: variables.hiveId,
        error,
      });
    },
  });
}

/** 벌통 삭제 mutation hook */
export function useDeleteHive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hiveId: string | number) => deleteHive(hiveId),
    onMutate: async (hiveId) => {
      await queryClient.cancelQueries({ queryKey: HIVE_QUERY_KEYS.list });
      await queryClient.cancelQueries({ queryKey: HIVE_QUERY_KEYS.detail(hiveId) });

      const previousList = queryClient.getQueryData<HiveListResponse>(
        HIVE_QUERY_KEYS.list,
      );
      const previousHives = useHiveStore.getState().hives;

      queryClient.setQueryData<HiveListResponse>(
        HIVE_QUERY_KEYS.list,
        (current) => {
          if (!current) return current;

          return {
            ...current,
            totalCount: Math.max(0, current.totalCount - 1),
            hives: current.hives.filter(
              (hive) => String(hive.hiveId) !== String(hiveId),
            ),
          };
        },
      );

      useHiveStore.getState().deleteHive(String(hiveId));
      console.log("[Hive UI] 벌통 삭제 낙관적 반영", { hiveId });

      return { previousList, previousHives };
    },
    onSuccess: (_, hiveId) => {
      queryClient.removeQueries({ queryKey: HIVE_QUERY_KEYS.detail(hiveId) });
    },
    onError: (error, hiveId, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(HIVE_QUERY_KEYS.list, context.previousList);
      }
      if (context?.previousHives) {
        useHiveStore.getState().setHives(context.previousHives);
      }

      console.warn("[Hive UI] 벌통 삭제 낙관적 반영 롤백", {
        hiveId,
        error: getApiErrorLogData(error),
      });
    },
  });
}

/**
 * 벌통 목록의 연동 상태를 병렬로 조회하고 Zustand store의 HiveData.status를 갱신합니다.
 * - useSyncHiveList와 함께 사용해 슬라이더 배지(연결됨/오프라인)에 반영합니다.
 */
export function useHiveConnectionStatuses(hiveIds: string[]) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setHives = useHiveStore((state) => state.setHives);
  const hives = useHiveStore((state) => state.hives);

  const results = useQueries({
    queries: hiveIds.map((hiveId) => ({
      queryKey: HIVE_QUERY_KEYS.connection(hiveId),
      queryFn: () => getHiveConnection(hiveId),
      enabled: isAuthenticated && hiveId !== "",
    })),
  });

  const connectionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    hiveIds.forEach((id, i) => {
      const data = results[i]?.data;
      if (data !== undefined) map[id] = data.isConnected;
    });
    return map;
  }, [hiveIds, results]);

  useEffect(() => {
    if (!hives.length || !Object.keys(connectionMap).length) return;

    const hasChange = hives.some((hive) => {
      const isConnected = connectionMap[hive.id];
      if (isConnected === undefined) return false;
      return hive.status !== (isConnected ? "online" : "offline");
    });
    if (!hasChange) return;

    setHives(
      hives.map((hive) => {
        const isConnected = connectionMap[hive.id];
        if (isConnected === undefined) return hive;
        return { ...hive, status: isConnected ? ("online" as const) : ("offline" as const) };
      }),
    );
  }, [connectionMap, hives, setHives]);

  return results;
}

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHiveReplacementHistory,
  deleteHiveReplacementHistory,
  getHiveReplacementHistoryDetail,
  getHiveReplacementHistoryList,
  updateHiveReplacementHistory,
  type HiveReplacementHistory,
  type HiveReplacementHistoryPage,
  type HiveReplacementHistoryRequest,
} from "../api/replacementHistoryApi";

interface ReplacementListParams {
  page?: number;
  size?: number;
  sort?: "asc" | "desc";
}

export const HIVE_REPLACEMENT_QUERY_KEYS = {
  list: (hiveId: string | number | undefined, params?: ReplacementListParams) =>
    ["hive-replacement-history", "list", hiveId, params] as const,
  listPrefix: (hiveId: string | number | undefined) =>
    ["hive-replacement-history", "list", hiveId] as const,
  latest: (hiveId: string | number | undefined) =>
    ["hive-replacement-history", "latest", hiveId] as const,
  detail: (
    hiveId: string | number | undefined,
    historyId: string | number | undefined,
  ) => ["hive-replacement-history", "detail", hiveId, historyId] as const,
};

function normalizeListParams(params: ReplacementListParams = {}) {
  return {
    page: params.page ?? 0,
    size: params.size ?? 50,
    sort: params.sort ?? "desc",
  };
}

function invalidateHiveReplacementQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  hiveId: string | number,
) {
  queryClient.invalidateQueries({
    queryKey: HIVE_REPLACEMENT_QUERY_KEYS.listPrefix(hiveId),
  });
  queryClient.invalidateQueries({
    queryKey: HIVE_REPLACEMENT_QUERY_KEYS.latest(hiveId),
  });
}

/** 벌통 교체 기록 목록 조회 hook */
export function useHiveReplacementHistoryList(
  hiveId: string | number | undefined,
  params?: ReplacementListParams,
) {
  const requestParams = normalizeListParams(params);

  return useQuery({
    queryKey: HIVE_REPLACEMENT_QUERY_KEYS.list(hiveId, requestParams),
    queryFn: () =>
      getHiveReplacementHistoryList({
        hiveId: hiveId!,
        ...requestParams,
      }),
    enabled: hiveId !== undefined && hiveId !== "",
  });
}

/** 최신 교체 기록 1건 조회 hook */
export function useHiveLatestReplacementHistory(hiveId: string | number | undefined) {
  return useQuery({
    queryKey: HIVE_REPLACEMENT_QUERY_KEYS.latest(hiveId),
    queryFn: async () => {
      const page = await getHiveReplacementHistoryList({
        hiveId: hiveId!,
        page: 0,
        size: 1,
        sort: "desc",
      });
      return page.content[0];
    },
    enabled: hiveId !== undefined && hiveId !== "",
  });
}

/** 여러 벌통의 최신 교체 기록을 병렬 조회합니다. */
export function useHiveLatestReplacementMap(hiveIds: string[]) {
  const queries = useQueries({
    queries: hiveIds.map((hiveId) => ({
      queryKey: HIVE_REPLACEMENT_QUERY_KEYS.latest(hiveId),
      queryFn: async () => {
        const page = await getHiveReplacementHistoryList({
          hiveId,
          page: 0,
          size: 1,
          sort: "desc" as const,
        });
        return page.content[0] as HiveReplacementHistory | undefined;
      },
      enabled: hiveId !== "",
    })),
  });

  const latestMap = new Map<string, HiveReplacementHistory>();
  hiveIds.forEach((hiveId, index) => {
    const data = queries[index]?.data;
    if (data) latestMap.set(hiveId, data);
  });

  return latestMap;
}

/** 교체 기록 상세 조회 hook */
export function useHiveReplacementHistoryDetail({
  hiveId,
  historyId,
}: {
  hiveId: string | number | undefined;
  historyId: string | number | undefined;
}) {
  return useQuery({
    queryKey: HIVE_REPLACEMENT_QUERY_KEYS.detail(hiveId, historyId),
    queryFn: () =>
      getHiveReplacementHistoryDetail({
        hiveId: hiveId!,
        historyId: historyId!,
      }),
    enabled:
      hiveId !== undefined &&
      hiveId !== "" &&
      historyId !== undefined &&
      historyId !== "",
  });
}

export function useCreateHiveReplacementHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      hiveId,
      body,
    }: {
      hiveId: string | number;
      body: HiveReplacementHistoryRequest;
    }) => createHiveReplacementHistory(hiveId, body),
    onSuccess: (_, variables) => {
      invalidateHiveReplacementQueries(queryClient, variables.hiveId);
    },
  });
}

export function useUpdateHiveReplacementHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateHiveReplacementHistory,
    onSuccess: (_, variables) => {
      invalidateHiveReplacementQueries(queryClient, variables.hiveId);
      queryClient.invalidateQueries({
        queryKey: HIVE_REPLACEMENT_QUERY_KEYS.detail(
          variables.hiveId,
          variables.historyId,
        ),
      });
    },
  });
}

export function useDeleteHiveReplacementHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHiveReplacementHistory,
    onMutate: async (variables) => {
      const listKey = HIVE_REPLACEMENT_QUERY_KEYS.listPrefix(variables.hiveId);
      const latestKey = HIVE_REPLACEMENT_QUERY_KEYS.latest(variables.hiveId);
      const detailKey = HIVE_REPLACEMENT_QUERY_KEYS.detail(
        variables.hiveId,
        variables.historyId,
      );

      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: latestKey });
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousLists =
        queryClient.getQueriesData<HiveReplacementHistoryPage>({
          queryKey: listKey,
        });
      const previousLatest =
        queryClient.getQueryData<HiveReplacementHistory>(latestKey);

      queryClient.setQueriesData<HiveReplacementHistoryPage>(
        { queryKey: listKey },
        (current) => {
          if (!current) return current;

          const nextContent = current.content.filter(
            (item) =>
              String(item.replacementHistoryId) !==
              String(variables.historyId),
          );

          return {
            ...current,
            content: nextContent,
            numberOfElements: Math.max(0, current.numberOfElements - 1),
            empty: nextContent.length === 0,
          };
        },
      );

      if (
        previousLatest &&
        String(previousLatest.replacementHistoryId) ===
          String(variables.historyId)
      ) {
        queryClient.setQueryData(latestKey, undefined);
      }

      return { previousLists, previousLatest };
    },
    onSuccess: (_, variables) => {
      invalidateHiveReplacementQueries(queryClient, variables.hiveId);
      queryClient.removeQueries({
        queryKey: HIVE_REPLACEMENT_QUERY_KEYS.detail(
          variables.hiveId,
          variables.historyId,
        ),
      });
    },
    onError: (_error, variables, context) => {
      context?.previousLists?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      queryClient.setQueryData(
        HIVE_REPLACEMENT_QUERY_KEYS.latest(variables.hiveId),
        context?.previousLatest,
      );
    },
    onSettled: (_data, _error, variables) => {
      queryClient.refetchQueries({
        queryKey: HIVE_REPLACEMENT_QUERY_KEYS.listPrefix(variables.hiveId),
        type: "active",
      });
      queryClient.refetchQueries({
        queryKey: HIVE_REPLACEMENT_QUERY_KEYS.latest(variables.hiveId),
        type: "active",
      });
    },
  });
}

/**
 * 커뮤니티 탐색 훅
 *
 * [역할]
 * API 호출을 React Query로 감싸 로딩·에러·캐시를 관리.
 * 컴포넌트는 { data, isLoading, isError } 상태만 구독하면 됨.
 *
 * [캐시 전략]
 * useTrendingCategories  staleTime 5분  — 24h 집계라 자주 바뀌지 않음
 * useActiveUsers         staleTime 1분  — 1h 집계지만 실시간 성격이 강함
 *
 * [쿼리 키 네임스페이스]
 * ["community", "explore", "trending-categories"]
 * ["community", "explore", "active-users"]
 * → invalidateQueries 시 "community" 또는 "explore" 단위로 일괄 무효화 가능
 *
 * [훅 목록]
 * useTrendingCategories()  → TrendingCategory[]
 * useActiveUsers()         → ActiveUser[]
 */

import { useQuery } from "@tanstack/react-query";
import { getTrendingCategories, getActiveUsers } from "../api";

const QK = {
  trending: ["community", "explore", "trending-categories"] as const,
  activeUsers: ["community", "explore", "active-users"] as const,
};

// ── 인기 카테고리 ─────────────────────────────────────────────────────────────
export function useTrendingCategories() {
  return useQuery({
    queryKey: QK.trending,
    queryFn: getTrendingCategories,
    staleTime: 1000 * 60 * 5, // 5분 — 24h 집계라 자주 바뀌지 않음
  });
}

// ── 활동 유저 ─────────────────────────────────────────────────────────────────
export function useActiveUsers() {
  return useQuery({
    queryKey: QK.activeUsers,
    queryFn: getActiveUsers,
    staleTime: 1000 * 60, // 1분 — 1h 집계지만 실시간 성격이 강함
  });
}

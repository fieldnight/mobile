/**
 * 뉴스 훅 모듈
 *
 * [역할]
 * API 호출을 React Query로 감싸 로딩·에러·캐시를 관리.
 * 컴포넌트는 { data, isLoading, isError } 상태만 구독하면 됨.
 *
 * [훅 목록]
 * useNews         — Google RSS 뉴스 (비로그인 사용자용, 기존)
 * useNewsList     — GET /api/v1/news (로그인 사용자용)
 *                   keyword 파라미터 지원. 서버 Slice의 last가 false인 동안
 *                   fetchNextPage로 다음 서버 페이지를 이어붙여 100건 상한을 넘김.
 * useNewsDetail   — GET /api/v1/news/{newsArticleId} (로그인 사용자용)
 *                   newsArticleId가 null이면 쿼리 비활성화.
 *
 * [캐시 전략]
 * useNews         staleTime 5분  — RSS 파싱 결과, 자체 인메모리 캐시도 존재
 * useNewsList     staleTime 3분  — 서버 Slice, 목록이므로 짧게
 * useNewsDetail   staleTime 5분  — 기사 본문은 바뀌지 않으므로 좀 길게
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fetchGoogleNews, getNewsList, getNewsDetail } from '../api';
import type { SlicePage, ApiNewsItem } from '@/types/news';

const QK = {
  rss: (keyword: string) => ['news', 'rss', keyword] as const,
  list: (keyword: string) => ['news', 'api', 'list', keyword] as const,
  detail: (id: number) => ['news', 'api', 'detail', id] as const,
};

// ── RSS (비로그인) ─────────────────────────────────────────────────────────────
export function useNews(keyword: string) {
  return useQuery({
    queryKey: QK.rss(keyword),
    queryFn: () => fetchGoogleNews(keyword),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ── 목록 API (로그인) ──────────────────────────────────────────────────────────
// 서버 페이지당 size=100으로 요청하되, last가 false면(=100건 초과) fetchNextPage로
// 다음 서버 페이지를 이어붙임. 서버 Slice에 totalPages가 없어 last 플래그로만 종료 판단 가능
export function useNewsList(keyword: string) {
  const query = useInfiniteQuery({
    queryKey: QK.list(keyword),
    queryFn: ({ pageParam = 0 }) => getNewsList(keyword, pageParam, 100),
    getNextPageParam: (lastPage: SlicePage<ApiNewsItem>, allPages) =>
      lastPage.last ? undefined : allPages.length,
    staleTime: 1000 * 60 * 3,
  });

  const content = query.data?.pages.flatMap((p) => p.content) ?? [];

  return { ...query, content };
}

// ── 상세 API (로그인) ──────────────────────────────────────────────────────────
export function useNewsDetail(newsArticleId: number | null) {
  return useQuery({
    queryKey: QK.detail(newsArticleId ?? 0),
    queryFn: () => getNewsDetail(newsArticleId!),
    enabled: newsArticleId !== null && Number.isFinite(newsArticleId),
    staleTime: 1000 * 60 * 5,
  });
}

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
 *                   keyword + page 파라미터 지원. page 바뀔 때마다 새 쿼리 키 생성.
 * useNewsDetail   — GET /api/v1/news/{newsArticleId} (로그인 사용자용)
 *                   newsArticleId가 null이면 쿼리 비활성화.
 *
 * [캐시 전략]
 * useNews         staleTime 5분  — RSS 파싱 결과, 자체 인메모리 캐시도 존재
 * useNewsList     staleTime 3분  — 서버 Slice, 목록이므로 짧게
 * useNewsDetail   staleTime 5분  — 기사 본문은 바뀌지 않으므로 좀 길게
 */

import { useQuery } from '@tanstack/react-query';
import { fetchGoogleNews, getNewsList, getNewsDetail } from '../api';

const QK = {
  rss: (keyword: string) => ['news', 'rss', keyword] as const,
  list: (keyword: string, page: number) => ['news', 'api', 'list', keyword, page] as const,
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
// size=100으로 한 번에 다 받아서 프론트에서 페이지 슬라이싱 (RSS와 동일 방식)
// 서버 Slice에 totalPages가 없어 page별 호출로는 전체 수를 알 수 없기 때문
export function useNewsList(keyword: string) {
  return useQuery({
    queryKey: QK.list(keyword, 0),
    queryFn: () => getNewsList(keyword, 0, 100),
    staleTime: 1000 * 60 * 3,
  });
}

// ── 상세 API (로그인) ──────────────────────────────────────────────────────────
export function useNewsDetail(newsArticleId: number | null) {
  return useQuery({
    queryKey: QK.detail(newsArticleId ?? 0),
    queryFn: () => getNewsDetail(newsArticleId!),
    enabled: newsArticleId !== null,
    staleTime: 1000 * 60 * 5,
  });
}

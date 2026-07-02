import { useQuery } from '@tanstack/react-query';
import { fetchGoogleNews } from '../api';

// ── RSS (비로그인) ─────────────────────────────────────────────────────────────
export function useNews(keyword: string) {
  return useQuery({
    queryKey: QK.rss(keyword),
    queryFn: () => fetchGoogleNews(keyword),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

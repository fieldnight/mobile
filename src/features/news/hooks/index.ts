import { useQuery } from '@tanstack/react-query';
import { fetchGoogleNews } from '../api';

// 뉴스 조회
export function useNews(keyword: string) {
  return useQuery({
    queryKey: ['news', keyword],
    queryFn: () => fetchGoogleNews(keyword),
    staleTime: 5 * 60 * 1000, // 5분
    retry: 1,
  });
}

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchGoogleNews, getNewsDetail, getNewsList } from '../api';

const newsKeys = {
  rss: (keyword: string) => ['news', 'rss', keyword] as const,
  list: (keyword: string, size: number) => ['news', 'list', keyword, size] as const,
  detail: (newsArticleId: number) => ['news', 'detail', newsArticleId] as const,
};

export function useNews(keyword: string) {
  return useQuery({
    queryKey: newsKeys.rss(keyword),
    queryFn: () => fetchGoogleNews(keyword),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useNewsList(keyword: string, page = 0, size = 5) {
  const query = useInfiniteQuery({
    queryKey: newsKeys.list(keyword, size),
    queryFn: ({ pageParam = page }) => getNewsList(keyword, pageParam, size),
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  return {
    ...query,
    content: query.data?.pages.flatMap((pageData) => pageData.content) ?? [],
  };
}

export function useNewsDetail(newsArticleId: number) {
  return useQuery({
    queryKey: newsKeys.detail(newsArticleId),
    queryFn: () => getNewsDetail(newsArticleId),
    enabled: Number.isFinite(newsArticleId),
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });
}

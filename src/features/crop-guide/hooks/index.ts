import { useQuery } from '@tanstack/react-query';
import { getCropCategories, getCropGuide } from '../api';

const QK = {
  categories: ['crop-guide', 'categories'] as const,
  guide: (category: string, crop: string) =>
    ['crop-guide', 'detail', category, crop] as const,
};

export function useCropCategories() {
  return useQuery({
    queryKey: QK.categories,
    queryFn: getCropCategories,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCropGuide(
  category: string | null,
  crop: string | null,
  submitted: boolean,
) {
  return useQuery({
    queryKey: QK.guide(category ?? '', crop ?? ''),
    queryFn: () => getCropGuide(category!, crop!),
    enabled: submitted && !!category && !!crop,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 1;
    },
  });
}

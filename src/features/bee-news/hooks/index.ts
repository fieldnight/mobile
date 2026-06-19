import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInterestKeywords, addInterestKeyword } from "../api";
import { useAuthStore } from "@/stores/useAuthStore";

// ── 관심 키워드 목록: 로그인 전에는 사용자 키워드 API를 호출하지 않습니다.
export function useInterestKeywords() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ["interest-keywords"],
    queryFn: getInterestKeywords,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}

// ── 관심 키워드 추가
export function useAddInterestKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addInterestKeyword,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interest-keywords"] });
    },
  });
}

/**
 * 커뮤니티 게시글 훅
 *
 * [역할]
 * API 호출을 react-query로 감싸 로딩/에러/캐시 관리.
 * try-catch는 react-query가 내부 처리 → 컴포넌트는 상태만 구독.
 *
 * [훅 목록]
 * usePostList       무한 스크롤 목록
 * usePost           단건 조회
 * useCreatePost     등록
 * useUpdatePost     수정
 * useDeletePost     삭제
 */

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createPost,
  getPostList,
  getPost,
  updatePost,
  deletePost,
} from "../api";
import { PAGE_SIZE } from "@/constants/community";
import type { CreatePostRequest, UpdatePostRequest } from "@/types/community";

const QK = {
  list: (sort: string) => ["community", "posts", "list", sort] as const,
  detail: (id: number) => ["community", "posts", "detail", id] as const,
};

// ── 목록 (무한 스크롤) ───────────────────────────────────────────────────────
export function usePostList(sort: string = "desc") {
  return useInfiniteQuery({
    queryKey: QK.list(sort),
    queryFn: ({ pageParam = 0 }) => getPostList(pageParam, PAGE_SIZE, sort),
    getNextPageParam: (lastPage) => {
      const page = lastPage.page;

      if (!page) return undefined;
      if (page.totalPages === 0) return undefined;
      if (page.number + 1 >= page.totalPages) return undefined;

      return page.number + 1;
    },
    staleTime: 1000 * 30,
  });
}

// ── 단건 조회 ────────────────────────────────────────────────────────────────
export function usePost(postId: number | null) {
  return useQuery({
    queryKey: QK.detail(postId ?? 0),
    queryFn: () => getPost(postId!),
    enabled: !!postId,
    staleTime: 1000 * 30,
  });
}

// ── 생성 ─────────────────────────────────────────────────────────────────────
export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePostRequest) => createPost(body),
    onSuccess: () => {
      // 목록 전체 invalidate (정렬 키 무관)
      qc.invalidateQueries({ queryKey: ["community", "posts", "list"] });
    },
  });
}

// ── 수정 ─────────────────────────────────────────────────────────────────────
export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      postId,
      body,
    }: {
      postId: number;
      body: UpdatePostRequest;
    }) => updatePost(postId, body),
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: QK.detail(postId) });
      qc.invalidateQueries({ queryKey: ["community", "posts", "list"] });
    },
  });
}

// ── 삭제 ─────────────────────────────────────────────────────────────────────
export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => deletePost(postId),
    onSuccess: (_, postId) => {
      qc.removeQueries({ queryKey: QK.detail(postId) });
      qc.invalidateQueries({ queryKey: ["community", "posts", "list"] });
    },
  });
}

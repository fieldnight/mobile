/**
 * 커뮤니티 댓글 훅
 *
 * useComments       댓글 목록 조회
 * useCreateComment  등록
 * useUpdateComment  수정
 * useDeleteComment  삭제 (낙관적 업데이트)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} from "../api";
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
} from "@/types/community";

const QK = {
  list: (postId: number) => ["community", "comments", postId] as const,
};

// ── 목록 조회 ────────────────────────────────────────────────────────────────
export function useComments(postId: number) {
  return useQuery({
    queryKey: QK.list(postId),
    queryFn: () => getComments(postId),
    enabled: postId > 0,
    staleTime: 1000 * 30,
  });
}

// ── 등록 ─────────────────────────────────────────────────────────────────────
export function useCreateComment(postId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCommentRequest) => createComment(postId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.list(postId) });
      // 게시글 단건 캐시도 무효화 (commentCount 갱신)
      qc.invalidateQueries({
        queryKey: ["community", "posts", "detail", postId],
      });
    },
  });
}

// ── 수정 ─────────────────────────────────────────────────────────────────────
export function useUpdateComment(postId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      body,
    }: {
      commentId: number;
      body: UpdateCommentRequest;
    }) => {
      console.log("update body:", body);
      console.log("postId:", postId, "commentId:", commentId);
      return updateComment(postId, commentId, body);
    },
  });
}

// ── 삭제 (낙관적 업데이트) ───────────────────────────────────────────────────
export function useDeleteComment(postId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => deleteComment(postId, commentId),
    // 삭제 즉시 UI 반영 → 실패 시 롤백
    onMutate: async (commentId) => {
      await qc.cancelQueries({ queryKey: QK.list(postId) });
      const prev = qc.getQueryData<Comment[]>(QK.list(postId));
      qc.setQueryData<Comment[]>(
        QK.list(postId),
        (old) => old?.filter((c) => c.commentId !== commentId) ?? [],
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.list(postId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.list(postId) });
      qc.invalidateQueries({
        queryKey: ["community", "posts", "detail", postId],
      });
    },
  });
}

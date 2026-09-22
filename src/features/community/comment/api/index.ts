/**
 * 커뮤니티 댓글 API
 *
 * POST   /api/v1/posts/{postId}/comments               등록
 * GET    /api/v1/posts/{postId}/comments               목록 조회
 * PUT    /api/v1/posts/{postId}/comments/{commentId}   수정 (본인만, 403)
 * DELETE /api/v1/posts/{postId}/comments/{commentId}   삭제 (본인만, 403)
 */

import { api } from "@/lib/api";
import type {
  ApiResponse,
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
} from "@/types/community";

let callCount = 0;
const logCall = (method: string, url: string) => {
  callCount += 1;
  console.log(`[Community Comment API #${callCount}] ${method} ${url}`);
};

// ── 댓글 등록 ────────────────────────────────────────────────────────────────
export async function createComment(
  postId: number,
  body: CreateCommentRequest,
): Promise<{ commentId: number }> {
  logCall("POST", `/api/v1/posts/${postId}/comments`);
  const res = await api.post<ApiResponse<{ commentId: number }>>(
    `/api/v1/posts/${postId}/comments`,
    body,
  );
  return res.data.data;
}

// ── 댓글 목록 조회 ───────────────────────────────────────────────────────────
export async function getComments(postId: number): Promise<Comment[]> {
  logCall("GET", `/api/v1/posts/${postId}/comments`);
  const res = await api.get<ApiResponse<Comment[]>>(
    `/api/v1/posts/${postId}/comments`,
  );
  return res.data.data;
}

// ── 댓글 수정 ────────────────────────────────────────────────────────────────
export async function updateComment(
  postId: number,
  commentId: number,
  body: UpdateCommentRequest,
): Promise<void> {
  logCall("PUT", `/api/v1/posts/${postId}/comments/${commentId}`);

  console.log("🔥 API 직전 payload:", {
    postId,
    commentId,
    body,
  });

  await api.put(`/api/v1/posts/${postId}/comments/${commentId}`, body);
}

// ── 댓글 삭제 ────────────────────────────────────────────────────────────────
export async function deleteComment(
  postId: number,
  commentId: number,
): Promise<void> {
  logCall("DELETE", `/api/v1/posts/${postId}/comments/${commentId}`);
  await api.delete(`/api/v1/posts/${postId}/comments/${commentId}`);
}

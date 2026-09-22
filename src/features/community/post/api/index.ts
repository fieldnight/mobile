/**
 * 커뮤니티 게시글 API
 *
 * [역할]
 * axios 호출만 담당. 비즈니스 로직 없음.
 * 매 호출마다 console.log로 추적 가능하게 로깅.
 *
 * [엔드포인트]
 * POST   /api/v1/posts              게시글 등록
 * GET    /api/v1/posts               목록 조회 (slice)
 * GET    /api/v1/posts/{postId}      단건 조회
 * PUT    /api/v1/posts/{postId}      수정
 * DELETE /api/v1/posts/{postId}      삭제
 */

import { api } from "@/lib/api";
import type {
  ApiResponse,
  Post,
  PostListItem,
  SliceResponse,
  CreatePostRequest,
  UpdatePostRequest,
} from "@/types/community";

// API 호출 카운터 — 개발 중 호출 횟수 추적용
let callCount = 0;
const logCall = (method: string, url: string, extra?: string) => {
  callCount += 1;
  console.log(
    `[Community API #${callCount}] ${method} ${url}${extra ? ` ${extra}` : ""}`
  );
};

// ── 게시글 등록 ──────────────────────────────────────────────────────────────
export async function createPost(
  body: CreatePostRequest
): Promise<{ postId: number }> {
  logCall("POST", "/api/v1/posts");
  const res = await api.post<ApiResponse<{ postId: number }>>(
    "/api/v1/posts",
    body
  );
  return res.data.data;
}

// ── 게시글 목록 조회 (Slice 페이지네이션) ────────────────────────────────────
export async function getPostList(
  page: number = 0,
  size: number = 10,
  sort: string = "desc"
): Promise<SliceResponse<PostListItem>> {
  logCall("GET", "/api/v1/posts", `?page=${page}&size=${size}&sort=${sort}`);
  const res = await api.get<ApiResponse<SliceResponse<PostListItem>>>(
    "/api/v1/posts",
    { params: { page, size, sort } }
  );
  return res.data.data;
}

// ── 게시글 단건 조회 ─────────────────────────────────────────────────────────
export async function getPost(postId: number): Promise<Post> {
  logCall("GET", `/api/v1/posts/${postId}`);
  const res = await api.get<ApiResponse<Post>>(`/api/v1/posts/${postId}`);
  return res.data.data;
}

// ── 게시글 수정 ──────────────────────────────────────────────────────────────
export async function updatePost(
  postId: number,
  body: UpdatePostRequest
): Promise<void> {
  logCall("PUT", `/api/v1/posts/${postId}`);
  await api.put(`/api/v1/posts/${postId}`, body);
}

// ── 게시글 삭제 ──────────────────────────────────────────────────────────────
export async function deletePost(postId: number): Promise<void> {
  logCall("DELETE", `/api/v1/posts/${postId}`);
  await api.delete(`/api/v1/posts/${postId}`);
}
/**
 * 커뮤니티 타입 정의
 */

// ── API 공통 응답 ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

// ── 게시글 ────────────────────────────────────────────────────────────────────
export interface Post {
  postId: number;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  // 미구현 필드 (화면에만 사용)
  authorName?: string;
  category?: PostCategory;
  tags?: string[];
  imageUrl?: string;
}

export interface PostListItem {
  postId: number;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

// ── 페이지네이션 (Slice) ─────────────────────────────────────────────────────
export interface SliceResponse<T> {
  content: T[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

// ── 요청 바디 ─────────────────────────────────────────────────────────────────
export interface CreatePostRequest {
  title: string;
  content: string;
}

export interface UpdatePostRequest {
  title: string;
  content: string;
}

// ── UI 전용 ──────────────────────────────────────────────────────────────────
export type PostCategory = "tip" | "question" | "news" | "share";

export type SortKey = "latest" | "popular" | "unanswered";

export type CategoryTab =
  | "all"
  | "pollination"
  | "fruiting"
  | "pest"
  | "weather"
  | "market";

// ── 커뮤니티 탐색 ─────────────────────────────────────────────────────────────
export interface TrendingCategory {
  category: string;
  postCount: number;
}

export interface ActiveUser {
  userId: number;
  name: string;
  profileImageUrl: string;
}

// ── 댓글 ─────────────────────────────────────────────────────────────────────
export interface Comment {
  commentId: number;
  content: string;
  name: string; // API에서 직접 내려오는 작성자 이름
  createdAt: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

/**
 * 커뮤니티 탐색 API
 *
 * [역할]
 * axios 호출만 담당. 비즈니스 로직 없음.
 * 호출 시 callCount 로그로 호출 횟수 추적 가능.
 * 성공·실패 모두 console.log로 기록 후, 실패는 re-throw해서
 * React Query의 error 상태로 전달.
 *
 * [엔드포인트]
 * GET /api/v1/community/trending-categories
 *   → 최근 24h 게시글이 많이 올라온 카테고리 Top 3
 *   → 응답: [{ category: "KNOWHOW", postCount: 42 }, ...]
 *
 * GET /api/v1/community/active-users
 *   → 최근 1h 내 게시글 또는 댓글을 작성한 유저 목록
 *   → 응답: [{ userId, name, profileImageUrl }, ...]
 */

import { api } from "@/lib/api";
import type { ApiResponse, TrendingCategory, ActiveUser } from "@/types/community";

let callCount = 0;
const logCall = (method: string, url: string) => {
  callCount += 1;
  console.log(`[CommunityExplore API #${callCount}] ${method} ${url}`);
};

// ── 인기 카테고리 조회 ────────────────────────────────────────────────────────
export async function getTrendingCategories(): Promise<TrendingCategory[]> {
  logCall("GET", "/api/v1/community/trending-categories");
  try {
    const res = await api.get<ApiResponse<TrendingCategory[]>>(
      "/api/v1/community/trending-categories"
    );
    console.log("[CommunityExplore] 인기 카테고리 조회 완료", res.data.data);
    return res.data.data;
  } catch (err) {
    console.log("[CommunityExplore] 인기 카테고리 조회 실패", err);
    throw err;
  }
}

// ── 활동 유저 조회 ────────────────────────────────────────────────────────────
export async function getActiveUsers(): Promise<ActiveUser[]> {
  logCall("GET", "/api/v1/community/active-users");
  try {
    const res = await api.get<ApiResponse<ActiveUser[]>>(
      "/api/v1/community/active-users"
    );
    console.log("[CommunityExplore] 활동 유저 조회 완료", res.data.data);
    return res.data.data;
  } catch (err) {
    console.log("[CommunityExplore] 활동 유저 조회 실패", err);
    throw err;
  }
}

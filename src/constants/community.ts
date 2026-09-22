/**
 * 커뮤니티 상수
 * UI에서만 사용하는 더미 데이터 (API 미구현 필드)
 */

import type { CategoryTab, SortKey, PostCategory } from "@/types/community";

export const PAGE_SIZE = 10;

export const CATEGORY_TABS: { key: CategoryTab; label: string }[] = [
  { key: "all",         label: "전체" },
  { key: "pollination", label: "수정벌" },
  { key: "fruiting",    label: "착과·결실" },
  { key: "pest",        label: "병해충" },
  { key: "weather",     label: "날씨·환경" },
  { key: "market",      label: "장터" },
];

export const SORT_OPTIONS: { key: SortKey; label: string; disabled?: boolean }[] = [
  { key: "latest",      label: "최신" },
  { key: "popular",     label: "인기", disabled: true },
  { key: "unanswered",  label: "미답변", disabled: true },
];

// 카테고리 배지 색상 (UI 전용)
export const CATEGORY_STYLE: Record<PostCategory, { bg: string; color: string; label: string }> = {
  tip:      { bg: "#E8F7EF", color: "#03B26C", label: "노하우" },
  question: { bg: "#FFF3E0", color: "#FE9800", label: "질문" },
  news:     { bg: "#E8F3FF", color: "#F97316", label: "소식" },
  share:    { bg: "#F3E8FF", color: "#9333EA", label: "나눔" },
};

// 지금 뜨는 주제 (더미)
export const TRENDING_TAGS: string[] = [
  "#뒤영벌방사",
  "#딸기착과",
  "#벌통온도",
  "#수분불량",
  "#꽃가루",
];

// 고정 공지 (더미 — 나중에 API 생기면 교체)
export const PINNED_NOTICE = {
  title: "이번 주 수정벌 방사 적정 시기 안내 — 기온 13°C 이상 확인 후 방사하세요",
  author: "WEBEE 운영팀",
  time: "2시간 전",
};

// 활동 중인 농부 더미 (나중에 /users/active API로 교체)
export const ACTIVE_FARMERS = [
  { id: 1, name: "경북 김씨", postCount: 42, active: true,  color: "#FFB74D" },
  { id: 2, name: "충남 박씨", postCount: 31, active: true,  color: "#FFCCBC" },
  { id: 3, name: "전남 이씨", postCount: 28, active: false, color: "#A5D6A7" },
  { id: 4, name: "경기 최씨", postCount: 19, active: false, color: "#CE93D8" },
  { id: 5, name: "강원 정씨", postCount: 15, active: false, color: "#80DEEA" },
];
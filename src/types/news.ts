// News types

// RSS 파싱 결과 (비로그인 사용자용)
export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

export interface NewsState {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  keyword: string;
}

export type NewsKeyword = '꿀벌' | '수정벌';

// API 뉴스 타입 (로그인 사용자용)
// GET /api/v1/news — 목록의 각 항목
export interface ApiNewsItem {
  newsArticleId: number;
  title: string;
  source: string;
  publishedAt: string; // ISO 8601
}

// GET /api/v1/news/{newsArticleId} — 상세
export interface ApiNewsDetail {
  newsArticleId: number;
  title: string;
  content: string;
  source: string;
  publishedAt: string; // ISO 8601
}

// Slice 페이지네이션 래퍼 (서버 공통 구조)
export interface SlicePage<T> {
  content: T[];
  first: boolean;
  last: boolean;
  number: number;
  size: number;
  numberOfElements: number;
  empty: boolean;
}

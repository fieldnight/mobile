// News types
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

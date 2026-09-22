import { api } from '@/lib/api';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface InterestKeyword {
  interestNewsKeywordId: number;
  keyword: string;
}

// ── 관심 키워드 조회
export async function getInterestKeywords(): Promise<InterestKeyword[]> {
  const res = await api.get<ApiResponse<InterestKeyword[]>>(
    '/api/v1/interest-news-keywords'
  );
  return res.data.data;
}

// ── 관심 키워드 등록
export async function addInterestKeyword(
  keyword: string
): Promise<{ interestNewsKeywordId: number }> {
  const res = await api.post<ApiResponse<{ interestNewsKeywordId: number }>>(
    '/api/v1/interest-news-keywords',
    { keyword }
  );
  return res.data.data;
}
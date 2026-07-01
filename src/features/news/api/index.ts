/**
 * 뉴스 API 모듈
 *
 * [역할]
 * 1. fetchGoogleNews   — Google News RSS 파싱 (비로그인 사용자용)
 *    - 외부 XML을 정규식으로 파싱해 NewsItem[] 반환
 *    - 인메모리 캐시(TTL 5분, 최대 10개 쿼리)로 반복 요청 방어
 *
 * 2. getNewsList       — GET /api/v1/news (로그인 사용자용)
 *    - keyword + page + size 파라미터로 서버 Slice 조회
 *    - 서버 응답: ApiResponse<SlicePage<ApiNewsItem>>
 *
 * 3. getNewsDetail     — GET /api/v1/news/{newsArticleId} (로그인 사용자용)
 *    - 뉴스 ID로 본문 포함 상세 조회
 *    - 서버 응답: ApiResponse<ApiNewsDetail>
 *    - 404 시 서버가 에러를 반환하며, axios가 자동으로 throw함
 *
 * [로그 규칙]
 * - API 호출마다 callCount를 증가시키고 [News API #N] 형식으로 기록
 * - 성공 시 console.log, 실패 시 console.log 후 re-throw
 */
import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { NewsItem, ApiNewsItem, ApiNewsDetail, SlicePage } from "@/types/news";

const parseXMLtoResults = (xmlText: string): NewsItem[] => {
  const newsList: NewsItem[] = [];

  try {
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    let itemCount = 0;
    // 최대 25개 항목을 파싱하도록 증가 (페이지당 5개 × 5페이지)
    while ((match = itemRegex.exec(xmlText)) !== null && itemCount < 25) {
      const itemXml = match[1];

      const title = extractContent(itemXml, "title") || "";
      const link = extractContent(itemXml, "link") || "";
      const pubDate = extractContent(itemXml, "pubDate") || "";
      const rawDescription = extractContent(itemXml, "description") || "";
      const description = stripHtmlTags(rawDescription);
      const source = extractContent(itemXml, "source") || "뉴스";

      if (title && link) {
        newsList.push({ title, link, pubDate, description, source });
        itemCount++;
      }
    }
  } catch (error) {
    console.error("XML parsing error:", error);
  }

  // 정렬: pubDate 기준 최신순으로 정렬 (가장 최신 항목이 배열 앞에 오도록)
  const toMillis = (dateStr: string) => {
    const t = Date.parse(dateStr);
    return isNaN(t) ? 0 : t;
  };
  newsList.sort((a, b) => toMillis(b.pubDate) - toMillis(a.pubDate));

  return newsList;
};

const extractContent = (xml: string, tag: string): string => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";

  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
};

const stripHtmlTags = (html: string): string => {
  return (
    html
      // 먼저 HTML 엔티티 디코딩
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&nbsp;/gi, " ")
      // 그 다음 HTML 태그 제거
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ") // 연속 공백 정리
      .trim()
  );
};

const newsCache = new Map<string, { data: NewsItem[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 10;
const MAX_RSS_ITEMS = 25; // 페이지당 5개 × 5페이지 확보

export async function fetchGoogleNews(query: string): Promise<NewsItem[]> {
  if (newsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = newsCache.keys().next().value;
    if (oldestKey) {
      newsCache.delete(oldestKey);
    }
  }

  const cached = newsCache.get(query);
  // 캐시가 있고 충분한 항목 수(MAX_RSS_ITEMS)를 가지고 있으며 TTL 내이면 캐시 사용
  if (
    cached &&
    Date.now() - cached.timestamp < CACHE_TTL &&
    cached.data.length >= MAX_RSS_ITEMS
  ) {
    return cached.data;
  }

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query,
  )}&hl=ko&gl=KR&ceid=KR:ko`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(rssUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const xmlText = await res.text();
    const newsList = parseXMLtoResults(xmlText);

    newsCache.set(query, { data: newsList, timestamp: Date.now() });

    return newsList;
  } catch (error) {
    console.error("News fetch error:", error);

    const cached = newsCache.get(query);
    if (cached) {
      return cached.data;
    }

    throw new Error("뉴스를 불러오는데 실패했습니다.");
  }
}

// ── 로그인 사용자용 API ──────────────────────────────────────────────────────

let callCount = 0;
const logCall = (method: string, url: string) => {
  callCount += 1;
  console.log(`[News API #${callCount}] ${method} ${url}`);
};

// GET /api/v1/news?keyword=꿀벌&page=0&size=5
export async function getNewsList(
  keyword: string,
  page: number = 0,
  size: number = 5,
): Promise<SlicePage<ApiNewsItem>> {
  logCall("GET", `/api/v1/news?keyword=${keyword}&page=${page}&size=${size}`);
  try {
    const res = await api.get<ApiResponse<SlicePage<ApiNewsItem>>>("/api/v1/news", {
      params: { keyword, page, size },
    });
    console.log("[News] 뉴스 목록 조회 완료", res.data.data.content.length, "건", res.data.data.content);
    return res.data.data;
  } catch (err) {
    console.log("[News] 뉴스 목록 조회 실패", err);
    throw err;
  }
}

// GET /api/v1/news/{newsArticleId}
export async function getNewsDetail(newsArticleId: number): Promise<ApiNewsDetail> {
  logCall("GET", `/api/v1/news/${newsArticleId}`);
  try {
    const res = await api.get<ApiResponse<ApiNewsDetail>>(`/api/v1/news/${newsArticleId}`);
    console.log("[News] 뉴스 상세 조회 완료", res.data.data);
    return res.data.data;
  } catch (err) {
    console.log("[News] 뉴스 상세 조회 실패", err);
    throw err;
  }
}

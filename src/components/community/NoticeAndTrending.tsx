/**
 * 커뮤니티 공지·트렌딩 섹션
 *
 * [컴포넌트 구성]
 * PinnedNotice  — 상단 고정 공지 카드. 현재는 constants의 더미 데이터 사용
 *                 (추후 공지 API 생기면 교체 예정)
 * TrendingTags  — 지금 뜨는 카테고리 Top 3 칩 목록
 *
 * [TrendingTags 데이터 흐름]
 * useTrendingCategories() → GET /api/v1/community/trending-categories
 * → 최근 24h 게시글이 많이 올라온 카테고리 Top 3 반환
 *   예: [{ category: "KNOWHOW", postCount: 42 }, ...]
 * → staleTime 5분 (24h 집계라 자주 바뀌지 않음)
 *
 * [TrendingTags 렌더링 로직]
 * 1. isLoading=true  → 오렌지 스피너
 * 2. 데이터 있음    → 순위(1·2·3) + 카테고리 한국어명 + 게시글 수 칩
 *    - 서버 enum(KNOWHOW 등) → CATEGORY_LABEL 테이블로 한국어 변환
 *    - 매핑 없는 값은 서버 원문 그대로 표시 (fallback)
 */
import { View, ActivityIndicator } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { PINNED_NOTICE } from "@/constants/community";
import { PretendardFont } from "@/components/PretendardFont";
import { useTrendingCategories } from "@/features/community/explore";

// 서버 카테고리 enum → 한국어 표시명
const CATEGORY_LABEL: Record<string, string> = {
  KNOWHOW:   "노하우",
  QUESTION:  "질문",
  NEWS:      "소식",
  SHARE:     "나눔",
  GENERAL:   "자유",
};

export function PinnedNotice() {
  return (
    <View
      className="mx-5 mt-3 rounded-xl p-4 flex-row items-start"
      style={{
        backgroundColor: "#e8f3ff",
        borderWidth: 1,
        borderColor: "rgba(249,115,22,0.15)",
      }}
    >
      <View className="mr-3">
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Circle
            cx="18"
            cy="18"
            r="17"
            fill="#FFF3E0"
            stroke="#FFE0B2"
            strokeWidth="1"
          />
          <Path
            d="M18 8 L20 14 L27 14 L21 18 L23 24 L18 20 L13 24 L15 18 L9 14 L16 14 Z"
            fill="#FFC107"
          />
        </Svg>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1 mb-1">
          <Feather name="star" size={10} color="#f97316" />
          <PretendardFont weight="semibold" style={{ fontSize: 11, color: "#f97316" }}>
            공지
          </PretendardFont>
        </View>
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 14, color: "#191f28", lineHeight: 20 }}
          numberOfLines={2}
        >
          {PINNED_NOTICE.title}
        </PretendardFont>
        <PretendardFont style={{ fontSize: 12, marginTop: 4, color: "#8b95a1" }}>
          {PINNED_NOTICE.author} · {PINNED_NOTICE.time}
        </PretendardFont>
      </View>
    </View>
  );
}

export function TrendingTags() {
  const { data: categories, isLoading } = useTrendingCategories();

  return (
    <View className="bg-white px-5 py-4 mb-2">
      <View className="flex-row items-center gap-1.5 mb-3">
        <Feather name="trending-up" size={15} color="#191f28" />
        <PretendardFont weight="bold" style={{ fontSize: 15, color: "#111827" }}>
          지금 뜨는 주제
        </PretendardFont>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#f97316" style={{ alignSelf: "flex-start" }} />
      ) : !categories?.length ? (
        <PretendardFont style={{ fontSize: 13, color: "#9ca3af" }}>
          아직 집계된 인기 주제가 없어요
        </PretendardFont>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {categories.map((item, i) => (
            <View
              key={item.category}
              className="flex-row items-center gap-1.5 rounded-full"
              style={{
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#e5e8eb",
                paddingHorizontal: 14,
                paddingVertical: 7,
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
              }}
            >
              <PretendardFont weight="bold" style={{ fontSize: 11, color: "#f97316" }}>
                {i + 1}
              </PretendardFont>
              <PretendardFont weight="medium" style={{ fontSize: 13, color: "#4e5968" }}>
                {CATEGORY_LABEL[item.category] ?? item.category}
              </PretendardFont>
              <PretendardFont style={{ fontSize: 10, color: "#9ca3af" }}>
                {item.postCount}개
              </PretendardFont>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

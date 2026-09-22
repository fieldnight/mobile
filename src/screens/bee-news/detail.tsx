/**
 * 뉴스 상세 화면
 *
 * [진입 경로]
 * 로그인 사용자가 뉴스 목록에서 특정 기사 탭 → /bee-news/{newsArticleId}
 *
 * [데이터 흐름]
 * useNewsDetail(newsArticleId)
 *   → GET /api/v1/news/{newsArticleId}
 *   → 서버 응답: ApiResponse<ApiNewsDetail>
 *   → { title, content, source, publishedAt }
 *
 * [상태 처리]
 * isLoading  → 스켈레톤 (제목 + 본문 영역)
 * isError    → 에러 안내 + 뒤로가기 버튼
 * success    → 제목 · 출처 · 날짜 · 본문 표시
 *
 * [스크롤]
 * 본문이 길 수 있으므로 ScrollView 사용
 * AppHeader는 useScrollHeader로 스크롤 연동
 */

import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "expo-router";

import { useNewsDetail } from "@/features";
import { formatDateKorean } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader } from "@/hooks";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

// 본문 스켈레톤
function DetailSkeleton() {
  return (
    <View className="px-5 pt-4">
      {/* 제목 */}
      <View className="h-6 rounded-lg bg-gray-200 mb-2" style={{ width: "90%" }} />
      <View className="h-6 rounded-lg bg-gray-200 mb-4" style={{ width: "70%" }} />
      {/* 메타 */}
      <View className="h-4 rounded-md bg-gray-100 mb-6" style={{ width: "40%" }} />
      {/* 본문 줄 */}
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} className="h-4 rounded-md bg-gray-100 mb-3" style={{ width: i % 3 === 2 ? "60%" : "100%" }} />
      ))}
    </View>
  );
}

export default function NewsDetailScreen({ newsArticleId }: { newsArticleId: number }) {
  const navigation = useNavigation();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();

  const { data, isLoading, isError, refetch } = useNewsDetail(newsArticleId);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <AppHeader title="뉴스" onBack={() => navigation.goBack()} isScrolled={isScrolled} />

      {isLoading ? (
        <ScrollView className="flex-1" style={{ paddingTop: 56 }}>
          <DetailSkeleton />
        </ScrollView>
      ) : isError ? (
        <View className="flex-1 items-center justify-center gap-4 p-10">
          <Feather name="alert-circle" size={48} color={C.ter} />
          <PretendardFont
            weight="regular"
            style={{ fontSize: 15, color: C.sec, textAlign: "center", lineHeight: 24 }}
          >
            기사를 불러오지 못했어요.{"\n"}잠시 후 다시 시도해 주세요.
          </PretendardFont>
          <Pressable
            onPress={() => refetch()}
            className="px-6 py-3 rounded-xl active:opacity-80"
            style={{ backgroundColor: C.primary }}
          >
            <PretendardFont weight="semibold" style={{ fontSize: 15, color: C.white }}>
              다시 시도
            </PretendardFont>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          style={{ paddingTop: 56 }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          <View className="px-5 pt-5">
            {/* 제목 */}
            <PretendardFont
              weight="bold"
              style={{ fontSize: 20, color: C.text, lineHeight: 30, marginBottom: 12 }}
            >
              {data?.title}
            </PretendardFont>

            {/* 출처 + 날짜 */}
            <View className="flex-row items-center gap-2 mb-6">
              {data?.source && (
                <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: C.primarySoft }}>
                  <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.primary }}>
                    {data.source}
                  </PretendardFont>
                </View>
              )}
              <PretendardFont weight="regular" style={{ fontSize: 13, color: C.sec }}>
                {data?.publishedAt ? formatDateKorean(data.publishedAt) : ""}
              </PretendardFont>
            </View>

            {/* 구분선 */}
            <View className="h-px bg-gray-100 mb-6" />

            {/* 본문 */}
            <PretendardFont
              weight="regular"
              style={{ fontSize: 15, color: C.text, lineHeight: 26 }}
            >
              {data?.content}
            </PretendardFont>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

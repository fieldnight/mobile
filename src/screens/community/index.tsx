/**
 * 커뮤니티 메인 화면 (벌집 광장)
 *
 * [화면 구조]
 * 1. AppHeader (로고 + 알림 + 검색)
 * 2. HeroBanner (수정벌 농가 커뮤니티 배너)
 * 3. ActiveFarmers (지금 활동 중인 농부)
 * 4. CategoryTabs (전체/수정벌/착과·결실...)
 * 5. FilterChips (최신/인기/미답변)
 * 6. PinnedNotice (고정 공지)
 * 7. TrendingTags (지금 뜨는 주제)
 * 8. PostList (게시글 목록 - 무한스크롤)
 * 9. FAB (작성 버튼)
 *
 * [데이터]
 * - usePostList: Slice 기반 무한스크롤
 * - 현재 API는 `desc`만 지원 → 필터 UI는 있지만 인기/미답변은 disabled
 *
 * [최적화]
 * - FlatList로 긴 목록 렌더
 * - PostCard는 memo로 래핑
 * - 헤더 영역(배너~공지)은 ListHeaderComponent로 스크롤에 포함
 */

import { useState, useCallback, useMemo } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRouter } from "expo-router";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import { usePostList } from "@/features/community/post";
import { HeroBanner } from "@/components/community/HeroBanner";
import { ActiveFarmers } from "@/components/community/ActiveFarmers";
import { CategoryTabs, FilterChips } from "@/components/community/Filters";
import {
  PinnedNotice,
  TrendingTags,
} from "@/components/community/NoticeAndTrending";
import { PostCard } from "@/components/community/PostCard";
import {
  PostCardSkeleton,
  EmptyState,
  ErrorState,
  LoadMoreFooter,
} from "@/components/community/States";
import { FAB } from "@/components/community/FAB";
import type { PostListItem, CategoryTab, SortKey } from "@/types/community";
import AppHeader from "@/components/AppHeader";

export default function CommunityScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryTab>("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const navigation = useNavigation();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();

  // desc만 지원 → sort state 변경해도 API 호출은 항상 desc
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = usePostList("desc");

  // 모든 페이지를 하나로 펼침
  const posts: PostListItem[] = useMemo(
    () =>
      data?.pages.flatMap((p) => (p as any).content as PostListItem[]) ?? [],
    [data],
  );

  const handlePostPress = useCallback(
    (postId: number) => {
      router.push(`/community/${postId}` as any);
    },
    [router],
  );

  const handleWritePress = useCallback(() => {
    router.push("/community/write" as any);
  }, [router]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── 헤더 (리스트와 함께 스크롤) ────────────────────────────────────────
  const ListHeader = useMemo(
    () => (
      <>
        <HeroBanner />
        <View style={{ height: 8 }} />
        <ActiveFarmers />
        <CategoryTabs active={category} onChange={setCategory} />
        <FilterChips active={sort} onChange={setSort} />
        <PinnedNotice />
        <View style={{ height: 8 }} />
        <TrendingTags />
        <View style={{ height: 4 }} />
      </>
    ),
    [category, sort],
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: "#f2f4f6" }}
      edges={["top"]}
    >
      <AppHeader title="농부의 수다" onBack={() => navigation.goBack()} isScrolled={isScrolled} />

      {/* 본문 */}
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <FlatList
          data={[1, 2, 3, 4]}
          keyExtractor={(i) => String(i)}
          renderItem={() => <PostCardSkeleton />}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.postId)}
          renderItem={({ item }) => (
            <PostCard post={item} onPress={handlePostPress} />
          )}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={<EmptyState onWritePress={handleWritePress} />}
          ListFooterComponent={<LoadMoreFooter loading={isFetchingNextPage} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#EA580C"
              progressBackgroundColor="#FFFFFF"
              colors={["#EA580C", "#F59E0B"]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: HEADER_HEIGHT, paddingBottom: 100 }}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          // 성능 최적화
          removeClippedSubviews
          windowSize={5}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
        />
      )}

      <FAB onPress={handleWritePress} />
    </SafeAreaView>
  );
}

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

import { memo, useState, useCallback, useMemo } from "react";
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

// ── 리스트 헤더 — memo로 분리해야 FlatList가 재마운트하지 않음
// useMemo로 JSX를 만들면 참조가 바뀔 때마다 ListHeaderComponent가 unmount→mount되어
// 내부 훅(useTrendingCategories, useActiveUsers)이 API를 중복 호출함
const ListHeader = memo(function ListHeader({
  category,
  sort,
  onCategoryChange,
  onSortChange,
}: {
  category: CategoryTab;
  sort: SortKey;
  onCategoryChange: (c: CategoryTab) => void;
  onSortChange: (s: SortKey) => void;
}) {
  return (
    <>
      <HeroBanner />
      <View style={{ height: 8 }} />
      <ActiveFarmers />
      <CategoryTabs active={category} onChange={onCategoryChange} />
      <FilterChips active={sort} onChange={onSortChange} />
      <PinnedNotice />
      <View style={{ height: 8 }} />
      <TrendingTags />
      <View style={{ height: 4 }} />
    </>
  );
});

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
  const posts: PostListItem[] = useMemo(() => {
    if (!data) return [];
    console.log("[Community] pages[0] 구조:", JSON.stringify(data.pages[0]));
    return data.pages.flatMap((p) => (p as any).content as PostListItem[]) ?? [];
  }, [data]);

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

  // ListHeaderComponent는 컴포넌트 참조를 받아야 재마운트를 막을 수 있음
  // useCallback으로 감싸 category/sort가 바뀌어도 함수 참조를 안정화
  const renderListHeader = useCallback(
    () => (
      <ListHeader
        category={category}
        sort={sort}
        onCategoryChange={setCategory}
        onSortChange={setSort}
      />
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

      {/* 본문 — FlatList를 하나로 유지해야 ListHeader 재마운트로 인한 중복 API 호출을 막을 수 있음 */}
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={isLoading ? ([1, 2, 3, 4] as any[]) : posts}
          keyExtractor={(item) =>
            isLoading ? String(item) : String((item as PostListItem).postId)
          }
          renderItem={({ item }) =>
            isLoading ? (
              <PostCardSkeleton />
            ) : (
              <PostCard post={item as PostListItem} onPress={handlePostPress} />
            )
          }
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={!isLoading ? <EmptyState onWritePress={handleWritePress} /> : null}
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

import { useState, useCallback, useEffect } from "react";
import {
  View,
  Pressable,
  Platform,
  FlatList,
  Linking,
  ScrollView,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation } from "expo-router";

import { useNews } from "@/features";
import { useAddInterestKeyword, useInterestKeywords } from "@/features/bee-news/hooks";
import { formatDateKorean } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";
import { BottomSheet } from "@/components/BottomSheet";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import Pagination from "@/components/pagination";
import { NewsCardSkeleton } from "@/components/Skeleton";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { C } from "@/constants/hive-colors";
import { useAuthStore } from "@/stores/useAuthStore";
import type { NewsItem } from "@/types/news";

const DEFAULT_KEYWORDS = ["꿀벌", "수정벌", "벌통", "농업"];
const PAGE_SIZE = 5;
const FORM_PANEL_BG = "#EEF2F6";

// Backend news API code is preserved in src/features/news and src/features/bee-news,
// but the screen temporarily uses the original RSS flow until the backend is ready.

function RssArticleItem({ item, index }: { item: NewsItem; index: number }) {
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL(item.link);
  }, [item.link]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300).springify()}
      className="mb-3"
    >
      <Pressable
        onPress={handlePress}
        className="flex-row items-center gap-5 rounded-xl bg-white p-4 active:opacity-75"
      >
        <View className="flex-1 gap-3">
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 16, color: C.text, lineHeight: 24 }}
          >
            {item.title}
          </PretendardFont>

          <View className="flex-row items-center gap-2">
            {item.source ? (
              <View
                className="rounded-md px-2 py-0.5"
                style={{ backgroundColor: C.primarySoft }}
              >
                <PretendardFont
                  weight="semibold"
                  style={{ fontSize: 12, color: C.primary }}
                >
                  {item.source}
                </PretendardFont>
              </View>
            ) : null}

            <PretendardFont
              weight="regular"
              style={{ fontSize: 13, color: C.sec }}
            >
              {formatDateKorean(item.pubDate)}
            </PretendardFont>
          </View>
        </View>

        <Feather name="external-link" size={16} color={C.ter} />
      </Pressable>
    </Animated.View>
  );
}

function RssNewsList({
  keyword,
  insets,
  onScroll,
  scrollEventThrottle,
}: {
  keyword: string;
  insets: { bottom: number };
  onScroll: any;
  scrollEventThrottle: number;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: news = [], isLoading, error, refetch } = useNews(keyword);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const totalPages = Math.max(1, Math.ceil(news.length / PAGE_SIZE));
  const pagedNews = news.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  if (isLoading) {
    return (
      <View className="px-4 pt-4">
        {Array.from({ length: PAGE_SIZE }).map((_, index) => (
          <NewsCardSkeleton key={index} />
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="wifi-off" size={48} color={C.ter} />
        <PretendardFont
          weight="regular"
          style={{
            fontSize: 15,
            color: C.sec,
            textAlign: "center",
            lineHeight: 24,
          }}
        >
          {error instanceof Error
            ? error.message
            : "뉴스를 불러오지 못했습니다."}
        </PretendardFont>

        <Pressable
          onPress={() => refetch()}
          className="rounded-xl px-6 py-3 active:opacity-80"
          style={{ backgroundColor: C.primary }}
        >
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 15, color: C.white }}
          >
            다시 시도
          </PretendardFont>
        </Pressable>
      </View>
    );
  }

  if (news.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="file-text" size={48} color={C.ter} />
        <PretendardFont
          weight="regular"
          style={{ fontSize: 15, color: C.sec, textAlign: "center" }}
        >
          '{keyword}' 관련 뉴스가 없습니다.
        </PretendardFont>
      </View>
    );
  }

  return (
    <FlatList
      data={pagedNews}
      renderItem={({ item, index }) => (
        <RssArticleItem item={item} index={index} />
      )}
      keyExtractor={(item) => item.link}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={C.primary}
          colors={[C.primary]}
        />
      }
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
      ListHeaderComponent={
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="mb-3 flex-row items-center gap-1.5"
        >
          <Feather name="file-text" size={15} color={C.primary} />
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 15, color: C.text }}
          >
            '{keyword}' 최신 뉴스
          </PretendardFont>
        </Animated.View>
      }
      ListFooterComponent={
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPage={setCurrentPage}
        />
      }
    />
  );
}

export default function BeeNewsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { show: showToast } = useAppToast();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const [selectedKeyword, setSelectedKeyword] = useState(DEFAULT_KEYWORDS[0]);
  const [localKeywords, setLocalKeywords] = useState<string[]>([]);
  const [keywordSheetVisible, setKeywordSheetVisible] = useState(false);
  const interestKeywordQuery = useInterestKeywords();
  const addInterestKeywordMutation = useAddInterestKeyword();
  const interestKeywords =
    interestKeywordQuery.data?.map((item) => item.keyword).filter(Boolean) ?? [];
  const keywords = Array.from(
    new Set([...DEFAULT_KEYWORDS, ...interestKeywords, ...localKeywords]),
  );

  const handleKeywordChange = useCallback(
    (keyword: string) => {
      if (keyword === selectedKeyword) return;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setSelectedKeyword(keyword);
    },
    [selectedKeyword],
  );

  const handleAddKeyword = useCallback(
    (rawKeyword: string) => {
      const keyword = rawKeyword.trim();
      if (!keyword) return;

      if (keywords.includes(keyword)) {
        setSelectedKeyword(keyword);
        setKeywordSheetVisible(false);
        showToast("이미 추가된 키워드예요.", "success");
        return;
      }

      if (!isAuthenticated) {
        setLocalKeywords((prev) => [...prev, keyword]);
        setSelectedKeyword(keyword);
        setKeywordSheetVisible(false);
        showToast("이번 화면에서 볼 키워드를 추가했어요.", "success");
        return;
      }

      addInterestKeywordMutation.mutate(keyword, {
        onSuccess: () => {
          setSelectedKeyword(keyword);
          setKeywordSheetVisible(false);
          showToast(`${keyword} 키워드를 추가했어요.`, "success");
        },
        onError: (error: any) => {
          showToast(
            error?.response?.data?.message ?? "키워드 추가에 실패했어요.",
            "error",
          );
        },
      });
    },
    [addInterestKeywordMutation, isAuthenticated, keywords, showToast],
  );

  return (
    <View className="flex-1 bg-gray-100">
      <AppHeader
        title="뉴스"
        onBack={() => navigation.goBack()}
        isScrolled={isScrolled}
      />

      <View
        className="border-b border-gray-200 bg-white"
        style={{ paddingTop: HEADER_HEIGHT }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          {keywords.map((keyword) => {
            const active = selectedKeyword === keyword;
            return (
              <Pressable
                key={keyword}
                onPress={() => handleKeywordChange(keyword)}
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: active ? C.primary : C.bg }}
              >
                <PretendardFont
                  weight="semibold"
                  style={{ fontSize: 14, color: active ? C.white : C.sec }}
                >
                  {keyword}
                </PretendardFont>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setKeywordSheetVisible(true)}
            className="flex-row items-center gap-1 rounded-full border px-4 py-2 active:opacity-70"
            style={{ borderColor: C.primary, backgroundColor: C.white }}
          >
            <Feather name="plus" size={14} color={C.primary} />
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.primary }}>
              키워드 추가
            </PretendardFont>
          </Pressable>
        </ScrollView>
      </View>

      <RssNewsList
        keyword={selectedKeyword}
        insets={insets}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      />

      <KeywordAddSheet
        visible={keywordSheetVisible}
        submitting={addInterestKeywordMutation.isPending}
        onClose={() => setKeywordSheetVisible(false)}
        onSubmit={handleAddKeyword}
      />
    </View>
  );
}

function KeywordAddSheet({
  visible,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (keyword: string) => void;
}) {
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (visible) setKeyword("");
  }, [visible]);

  const canSubmit = keyword.trim().length > 0 && !submitting;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="키워드 추가"
      snapHeight={0.38}
      contentScrollEnabled={false}
    >
      <PretendardFont style={{ fontSize: 14, color: C.sec, lineHeight: 21 }}>
        보고 싶은 뉴스 키워드를 입력하면 상단 목록에 추가돼요.
      </PretendardFont>

      <TextInput
        value={keyword}
        onChangeText={setKeyword}
        placeholder="예: 딸기 수정벌"
        placeholderTextColor={C.ter}
        autoCapitalize="none"
        className="mt-5 h-12 rounded-2xl px-4"
        style={{
          backgroundColor: FORM_PANEL_BG,
          color: C.text,
          fontFamily: "Pretendard-Medium",
          fontSize: 14,
        }}
        onSubmitEditing={() => {
          if (canSubmit) onSubmit(keyword);
        }}
      />

      <View className="mt-6 flex-row gap-2.5">
        <Pressable
          onPress={onClose}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: FORM_PANEL_BG }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.textAlt }}>
            취소
          </PretendardFont>
        </Pressable>
        <Pressable
          disabled={!canSubmit}
          onPress={() => onSubmit(keyword)}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
          style={{ backgroundColor: canSubmit ? C.primary : C.border }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
            {submitting ? "추가 중" : "추가"}
          </PretendardFont>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

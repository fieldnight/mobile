/**
 * 뉴스 목록 화면 (관심뉴스)
 *
 * [화면 구조]
 * 1. AppHeader (관심뉴스 + 뒤로가기)
 * 2. 키워드 바 (기본 키워드 + 사용자 추가 키워드 + 추가 버튼)
 * 3. 뉴스 목록 (로그인/비로그인 분기)
 * 4. 페이지네이션 또는 더보기 버튼
 *
 * [로그인/비로그인 분기]
 * 비로그인  → useNews(RSS)   — Google News XML 파싱, 외부 링크로 이동
 * 로그인    → useNewsList    — GET /api/v1/news, 상세 화면으로 라우팅
 *
 * [데이터]
 * useNews(keyword)           — RSS 뉴스 목록 (비로그인, staleTime 5분)
 * useNewsList(keyword, page) — 서버 Slice 뉴스 목록 (로그인, staleTime 3분)
 * useInterestKeywords        — 사용자 관심 키워드 (로그인 시만 호출)
 * useAddInterestKeyword      — 키워드 추가 mutation
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  Platform,
  FlatList,
  ActivityIndicator,
  Linking,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation, useRouter } from "expo-router";

import { useNews, useNewsList } from "@/features";
import { useInterestKeywords, useAddInterestKeyword } from "@/features/bee-news";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDateKorean } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import Pagination from "@/components/pagination";
import { NewsCardSkeleton, KeywordChipSkeleton } from "@/components/Skeleton";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { NewsItem, ApiNewsItem } from "@/types/news";

const DEFAULT_KEYWORDS = ["수정벌", "꿀벌", "호박벌", "양봉"];
const PAGE_SIZE = 5;

// ── 키워드 추가 바텀시트 ─────────────────────────────────────────────────────
function AddKeywordSheet({
  visible,
  onClose,
  onAdd,
  isPending,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (kw: string) => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  const isReady = !!value.trim() && !isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-5" />

          <PretendardFont weight="bold" style={{ fontSize: 18, color: C.text, marginBottom: 4 }}>
            키워드 추가
          </PretendardFont>
          <PretendardFont weight="regular" style={{ fontSize: 14, color: C.sec, marginBottom: 20 }}>
            관심 있는 키워드를 등록하면{"\n"}해당 뉴스를 바로 모아볼 수 있어요.
          </PretendardFont>

          <View className="flex-row items-center rounded-2xl px-4 gap-3" style={{ backgroundColor: C.bg, height: 52 }}>
            <Feather name="search" size={18} color={C.ter} />
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={setValue}
              placeholder="ex. 토마토, 딸기, 블루베리..."
              placeholderTextColor={C.ter}
              style={{ flex: 1, fontSize: 15, color: C.text, fontFamily: "Pretendard-Regular" }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              maxLength={20}
            />
            {value.length > 0 && (
              <Pressable onPress={() => setValue("")} hitSlop={8}>
                <Feather name="x" size={16} color={C.ter} />
              </Pressable>
            )}
          </View>

          <PretendardFont weight="regular" style={{ fontSize: 12, color: C.ter, marginTop: 8, marginBottom: 24 }}>
            최대 20자 · 특수문자 제외
          </PretendardFont>

          <Pressable
            onPress={handleSubmit}
            disabled={!isReady}
            className="h-[52px] rounded-2xl items-center justify-center active:opacity-80"
            style={{ backgroundColor: isReady ? C.primary : C.border }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <PretendardFont weight="semibold" style={{ fontSize: 16, color: isReady ? C.white : C.ter }}>
                추가하기
              </PretendardFont>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── RSS 뉴스 카드 (비로그인) — 외부 링크로 이동 ─────────────────────────────
function RssArticleItem({ item, index }: { item: NewsItem; index: number }) {
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(item.link);
  }, [item.link]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()} className="mb-3">
      <Pressable onPress={handlePress} className="bg-white rounded-xl p-4 flex-row items-center gap-5 active:opacity-75">
        <View className="flex-1 gap-3">
          <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.text, lineHeight: 24 }}>
            {item.title}
          </PretendardFont>
          <View className="flex-row items-center gap-2">
            {item.source && (
              <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: C.primarySoft }}>
                <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.primary }}>
                  {item.source}
                </PretendardFont>
              </View>
            )}
            <PretendardFont weight="regular" style={{ fontSize: 13, color: C.sec }}>
              {formatDateKorean(item.pubDate)}
            </PretendardFont>
          </View>
        </View>
        <Feather name="external-link" size={16} color={C.ter} />
      </Pressable>
    </Animated.View>
  );
}

// ── API 뉴스 카드 (로그인) — 상세 화면으로 라우팅 ───────────────────────────
function ApiArticleItem({ item, index, onPress }: { item: ApiNewsItem; index: number; onPress: (id: number) => void }) {
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(item.newsArticleId);
  }, [item.newsArticleId, onPress]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()} className="mb-3">
      <Pressable onPress={handlePress} className="bg-white rounded-xl p-4 flex-row items-center gap-5 active:opacity-75">
        <View className="flex-1 gap-3">
          <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.text, lineHeight: 24 }}>
            {item.title}
          </PretendardFont>
          <View className="flex-row items-center gap-2">
            {item.source && (
              <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: C.primarySoft }}>
                <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.primary }}>
                  {item.source}
                </PretendardFont>
              </View>
            )}
            <PretendardFont weight="regular" style={{ fontSize: 13, color: C.sec }}>
              {formatDateKorean(item.publishedAt)}
            </PretendardFont>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={C.ter} />
      </Pressable>
    </Animated.View>
  );
}

// ── 로그인 사용자 뉴스 목록 ─────────────────────────────────────────────────
function ApiNewsList({
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
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword]);

  const { data, isLoading, error, refetch } = useNewsList(keyword);

  const allArticles: ApiNewsItem[] = data?.content ?? [];
  const totalPages = Math.max(1, Math.ceil(allArticles.length / PAGE_SIZE));
  const articles = allArticles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePress = useCallback(
    (id: number) => {
      router.push(`/bee-news/${id}` as any);
    },
    [router],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  if (isLoading) {
    return (
      <View className="px-4 pt-4">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => <NewsCardSkeleton key={i} />)}
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="wifi-off" size={48} color={C.ter} />
        <PretendardFont weight="regular" style={{ fontSize: 15, color: C.sec, textAlign: "center", lineHeight: 24 }}>
          {error instanceof Error ? error.message : "뉴스를 불러오지 못했어요."}
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
    );
  }

  if (articles.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="file-text" size={48} color={C.ter} />
        <PretendardFont weight="regular" style={{ fontSize: 15, color: C.sec, textAlign: "center" }}>
          '{keyword}' 관련 뉴스가 없어요.
        </PretendardFont>
      </View>
    );
  }

  return (
    <FlatList
      data={articles}
      renderItem={({ item, index }) => (
        <ApiArticleItem item={item} index={index} onPress={handlePress} />
      )}
      keyExtractor={(item) => String(item.newsArticleId)}
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
        <Animated.View entering={FadeInDown.duration(300)} className="flex-row items-center gap-1.5 mb-3">
          <Feather name="file-text" size={15} color={C.primary} />
          <PretendardFont weight="semibold" style={{ fontSize: 15, color: C.text }}>
            '{keyword}' 최신 소식
          </PretendardFont>
        </Animated.View>
      }
      ListFooterComponent={
        <Pagination page={currentPage} totalPages={totalPages} onPage={setCurrentPage} />
      }
    />
  );
}

// ── 비로그인 사용자 뉴스 목록 (RSS) ─────────────────────────────────────────
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

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword]);

  const { data: news = [], isLoading, error, refetch } = useNews(keyword);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const totalPages = Math.max(1, Math.ceil(news.length / PAGE_SIZE));
  const pagedNews = news.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) {
    return (
      <View className="px-4 pt-4">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => <NewsCardSkeleton key={i} />)}
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="wifi-off" size={48} color={C.ter} />
        <PretendardFont weight="regular" style={{ fontSize: 15, color: C.sec, textAlign: "center", lineHeight: 24 }}>
          {error instanceof Error ? error.message : "뉴스를 불러오지 못했어요."}
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
    );
  }

  if (news.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="file-text" size={48} color={C.ter} />
        <PretendardFont weight="regular" style={{ fontSize: 15, color: C.sec, textAlign: "center" }}>
          '{keyword}' 관련 뉴스가 없어요.
        </PretendardFont>
      </View>
    );
  }

  return (
    <FlatList
      data={pagedNews}
      renderItem={({ item, index }) => <RssArticleItem item={item} index={index} />}
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
        <Animated.View entering={FadeInDown.duration(300)} className="flex-row items-center gap-1.5 mb-3">
          <Feather name="file-text" size={15} color={C.primary} />
          <PretendardFont weight="semibold" style={{ fontSize: 15, color: C.text }}>
            '{keyword}' 최신 소식
          </PretendardFont>
        </Animated.View>
      }
      ListFooterComponent={
        <Pagination page={currentPage} totalPages={totalPages} onPage={setCurrentPage} />
      }
    />
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────────────────
export default function BeeNewsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const [selectedKeyword, setSelectedKeyword] = useState(DEFAULT_KEYWORDS[0]);
  const [sheetVisible, setSheetVisible] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: userKeywords = [], isLoading: kwLoading } = useInterestKeywords();
  const { mutate: addKeyword, isPending } = useAddInterestKeyword();

  const allKeywords = [
    ...DEFAULT_KEYWORDS,
    ...userKeywords
      .map((k: { keyword: string }) => k.keyword)
      .filter((k: string) => !DEFAULT_KEYWORDS.includes(k)),
  ];

  const handleKeywordChange = useCallback(
    (keyword: string) => {
      if (keyword === selectedKeyword) return;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedKeyword(keyword);
    },
    [selectedKeyword],
  );

  const handleAddKeyword = useCallback(
    (kw: string) => {
      addKeyword(kw, {
        onSuccess: () => {
          setSheetVisible(false);
          setSelectedKeyword(kw);
        },
      });
    },
    [addKeyword],
  );

  return (
    <View className="flex-1 bg-gray-100">
      <AppHeader title="관심뉴스" onBack={() => navigation.goBack()} isScrolled={isScrolled} />

      {/* 키워드 바 */}
      <View className="bg-white border-b border-gray-200" style={{ paddingTop: HEADER_HEIGHT }}>
        {kwLoading ? (
          <KeywordChipSkeleton />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          >
            {allKeywords.map((kw) => {
              const active = selectedKeyword === kw;
              return (
                <Pressable
                  key={kw}
                  onPress={() => handleKeywordChange(kw)}
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: active ? C.primary : C.bg }}
                >
                  <PretendardFont
                    weight="semibold"
                    style={{ fontSize: 14, color: active ? C.white : C.sec }}
                  >
                    {kw}
                  </PretendardFont>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSheetVisible(true);
              }}
              className="flex-row items-center gap-1 px-3 py-2 rounded-full border border-dashed border-gray-300"
            >
              <Feather name="plus" size={14} color={C.sec} />
              <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.sec }}>
                추가
              </PretendardFont>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* 뉴스 목록 — 로그인 여부에 따라 API / RSS 분기 */}
      {isAuthenticated ? (
        <ApiNewsList
          keyword={selectedKeyword}
          insets={insets}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        />
      ) : (
        <RssNewsList
          keyword={selectedKeyword}
          insets={insets}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        />
      )}

      <AddKeywordSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAdd={handleAddKeyword}
        isPending={isPending}
      />
    </View>
  );
}
/**
 * 뉴스 목록 화면 (관심뉴스)
 *
 * [화면 구조]
 * 1. AppHeader (관심뉴스 + 뒤로가기)
 * 2. 키워드 바 (기본 키워드 + 사용자 추가 키워드 + 추가 버튼)
 * 3. 뉴스 목록 (로그인/비로그인 분기)
 * 4. 페이지네이션 또는 더보기 버튼
 *
 * [로그인/비로그인 분기]
 * 비로그인  → useNews(RSS)   — Google News XML 파싱, 외부 링크로 이동
 * 로그인    → useNewsList    — GET /api/v1/news, 상세 화면으로 라우팅
 *
 * [데이터]
 * useNews(keyword)           — RSS 뉴스 목록 (비로그인, staleTime 5분)
 * useNewsList(keyword, page) — 서버 Slice 뉴스 목록 (로그인, staleTime 3분)
 * useInterestKeywords        — 사용자 관심 키워드 (로그인 시만 호출)
 * useAddInterestKeyword      — 키워드 추가 mutation
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  Platform,
  FlatList,
  ActivityIndicator,
  Linking,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation, useRouter } from "expo-router";

import { useNews, useNewsList } from "@/features";
import { useInterestKeywords, useAddInterestKeyword } from "@/features/bee-news";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDateKorean } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import Pagination from "@/components/pagination";
import { NewsCardSkeleton, KeywordChipSkeleton } from "@/components/Skeleton";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useAppToast } from "@/components/ToastContext";
import type { NewsItem, ApiNewsItem } from "@/types/news";

const DEFAULT_KEYWORDS = ["수정벌", "꿀벌", "호박벌", "양봉"];
const PAGE_SIZE = 5;

// ── 키워드 추가 바텀시트 ─────────────────────────────────────────────────────
function AddKeywordSheet({
  visible,
  onClose,
  onAdd,
  isPending,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (kw: string) => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  const isReady = !!value.trim() && !isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-5" />

          <PretendardFont weight="bold" style={{ fontSize: 18, color: C.text, marginBottom: 4 }}>
            키워드 추가
          </PretendardFont>
          <PretendardFont weight="regular" style={{ fontSize: 14, color: C.sec, marginBottom: 20 }}>
            관심 있는 키워드를 등록하면{"\n"}해당 뉴스를 바로 모아볼 수 있어요.
          </PretendardFont>

          <View className="flex-row items-center rounded-2xl px-4 gap-3" style={{ backgroundColor: C.bg, height: 52 }}>
            <Feather name="search" size={18} color={C.ter} />
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={setValue}
              placeholder="ex. 토마토, 딸기, 블루베리..."
              placeholderTextColor={C.ter}
              style={{ flex: 1, fontSize: 15, color: C.text, fontFamily: "Pretendard-Regular" }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              maxLength={20}
            />
            {value.length > 0 && (
              <Pressable onPress={() => setValue("")} hitSlop={8}>
                <Feather name="x" size={16} color={C.ter} />
              </Pressable>
            )}
          </View>

          <PretendardFont weight="regular" style={{ fontSize: 12, color: C.ter, marginTop: 8, marginBottom: 24 }}>
            최대 20자 · 특수문자 제외
          </PretendardFont>

          <Pressable
            onPress={handleSubmit}
            disabled={!isReady}
            className="h-[52px] rounded-2xl items-center justify-center active:opacity-80"
            style={{ backgroundColor: isReady ? C.primary : C.border }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <PretendardFont weight="semibold" style={{ fontSize: 16, color: isReady ? C.white : C.ter }}>
                추가하기
              </PretendardFont>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── RSS 뉴스 카드 (비로그인) — 외부 링크로 이동 ─────────────────────────────
function RssArticleItem({ item, index }: { item: NewsItem; index: number }) {
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(item.link);
  }, [item.link]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()} className="mb-3">
      <Pressable onPress={handlePress} className="bg-white rounded-xl p-4 flex-row items-center gap-5 active:opacity-75">
        <View className="flex-1 gap-3">
          <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.text, lineHeight: 24 }}>
            {item.title}
          </PretendardFont>
          <View className="flex-row items-center gap-2">
            {item.source && (
              <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: C.primarySoft }}>
                <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.primary }}>
                  {item.source}
                </PretendardFont>
              </View>
            )}
            <PretendardFont weight="regular" style={{ fontSize: 13, color: C.sec }}>
              {formatDateKorean(item.pubDate)}
            </PretendardFont>
          </View>
        </View>
        <Feather name="external-link" size={16} color={C.ter} />
      </Pressable>
    </Animated.View>
  );
}

// ── API 뉴스 카드 (로그인) — 상세 화면으로 라우팅 ───────────────────────────
function ApiArticleItem({ item, index, onPress }: { item: ApiNewsItem; index: number; onPress: (id: number) => void }) {
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(item.newsArticleId);
  }, [item.newsArticleId, onPress]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()} className="mb-3">
      <Pressable onPress={handlePress} className="bg-white rounded-xl p-4 flex-row items-center gap-5 active:opacity-75">
        <View className="flex-1 gap-3">
          <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.text, lineHeight: 24 }}>
            {item.title}
          </PretendardFont>
          <View className="flex-row items-center gap-2">
            {item.source && (
              <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: C.primarySoft }}>
                <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.primary }}>
                  {item.source}
                </PretendardFont>
              </View>
            )}
            <PretendardFont weight="regular" style={{ fontSize: 13, color: C.sec }}>
              {formatDateKorean(item.publishedAt)}
            </PretendardFont>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={C.ter} />
      </Pressable>
    </Animated.View>
  );
}

// ── 로그인 사용자 뉴스 목록 ─────────────────────────────────────────────────
function ApiNewsList({
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
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword]);

  const {
    content,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNewsList(keyword);

  const allArticles: ApiNewsItem[] = content;
  const totalPages = Math.max(1, Math.ceil(allArticles.length / PAGE_SIZE));
  const articles = allArticles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 프론트 페이지네이션이 마지막 로드된 서버 청크 근처에 도달하면 다음 서버 페이지를 미리 이어붙임
  useEffect(() => {
    if (currentPage >= totalPages - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentPage, totalPages, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePress = useCallback(
    (id: number) => {
      router.push(`/bee-news/${id}` as any);
    },
    [router],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  if (isLoading) {
    return (
      <View className="px-4 pt-4">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => <NewsCardSkeleton key={i} />)}
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="wifi-off" size={48} color={C.ter} />
        <PretendardFont weight="regular" style={{ fontSize: 15, color: C.sec, textAlign: "center", lineHeight: 24 }}>
          {error instanceof Error ? error.message : "뉴스를 불러오지 못했어요."}
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
    );
  }

  if (articles.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="file-text" size={48} color={C.ter} />
        <PretendardFont weight="regular" style={{ fontSize: 15, color: C.sec, textAlign: "center" }}>
          '{keyword}' 관련 뉴스가 없어요.
        </PretendardFont>
      </View>
    );
  }

  return (
    <FlatList
      data={articles}
      renderItem={({ item, index }) => (
        <ApiArticleItem item={item} index={index} onPress={handlePress} />
      )}
      keyExtractor={(item) => String(item.newsArticleId)}
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
        <Animated.View entering={FadeInDown.duration(300)} className="flex-row items-center gap-1.5 mb-3">
          <Feather name="file-text" size={15} color={C.primary} />
          <PretendardFont weight="semibold" style={{ fontSize: 15, color: C.text }}>
            '{keyword}' 최신 소식
          </PretendardFont>
        </Animated.View>
      }
      ListFooterComponent={
        <Pagination page={currentPage} totalPages={totalPages} onPage={setCurrentPage} />
      }
    />
  );
}

// ── 비로그인 사용자 뉴스 목록 (RSS) ─────────────────────────────────────────
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

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword]);

  const { data: news = [], isLoading, error, refetch } = useNews(keyword);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const totalPages = Math.max(1, Math.ceil(news.length / PAGE_SIZE));
  const pagedNews = news.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) {
    return (
      <View className="px-4 pt-4">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => <NewsCardSkeleton key={i} />)}
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="wifi-off" size={48} color={C.ter} />
        <PretendardFont weight="regular" style={{ fontSize: 15, color: C.sec, textAlign: "center", lineHeight: 24 }}>
          {error instanceof Error ? error.message : "뉴스를 불러오지 못했어요."}
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
    );
  }

  if (news.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-10">
        <Feather name="file-text" size={48} color={C.ter} />
        <PretendardFont weight="regular" style={{ fontSize: 15, color: C.sec, textAlign: "center" }}>
          '{keyword}' 관련 뉴스가 없어요.
        </PretendardFont>
      </View>
    );
  }

  return (
    <FlatList
      data={pagedNews}
      renderItem={({ item, index }) => <RssArticleItem item={item} index={index} />}
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
        <Animated.View entering={FadeInDown.duration(300)} className="flex-row items-center gap-1.5 mb-3">
          <Feather name="file-text" size={15} color={C.primary} />
          <PretendardFont weight="semibold" style={{ fontSize: 15, color: C.text }}>
            '{keyword}' 최신 소식
          </PretendardFont>
        </Animated.View>
      }
      ListFooterComponent={
        <Pagination page={currentPage} totalPages={totalPages} onPage={setCurrentPage} />
      }
    />
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────────────────
export default function BeeNewsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const [selectedKeyword, setSelectedKeyword] = useState(DEFAULT_KEYWORDS[0]);
  const [sheetVisible, setSheetVisible] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: userKeywords = [], isLoading: kwLoading } = useInterestKeywords();
  const { mutate: addKeyword, isPending } = useAddInterestKeyword();
  const { show: showToast } = useAppToast();

  const allKeywords = [
    ...DEFAULT_KEYWORDS,
    ...userKeywords
      .map((k: { keyword: string }) => k.keyword)
      .filter((k: string) => !DEFAULT_KEYWORDS.includes(k)),
  ];

  const handleKeywordChange = useCallback(
    (keyword: string) => {
      if (keyword === selectedKeyword) return;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedKeyword(keyword);
    },
    [selectedKeyword],
  );

  const handleAddKeyword = useCallback(
    (kw: string) => {
      addKeyword(kw, {
        onSuccess: () => {
          setSheetVisible(false);
          setSelectedKeyword(kw);
        },
        onError: () => {
          showToast("키워드 추가에 실패했어요. 다시 시도해주세요", "error");
        },
      });
    },
    [addKeyword, showToast],
  );

  return (
    <View className="flex-1 bg-gray-100">
      <AppHeader title="관심뉴스" onBack={() => navigation.goBack()} isScrolled={isScrolled} />

      {/* 키워드 바 */}
      <View className="bg-white border-b border-gray-200" style={{ paddingTop: HEADER_HEIGHT }}>
        {kwLoading ? (
          <KeywordChipSkeleton />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          >
            {allKeywords.map((kw) => {
              const active = selectedKeyword === kw;
              return (
                <Pressable
                  key={kw}
                  onPress={() => handleKeywordChange(kw)}
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: active ? C.primary : C.bg }}
                >
                  <PretendardFont
                    weight="semibold"
                    style={{ fontSize: 14, color: active ? C.white : C.sec }}
                  >
                    {kw}
                  </PretendardFont>
                </Pressable>
              );
            })}

            {isAuthenticated ? (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSheetVisible(true);
                }}
                className="flex-row items-center gap-1 px-3 py-2 rounded-full border border-dashed border-gray-300"
              >
                <Feather name="plus" size={14} color={C.sec} />
                <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.sec }}>
                  추가
                </PretendardFont>
              </Pressable>
            ) : null}
          </ScrollView>
        )}
      </View>

      {/* 뉴스 목록 — 로그인 여부에 따라 API / RSS 분기 */}
      {isAuthenticated ? (
        <ApiNewsList
          keyword={selectedKeyword}
          insets={insets}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        />
      ) : (
        <RssNewsList
          keyword={selectedKeyword}
          insets={insets}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        />
      )}

      <AddKeywordSheet
        visible={isAuthenticated && sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAdd={handleAddKeyword}
        isPending={isPending}
      />
    </View>
  );
}

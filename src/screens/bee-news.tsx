import { useState, useCallback, useRef } from "react";
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
import { useNavigation } from "@react-navigation/native";

import { useNews } from "@/features";
import { useInterestKeywords, useAddInterestKeyword } from "@/features/bee-news";
import { formatDateKorean } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import Pagination from "@/components/pagination";
import { NewsCardSkeleton, KeywordChipSkeleton } from "@/components/Skeleton";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { NewsItem } from "@/types/news";

const DEFAULT_KEYWORDS = ["수정벌", "꿀벌", "호박벌", "양봉"];
const PAGE_SIZE = 5;

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

function ArticleItem({ item, index }: { item: NewsItem; index: number }) {
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
        <Feather name="chevron-right" size={18} color={C.ter} />
      </Pressable>
    </Animated.View>
  );
}

export default function BeeNewsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKeyword, setSelectedKeyword] = useState(DEFAULT_KEYWORDS[0]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: news = [], isLoading: newsLoading, error, refetch } = useNews(selectedKeyword);
  const { data: userKeywords = [], isLoading: kwLoading } = useInterestKeywords();
  const { mutate: addKeyword, isPending } = useAddInterestKeyword();

  const allKeywords = [
    ...DEFAULT_KEYWORDS,
    ...userKeywords
      .map((k: { keyword: string }) => k.keyword)
      .filter((k: string) => !DEFAULT_KEYWORDS.includes(k)),
  ];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleKeywordChange = useCallback((keyword: string) => {
    if (keyword === selectedKeyword) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedKeyword(keyword);
    setCurrentPage(1);
  }, [selectedKeyword]);

  const handleAddKeyword = useCallback((kw: string) => {
    addKeyword(kw, {
      onSuccess: () => {
        setSheetVisible(false);
        setSelectedKeyword(kw);
        setCurrentPage(1);
      },
    });
  }, [addKeyword]);

  const totalPages = Math.max(1, Math.ceil(news.length / PAGE_SIZE));
  const pagedNews = news.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

      {/* 뉴스 목록 */}
      {newsLoading ? (
        <View className="px-4 pt-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <NewsCardSkeleton key={i} />)}
        </View>
      ) : error ? (
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
      ) : news.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 p-10">
          <Feather name="file-text" size={48} color={C.ter} />
          <PretendardFont weight="regular" style={{ fontSize: 15, color: C.sec, textAlign: "center" }}>
            '{selectedKeyword}' 관련 뉴스가 없어요.
          </PretendardFont>
        </View>
      ) : (
        <FlatList
          data={pagedNews}
          renderItem={({ item, index }) => <ArticleItem item={item} index={index} />}
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
                '{selectedKeyword}' 최신 소식
              </PretendardFont>
            </Animated.View>
          }
          ListFooterComponent={
            <Pagination page={currentPage} totalPages={totalPages} onPage={setCurrentPage} />
          }
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

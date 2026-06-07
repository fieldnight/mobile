import { useState, useCallback, useRef } from "react";
import {
  View,
  Pressable,
  Platform,
  FlatList,
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
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

import {
  useInterestKeywords,
  useAddInterestKeyword,
} from "@/features/bee-news";
import { formatDateKorean } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import Pagination from "@/components/pagination";
import { NewsCardSkeleton, KeywordChipSkeleton } from "@/components/Skeleton";
import type { NewsItem } from "@/types/news";

const DEFAULT_KEYWORDS = ["수정벌", "꿀벌", "호박벌", "양봉"];
const PAGE_SIZE = 5;

const C = {
  primary: "#C68A00",
  primaryLight: "#FFD55F",
  primaryBg: "#FFF8E1",
  text: "#191F28",
  textSecondary: "#8B95A1",
  textTertiary: "#B0B8C1",
};

// ── 키워드 추가 바텀시트
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          {/* 핸들 */}
          <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-5" />

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: C.text,
              marginBottom: 4,
            }}
          >
            키워드 추가
          </Text>
          <Text
            style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}
          >
            관심 있는 키워드를 등록하면{"\n"}해당 뉴스를 바로 모아볼 수 있어요.
          </Text>

          {/* 입력 */}
          <View
            className="flex-row items-center rounded-2xl px-4 gap-3"
            style={{ backgroundColor: "#F4F5F7", height: 52 }}
          >
            <Feather name="search" size={18} color={C.textTertiary} />
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={setValue}
              placeholder="ex. 토마토, 딸기, 블루베리..."
              placeholderTextColor={C.textTertiary}
              style={{ flex: 1, fontSize: 15, color: C.text }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              maxLength={20}
            />
            {value.length > 0 && (
              <Pressable onPress={() => setValue("")} hitSlop={8}>
                <Feather name="x" size={16} color={C.textTertiary} />
              </Pressable>
            )}
          </View>

          <Text
            style={{
              fontSize: 12,
              color: C.textTertiary,
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            최대 20자 · 특수문자 제외
          </Text>

          {/* 확인 버튼 */}
          <Pressable
            onPress={handleSubmit}
            disabled={!value.trim() || isPending}
            style={({ pressed }) => ({
              backgroundColor:
                value.trim() && !isPending ? "#FFD55F" : "#E5E8EB",
              borderRadius: 16,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={C.text} />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: value.trim() ? C.text : C.textTertiary,
                }}
              >
                추가하기
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 뉴스 아이템
function ArticleItem({ item, index }: { item: NewsItem; index: number }) {
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(item.link);
  }, [item.link]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50)
        .duration(300)
        .springify()}
      className="mb-3"
    >
      <Pressable
        onPress={handlePress}
        className="bg-white rounded-xl p-4 flex-row items-center gap-5"
      >
        <View className="flex-1 gap-3">
          <Text className="text-lg font-semibold text-gray-900 leading-6">
            {item.title}
          </Text>
          <View className="flex-row items-center gap-2">
            {item.source ? (
              <View className="bg-yellow-50 px-2 py-0.5 rounded-md">
                <Text className="text-sm font-semibold text-yellow-600">
                  {item.source}
                </Text>
              </View>
            ) : null}
            <Text className="text-sm text-gray-500">
              {formatDateKorean(item.pubDate)}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={C.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

// ── 메인 스크린
export default function BeeNewsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKeyword, setSelectedKeyword] = useState(DEFAULT_KEYWORDS[0]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: news = [],
    isLoading: newsLoading,
    error,
    refetch,
  } = useNews(selectedKeyword);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);
  const { data: userKeywords = [], isLoading: kwLoading } =
    useInterestKeywords();
  const { mutate: addKeyword, isPending } = useAddInterestKeyword();

  // 기본 키워드 + 사용자 키워드 병합 (중복 제거)
  const allKeywords = [
    ...DEFAULT_KEYWORDS,
    ...userKeywords
      .map((k: { keyword: any }) => k.keyword)
      .filter((k: string) => !DEFAULT_KEYWORDS.includes(k)),
  ];

  const handleKeywordChange = useCallback(
    (keyword: string) => {
      if (keyword === selectedKeyword) return;
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedKeyword(keyword);
      setCurrentPage(1);
    },
    [selectedKeyword],
  );

  const handleAddKeyword = useCallback(
    (kw: string) => {
      addKeyword(kw, {
        onSuccess: () => {
          setSheetVisible(false);
          setSelectedKeyword(kw);
          setCurrentPage(1);
        },
      });
    },
    [addKeyword],
  );

  const totalPages = Math.max(1, Math.ceil(news.length / PAGE_SIZE));
  const pagedNews = news.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
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
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              gap: 8,
            }}
          >
            {allKeywords.map((kw) => (
              <Pressable
                key={kw}
                onPress={() => handleKeywordChange(kw)}
                className={`px-4 py-2 rounded-full ${selectedKeyword === kw ? "bg-yellow-300" : "bg-gray-100"}`}
              >
                <Text
                  className={`text-sm font-semibold ${selectedKeyword === kw ? "text-gray-900" : "text-gray-500"}`}
                >
                  {kw}
                </Text>
              </Pressable>
            ))}

            {/* + 키워드 추가 버튼 */}
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web")
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSheetVisible(true);
              }}
              className="flex-row items-center gap-1 px-3 py-2 rounded-full border border-dashed border-gray-300"
            >
              <Feather name="plus" size={14} color={C.textSecondary} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: C.textSecondary,
                }}
              >
                추가
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* 뉴스 목록 */}
      {newsLoading ? (
        <View className="px-4 pt-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-4 p-10">
          <Feather name="wifi-off" size={48} color={C.textTertiary} />
          <Text className="text-base text-gray-500 text-center leading-6">
            {error instanceof Error
              ? error.message
              : "뉴스를 불러오지 못했어요."}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="bg-yellow-300 px-6 py-3 rounded-xl"
          >
            <Text className="text-base font-semibold text-gray-900">
              다시 시도
            </Text>
          </Pressable>
        </View>
      ) : news.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 p-10">
          <Feather name="file-text" size={48} color={C.textTertiary} />
          <Text className="text-base text-gray-500 text-center">
            '{selectedKeyword}' 관련 뉴스가 없어요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pagedNews}
          renderItem={({ item, index }) => (
            <ArticleItem item={item} index={index} />
          )}
          keyExtractor={(item) => item.link}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#EA580C"
              progressBackgroundColor="#FFFFFF"
              colors={["#EA580C", "#F59E0B"]}
            />
          }
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 20,
          }}
          ListHeaderComponent={
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="flex-row items-center gap-1.5 mb-3"
            >
              <Feather name="file-text" size={15} color={C.primaryLight} />
              <Text className="text-base font-semibold text-gray-900">
                '{selectedKeyword}' 최신 소식
              </Text>
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
      )}

      {/* 키워드 추가 시트 */}
      <AddKeywordSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAdd={handleAddKeyword}
        isPending={isPending}
      />
    </View>
  );
}

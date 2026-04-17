import { useState, useEffect } from "react";
import {
  View,
  Pressable,
  Platform,
  FlatList,
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import Pagination from "@/components/pagination";

const KEYWORDS = [
  { label: "수정벌", value: "수정벌" },
  { label: "꿀벌", value: "꿀벌" },
  { label: "호박벌", value: "호박벌" },
  { label: "양봉", value: "양봉" },
];

const TossColors = {
  primary: "#C68A00",
  primaryLight: "#FFD55F",
  primaryBg: "#FFF8E1",
  primaryBadgeBg: "#FFF3D6",
  background: "#F4F5F7",
  white: "#FFFFFF",
  text: "#191F28",
  textSecondary: "#8B95A1",
  textTertiary: "#B0B8C1",
  border: "#E5E8EB",
};

import { NewsItem } from "@/types/news";
import { useNews } from "@/features";
import { formatDateKorean } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";

// 한 화면에 5개씩 표시 — 최대 5페이지(최대 25개 항목 기준)
const PAGE_SIZE = 5;

export default function BeeNewsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKeyword, setSelectedKeyword] = useState("수정벌");

  // use internal Google News fetch (no backend auth required)
  const {
    data: news = [],
    isLoading,
    error,
    refetch,
  } = useNews(selectedKeyword);

  // 키워드 변경 시(또는 화면 로드 시) 항상 최신 데이터를 강제 로드하여
  // 최대 25개 항목이 반영되도록 합니다.
  useEffect(() => {
    refetch().catch(() => {});
  }, [selectedKeyword, refetch]);

  const handleKeywordChange = (keyword: string) => {
    if (keyword === selectedKeyword) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedKeyword(keyword);
    setCurrentPage(1);
  };

  const handleGoBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  };

  const handlePageChange = (page: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentPage(page);
  };

  const handleOpenLink = (url: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL(url);
  };

  const renderArticle = ({
    item,
    index,
  }: {
    item: NewsItem;
    index: number;
  }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50)
        .duration(300)
        .springify()}
      className="mb-3"
    >
      <Pressable
        onPress={() => handleOpenLink(item.link)}
        data-testid={`button-news-${index}`}
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
        <Feather
          name="chevron-right"
          size={18}
          color={TossColors.textTertiary}
        />
      </Pressable>
    </Animated.View>
  );

  const totalPages = Math.max(1, Math.ceil(news.length / PAGE_SIZE));

  return (
    <View className="flex-1 bg-gray-100">
      <AppHeader title="새 소식" onBack={() => navigation.goBack()} />
      <View className="bg-white py-2.5 border-b border-gray-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {KEYWORDS.map((kw) => (
            <Pressable
              key={kw.value}
              onPress={() => handleKeywordChange(kw.value)}
              data-testid={`button-keyword-${kw.value}`}
              className={`px-4 py-2 rounded-full mr-2 ${selectedKeyword === kw.value ? "bg-yellow-300" : "bg-gray-100"}`}
            >
              <Text
                className={`text-sm font-semibold ${selectedKeyword === kw.value ? "text-gray-900" : "text-gray-500"}`}
              >
                {kw.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color={TossColors.primaryLight} />
          <Text className="text-base text-gray-500">뉴스를 불러오는 중...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-4 p-10">
          <Feather name="wifi-off" size={48} color={TossColors.textTertiary} />
          <Text className="text-base text-gray-500 text-center leading-6">
            {String(error?.message || "뉴스를 불러오지 못했어요.")}
          </Text>
          <Pressable
            onPress={() => refetch()}
            data-testid="button-retry"
            className="bg-yellow-300 px-6 py-3 rounded-xl"
          >
            <Text className="text-base font-semibold text-gray-900">
              다시 시도
            </Text>
          </Pressable>
        </View>
      ) : news.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 p-10">
          <Feather name="file-text" size={48} color={TossColors.textTertiary} />
          <Text className="text-base text-gray-500 text-center">
            수정벌 관련 뉴스가 없습니다.
          </Text>
        </View>
      ) : (
        <FlatList
          data={news.slice(
            (currentPage - 1) * PAGE_SIZE,
            currentPage * PAGE_SIZE,
          )}
          renderItem={renderArticle}
          keyExtractor={(item) => item.link}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            gap: 1,
            paddingBottom: insets.bottom + 20,
          }}
          ListHeaderComponent={
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="flex-row items-center gap-1.5 mb-1 px-0"
            >
              <Feather
                name="file-text"
                size={15}
                color={TossColors.primaryLight}
              />
              <Text className="text-base font-semibold text-gray-900">
                '{selectedKeyword}' 관련 최신 뉴스
              </Text>
            </Animated.View>
          }
          ListFooterComponent={
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPage={handlePageChange}
            />
          }
        />
      )}
    </View>
  );
}

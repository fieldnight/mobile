import {
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNews } from "@/features/news";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NEWS_CARD_WIDTH = SCREEN_WIDTH - 44;

interface NewsCarouselProps {
  keyword?: string;
  title?: string;
  maxItems?: number;
}

export function NewsCarousel({
  keyword = "수정벌",
  title = "수정벌 뉴스",
  maxItems = 5,
}: NewsCarouselProps) {
  const { data: newsList = [], isLoading: loading } = useNews(keyword);
  const news = newsList.slice(0, maxItems);
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const cleanTitle = (title: string, source: string) => {
    // 제목 끝의 " - 출처명" 패턴 제거
    const suffixPattern = new RegExp(`\\s*[-–—]\\s*${source}\\s*$`, "i");
    return title.replace(suffixPattern, "").trim();
  };

  if (loading) {
    return (
      <View className="mb-8">
        <View className="flex-row items-center justify-between px-4 mb-2">
          <Text className="text-lg font-bold text-gray-900">{title}</Text>
          <Pressable
            onPress={() => router.push("/bee-news")}
            className="flex-row items-center"
          >
            <Text className="text-sm font-semibold text-blue-600 mr-1">
              뉴스 더보기
            </Text>
            <Feather name="arrow-right" size={14} color="#3B82F6" />
          </Pressable>
        </View>
        <View className="mx-4 bg-white rounded-2xl p-8 items-center">
          <Text className="text-sm text-gray-500">뉴스 로딩중...</Text>
        </View>
      </View>
    );
  }

  if (news.length === 0) {
    return (
      <View className="mb-8">
        <View className="flex-row items-center justify-between px-4 mb-2">
          <Text className="text-lg font-bold text-gray-900">{title}</Text>
          <Pressable
            onPress={() => router.push("/bee-news")}
            className="flex-row items-center"
          >
            <Text className="text-sm font-semibold text-blue-600 mr-1">
              뉴스 더보기
            </Text>
            <Feather name="arrow-right" size={14} color="#3B82F6" />
          </Pressable>
        </View>
        <View className="mx-4 bg-white rounded-2xl p-8 items-center">
          <Text className="text-sm text-gray-500">
            뉴스를 불러올 수 없습니다
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-8">
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className="text-lg font-bold text-gray-900">{title}</Text>
        <Pressable
          onPress={() => router.push("/bee-news")}
          className="flex-row items-center"
        >
          <Text className="text-sm font-semibold text-blue-600 mr-1">
            뉴스 더보기
          </Text>
          <Feather name="arrow-right" size={14} color="#3B82F6" />
        </Pressable>
      </View>
      <FlatList
        data={news}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={NEWS_CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        keyExtractor={(item, index) => `${item.link}-${index}`}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => Linking.openURL(item.link)}
            className="bg-white rounded-2xl p-4 active:scale-[0.98]"
            style={{ width: NEWS_CARD_WIDTH }}
          >
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs font-semibold text-blue-600">
                {item.source}
              </Text>
              <Text className="text-xs text-gray-500">
                {formatDate(item.pubDate)}
              </Text>
            </View>
            <Text
              className="text-base font-semibold text-gray-900 mb-2"
              numberOfLines={2}
            >
              {cleanTitle(item.title, item.source)}
            </Text>

            <View className="flex-row items-center">
              <Text className="text-sm font-semibold text-blue-600">
                자세히 보기
              </Text>
              <Feather name="arrow-right" size={14} color="#3B82F6" />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

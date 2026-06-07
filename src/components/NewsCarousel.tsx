import {
  View,
  Pressable,
  FlatList,
  Dimensions,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNews } from "@/features/news";
import { PretendardFont } from "@/components/PretendardFont";

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
        <View className="px-4 mb-4">
          <PretendardFont
            weight="bold"
            style={{ fontSize: 20, color: "#111827", marginBottom: 4 }}
          >
            {title}
          </PretendardFont>
          <PretendardFont
            weight="regular"
            style={{ fontSize: 13, color: "#6B7280" }}
          >
            매일 업데이트되는 {keyword} 관련 뉴스
          </PretendardFont>
        </View>
        <View className="mx-4 bg-white rounded-2xl p-8 items-center">
          <PretendardFont
            weight="regular"
            style={{ fontSize: 14, color: "#9CA3AF" }}
          >
            뉴스 로딩중...
          </PretendardFont>
        </View>
      </View>
    );
  }

  if (news.length === 0) {
    return (
      <View className="mb-8">
        <View className="px-4 mb-4">
          <PretendardFont
            weight="bold"
            style={{ fontSize: 20, color: "#111827", marginBottom: 4 }}
          >
            {title}
          </PretendardFont>
          <PretendardFont
            weight="regular"
            style={{ fontSize: 13, color: "#6B7280" }}
          >
            매일 업데이트되는 {keyword} 관련 뉴스
          </PretendardFont>
        </View>
        <View className="mx-4 bg-white rounded-2xl p-8 items-center">
          <PretendardFont
            weight="regular"
            style={{ fontSize: 14, color: "#9CA3AF" }}
          >
            뉴스를 불러올 수 없습니다
          </PretendardFont>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-8">
      <View className="px-4 mb-4">
        <View style={{ flexDirection: "column", gap: 2 }}>
          <PretendardFont
            weight="bold"
            style={{ fontSize: 20, color: "#111827" }}
            numberOfLines={1}
          >
            {title}
          </PretendardFont>
          <PretendardFont
            weight="regular"
            style={{ fontSize: 13, color: "#6B7280", lineHeight: 18 }}
          >
            매일 업데이트되는 {keyword} 소식
          </PretendardFont>
        </View>
        <Pressable
          onPress={() => router.push("/bee-news")}
          className="flex-row items-center absolute right-4 top-4"
        >
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 14, color: "#2563EB", marginRight: 4 }}
          >
            뉴스 더보기
          </PretendardFont>
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
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 12, color: "#2563EB" }}
              >
                {item.source}
              </PretendardFont>
              <PretendardFont
                weight="regular"
                style={{ fontSize: 12, color: "#9CA3AF" }}
              >
                {formatDate(item.pubDate)}
              </PretendardFont>
            </View>
            <PretendardFont
              weight="semibold"
              style={{
                fontSize: 16,
                color: "#111827",
                marginBottom: 8,
                lineHeight: 24,
              }}
              numberOfLines={2}
            >
              {cleanTitle(item.title, item.source)}
            </PretendardFont>

            <View className="flex-row items-center">
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 13, color: "#2563EB" }}
              >
                자세히 보기
              </PretendardFont>
              <Feather name="arrow-right" size={14} color="#3B82F6" />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

/**
 * 뉴스 카드 가로 캐러셀
 * - keyword 기반 뉴스 API 호출, 최대 maxItems개 표시
 * - 카드 탭 시 외부 링크(Linking.openURL) 열기
 * - 로딩/빈 상태 별도 처리
 */
import { View, Pressable, FlatList, Dimensions, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNews } from "@/features/news";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NEWS_CARD_WIDTH = SCREEN_WIDTH - 44;

interface NewsCarouselProps {
  keyword?: string;
  title?: string;
  maxItems?: number;
}

export function NewsCarousel({
  keyword = "수정벌",
  title = "둘러봤으니, 소식도 한 줄",
  maxItems = 5,
}: NewsCarouselProps) {
  const { data: newsList = [], isLoading: loading } = useNews(keyword);
  const news = newsList.slice(0, maxItems);
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const cleanTitle = (raw: string, source: string) =>
    raw.replace(new RegExp(`\\s*[-–—]\\s*${source}\\s*$`, "i"), "").trim();

  const header = (
    <View className="px-5 mb-3 flex-row items-center">
      <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text, flex: 1 }}>
        {title}
      </PretendardFont>
      <Pressable
        onPress={() => router.push("/bee-news")}
        className="flex-row items-center gap-1 active:opacity-70"
      >
        <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.sec }}>
          더보기
        </PretendardFont>
        <Feather name="arrow-right" size={14} color={C.sec} />
      </Pressable>
    </View>
  );

  if (loading || news.length === 0) {
    return (
      <View className="mb-8">
        {header}
        <View className="mx-4 bg-white rounded-2xl p-8 items-center">
          <PretendardFont weight="regular" style={{ fontSize: 14, color: C.ter }}>
            {loading ? "뉴스 로딩중..." : "뉴스를 불러올 수 없습니다"}
          </PretendardFont>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-8" style={{ paddingBottom: 4 }}>
      {header}
      <FlatList
        data={news}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={NEWS_CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 12 }}
        keyExtractor={(item, index) => `${item.link}-${index}`}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => Linking.openURL(item.link)}
            className="bg-white rounded-2xl p-4 active:scale-[0.98]"
            style={{
              width: NEWS_CARD_WIDTH,
            }}
          >
            {/* 출처 + 날짜 */}
            <View className="flex-row justify-between items-center mb-2.5">
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: C.bgAlt }}>
                <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.sec }}>
                  {item.source}
                </PretendardFont>
              </View>
              <PretendardFont weight="regular" style={{ fontSize: 12, color: C.ter }}>
                {formatDate(item.pubDate)}
              </PretendardFont>
            </View>

            {/* 제목 */}
            <PretendardFont
              weight="bold"
              style={{ fontSize: 16, color: C.text, marginBottom: 10, lineHeight: 24 }}
              numberOfLines={2}
            >
              {cleanTitle(item.title, item.source)}
            </PretendardFont>

            {/* 더보기 */}
            <View className="flex-row items-center gap-1">
              <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.sec }}>
                자세히 보기
              </PretendardFont>
              <Feather name="arrow-right" size={13} color={C.sec} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

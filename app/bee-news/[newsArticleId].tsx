import { useLocalSearchParams } from "expo-router";
import NewsDetailScreen from "@/screens/bee-news/detail";

export default function NewsDetailRoute() {
  const { newsArticleId } = useLocalSearchParams<{ newsArticleId: string }>();
  return <NewsDetailScreen newsArticleId={Number(newsArticleId)} />;
}

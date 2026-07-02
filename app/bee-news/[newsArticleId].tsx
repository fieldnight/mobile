import { Redirect, useLocalSearchParams } from "expo-router";
import NewsDetailScreen from "@/screens/bee-news/detail";

export default function NewsDetailRoute() {
  const { newsArticleId } = useLocalSearchParams<{ newsArticleId: string }>();
  const id = Number(newsArticleId);

  if (!Number.isFinite(id)) {
    return <Redirect href="/bee-news" />;
  }

  return <NewsDetailScreen newsArticleId={id} />;
}

// @ts-nocheck
/**
 * RefreshControl 적용 가이드
 *
 * 최적화된 새로고침 컴포넌트를 다양한 화면에 적용하는 방법
 */

import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl as RNRefreshControl,
} from "react-native";
import {
  PullToRefresh,
  RotatingRefreshIcon,
} from "@/components/refresh/RefreshControl";

// ─── 1. ScrollView 기반 화면 (bee-chat.tsx 예) ────────────────────────────────

export function BeeChatScreen() {
  const { refetch } = useNews(); // react-query 사용 시

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <View className="flex-1">
      <PullToRefresh onRefresh={handleRefresh}>
        {/* 기존 컨텐츠 */}
      </PullToRefresh>
    </View>
  );
}

// ─── 2. FlatList 기반 화면 (bee-news.tsx 예) ─────────────────────────────────

export function BeeNewsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { refetch } = useNews();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <FlatList
      data={newsList}
      renderItem={({ item }) => <NewsItem item={item} />}
      refreshControl={
        <RNRefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#EA580C"
          colors={["#EA580C"]}
        />
      }
    />
  );
}

// ─── 3. 커스텀 회전 아이콘 (헤더의 수동 새로고침) ────────────────────────────

export function MyScreen() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refetch } = useMyData();

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  return (
    <View>
      <View className="flex-row items-center justify-between p-4">
        <Text>제목</Text>
        <RotatingRefreshIcon
          isAnimating={isRefreshing}
          onPress={handleManualRefresh}
        />
      </View>
    </View>
  );
}

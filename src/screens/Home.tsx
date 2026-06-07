import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useCallback } from "react";
import { PretendardFont } from "@/components/PretendardFont";
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { NewsCarousel } from "@/components/NewsCarousel";
import { PromoBanner } from "@/components/Promobanner";
import { HomeGridIcon } from "@/components/HomeGridIcon";

export default function Home() {
  const router = useRouter();

  const handleRefresh = useCallback(async (): Promise<void> => {
    // 실제 데이터 refetch는 각 컴포넌트의 useQuery에서 처리됨
    // 여기서는 간단한 딜레이만 추가
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }, []);
  return (
    <View className="flex-1 bg-gray-100">
      <PullToRefresh
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. 프로모 배너 */}
        <PromoBanner />

        {/* 2. 1분 가이드 */}
        <View className="px-4 my-6">
          <Pressable
            // onPress={() => router.push("/report")}
            className="bg-green-50 rounded-2xl p-4 flex-row items-center active:scale-[0.98]"
          >
            <View className="w-10 h-10 rounded-xl bg-green-100 items-center justify-center mr-3">
              <Feather name="zap" size={18} color="#22C55E" />
            </View>
            <View className="flex-1">
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 16, color: "#111827" }}
              >
                농번기 필수 기능부터 시작
              </PretendardFont>
              <PretendardFont
                weight="regular"
                style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}
              >
                WEBEE가 처음이라면
              </PretendardFont>
            </View>
            <View className="flex-row items-center">
              <PretendardFont
                weight="medium"
                style={{ fontSize: 14, color: "#16A34A", marginRight: 4 }}
              >
                따라해보기
              </PretendardFont>
              <Feather name="chevron-right" size={20} color="#22C55E" />
            </View>
          </Pressable>
        </View>

        {/* 3. 홈 아이콘 그리드 */}
        <HomeGridIcon />

        {/*<HiveControlBanner />빈 자리에 넣을만한 기능?? 벌통상태확인 + 커뮤니티*/}

        {/* 4. 수정벌 뉴스 캐러셀 */}
        <NewsCarousel keyword="수정벌" title="수정벌 뉴스" />
      </PullToRefresh>
    </View>
  );
}

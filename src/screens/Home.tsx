import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { NewsCarousel } from "@/components/NewsCarousel";

export default function Home() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 2. 1분 가이드 */}
        <View className="px-4 mb-6">
          <Pressable
            onPress={() => router.push("/report")}
            className="bg-green-50 rounded-2xl p-4 flex-row items-center active:scale-[0.98]"
          >
            <View className="w-10 h-10 rounded-xl bg-green-100 items-center justify-center mr-3">
              <Feather name="zap" size={18} color="#22C55E" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                농번기 필수 기능부터 시작
              </Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                WEBEE가 처음이라면
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm font-medium text-green-600 mr-1">
                따라해보기
              </Text>
              <Feather name="chevron-right" size={20} color="#22C55E" />
            </View>
          </Pressable>
        </View>

        {/* 3. 수정벌 뉴스 캐러셀 */}
        <NewsCarousel keyword="수정벌" title="수정벌 뉴스" />
      </ScrollView>
    </View>
  );
}

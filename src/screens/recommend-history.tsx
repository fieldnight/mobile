import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useRecommendationList } from '@/features/recommendation';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { CULTIVATION_TYPE_LABELS, BEE_TYPE_INFO } from '@/constants/recommend';

// 날짜 포맷팅 헬퍼
function formatDateKorean(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 벌 타입 한글명 매핑
const BEE_TYPE_LABELS: Record<string, string> = {
  HONEYBEE: '꿀벌',
  BUMBLEBEE: '뒤영벌',
  MASON_BEE: '가위벌',
};

export default function RecommendHistoryScreen() {
  const router = useRouter();
  const { data: recommendations, isLoading } = useRecommendationList();

  if (isLoading) {
    return <Loading text="추천 기록을 불러오는 중..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Feather name="chevron-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">추천 기록</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {!recommendations || recommendations.length === 0 ? (
          <Card className="items-center py-12">
            <View className="w-16 h-16 rounded-full bg-purple-100 items-center justify-center mb-4">
              <Feather name="zap" size={32} color="#7C4DFF" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              추천 기록이 없습니다
            </Text>
            <Text className="text-gray-500 text-center mb-4">
              맞춤형 수정벌 추천을 받아보세요
            </Text>
            <Pressable
              onPress={() => router.push('/recommend')}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">추천받기</Text>
            </Pressable>
          </Card>
        ) : (
          <View className="gap-3">
            {recommendations.map((item) => {
              const beeInfo = BEE_TYPE_INFO[item.beeType?.toUpperCase()] || { icon: 'zap', color: '#7C4DFF' };

              return (
                <Pressable
                  key={item.beeRecommendationId}
                  onPress={() => router.push(`/recommend-detail/${item.beeRecommendationId}`)}
                  className="active:scale-[0.98]"
                >
                <Card>
                  <View className="flex-row items-start">
                    {/* 벌 아이콘 */}
                    <View
                      className="w-14 h-14 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${beeInfo.color}20` }}
                    >
                      <Feather name={beeInfo.icon as any} size={24} color={beeInfo.color} />
                    </View>

                    {/* 정보 */}
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-900 mb-1">
                        {BEE_TYPE_LABELS[item.beeType?.toUpperCase()] || item.beeType}
                      </Text>

                      {/* 태그 */}
                      <View className="flex-row flex-wrap gap-1 mb-2">
                        <View className="px-2 py-1 bg-blue-100 rounded-full">
                          <Text className="text-xs font-medium text-blue-700">
                            {item.cropName}
                          </Text>
                        </View>
                        <View className="px-2 py-1 bg-green-100 rounded-full">
                          <Text className="text-xs font-medium text-green-700">
                            {CULTIVATION_TYPE_LABELS[item.cultivationType]}
                          </Text>
                        </View>
                      </View>

                      {/* 투입 기간 */}
                      <View className="flex-row items-center gap-1 mb-1">
                        <Feather name="calendar" size={14} color="#6B7280" />
                        <Text className="text-sm text-gray-600">
                          {formatDateKorean(item.inputStartDate)} ~ {formatDateKorean(item.inputEndDate)}
                        </Text>
                      </View>

                      {/* 지역 */}
                      {item.cultivationAddress && (
                        <View className="flex-row items-center gap-1">
                          <Feather name="map-pin" size={14} color="#9CA3AF" />
                          <Text className="text-sm text-gray-500">
                            {item.cultivationAddress}
                          </Text>
                        </View>
                      )}

                      {/* 생성일 */}
                      <Text className="text-xs text-gray-400 mt-2">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#9CA3AF" />
                  </View>
                </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

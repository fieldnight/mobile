import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useRecommendationList } from '@/features/recommendation';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import AppHeader from '@/components/AppHeader';
import { PretendardFont } from '@/components/PretendardFont';
import { CULTIVATION_TYPE_LABELS, BEE_TYPE_INFO } from '@/constants/recommend';
import { useScrollHeader, HEADER_HEIGHT } from '@/hooks';

function formatDateKorean(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

const BEE_TYPE_LABELS: Record<string, string> = {
  HONEYBEE: '꿀벌',
  BUMBLEBEE: '뒤영벌',
  MASON_BEE: '가위벌',
};

export default function RecommendHistoryScreen() {
  const router = useRouter();
  const { data: recommendations, isLoading } = useRecommendationList();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();

  if (isLoading) {
    return <Loading text="추천 기록을 불러오는 중..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['bottom']}>
      <AppHeader
        title="추천 기록"
        onBack={() => router.back()}
        isScrolled={isScrolled}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 16, paddingBottom: 16 }} onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
        {!recommendations || recommendations.length === 0 ? (
          <Card className="items-center py-12">
            <View className="w-16 h-16 rounded-full bg-purple-100 items-center justify-center mb-4">
              <Feather name="zap" size={32} color="#7C4DFF" />
            </View>
            <PretendardFont weight="semibold" className="text-lg text-gray-900 mb-2">
              추천 기록이 없습니다
            </PretendardFont>
            <PretendardFont className="text-gray-500 text-center mb-4">
              맞춤형 수정벌 추천을 받아보세요
            </PretendardFont>
            <Pressable
              onPress={() => router.push('/recommend')}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <PretendardFont weight="semibold" className="text-white">추천받기</PretendardFont>
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
                    <View
                      className="w-14 h-14 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${beeInfo.color}20` }}
                    >
                      <Feather name={beeInfo.icon as any} size={24} color={beeInfo.color} />
                    </View>

                    <View className="flex-1">
                      <PretendardFont weight="bold" className="text-lg text-gray-900 mb-1">
                        {BEE_TYPE_LABELS[item.beeType?.toUpperCase()] || item.beeType}
                      </PretendardFont>

                      <View className="flex-row flex-wrap gap-1 mb-2">
                        <View className="px-2 py-1 bg-blue-100 rounded-full">
                          <PretendardFont weight="medium" className="text-xs text-blue-700">
                            {item.cropName}
                          </PretendardFont>
                        </View>
                        <View className="px-2 py-1 bg-green-100 rounded-full">
                          <PretendardFont weight="medium" className="text-xs text-green-700">
                            {CULTIVATION_TYPE_LABELS[item.cultivationType]}
                          </PretendardFont>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-1 mb-1">
                        <Feather name="calendar" size={14} color="#6B7280" />
                        <PretendardFont className="text-sm text-gray-600">
                          {formatDateKorean(item.inputStartDate)} ~ {formatDateKorean(item.inputEndDate)}
                        </PretendardFont>
                      </View>

                      {item.cultivationAddress && (
                        <View className="flex-row items-center gap-1">
                          <Feather name="map-pin" size={14} color="#9CA3AF" />
                          <PretendardFont className="text-sm text-gray-500">
                            {item.cultivationAddress}
                          </PretendardFont>
                        </View>
                      )}

                      <PretendardFont className="text-xs text-gray-400 mt-2">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </PretendardFont>
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

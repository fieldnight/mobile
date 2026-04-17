import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useRecommendationDetail } from '@/features/recommendation';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { CULTIVATION_TYPE_LABELS, BEE_TYPE_INFO } from '@/constants/recommend';

// 벌 타입 한글명 매핑
const BEE_TYPE_LABELS: Record<string, string> = {
  HONEYBEE: '꿀벌',
  BUMBLEBEE: '뒤영벌',
  MASON_BEE: '가위벌',
};

// 날짜 포맷팅 헬퍼
function formatDateKorean(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function RecommendDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: detail, isLoading, error } = useRecommendationDetail(id);

  if (isLoading) {
    return <Loading text="추천 내역을 불러오는 중..." />;
  }

  if (error || !detail) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 items-center justify-center">
        <Feather name="alert-circle" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 mt-4">추천 내역을 찾을 수 없습니다</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-blue-600 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const beeInfo = BEE_TYPE_INFO[detail.beeType?.toUpperCase()] || { icon: 'zap', color: '#7C4DFF' };
  const beeLabel = BEE_TYPE_LABELS[detail.beeType?.toUpperCase()] || detail.beeType;

  // \n으로 구분된 문자열을 배열로 변환
  const characteristics = detail.characteristics?.split('\n').filter(Boolean) || [];
  const cautions = detail.caution?.split('\n').filter(Boolean) || [];
  const usageTips = detail.usageTip?.split('\n').filter(Boolean) || [];

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
        <Text className="text-lg font-semibold text-gray-900">추천 상세</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* 수정벌 타입 */}
        <Card className="mb-4">
          <View className="flex-row items-center">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: `${beeInfo.color}20` }}
            >
              <Feather name={beeInfo.icon as any} size={32} color={beeInfo.color} />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500 mb-1">추천 수정벌</Text>
              <Text className="text-2xl font-bold text-gray-900">{beeLabel}</Text>
            </View>
          </View>
        </Card>

        {/* 투입 기간 */}
        <Card className="mb-4 items-center">
          <View className="flex-row items-center gap-2 bg-blue-50 px-5 py-3 rounded-full">
            <Feather name="calendar" size={18} color="#3B82F6" />
            <Text className="text-base font-semibold text-blue-600">
              {formatDateKorean(detail.inputStartDate)} ~ {formatDateKorean(detail.inputEndDate)}
            </Text>
          </View>
          <Text className="text-xs text-gray-500 mt-2">권장 투입 기간</Text>
        </Card>

        {/* 작물 정보 */}
        <Card className="mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">작물 정보</Text>
          <View className="gap-2">
            {detail.cropName && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">작물명</Text>
                <Text className="text-sm font-medium text-gray-900">{detail.cropName}</Text>
              </View>
            )}
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">재배 방식</Text>
              <Text className="text-sm font-medium text-gray-900">
                {CULTIVATION_TYPE_LABELS[detail.cultivationType]}
              </Text>
            </View>
            {detail.cultivationAddress && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">재배 지역</Text>
                <Text className="text-sm font-medium text-gray-900">{detail.cultivationAddress}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* 특징 */}
        {characteristics.length > 0 && (
          <Card className="mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">수정벌 특징</Text>
            {characteristics.map((char, index) => (
              <View key={index} className="flex-row items-start mb-3">
                <View className="w-5 h-5 rounded-full bg-green-100 items-center justify-center mr-3 mt-0.5">
                  <Feather name="check" size={12} color="#10B981" />
                </View>
                <Text className="flex-1 text-base text-gray-700 leading-6">{char.trim()}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* 사용 팁 */}
        {usageTips.length > 0 && (
          <Card className="mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">사용 팁</Text>
            {usageTips.map((tip, index) => (
              <View key={index} className="flex-row items-start mb-3">
                <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center mr-3">
                  <Text className="text-xs font-semibold text-white">{index + 1}</Text>
                </View>
                <Text className="flex-1 text-base text-gray-700 leading-6">{tip.trim()}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* 주의사항 */}
        {cautions.length > 0 && (
          <Card className="mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Feather name="alert-triangle" size={20} color="#F59E0B" />
              <Text className="text-lg font-semibold text-amber-600">주의사항</Text>
            </View>
            {cautions.map((caution, index) => (
              <View key={index} className="flex-row items-start bg-amber-50 p-3 rounded-lg mb-2">
                <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 mr-3" />
                <Text className="flex-1 text-sm text-gray-700 leading-5">{caution.trim()}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* 추천일 */}
        <View className="items-center mt-2">
          <Text className="text-xs text-gray-400">
            추천일: {new Date(detail.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

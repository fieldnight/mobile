import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useRecommendationDetail } from '@/features/recommendation';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import AppHeader from '@/components/AppHeader';
import { PretendardFont } from '@/components/PretendardFont';
import { CULTIVATION_TYPE_LABELS, BEE_TYPE_INFO } from '@/constants/recommend';
import { useScrollHeader, HEADER_HEIGHT } from '@/hooks';

const BEE_TYPE_LABELS: Record<string, string> = {
  HONEYBEE: '꿀벌',
  BUMBLEBEE: '뒤영벌',
  MASON_BEE: '가위벌',
};

function formatDateKorean(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function RecommendDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: detail, isLoading, error } = useRecommendationDetail(id);
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();

  if (isLoading) {
    return <Loading text="추천 내역을 불러오는 중..." />;
  }

  if (error || !detail) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 items-center justify-center">
        <Feather name="alert-circle" size={48} color="#9CA3AF" />
        <PretendardFont className="text-gray-500 mt-4">추천 내역을 찾을 수 없습니다</PretendardFont>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-blue-600 px-6 py-3 rounded-xl"
        >
          <PretendardFont weight="semibold" className="text-white">돌아가기</PretendardFont>
        </Pressable>
      </SafeAreaView>
    );
  }

  const beeInfo = BEE_TYPE_INFO[detail.beeType?.toUpperCase()] || { icon: 'zap', color: '#7C4DFF' };
  const beeLabel = BEE_TYPE_LABELS[detail.beeType?.toUpperCase()] || detail.beeType;

  const characteristics = detail.characteristics?.split('\n').filter(Boolean) || [];
  const cautions = detail.caution?.split('\n').filter(Boolean) || [];
  const usageTips = detail.usageTip?.split('\n').filter(Boolean) || [];

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['bottom']}>
      <AppHeader
        title="추천 상세"
        onBack={() => router.back()}
        isScrolled={isScrolled}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: HEADER_HEIGHT + 16, paddingBottom: 100 }} onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
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
              <PretendardFont className="text-sm text-gray-500 mb-1">추천 수정벌</PretendardFont>
              <PretendardFont weight="bold" className="text-2xl text-gray-900">{beeLabel}</PretendardFont>
            </View>
          </View>
        </Card>

        {/* 투입 기간 */}
        <Card className="mb-4 items-center">
          <View className="flex-row items-center gap-2 bg-blue-50 px-5 py-3 rounded-full">
            <Feather name="calendar" size={18} color="#3B82F6" />
            <PretendardFont weight="semibold" className="text-base text-blue-600">
              {formatDateKorean(detail.inputStartDate)} ~ {formatDateKorean(detail.inputEndDate)}
            </PretendardFont>
          </View>
          <PretendardFont className="text-xs text-gray-500 mt-2">권장 투입 기간</PretendardFont>
        </Card>

        {/* 작물 정보 */}
        <Card className="mb-4">
          <PretendardFont weight="semibold" className="text-lg text-gray-900 mb-3">작물 정보</PretendardFont>
          <View className="gap-2">
            {detail.cropName && (
              <View className="flex-row justify-between">
                <PretendardFont className="text-sm text-gray-500">작물명</PretendardFont>
                <PretendardFont weight="medium" className="text-sm text-gray-900">{detail.cropName}</PretendardFont>
              </View>
            )}
            <View className="flex-row justify-between">
              <PretendardFont className="text-sm text-gray-500">재배 방식</PretendardFont>
              <PretendardFont weight="medium" className="text-sm text-gray-900">
                {CULTIVATION_TYPE_LABELS[detail.cultivationType]}
              </PretendardFont>
            </View>
            {detail.cultivationAddress && (
              <View className="flex-row justify-between">
                <PretendardFont className="text-sm text-gray-500">재배 지역</PretendardFont>
                <PretendardFont weight="medium" className="text-sm text-gray-900">{detail.cultivationAddress}</PretendardFont>
              </View>
            )}
          </View>
        </Card>

        {/* 특징 */}
        {characteristics.length > 0 && (
          <Card className="mb-4">
            <PretendardFont weight="semibold" className="text-lg text-gray-900 mb-3">수정벌 특징</PretendardFont>
            {characteristics.map((char, index) => (
              <View key={index} className="flex-row items-start mb-3">
                <View className="w-5 h-5 rounded-full bg-green-100 items-center justify-center mr-3 mt-0.5">
                  <Feather name="check" size={12} color="#10B981" />
                </View>
                <PretendardFont className="flex-1 text-base text-gray-700 leading-6">{char.trim()}</PretendardFont>
              </View>
            ))}
          </Card>
        )}

        {/* 사용 팁 */}
        {usageTips.length > 0 && (
          <Card className="mb-4">
            <PretendardFont weight="semibold" className="text-lg text-gray-900 mb-3">사용 팁</PretendardFont>
            {usageTips.map((tip, index) => (
              <View key={index} className="flex-row items-start mb-3">
                <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center mr-3">
                  <PretendardFont weight="semibold" className="text-xs text-white">{index + 1}</PretendardFont>
                </View>
                <PretendardFont className="flex-1 text-base text-gray-700 leading-6">{tip.trim()}</PretendardFont>
              </View>
            ))}
          </Card>
        )}

        {/* 주의사항 */}
        {cautions.length > 0 && (
          <Card className="mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Feather name="alert-triangle" size={20} color="#F59E0B" />
              <PretendardFont weight="semibold" className="text-lg text-amber-600">주의사항</PretendardFont>
            </View>
            {cautions.map((caution, index) => (
              <View key={index} className="flex-row items-start bg-amber-50 p-3 rounded-lg mb-2">
                <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 mr-3" />
                <PretendardFont className="flex-1 text-sm text-gray-700 leading-5">{caution.trim()}</PretendardFont>
              </View>
            ))}
          </Card>
        )}

        {/* 추천일 */}
        <View className="items-center mt-2">
          <PretendardFont className="text-xs text-gray-400">
            추천일: {new Date(detail.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </PretendardFont>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

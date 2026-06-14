import { View, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useDiagnosisList } from '@/features/diagnosis';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import AppHeader from '@/components/AppHeader';
import { PretendardFont } from '@/components/PretendardFont';
import { DISEASE_LABELS } from '@/types/bee-diagnosis';
import { useScrollHeader, HEADER_HEIGHT } from '@/hooks';

export default function DiagnosisHistoryScreen() {
  const router = useRouter();
  const { data: diagnoses, isLoading } = useDiagnosisList();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-700';
    if (confidence >= 50) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  if (isLoading) {
    return <Loading text="진단 기록을 불러오는 중..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <AppHeader
        title="진단 기록"
        onBack={() => router.back()}
        isScrolled={isScrolled}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 16, paddingBottom: 16 }} onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
        {!diagnoses || diagnoses.length === 0 ? (
          <Card className="items-center py-12">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Feather name="clipboard" size={32} color="#9CA3AF" />
            </View>
            <PretendardFont weight="semibold" className="text-lg text-gray-900 mb-2">
              진단 기록이 없습니다
            </PretendardFont>
            <PretendardFont className="text-gray-500 text-center mb-4">
              꿀벌 질병 진단을 받아보세요
            </PretendardFont>
            <Pressable
              onPress={() => router.push('/bee-diagnosis')}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <PretendardFont weight="semibold" className="text-white">진단 시작하기</PretendardFont>
            </Pressable>
          </Card>
        ) : (
          <View className="gap-3">
            {diagnoses.map((diagnosis) => (
              <Pressable
                key={diagnosis.beeDiagnosisId}
                onPress={() => router.push(`/bee-diagnosis-detail/${diagnosis.beeDiagnosisId}`)}
                className="active:scale-[0.98]"
              >
                <Card>
                  <View className="flex-row">
                    {diagnosis.imageUrl && (
                      <Image
                        source={{ uri: diagnosis.imageUrl }}
                        className="w-20 h-20 rounded-xl mr-3"
                        resizeMode="cover"
                      />
                    )}
                    <View className="flex-1">
                      <PretendardFont weight="semibold" className="text-base text-gray-900 mb-1">
                        {DISEASE_LABELS[diagnosis.diseaseType] || diagnosis.diseaseType}
                      </PretendardFont>
                      <View
                        className={`self-start px-2 py-1 rounded-full mb-2 ${
                          getConfidenceColor(diagnosis.confidence).split(' ')[0]
                        }`}
                      >
                        <PretendardFont
                          weight="medium"
                          className={`text-xs ${getConfidenceColor(diagnosis.confidence).split(' ')[1]}`}
                        >
                          신뢰도 {diagnosis.confidence.toFixed(1)}%
                        </PretendardFont>
                      </View>
                      <PretendardFont className="text-xs text-gray-500">
                        {new Date(diagnosis.createdAt).toLocaleDateString('ko-KR', {
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
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

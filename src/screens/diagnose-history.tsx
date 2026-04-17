import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useDiagnosisList } from '@/features/diagnosis';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { DISEASE_LABELS } from '@/types/bee-diagnosis';

export default function DiagnosisHistoryScreen() {
  const router = useRouter();
  const { data: diagnoses, isLoading } = useDiagnosisList();

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
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Feather name="chevron-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">진단 기록</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {!diagnoses || diagnoses.length === 0 ? (
          <Card className="items-center py-12">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Feather name="clipboard" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              진단 기록이 없습니다
            </Text>
            <Text className="text-gray-500 text-center mb-4">
              꿀벌 질병 진단을 받아보세요
            </Text>
            <Pressable
              onPress={() => router.push('/bee-diagnosis')}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">진단 시작하기</Text>
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
                      <Text className="text-base font-semibold text-gray-900 mb-1">
                        {DISEASE_LABELS[diagnosis.diseaseType] || diagnosis.diseaseType}
                      </Text>
                      <View
                        className={`self-start px-2 py-1 rounded-full mb-2 ${
                          getConfidenceColor(diagnosis.confidence).split(' ')[0]
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            getConfidenceColor(diagnosis.confidence).split(' ')[1]
                          }`}
                        >
                          신뢰도 {diagnosis.confidence.toFixed(1)}%
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500">
                        {new Date(diagnosis.createdAt).toLocaleDateString('ko-KR', {
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
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

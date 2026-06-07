import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { ReportData } from '@/types/report';
import { formatCurrency } from '@/lib/utils';
import { PretendardFont } from '@/components/PretendardFont';

export default function ReportResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3;

  useEffect(() => {
    if (params.data) {
      try {
        const parsed = JSON.parse(params.data as string);
        setReportData(parsed);
      } catch (e) {
        console.error('Failed to parse report data:', e);
      }
    }
  }, [params.data]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/home');
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else {
      router.replace('/report');
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (!reportData) {
    return (
      <View className="flex-1 bg-gray-100 items-center justify-center">
        <PretendardFont className="text-gray-600">리포트 데이터를 불러오는 중...</PretendardFont>
      </View>
    );
  }

  const { revenueAnalysis, input, brandComparison, managementActions, managementGuide, environment, expectedRevenue, finalConclusion } = reportData;

  const boxesPerHouse = input?.boxesPerHouse || 3;
  const greenhouseSize = input?.greenhouseSize || 330;
  const densityPer100 = (boxesPerHouse / greenhouseSize) * 100;
  const isDensityLow = densityPer100 < 1;

  const cropName = input?.crop || '작물';
  const varietyName = input?.cropVariety || '';
  const brandName = input?.beeBrand || '지리산';

  const hasEnvData = input?.hasSmartFarm && input?.averageTemperature && input?.averageHumidity;
  const tempOptimal = input?.averageTemperature && input.averageTemperature >= 18 && input.averageTemperature <= 25;
  const humidOptimal = input?.averageHumidity && input.averageHumidity >= 60 && input.averageHumidity <= 75;
  const tempHigh = input?.averageTemperature && input.averageTemperature > 25;
  const humidHigh = input?.averageHumidity && input.averageHumidity > 75;

  const overallScore =
    (tempOptimal ? 25 : tempHigh ? 10 : 20) +
    (humidOptimal ? 25 : humidHigh ? 10 : 20) +
    (isDensityLow ? 15 : 25) + 15;

  const beeRecommendations = brandComparison ? [
    {
      rank: 1,
      name: brandComparison.brand1?.name || '추천 수정벌',
      price: brandComparison.brand1?.price || 45000,
      lifespan: `${brandComparison.brand1?.replacementCycleWeeks || 3}주`,
      cropMatch: brandComparison.brand1?.activityRate || 95,
      tempRange: brandComparison.brand1?.optimalTemperature
        ? `${brandComparison.brand1.optimalTemperature.min}~${brandComparison.brand1.optimalTemperature.max}°C`
        : '15~25°C',
      features: brandComparison.brand1?.features || [],
    },
    {
      rank: 2,
      name: brandComparison.brand2?.name || '대안 1',
      price: brandComparison.brand2?.price || 42000,
      lifespan: `${brandComparison.brand2?.replacementCycleWeeks || 3}주`,
      cropMatch: brandComparison.brand2?.activityRate || 88,
      tempRange: brandComparison.brand2?.optimalTemperature
        ? `${brandComparison.brand2.optimalTemperature.min}~${brandComparison.brand2.optimalTemperature.max}°C`
        : '18~30°C',
      features: brandComparison.brand2?.features || [],
    },
    ...(brandComparison.brand3 ? [{
      rank: 3,
      name: brandComparison.brand3.name,
      price: brandComparison.brand3.price || 40000,
      lifespan: `${brandComparison.brand3.replacementCycleWeeks || 3}주`,
      cropMatch: brandComparison.brand3.activityRate || 80,
      tempRange: brandComparison.brand3.optimalTemperature
        ? `${brandComparison.brand3.optimalTemperature.min}~${brandComparison.brand3.optimalTemperature.max}°C`
        : '18~28°C',
      features: brandComparison.brand3.features || [],
    }] : []),
  ] : [];

  const priorityImprovements = (managementActions || []).slice(0, 3).map((action, index) => ({
    priority: index + 1,
    issue: action.title,
    reason: action.target,
  }));

  const marketPrice = revenueAnalysis ? revenueAnalysis.currentRevenue / revenueAnalysis.currentYield : 0;

  return (
    <View className="flex-1 bg-[#0A0E27]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={handleClose} className="w-11 h-11 items-center justify-center">
          <Feather name="x" size={24} color="#FFFFFF" />
        </Pressable>
        <PretendardFont weight="semibold" className="text-base text-white">분석 리포트</PretendardFont>
        <View className="w-11" />
      </View>

      {/* Page Indicator */}
      <View className="flex-row items-center justify-center gap-2 mb-4">
        {[1, 2, 3].map((page) => (
          <View
            key={page}
            className={`h-1.5 rounded-full ${currentPage === page ? 'w-8 bg-green-500' : 'w-2 bg-white/20'}`}
          />
        ))}
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Page 1 */}
        {currentPage === 1 && (
          <Animated.View entering={FadeIn.duration(300)} className="gap-4">
            <View className="bg-[#1A1F3D] rounded-2xl p-6 items-center border border-white/10">
              <PretendardFont weight="bold" className="text-xs text-green-500 mb-2 tracking-widest">
                {cropName}{varietyName ? `(${varietyName})` : ''} 분석 리포트
              </PretendardFont>
              <PretendardFont weight="semibold" className="text-sm text-white/80 mb-4">수정벌 관리 최적화 지수</PretendardFont>

              <View className="w-36 h-36 rounded-full border-8 border-white/10 items-center justify-center mb-4">
                <PretendardFont weight="bold" className="text-4xl text-white">{overallScore}</PretendardFont>
                <PretendardFont className="text-xs text-white/75">점</PretendardFont>
              </View>

              <PretendardFont className="text-sm text-white/80">
                상위 <PretendardFont weight="bold" className="text-green-500">{Math.max(1, 100 - Math.round(overallScore * 0.8))}%</PretendardFont>입니다
              </PretendardFont>
            </View>

            {beeRecommendations.length > 0 && (
              <View className="bg-white rounded-2xl p-5">
                <View className="flex-row items-center gap-2 mb-4">
                  <View className="w-6 h-6 rounded-lg bg-green-100 items-center justify-center">
                    <Feather name="target" size={14} color="#22C55E" />
                  </View>
                  <PretendardFont weight="bold" className="text-sm text-gray-900">1. 맞춤 수정벌 추천</PretendardFont>
                </View>

                <View className="bg-green-50 rounded-xl p-4 border-2 border-green-400 mb-3">
                  <View className="absolute -top-2 left-4 bg-green-500 px-2 py-0.5 rounded-full">
                    <PretendardFont weight="bold" className="text-xs text-white">BEST</PretendardFont>
                  </View>
                  <View className="flex-row items-center justify-between mb-3 pt-1">
                    <PretendardFont weight="bold" className="text-base text-green-600">{beeRecommendations[0].name}</PretendardFont>
                    <PretendardFont weight="bold" className="text-base text-gray-900">
                      {beeRecommendations[0].price.toLocaleString()}원
                      <PretendardFont className="text-xs text-gray-600">/박스</PretendardFont>
                    </PretendardFont>
                  </View>
                  <View className="flex-row gap-2 mb-3">
                    <View className="flex-1 bg-white/80 rounded-lg p-2 items-center">
                      <PretendardFont className="text-xs text-gray-600 mb-0.5">교체 주기</PretendardFont>
                      <PretendardFont weight="bold" className="text-gray-900">{beeRecommendations[0].lifespan}</PretendardFont>
                    </View>
                    <View className="flex-1 bg-white/80 rounded-lg p-2 items-center">
                      <PretendardFont className="text-xs text-gray-600 mb-0.5">{cropName} 적합도</PretendardFont>
                      <PretendardFont weight="bold" className="text-green-600">{beeRecommendations[0].cropMatch}%</PretendardFont>
                    </View>
                    <View className="flex-1 bg-white/80 rounded-lg p-2 items-center">
                      <PretendardFont className="text-xs text-gray-600 mb-0.5">적정 온도</PretendardFont>
                      <PretendardFont weight="bold" className="text-gray-900">{beeRecommendations[0].tempRange}</PretendardFont>
                    </View>
                  </View>
                  <View className="flex-row flex-wrap gap-1">
                    {beeRecommendations[0].features.map((f, i) => (
                      <View key={i} className="bg-green-200 px-2 py-0.5 rounded-full">
                        <PretendardFont weight="medium" className="text-xs text-green-700">{f}</PretendardFont>
                      </View>
                    ))}
                  </View>
                </View>

                <View className="flex-row gap-3">
                  {beeRecommendations.slice(1).map((bee) => (
                    <View key={bee.rank} className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <View className="absolute -top-2 left-3 bg-gray-500 px-1.5 py-0.5 rounded-full">
                        <PretendardFont weight="bold" className="text-xs text-white">{bee.rank}위</PretendardFont>
                      </View>
                      <PretendardFont weight="bold" className="text-xs text-gray-700 pt-1 mb-2">{bee.name}</PretendardFont>
                      <View className="gap-1">
                        <View className="flex-row justify-between">
                          <PretendardFont className="text-xs text-gray-600">가격</PretendardFont>
                          <PretendardFont weight="semibold" className="text-xs text-gray-800">{bee.price.toLocaleString()}원</PretendardFont>
                        </View>
                        <View className="flex-row justify-between">
                          <PretendardFont className="text-xs text-gray-600">교체</PretendardFont>
                          <PretendardFont weight="semibold" className="text-xs text-gray-800">{bee.lifespan}</PretendardFont>
                        </View>
                        <View className="flex-row justify-between">
                          <PretendardFont className="text-xs text-gray-600">적합도</PretendardFont>
                          <PretendardFont weight="semibold" className="text-xs text-gray-800">{bee.cropMatch}%</PretendardFont>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {hasEnvData && (
              <View className="bg-white rounded-2xl p-5">
                <View className="flex-row items-center gap-2 mb-4">
                  <View className="w-6 h-6 rounded-lg bg-blue-100 items-center justify-center">
                    <Feather name="activity" size={14} color="#3B82F6" />
                  </View>
                  <PretendardFont weight="bold" className="text-sm text-gray-900">2. 온·습도 상태 진단</PretendardFont>
                </View>

                <View className="flex-row gap-3 mb-3">
                  <View className="flex-1 bg-gray-50 rounded-xl p-4 items-center">
                    <Feather name="thermometer" size={20} color="#FFD55F" />
                    <PretendardFont className="text-xs text-gray-600 mt-2 mb-1">평균 온도</PretendardFont>
                    <PretendardFont weight="bold" className={`text-xl ${tempOptimal ? 'text-green-600' : 'text-yellow-500'}`}>
                      {input?.averageTemperature}°C
                    </PretendardFont>
                    <PretendardFont className="text-xs text-gray-600 mt-1">벌 최적: {beeRecommendations[0]?.tempRange || '18~25°C'}</PretendardFont>
                  </View>
                  <View className="flex-1 bg-gray-50 rounded-xl p-4 items-center">
                    <Feather name="droplet" size={20} color="#3B82F6" />
                    <PretendardFont className="text-xs text-gray-600 mt-2 mb-1">평균 습도</PretendardFont>
                    <PretendardFont weight="bold" className={`text-xl ${humidOptimal ? 'text-green-600' : 'text-red-500'}`}>
                      {input?.averageHumidity}%
                    </PretendardFont>
                    <PretendardFont className="text-xs text-gray-600 mt-1">벌 최적: {managementGuide?.humidityControl?.recommendedRange || '50~70%'}</PretendardFont>
                  </View>
                </View>

                {(tempHigh || humidHigh) && (
                  <View className="bg-red-50 rounded-xl p-3 border border-red-100">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Feather name="alert-triangle" size={14} color="#EF4444" />
                      <PretendardFont weight="bold" className="text-xs text-red-600">문제 진단</PretendardFont>
                    </View>
                    {tempHigh && <PretendardFont className="text-xs text-red-600/80">• 고온으로 벌 비행 시간 단축</PretendardFont>}
                    {humidHigh && <PretendardFont className="text-xs text-red-600/80">• 고습으로 꽃가루 점착, 수정 효율 하락</PretendardFont>}
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        )}

        {/* Page 2 */}
        {currentPage === 2 && (
          <Animated.View entering={FadeIn.duration(300)} className="gap-4">
            {priorityImprovements.length > 0 && (
              <View className="bg-gradient-to-br rounded-2xl p-5 border border-red-500/20" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <View className="flex-row items-center gap-2 mb-4">
                  <View className="w-6 h-6 rounded-lg bg-red-500 items-center justify-center">
                    <Feather name="alert-circle" size={14} color="#FFFFFF" />
                  </View>
                  <PretendardFont weight="bold" className="text-sm text-white">우선 개선 사항 (시급 순)</PretendardFont>
                </View>

                <View className="gap-2">
                  {priorityImprovements.map((item, idx) => (
                    <View key={idx} className="bg-white/10 rounded-xl p-3 flex-row items-start gap-3 border border-white/10">
                      <View className="w-6 h-6 rounded-full bg-red-500 items-center justify-center">
                        <PretendardFont weight="bold" className="text-xs text-white">{idx + 1}</PretendardFont>
                      </View>
                      <View className="flex-1">
                        <PretendardFont weight="bold" className="text-sm text-white">{item.issue}</PretendardFont>
                        <PretendardFont className="text-xs text-white/70">{item.reason}</PretendardFont>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View className="bg-white rounded-2xl p-5">
              <View className="flex-row items-center gap-2 mb-4">
                <View className="w-6 h-6 rounded-lg bg-yellow-100 items-center justify-center">
                  <Feather name="thermometer" size={14} color="#FFD55F" />
                </View>
                <PretendardFont weight="bold" className="text-sm text-gray-900">3. 온도 관리</PretendardFont>
              </View>

              <View className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <View className="flex-row gap-3 mb-3">
                  <View className="flex-1 bg-white rounded-lg p-3 border border-gray-100">
                    <PretendardFont weight="semibold" className="text-gray-900 mb-1 text-xs">벌 최적 온도</PretendardFont>
                    <PretendardFont weight="bold" className="text-lg text-yellow-500">{beeRecommendations[0]?.tempRange || '18~25°C'}</PretendardFont>
                  </View>
                  <View className="flex-1 bg-white rounded-lg p-3 border border-gray-100">
                    <PretendardFont weight="semibold" className="text-gray-900 mb-1 text-xs">{cropName} 최적 온도</PretendardFont>
                    <PretendardFont weight="bold" className="text-lg text-green-600">{managementGuide?.temperatureControl?.recommendedRange || '15~25°C'}</PretendardFont>
                  </View>
                </View>
                <View className="gap-1.5">
                  {(managementGuide?.temperatureControl?.actions || ['오전 9~11시 개화 시간대 환기 강화', '고온 시(25°C 초과) 차광막 활용']).map((action, idx) => (
                    <View key={idx} className="flex-row items-start gap-2">
                      <Feather name="check-circle" size={14} color="#22C55E" />
                      <PretendardFont className="flex-1 text-xs text-gray-600">{action}</PretendardFont>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View className="bg-white rounded-2xl p-5">
              <View className="flex-row items-center gap-2 mb-4">
                <View className="w-6 h-6 rounded-lg bg-blue-100 items-center justify-center">
                  <Feather name="droplet" size={14} color="#3B82F6" />
                </View>
                <PretendardFont weight="bold" className="text-sm text-gray-900">4. 습도 관리</PretendardFont>
              </View>

              <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <View className="flex-row gap-3 mb-3">
                  <View className="flex-1 bg-white rounded-lg p-3 border border-gray-100">
                    <PretendardFont weight="semibold" className="text-gray-900 mb-1 text-xs">벌 최적 습도</PretendardFont>
                    <PretendardFont weight="bold" className="text-lg text-blue-500">{managementGuide?.humidityControl?.recommendedRange || '50~70%'}</PretendardFont>
                  </View>
                  <View className="flex-1 bg-white rounded-lg p-3 border border-gray-100">
                    <PretendardFont weight="semibold" className="text-gray-900 mb-1 text-xs">{cropName} 최적 습도</PretendardFont>
                    <PretendardFont weight="bold" className="text-lg text-green-600">
                      {environment?.humidityRange ? `${environment.humidityRange.min}~${environment.humidityRange.max}%` : '60~75%'}
                    </PretendardFont>
                  </View>
                </View>
                <View className="gap-1.5">
                  {(managementGuide?.humidityControl?.actions || ['오전 관수 집중으로 오후 습도 상승 방지', '관수 후 1~2시간 내 환기 타이밍 설정']).map((action, idx) => (
                    <View key={idx} className="flex-row items-start gap-2">
                      <Feather name="check-circle" size={14} color="#22C55E" />
                      <PretendardFont className="flex-1 text-xs text-gray-600">{action}</PretendardFont>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View className="bg-white rounded-2xl p-5">
              <View className="flex-row items-center gap-2 mb-4">
                <View className="w-6 h-6 rounded-lg bg-green-100 items-center justify-center">
                  <Feather name="target" size={14} color="#22C55E" />
                </View>
                <PretendardFont weight="bold" className="text-sm text-gray-900">5. 벌 관리</PretendardFont>
              </View>

              <View className="gap-3">
                <View className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Feather name="map-pin" size={16} color="#22C55E" />
                    <PretendardFont weight="bold" className="text-sm text-gray-900">벌통 위치</PretendardFont>
                  </View>
                  <PretendardFont className="text-xs text-gray-700">
                    {managementGuide?.pollinationManagement?.placement || '하우스 중앙부 배치, 직풍 회피'}
                  </PretendardFont>
                </View>

                <View className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Feather name="refresh-cw" size={16} color="#22C55E" />
                    <PretendardFont weight="bold" className="text-sm text-gray-900">교체 주기</PretendardFont>
                  </View>
                  <PretendardFont className="text-xs text-gray-700">
                    {managementGuide?.pollinationManagement?.replacementCycle || `현재 ${input?.replacementWeeks || 3}주 → ${Math.max(2, (input?.replacementWeeks || 3) - 0.5)}주 단축 권장`}
                  </PretendardFont>
                </View>

                <View className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Feather name="layers" size={16} color="#22C55E" />
                    <PretendardFont weight="bold" className="text-sm text-gray-900">밀도 보정</PretendardFont>
                  </View>
                  <PretendardFont className="text-xs text-gray-700">
                    현재 동당 {boxesPerHouse}박스 →{' '}
                    <PretendardFont weight="bold" className="text-green-600">동당 {boxesPerHouse + 1}박스</PretendardFont> 권장
                  </PretendardFont>
                  <PretendardFont className="text-xs text-gray-500 mt-1">
                    100평당 최소 1박스 필요. 현재 {densityPer100.toFixed(1)}박스로 {isDensityLow ? '밀도 부족' : '적정 수준'}
                  </PretendardFont>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Page 3 */}
        {currentPage === 3 && (
          <Animated.View entering={FadeIn.duration(300)} className="gap-4">
            <View className="bg-[#1A1F3D] rounded-2xl p-5 border border-white/10">
              <View className="flex-row items-center gap-2 mb-4">
                <View className="w-6 h-6 rounded-lg bg-green-500/20 items-center justify-center">
                  <Feather name="dollar-sign" size={14} color="#22C55E" />
                </View>
                <PretendardFont weight="bold" className="text-sm text-white">6. 기대 수익률 분석</PretendardFont>
              </View>

              <View className="bg-white/5 rounded-xl p-3 mb-4 border border-white/10">
                <View className="flex-row items-start gap-2">
                  <Feather name="info" size={14} color="#3B82F6" />
                  <PretendardFont className="flex-1 text-xs text-white/80">
                    개선 방안을 준수할 경우, 아래의 추가 수익이 예상됩니다.
                  </PretendardFont>
                </View>
              </View>

              <View className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                <PretendardFont className="text-xs text-white/75 mb-2">{cropName} 현재 시세</PretendardFont>
                <PretendardFont weight="bold" className="text-2xl text-yellow-400">
                  {marketPrice.toLocaleString()}원<PretendardFont className="text-sm text-white/75">/kg</PretendardFont>
                </PretendardFont>
              </View>

              <View className="flex-row gap-2 mb-4">
                <View className="flex-1 bg-white/5 rounded-lg p-3 items-center">
                  <PretendardFont className="text-xs text-white/70 mb-1">연간 생산량</PretendardFont>
                  <PretendardFont weight="bold" className="text-lg text-white">{(input?.annualKg || 5000).toLocaleString()}kg</PretendardFont>
                </View>
                <View className="flex-1 bg-white/5 rounded-lg p-3 items-center">
                  <PretendardFont className="text-xs text-white/70 mb-1">현재 착과율</PretendardFont>
                  <PretendardFont weight="bold" className="text-lg text-white/80">{revenueAnalysis?.currentRate || 85}%</PretendardFont>
                </View>
                <View className="flex-1 bg-green-500/20 rounded-lg p-3 items-center border border-green-500/30">
                  <PretendardFont className="text-xs text-green-400 mb-1">개선 후</PretendardFont>
                  <PretendardFont weight="bold" className="text-lg text-green-400">{revenueAnalysis?.improvedRate || 95}%</PretendardFont>
                </View>
              </View>

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 bg-white/5 rounded-xl p-3">
                  <PretendardFont className="text-xs text-white/70 mb-1">추가 매출</PretendardFont>
                  <PretendardFont weight="bold" className="text-xl text-green-400">+{formatCurrency(revenueAnalysis?.additionalRevenue || 0)}원</PretendardFont>
                </View>
                <View className="flex-1 bg-white/5 rounded-xl p-3">
                  <PretendardFont className="text-xs text-white/70 mb-1">추가 비용</PretendardFont>
                  <PretendardFont weight="bold" className="text-lg text-white/80">
                    {expectedRevenue?.additionalCost
                      ? `약 ${formatCurrency(expectedRevenue.additionalCost.min)}~${formatCurrency(expectedRevenue.additionalCost.max)}원`
                      : '약 200~300만원'}
                  </PretendardFont>
                </View>
              </View>

              <View className="bg-green-500/10 rounded-xl p-4 flex-row items-center justify-between border border-green-500/30">
                <View>
                  <PretendardFont className="text-xs text-white/70 mb-1">기대 순이익</PretendardFont>
                  <PretendardFont weight="bold" className="text-xl text-white">
                    {expectedRevenue?.netGainRange
                      ? `+${formatCurrency(expectedRevenue.netGainRange.min)}~${formatCurrency(expectedRevenue.netGainRange.max)}원`
                      : '+450~550만원'}
                  </PretendardFont>
                </View>
                <View className="items-end">
                  <PretendardFont className="text-xs text-white/70 mb-1">기대 ROI</PretendardFont>
                  <PretendardFont weight="bold" className="text-3xl text-green-400">
                    {expectedRevenue?.roiPercentRange
                      ? `${expectedRevenue.roiPercentRange.min}~${expectedRevenue.roiPercentRange.max}%`
                      : '150~200%'}
                  </PretendardFont>
                </View>
              </View>
            </View>

            <View className="bg-[#1A1F3D] rounded-2xl p-5 border border-green-500/30">
              <View className="flex-row items-start gap-4">
                <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center">
                  <Feather name="trending-up" size={24} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <PretendardFont weight="bold" className="text-base text-white mb-2">최종 결론</PretendardFont>
                  <PretendardFont className="text-sm text-white/90 mb-1">
                    현재 <PretendardFont weight="bold" className="text-white">{brandName} 수정벌</PretendardFont>은 {cropName}{varietyName ? `(${varietyName})` : ''}에 {finalConclusion?.suitability || '적합'}합니다.
                  </PretendardFont>
                  <PretendardFont className="text-sm text-white/80 mb-2">온·습도 조정 및 박스 밀도 보정 시</PretendardFont>
                  <PretendardFont weight="bold" className="text-lg text-white">
                    착과율 <PretendardFont weight="bold" className="text-yellow-400">
                      {finalConclusion?.expectedImprovementRate
                        ? `최대 +${finalConclusion.expectedImprovementRate.min}~${finalConclusion.expectedImprovementRate.max}%p`
                        : '최대 +10~15%p'}
                    </PretendardFont>
                  </PretendardFont>
                  <PretendardFont weight="bold" className="text-lg text-white">
                    연간 기대 수익 <PretendardFont weight="bold" className="text-yellow-400">
                      {finalConclusion?.expectedAnnualRevenueIncrease
                        ? `약 +${formatCurrency(finalConclusion.expectedAnnualRevenueIncrease.min)}~${formatCurrency(finalConclusion.expectedAnnualRevenueIncrease.max)}원`
                        : '약 +400~600만원'}
                    </PretendardFont> 증가
                  </PretendardFont>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-5 pt-4 border-t border-white/10 bg-[#0A0E27]"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={handlePrev}
          className="flex-row items-center px-5 py-3 rounded-xl border border-white/20"
        >
          <Feather name="chevron-left" size={16} color="#FFFFFF" />
          <PretendardFont weight="semibold" className="text-white/70 ml-1">
            {currentPage === 1 ? '다시 작성' : '이전'}
          </PretendardFont>
        </Pressable>

        {currentPage < totalPages ? (
          <Pressable
            onPress={handleNext}
            className="flex-row items-center px-6 py-3 rounded-xl bg-green-500"
          >
            <PretendardFont weight="semibold" className="text-white mr-1">
              {currentPage === 1 ? '개선방안 보기' : '수익분석 보기'}
            </PretendardFont>
            <Feather name="chevron-right" size={16} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleClose}
            className="px-6 py-3 rounded-xl bg-yellow-500"
          >
            <PretendardFont weight="bold" className="text-black">진단 완료</PretendardFont>
          </Pressable>
        )}
      </View>
    </View>
  );
}

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { api } from '@/lib/api';
import { useKeyboard } from '@/hooks/useKeyboard';
import type { ReportRequest, FacilityType } from '@/types/report';
import {
  BEE_BRANDS,
  FACILITY_TYPES,
  REPORT_TOTAL_STEPS,
  REPORT_STEP_LABELS,
} from '@/constants/report';

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isVisible: isKeyboardVisible, keyboardHeight } = useKeyboard();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: 농장 정보
  const [facilityType, setFacilityType] = useState<FacilityType | ''>('');
  const [location, setLocation] = useState('');
  const [buildingCount, setBuildingCount] = useState('');
  const [areaPerBuilding, setAreaPerBuilding] = useState('');
  const [farmlandArea, setFarmlandArea] = useState('');

  // Step 2: 작물 정보
  const [cropType, setCropType] = useState('');
  const [variety, setVariety] = useState('');

  // Step 3: 수정벌 정보
  const [beeBrand, setBeeBrand] = useState('');
  const [customBeeBrand, setCustomBeeBrand] = useState('');
  const [hivesPerBuilding, setHivesPerBuilding] = useState('');

  // Step 4: 생산 정보
  const [replacementCycle, setReplacementCycle] = useState('');
  const [annualProduction, setAnnualProduction] = useState('');

  // Step 5: 환경 데이터
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');

  const [showStepList, setShowStepList] = useState(false);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < REPORT_TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleStartDiagnosis = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      const selectedBeeBrand = beeBrand === '기타' ? customBeeBrand : beeBrand;
      const totalArea = facilityType === 'farmland'
        ? parseInt(farmlandArea, 10)
        : parseInt(buildingCount, 10) * parseInt(areaPerBuilding, 10);

      const requestData: ReportRequest = {
        farmBaseInfo: {
          region: location,
          areaPyeong: totalArea,
          cropName: cropType,
          cropVariety: variety || undefined,
        },
        greenhouseSetup: {
          houseCount: facilityType === 'greenhouse' ? parseInt(buildingCount, 10) : undefined,
          areaPerHousePyeong: facilityType === 'greenhouse' ? parseInt(areaPerBuilding, 10) : undefined,
          beeType: selectedBeeBrand,
          boxesPerHouse: parseInt(hivesPerBuilding, 10),
          replacementCycleWeeks: parseReplacementCycle(replacementCycle),
          annualYieldKg: parseInt(annualProduction, 10),
        },
        environmentData: {
          temperature: parseInt(temperature, 10),
          humidity: parseInt(humidity, 10),
        },
      };

      const response = await api.post('/api/v1/reports/harvest-prediction', requestData);

      if (response.data.code === '200' || response.data.code === 'OK') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // TODO: 결과 화면으로 이동하면서 데이터 전달
        router.replace({
          pathname: '/report-result',
          params: { data: JSON.stringify(response.data.data) },
        });
      } else {
        throw new Error(response.data.message || '리포트 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Report generation error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        '오류',
        error.response?.data?.message || error.message || '리포트 생성에 실패했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const parseReplacementCycle = (cycle: string): number => {
    // "2주" -> 2, "1개월" -> 4
    const weekMatch = cycle.match(/(\d+)\s*주/);
    if (weekMatch) return parseInt(weekMatch[1], 10);

    const monthMatch = cycle.match(/(\d+)\s*개월/);
    if (monthMatch) return parseInt(monthMatch[1], 10) * 4;

    return parseInt(cycle, 10) || 2;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        if (facilityType === 'farmland') {
          return location.trim() !== '' && farmlandArea.trim() !== '' && farmlandArea.trim() !== '0';
        }
        if (facilityType === 'greenhouse') {
          return location.trim() !== '' && buildingCount.trim() !== '' && areaPerBuilding.trim() !== '';
        }
        return false; // facilityType이 선택되지 않은 경우
      case 2:
        return cropType.trim() !== '';
      case 3:
        return beeBrand !== '' && (beeBrand !== '기타' || customBeeBrand.trim() !== '') && hivesPerBuilding.trim() !== '';
      case 4:
        return replacementCycle.trim() !== '' && annualProduction.trim() !== '';
      case 5:
        return temperature.trim() !== '' && humidity.trim() !== '';
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return '농장 정보를 입력해주세요';
      case 2: return '재배 작물을 입력해주세요';
      case 3: return '수정벌 정보를 입력해주세요';
      case 4: return '생산 정보를 입력해주세요';
      case 5: return '환경 데이터를 입력해주세요';
      default: return '';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 2: return '품종은 선택사항입니다';
      default: return '';
    }
  };

  const getAllStepLabels = () => REPORT_STEP_LABELS;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View className="gap-5">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">시설 유형</Text>
              <View className="flex-row gap-3">
                {FACILITY_TYPES.map((type) => (
                  <Pressable
                    key={type.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFacilityType(type.id);
                    }}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 py-4 px-5 rounded-xl border-2 ${
                      facilityType === type.id
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-gray-100 border-transparent'
                    }`}
                  >
                    <Feather
                      name={type.icon}
                      size={18}
                      color={facilityType === type.id ? '#000000' : '#8E8E93'}
                    />
                    <Text
                      className={`text-sm font-medium ${
                        facilityType === type.id ? 'text-black font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">위치</Text>
              <View className="bg-gray-100 rounded-xl px-4">
                <TextInput
                  className="h-14 text-base text-black"
                  value={location}
                  onChangeText={setLocation}
                  placeholder="예: 경상북도 상주시 낙동면"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </View>

            {facilityType === 'farmland' ? (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-gray-500">농지 면적</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                  <TextInput
                    className="flex-1 h-14 text-base text-black"
                    value={farmlandArea}
                    onChangeText={setFarmlandArea}
                    placeholder="0"
                    placeholderTextColor="#C7C7CC"
                    keyboardType="numeric"
                  />
                  <Text className="text-base text-gray-500 ml-2">평</Text>
                </View>
              </View>
            ) : facilityType === 'greenhouse' ? (
              <>
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-gray-500">동 갯수</Text>
                  <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                    <TextInput
                      className="flex-1 h-14 text-base text-black"
                      value={buildingCount}
                      onChangeText={setBuildingCount}
                      placeholder="0"
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numeric"
                    />
                    <Text className="text-base text-gray-500 ml-2">동</Text>
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-gray-500">동당 평수</Text>
                  <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                    <TextInput
                      className="flex-1 h-14 text-base text-black"
                      value={areaPerBuilding}
                      onChangeText={setAreaPerBuilding}
                      placeholder="0"
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numeric"
                    />
                    <Text className="text-base text-gray-500 ml-2">평</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        );

      case 2:
        return (
          <View className="gap-5">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">작물</Text>
              <View className="bg-gray-100 rounded-xl px-4">
                <TextInput
                  className="h-14 text-base text-black"
                  value={cropType}
                  onChangeText={setCropType}
                  placeholder="예: 딸기, 토마토, 고추"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">품종 (선택)</Text>
              <View className="bg-gray-100 rounded-xl px-4">
                <TextInput
                  className="h-14 text-base text-black"
                  value={variety}
                  onChangeText={setVariety}
                  placeholder="품종명을 입력해주세요"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View className="gap-5">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">수정벌 브랜드</Text>
              <View className="flex-row flex-wrap gap-2">
                {BEE_BRANDS.map((brand) => (
                  <Pressable
                    key={brand}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBeeBrand(brand);
                    }}
                    className={`px-4 py-3 rounded-full border-2 ${
                      beeBrand === brand
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-gray-100 border-transparent'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        beeBrand === brand ? 'font-semibold text-black' : 'font-medium text-black'
                      }`}
                    >
                      {brand}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {beeBrand === '기타' && (
                <View className="bg-gray-100 rounded-xl px-4 mt-2">
                  <TextInput
                    className="h-14 text-base text-black"
                    value={customBeeBrand}
                    onChangeText={setCustomBeeBrand}
                    placeholder="브랜드명을 입력해주세요"
                    placeholderTextColor="#C7C7CC"
                  />
                </View>
              )}
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">
                {facilityType === 'farmland' ? '평당 벌통 개수' : '동당 벌통 개수'}
              </Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                <TextInput
                  className="flex-1 h-14 text-base text-black"
                  value={hivesPerBuilding}
                  onChangeText={setHivesPerBuilding}
                  placeholder="0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="numeric"
                />
                <Text className="text-base text-gray-500 ml-2">개</Text>
              </View>
            </View>
          </View>
        );

      case 4:
        return (
          <View className="gap-5">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">교체 주기</Text>
              <View className="bg-gray-100 rounded-xl px-4">
                <TextInput
                  className="h-14 text-base text-black"
                  value={replacementCycle}
                  onChangeText={setReplacementCycle}
                  placeholder="예: 2주, 1개월"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">연간 생산량</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                <TextInput
                  className="flex-1 h-14 text-base text-black"
                  value={annualProduction}
                  onChangeText={setAnnualProduction}
                  placeholder="0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="numeric"
                />
                <Text className="text-base text-gray-500 ml-2">kg</Text>
              </View>
            </View>
          </View>
        );

      case 5:
        return (
          <View className="gap-5">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">온도</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                <TextInput
                  className="flex-1 h-14 text-base text-black"
                  value={temperature}
                  onChangeText={setTemperature}
                  placeholder="0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="numeric"
                />
                <Text className="text-base text-gray-500 ml-2">°C</Text>
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-gray-500">습도</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                <TextInput
                  className="flex-1 h-14 text-base text-black"
                  value={humidity}
                  onChangeText={setHumidity}
                  placeholder="0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="numeric"
                />
                <Text className="text-base text-gray-500 ml-2">%</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 gap-3">
        <Pressable
          onPress={currentStep > 1 ? handlePrev : undefined}
          className="w-11 h-11 items-center justify-center"
        >
          {currentStep > 1 ? (
            <Feather name="arrow-left" size={24} color="#000000" />
          ) : (
            <View style={{ width: 24 }} />
          )}
        </Pressable>

        <View className="flex-1 flex-row items-center gap-2">
          <View className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-yellow-500 rounded-full"
              style={{ width: `${(currentStep / REPORT_TOTAL_STEPS) * 100}%` }}
            />
          </View>
          <Text className="text-sm font-semibold text-gray-500 mr-2">
            {currentStep}/{REPORT_TOTAL_STEPS}
          </Text>
          <Pressable
            onPress={() => setShowStepList(!showStepList)}
            className={`w-7 h-7 rounded-lg items-center justify-center ${
              showStepList ? 'bg-yellow-500' : 'bg-gray-200'
            }`}
          >
            <Feather
              name="list"
              size={14}
              color={showStepList ? '#000000' : '#8E8E93'}
            />
          </Pressable>
        </View>

        <Pressable onPress={handleClose} className="w-11 h-11 items-center justify-center">
          <Feather name="x" size={24} color="#000000" />
        </Pressable>
      </View>

      {/* Step List */}
      {showStepList && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="mx-4 mb-3 bg-white rounded-xl p-3 shadow-lg"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {getAllStepLabels().map((item) => (
            <View
              key={item.step}
              className={`flex-row items-center py-2 gap-2 ${
                currentStep > item.step ? 'opacity-60' : ''
              }`}
            >
              <View
                className={`w-6 h-6 rounded-full items-center justify-center ${
                  currentStep === item.step
                    ? 'bg-yellow-500'
                    : currentStep > item.step
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              >
                {currentStep > item.step ? (
                  <Feather name="check" size={12} color="#FFFFFF" />
                ) : (
                  <Text
                    className={`text-xs font-semibold ${
                      currentStep === item.step ? 'text-black' : 'text-gray-500'
                    }`}
                  >
                    {item.step}
                  </Text>
                )}
              </View>
              <Text
                className={`text-sm ${
                  currentStep === item.step
                    ? 'text-black font-semibold'
                    : 'text-gray-500'
                }`}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View key={currentStep} entering={SlideInRight.duration(250)}>
          <Text className="text-2xl font-bold text-black tracking-tight">
            {getStepTitle()}
          </Text>
          {getStepSubtitle() ? (
            <Text className="text-base text-gray-500 mt-1">{getStepSubtitle()}</Text>
          ) : null}
          <View className="mt-8">{renderStepContent()}</View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View
        className="absolute left-0 right-0 px-5 pt-3 bg-white border-t border-gray-100"
        style={{
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          paddingBottom: isKeyboardVisible ? 12 : insets.bottom + 16,
        }}
      >
        {currentStep === REPORT_TOTAL_STEPS ? (
          <Pressable
            onPress={handleStartDiagnosis}
            disabled={!canProceed() || isLoading}
            className={`h-14 rounded-xl items-center justify-center ${
              canProceed() && !isLoading ? 'bg-yellow-500' : 'bg-gray-200'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text className="text-base font-semibold text-black">진단 시작하기</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={handleNext}
            disabled={!canProceed()}
            className={`h-14 rounded-xl items-center justify-center ${
              canProceed() ? 'bg-yellow-500' : 'bg-gray-200'
            }`}
          >
            <Text className="text-base font-semibold text-black">다음</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

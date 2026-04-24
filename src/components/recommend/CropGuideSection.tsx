import { useState } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCropCategories, useCropGuide } from '@/features/crop-guide';
import { Card } from '@/components/Card';
import { PretendardFont } from '@/components/PretendardFont';
import { DropdownPicker } from './DropdownPicker';
import type { CropGuide, Pollinator } from '@/types/crop-guide';

function triggerHaptic(style: 'light' | 'medium') {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(
      style === 'light'
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
  }
}

export function CropGuideSection() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCropCategories();

  const {
    data: guide,
    isLoading: guideLoading,
    isError: guideError,
    error: guideRawError,
  } = useCropGuide(selectedCategory, selectedCrop, isSubmitted);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedCrop(null);
    setIsSubmitted(false);
    triggerHaptic('light');
  };

  const handleCropChange = (crop: string) => {
    setSelectedCrop(crop);
    setIsSubmitted(false);
    triggerHaptic('light');
  };

  const handleSubmit = () => {
    if (!selectedCategory || !selectedCrop) return;
    triggerHaptic('medium');
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    triggerHaptic('light');
  };

  const categoryOptions = categories?.map((c) => c.category) ?? [];
  const cropOptions =
    categories?.find((c) => c.category === selectedCategory)?.crops ?? [];
  const canSubmit = !!selectedCategory && !!selectedCrop;
  const isNotFound = (guideRawError as any)?.response?.status === 404;

  // ── 카테고리 로딩 ─────────────────────────────────────────────────────────
  if (categoriesLoading) {
    return (
      <Card className="items-center py-12">
        <ActivityIndicator size="large" color="#3B82F6" />
        <PretendardFont weight="regular" style={{ color: '#6B7280', marginTop: 16, fontSize: 14 }}>
          작물 목록을 불러오는 중...
        </PretendardFont>
      </Card>
    );
  }

  // ── 카테고리 로딩 실패 ────────────────────────────────────────────────────
  if (categoriesError) {
    return (
      <Card className="items-center py-12">
        <View className="w-14 h-14 rounded-full bg-red-50 items-center justify-center mb-3">
          <Feather name="wifi-off" size={24} color="#EF4444" />
        </View>
        <PretendardFont weight="bold" style={{ fontSize: 15, color: '#111827', marginBottom: 6 }}>
          목록을 불러오지 못했어요
        </PretendardFont>
        <PretendardFont weight="regular" style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
          {'네트워크 상태를 확인하고\n다시 시도해 주세요'}
        </PretendardFont>
        <Pressable
          onPress={() => refetchCategories()}
          className="bg-blue-600 px-6 py-3 rounded-xl active:bg-blue-700"
        >
          <PretendardFont weight="semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
            다시 시도하기
          </PretendardFont>
        </Pressable>
      </Card>
    );
  }

  // ── 가이드 로딩 ───────────────────────────────────────────────────────────
  if (isSubmitted && guideLoading) {
    return (
      <Card className="items-center py-14">
        <ActivityIndicator size="large" color="#3B82F6" />
        <PretendardFont weight="bold" style={{ fontSize: 16, color: '#1F2937', marginTop: 16 }}>
          정보를 불러오는 중이에요
        </PretendardFont>
        <PretendardFont weight="regular" style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
          잠깐만 기다려 주세요 🐝
        </PretendardFont>
      </Card>
    );
  }

  // ── 가이드 오류 ───────────────────────────────────────────────────────────
  if (isSubmitted && guideError) {
    return (
      <Card className="items-center py-12">
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isNotFound ? '#FFFBEB' : '#FEF2F2',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Feather
            name={isNotFound ? 'search' : 'alert-circle'}
            size={24}
            color={isNotFound ? '#F59E0B' : '#EF4444'}
          />
        </View>
        <PretendardFont weight="bold" style={{ fontSize: 15, color: '#111827', marginBottom: 6 }}>
          {isNotFound ? '해당 작물 가이드를 찾지 못했어요' : '잠시 오류가 생겼어요'}
        </PretendardFont>
        <PretendardFont weight="regular" style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
          {isNotFound
            ? '다른 작물을 선택해 보세요'
            : '네트워크 상태를 확인하고\n다시 시도해 주세요'}
        </PretendardFont>
        <Pressable
          onPress={handleReset}
          className="bg-blue-600 px-6 py-3 rounded-xl active:bg-blue-700"
        >
          <PretendardFont weight="semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
            다른 작물 보기
          </PretendardFont>
        </Pressable>
      </Card>
    );
  }

  // ── 가이드 결과 ───────────────────────────────────────────────────────────
  if (isSubmitted && guide) {
    return <GuideResult guide={guide} onReset={handleReset} />;
  }

  // ── 선택 UI (기본) ────────────────────────────────────────────────────────
  return (
    <View>
      <Card className="mb-4">
        {/* 섹션 헤더 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#ECFDF5',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PretendardFont style={{ fontSize: 20 }}>🌱</PretendardFont>
          </View>
          <View style={{ flex: 1 }}>
            <PretendardFont weight="bold" style={{ fontSize: 16, color: '#111827' }}>
              작물별 수정벌 가이드
            </PretendardFont>
            <PretendardFont weight="regular" style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
              작물을 선택하면 딱 맞는 수정벌 정보를 알려드려요
            </PretendardFont>
          </View>
        </View>

        <DropdownPicker
          label="작물 대분류"
          placeholder="대분류를 선택해주세요"
          value={selectedCategory}
          options={categoryOptions}
          onChange={handleCategoryChange}
        />

        <DropdownPicker
          label="작물명"
          placeholder={
            selectedCategory ? '작물을 선택해주세요' : '먼저 대분류를 선택해주세요'
          }
          value={selectedCrop}
          options={cropOptions}
          onChange={handleCropChange}
          disabled={!selectedCategory}
        />

        {/* 가이드 보기 버튼 */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 52,
            borderRadius: 14,
            marginTop: 8,
            backgroundColor: canSubmit ? '#2563EB' : '#E5E7EB',
          }}
        >
          <PretendardFont
            weight="bold"
            style={{ fontSize: 16, color: canSubmit ? '#FFFFFF' : '#9CA3AF' }}
          >
            가이드 보기
          </PretendardFont>
          {canSubmit && <Feather name="arrow-right" size={18} color="#FFFFFF" />}
        </Pressable>
      </Card>

      {/* 안내 카드 */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#EFF6FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            <Feather name="info" size={14} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <PretendardFont weight="semibold" style={{ fontSize: 13, color: '#1F2937', marginBottom: 6 }}>
              이런 정보를 확인할 수 있어요
            </PretendardFont>
            <PretendardFont weight="regular" style={{ fontSize: 13, color: '#6B7280', lineHeight: 22 }}>
              {'· 작물에 적합한 수분매개곤충 종류\n· 방사 시기 및 권장 수량\n· 단계별 설치 방법\n· 온도·군세·농약 관련 주의사항\n· 수분 효과 및 출처 정보'}
            </PretendardFont>
          </View>
        </View>
      </Card>
    </View>
  );
}

// ── 가이드 결과 ───────────────────────────────────────────────────────────────

function GuideResult({ guide, onReset }: { guide: CropGuide; onReset: () => void }) {
  // API가 배열 필드를 null로 내려주는 경우 방어
  const applicableVarieties = guide.applicableVarieties ?? [];
  const pollinators = guide.pollinators ?? [];
  const colonyManagement = guide.precautions?.colonyManagement ?? [];
  const temperature = guide.precautions?.temperature ?? [];
  const pesticideSafety = guide.precautions?.pesticideSafety ?? [];
  const highlights = guide.effectiveness?.highlights ?? [];
  const source = guide.effectiveness?.source ?? '';

  return (
    <View>
      {/* 헤더 */}
      <Card className="mb-4">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ECFDF5',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PretendardFont style={{ fontSize: 22 }}>🐝</PretendardFont>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                <PretendardFont weight="semibold" style={{ fontSize: 11, color: '#065F46' }}>
                  {guide.category}
                </PretendardFont>
              </View>
            </View>
            <PretendardFont weight="bold" style={{ fontSize: 20, color: '#111827' }}>
              {guide.name}
            </PretendardFont>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#EFF6FF',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Feather name="calendar" size={15} color="#2563EB" />
          <PretendardFont weight="semibold" style={{ fontSize: 13, color: '#1D4ED8' }}>
            적용 시기: {guide.usagePeriod}
          </PretendardFont>
        </View>
      </Card>

      {/* 적용 가능 품종 */}
      {applicableVarieties.length > 0 && (
        <Card className="mb-4">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Feather name="tag" size={15} color="#10B981" />
            <PretendardFont weight="bold" style={{ fontSize: 15, color: '#111827' }}>
              적용 가능 품종
            </PretendardFont>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {applicableVarieties.map((variety, i) => (
              <View
                key={i}
                style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
              >
                <PretendardFont weight="semibold" style={{ fontSize: 13, color: '#065F46' }}>
                  {variety}
                </PretendardFont>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* 수분매개곤충 */}
      {pollinators.length > 0 && (
        <View style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 12 }}>
            <Feather name="zap" size={15} color="#7C3AED" />
            <PretendardFont weight="bold" style={{ fontSize: 15, color: '#111827' }}>
              수분매개곤충
            </PretendardFont>
          </View>
          {pollinators.map((pollinator, i) => (
            <PollinatorCard key={i} pollinator={pollinator} />
          ))}
        </View>
      )}

      {/* 주의사항 */}
      {(colonyManagement.length > 0 || temperature.length > 0 || pesticideSafety.length > 0) && (
        <Card className="mb-4">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Feather name="alert-triangle" size={15} color="#D97706" />
            <PretendardFont weight="bold" style={{ fontSize: 15, color: '#111827' }}>
              주의사항
            </PretendardFont>
          </View>
          {colonyManagement.length > 0 && (
            <PrecautionGroup
              icon="users"
              iconColor="#7C3AED"
              bgColor="#F5F3FF"
              textColor="#5B21B6"
              title="군세 관리"
              items={colonyManagement}
            />
          )}
          {temperature.length > 0 && (
            <PrecautionGroup
              icon="thermometer"
              iconColor="#EA580C"
              bgColor="#FFF7ED"
              textColor="#C2410C"
              title="온도 관리"
              items={temperature}
            />
          )}
          {pesticideSafety.length > 0 && (
            <PrecautionGroup
              icon="shield"
              iconColor="#DC2626"
              bgColor="#FEF2F2"
              textColor="#B91C1C"
              title="농약 안전"
              items={pesticideSafety}
            />
          )}
        </Card>
      )}

      {/* 효과 정보 */}
      {(highlights.length > 0 || source) && (
        <Card className="mb-4">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Feather name="bar-chart-2" size={15} color="#2563EB" />
            <PretendardFont weight="bold" style={{ fontSize: 15, color: '#111827' }}>
              효과 정보
            </PretendardFont>
          </View>
          {highlights.map((highlight, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#2563EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                  marginTop: 1,
                }}
              >
                <PretendardFont weight="bold" style={{ fontSize: 11, color: '#FFFFFF' }}>
                  {i + 1}
                </PretendardFont>
              </View>
              <PretendardFont weight="regular" style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 22 }}>
                {highlight}
              </PretendardFont>
            </View>
          ))}
          {source && (
            <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <PretendardFont weight="regular" style={{ fontSize: 12, color: '#9CA3AF' }}>
                📌 출처: {source}
              </PretendardFont>
            </View>
          )}
        </Card>
      )}

      {/* 다른 작물 보기 */}
      <Card>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 52,
            borderRadius: 14,
            backgroundColor: pressed ? '#E5E7EB' : '#F3F4F6',
          })}
        >
          <Feather name="refresh-cw" size={16} color="#6B7280" />
          <PretendardFont weight="bold" style={{ fontSize: 15, color: '#4B5563' }}>
            다른 작물 가이드 보기
          </PretendardFont>
        </Pressable>
      </Card>
    </View>
  );
}

// ── 수분매개곤충 카드 ─────────────────────────────────────────────────────────

function PollinatorCard({ pollinator }: { pollinator: Pollinator }) {
  const installationSteps = pollinator.installationSteps ?? [];
  return (
    <Card className="mb-3">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#F5F3FF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PretendardFont style={{ fontSize: 16 }}>🐝</PretendardFont>
          </View>
          <PretendardFont weight="bold" style={{ fontSize: 16, color: '#111827' }}>
            {pollinator.insectType}
          </PretendardFont>
        </View>
        <View style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <PretendardFont weight="semibold" style={{ fontSize: 12, color: '#6D28D9' }}>
            {pollinator.durationDays}일 활동
          </PretendardFont>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <InfoRow label="투입 시기" value={pollinator.inputTiming} />
        <InfoRow label="방사량" value={pollinator.releaseQuantity} />
        {installationSteps.length > 0 && (
          <View>
            <PretendardFont weight="semibold" style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
              설치 방법
            </PretendardFont>
            <View style={{ gap: 8 }}>
              {installationSteps.map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#DBEAFE',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      marginTop: 2,
                    }}
                  >
                    <PretendardFont weight="bold" style={{ fontSize: 11, color: '#1D4ED8' }}>
                      {i + 1}
                    </PretendardFont>
                  </View>
                  <PretendardFont weight="regular" style={{ flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 }}>
                    {step}
                  </PretendardFont>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <PretendardFont weight="semibold" style={{ width: 68, fontSize: 12, color: '#9CA3AF' }}>
        {label}
      </PretendardFont>
      <PretendardFont weight="regular" style={{ flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 }}>
        {value}
      </PretendardFont>
    </View>
  );
}

// ── 주의사항 그룹 ─────────────────────────────────────────────────────────────

function PrecautionGroup({
  icon,
  iconColor,
  bgColor,
  textColor,
  title,
  items,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor: string;
  bgColor: string;
  textColor: string;
  title: string;
  items: string[];
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: bgColor,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          marginBottom: 10,
        }}
      >
        <Feather name={icon} size={13} color={iconColor} />
        <PretendardFont weight="bold" style={{ fontSize: 13, color: textColor }}>
          {title}
        </PretendardFont>
      </View>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8, marginBottom: 8 }}>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: '#9CA3AF',
              marginRight: 10,
              marginTop: 8,
            }}
          />
          <PretendardFont weight="regular" style={{ flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 20 }}>
            {item}
          </PretendardFont>
        </View>
      ))}
    </View>
  );
}

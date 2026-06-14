import { useState } from 'react';
import { View, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCropCategories, useCropGuide } from '@/features/crop-guide';
import { Card } from '@/components/hive/hive-shared';
import { PageTitle } from '@/components/PageTitle';
import { PretendardFont } from '@/components/PretendardFont';
import { FilterDropdown } from '@/components/FilterDropdown';
import { C } from '@/constants/hive-colors';
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

// ── 섹션 헤더 (얇은 액센트 바 + 제목) — 미니멀 ─────────────────────────────────
function SectionHeader({
  title,
  accent = C.primary,
}: {
  title: string;
  accent?: string;
}) {
  return (
    <View className="flex-row items-center" style={{ gap: 9, marginBottom: 16 }}>
      <View
        style={{ width: 3.5, height: 16, borderRadius: 2, backgroundColor: accent }}
      />
      <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
        {title}
      </PretendardFont>
    </View>
  );
}

// ── 라벨 + 공용 FilterDropdown 묶음 ────────────────────────────────────────────
function LabeledDropdown({
  label,
  placeholder,
  value,
  options,
  onSelect,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 13.5, color: C.textAlt, marginBottom: 7 }}
      >
        {label}
      </PretendardFont>
      <FilterDropdown
        label={label}
        placeholder={placeholder}
        value={value ?? ''}
        options={options}
        onSelect={onSelect}
        disabled={disabled}
      />
    </View>
  );
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
      <Card className="items-center" style={{ paddingVertical: 48 }}>
        <ActivityIndicator size="large" color={C.primary} />
        <PretendardFont style={{ color: C.sec, marginTop: 14, fontSize: 14 }}>
          작물 목록을 불러오는 중...
        </PretendardFont>
      </Card>
    );
  }

  // ── 카테고리 로딩 실패 ────────────────────────────────────────────────────
  if (categoriesError) {
    return (
      <Card className="items-center" style={{ paddingVertical: 44 }}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#FEF2F2',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Feather name="wifi-off" size={26} color={C.error} />
        </View>
        <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text, marginBottom: 6 }}>
          목록을 불러오지 못했어요
        </PretendardFont>
        <PretendardFont
          style={{ fontSize: 13, color: C.sec, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}
        >
          {'네트워크 상태를 확인하고\n다시 시도해 주세요'}
        </PretendardFont>
        <Pressable
          onPress={() => refetchCategories()}
          className="active:opacity-90"
          style={{ backgroundColor: C.primary, paddingHorizontal: 24, height: 48, borderRadius: 14, justifyContent: 'center' }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
            다시 시도하기
          </PretendardFont>
        </Pressable>
      </Card>
    );
  }

  // ── 가이드 로딩 ───────────────────────────────────────────────────────────
  if (isSubmitted && guideLoading) {
    return (
      <Card className="items-center" style={{ paddingVertical: 52 }}>
        <ActivityIndicator size="large" color={C.primary} />
        <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text, marginTop: 16 }}>
          정보를 불러오는 중이에요
        </PretendardFont>
        <PretendardFont style={{ fontSize: 13, color: C.ter, marginTop: 4 }}>
          잠깐만 기다려 주세요
        </PretendardFont>
      </Card>
    );
  }

  // ── 가이드 오류 ───────────────────────────────────────────────────────────
  if (isSubmitted && guideError) {
    return (
      <Card className="items-center" style={{ paddingVertical: 44 }}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: isNotFound ? '#FFFBEB' : '#FEF2F2',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Feather
            name={isNotFound ? 'search' : 'alert-circle'}
            size={26}
            color={isNotFound ? C.warning : C.error}
          />
        </View>
        <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text, marginBottom: 6 }}>
          {isNotFound ? '해당 작물 가이드를 찾지 못했어요' : '잠시 오류가 생겼어요'}
        </PretendardFont>
        <PretendardFont
          style={{ fontSize: 13, color: C.sec, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}
        >
          {isNotFound ? '다른 작물을 선택해 보세요' : '네트워크 상태를 확인하고\n다시 시도해 주세요'}
        </PretendardFont>
        <Pressable
          onPress={handleReset}
          className="active:opacity-90"
          style={{ backgroundColor: C.primary, paddingHorizontal: 24, height: 48, borderRadius: 14, justifyContent: 'center' }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
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
    <>
      <PageTitle
        title={'작물별\n수정벌 가이드'}
        subtitle="작물을 선택하면 딱 맞는 수정벌 정보를 알려드려요"
      />

      <Card>
        <SectionHeader title="작물 선택" accent={C.success} />

        <LabeledDropdown
          label="작물 대분류"
          placeholder="대분류를 선택해주세요"
          value={selectedCategory}
          options={categoryOptions}
          onSelect={handleCategoryChange}
        />

        <LabeledDropdown
          label="작물명"
          placeholder={selectedCategory ? '작물을 선택해주세요' : '먼저 대분류를 선택해주세요'}
          value={selectedCrop}
          options={cropOptions}
          onSelect={handleCropChange}
          disabled={!selectedCategory}
        />

        {/* 가이드 보기 버튼 */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="flex-row items-center justify-center active:opacity-90"
          style={{
            gap: 8,
            height: 52,
            borderRadius: 14,
            marginTop: 4,
            backgroundColor: canSubmit ? C.primary : C.border,
          }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 16, color: canSubmit ? C.white : C.ter }}>
            가이드 보기
          </PretendardFont>
          {canSubmit && <Feather name="arrow-right" size={18} color={C.white} />}
        </Pressable>
      </Card>

      {/* 안내 카드 */}
      <Card>
        <View className="flex-row items-start" style={{ gap: 12 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: C.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            <Feather name="info" size={15} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text, marginBottom: 7 }}>
              이런 정보를 확인할 수 있어요
            </PretendardFont>
            <PretendardFont style={{ fontSize: 13.5, color: C.textAlt, lineHeight: 23 }}>
              {'· 작물에 적합한 수분매개곤충 종류\n· 방사 시기 및 권장 수량\n· 단계별 설치 방법\n· 온도·군세·농약 관련 주의사항\n· 수분 효과 및 출처 정보'}
            </PretendardFont>
          </View>
        </View>
      </Card>
    </>
  );
}

// ── 가이드 결과 ───────────────────────────────────────────────────────────────

function GuideResult({ guide, onReset }: { guide: CropGuide; onReset: () => void }) {
  const applicableVarieties = guide.applicableVarieties ?? [];
  const pollinators = guide.pollinators ?? [];
  const colonyManagement = guide.precautions?.colonyManagement ?? [];
  const temperature = guide.precautions?.temperature ?? [];
  const pesticideSafety = guide.precautions?.pesticideSafety ?? [];
  const highlights = guide.effectiveness?.highlights ?? [];
  const source = guide.effectiveness?.source ?? '';

  return (
    <>
      <PageTitle title="작물 가이드" subtitle={`${guide.name} 수정벌 정보를 확인하세요`} />

      {/* 헤더 */}
      <Card>
        <View className="flex-row items-center" style={{ marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#D1FAE5',
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: 20,
                marginBottom: 5,
              }}
            >
              <PretendardFont weight="semibold" style={{ fontSize: 11, color: '#065F46' }}>
                {guide.category}
              </PretendardFont>
            </View>
            <PretendardFont weight="bold" style={{ fontSize: 22, color: C.text }}>
              {guide.name}
            </PretendardFont>
          </View>
        </View>
        <View
          className="flex-row items-center"
          style={{
            gap: 8,
            backgroundColor: C.primarySoft,
            paddingHorizontal: 16,
            paddingVertical: 13,
            borderRadius: 14,
          }}
        >
          <Feather name="calendar" size={15} color={C.primary} />
          <PretendardFont weight="semibold" style={{ fontSize: 13.5, color: C.text }}>
            적용 시기: {guide.usagePeriod}
          </PretendardFont>
        </View>
      </Card>

      {/* 적용 가능 품종 */}
      {applicableVarieties.length > 0 && (
        <Card>
          <SectionHeader title="적용 가능 품종" accent={C.success} />
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {applicableVarieties.map((variety, i) => (
              <View
                key={i}
                style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20 }}
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
        <View>
          <View className="flex-row items-center" style={{ gap: 8, paddingHorizontal: 4, marginBottom: 12 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: '#F5F3FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="zap" size={15} color="#7C3AED" />
            </View>
            <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
              수분매개곤충
            </PretendardFont>
          </View>
          {pollinators.map((pollinator, i) => (
            <PollinatorCard key={i} pollinator={pollinator} last={i === pollinators.length - 1} />
          ))}
        </View>
      )}

      {/* 주의사항 */}
      {(colonyManagement.length > 0 || temperature.length > 0 || pesticideSafety.length > 0) && (
        <Card>
          <SectionHeader title="주의사항" accent={C.warning} />
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
              iconColor={C.error}
              bgColor="#FEF2F2"
              textColor="#B91C1C"
              title="농약 안전"
              items={pesticideSafety}
              last
            />
          )}
        </Card>
      )}

      {/* 효과 정보 */}
      {(highlights.length > 0 || source) && (
        <Card>
          <SectionHeader title="효과 정보" accent={C.chartHumidity} />
          {highlights.map((highlight, i) => (
            <View key={i} className="flex-row items-start" style={{ gap: 10, marginBottom: 12 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: C.chartHumidity,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                <PretendardFont weight="bold" style={{ fontSize: 11, color: C.white }}>
                  {i + 1}
                </PretendardFont>
              </View>
              <PretendardFont style={{ flex: 1, fontSize: 15, color: C.text, lineHeight: 23 }}>
                {highlight}
              </PretendardFont>
            </View>
          ))}
          {source && (
            <View style={{ marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
              <PretendardFont style={{ fontSize: 12, color: C.ter }}>
                출처: {source}
              </PretendardFont>
            </View>
          )}
        </Card>
      )}

      {/* 다른 작물 보기 */}
      <Pressable
        onPress={onReset}
        className="flex-row items-center justify-center active:opacity-90"
        style={{
          gap: 8,
          height: 52,
          borderRadius: 14,
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Feather name="refresh-cw" size={16} color={C.sec} />
        <PretendardFont weight="bold" style={{ fontSize: 15, color: C.textAlt }}>
          다른 작물 가이드 보기
        </PretendardFont>
      </Pressable>
    </>
  );
}

// ── 수분매개곤충 카드 ─────────────────────────────────────────────────────────

function PollinatorCard({ pollinator, last }: { pollinator: Pollinator; last?: boolean }) {
  const installationSteps = pollinator.installationSteps ?? [];
  return (
    <Card style={{ marginBottom: last ? 0 : 12 }}>
      <View
        className="flex-row items-center justify-between"
        style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border }}
      >
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: '#F5F3FF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="zap" size={17} color="#7C3AED" />
          </View>
          <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
            {pollinator.insectType}
          </PretendardFont>
        </View>
        <View style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 }}>
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
            <PretendardFont weight="semibold" style={{ fontSize: 12.5, color: C.sec, marginBottom: 8 }}>
              설치 방법
            </PretendardFont>
            <View style={{ gap: 8 }}>
              {installationSteps.map((step, i) => (
                <View key={i} className="flex-row items-start" style={{ gap: 10 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: C.infoBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    <PretendardFont weight="bold" style={{ fontSize: 11, color: C.chartHumidity }}>
                      {i + 1}
                    </PretendardFont>
                  </View>
                  <PretendardFont style={{ flex: 1, fontSize: 14.5, color: C.text, lineHeight: 22 }}>
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
    <View className="flex-row items-start">
      <PretendardFont weight="semibold" style={{ width: 72, fontSize: 12.5, color: C.sec }}>
        {label}
      </PretendardFont>
      <PretendardFont style={{ flex: 1, fontSize: 14.5, color: C.text, lineHeight: 22 }}>
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
  last,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor: string;
  bgColor: string;
  textColor: string;
  title: string;
  items: string[];
  last?: boolean;
}) {
  return (
    <View style={{ marginBottom: last ? 0 : 16 }}>
      <View
        className="flex-row items-center"
        style={{ gap: 6, backgroundColor: bgColor, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 10 }}
      >
        <Feather name={icon} size={13} color={iconColor} />
        <PretendardFont weight="bold" style={{ fontSize: 13, color: textColor }}>
          {title}
        </PretendardFont>
      </View>
      {items.map((item, i) => (
        <View key={i} className="flex-row items-start" style={{ gap: 10, paddingHorizontal: 8, marginBottom: 8 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.ter, marginTop: 8 }} />
          <PretendardFont style={{ flex: 1, fontSize: 14.5, color: C.text, lineHeight: 22 }}>
            {item}
          </PretendardFont>
        </View>
      ))}
    </View>
  );
}

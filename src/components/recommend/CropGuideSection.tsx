/**
 * 작물별 수정벌 가이드
 * - 흰 면 위에 글자 위계(제목/본문/보조)만으로 정보를 나눕니다. 색 배지·아이콘 타일은 쓰지 않습니다.
 * - 색은 오류처럼 상태를 알릴 때만 씁니다.
 */
import { useState } from "react";
import { View, Pressable, ActivityIndicator, Platform } from "react-native";
import * as Haptics from "@/lib/haptics";
import { useCropCategories, useCropGuide } from "@/features/crop-guide";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { FilterDropdown } from "@/components/FilterDropdown";
import { C } from "@/constants/hive-colors";
import type { CropGuide, Pollinator } from "@/types/crop-guide";

function triggerHaptic(style: "light" | "medium") {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(
      style === "light"
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
  }
}

function SectionHeader({ title }: { title: string }) {
  return (
    <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text, marginBottom: 12 }}>
      {title}
    </PretendardFont>
  );
}

/** 카드 하나로 끝나는 상태(로딩·오류·결과 없음) */
function StatusCard({
  title,
  message,
  action,
  loading = false,
}: {
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  loading?: boolean;
}) {
  return (
    <Card className="items-center" style={{ paddingVertical: 32 }}>
      {loading ? <ActivityIndicator color={C.sec} style={{ marginBottom: 12 }} /> : null}
      <PretendardFont weight="semibold" style={{ fontSize: 15, color: C.text }}>
        {title}
      </PretendardFont>
      {message ? (
        <PretendardFont style={{ fontSize: 13, color: C.sec, textAlign: "center", lineHeight: 20, marginTop: 4 }}>
          {message}
        </PretendardFont>
      ) : null}
      {action ? (
        <Pressable
          onPress={action.onPress}
          className="mt-4 h-10 justify-center rounded-lg px-4 active:opacity-80"
          style={{ backgroundColor: C.bgAlt }}
        >
          <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.text }}>
            {action.label}
          </PretendardFont>
        </Pressable>
      ) : null}
    </Card>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const fg = disabled ? C.ter : secondary ? C.text : C.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="h-12 items-center justify-center rounded-lg active:opacity-80"
      style={{ backgroundColor: disabled ? C.border : secondary ? C.white : C.primary }}
    >
      <PretendardFont weight="semibold" style={{ fontSize: 15, color: fg }}>
        {label}
      </PretendardFont>
    </Pressable>
  );
}

export function CropGuideSection({
  isAuthenticated = true,
  onRequireLogin,
}: {
  isAuthenticated?: boolean;
  onRequireLogin?: () => void;
}) {
  if (!isAuthenticated) {
    return <GuestCropGuideSection onRequireLogin={onRequireLogin} />;
  }

  return <MemberCropGuideSection />;
}

function GuestCropGuideSection({
  onRequireLogin,
}: {
  onRequireLogin?: () => void;
}) {
  const handleRequireLogin = () => {
    triggerHaptic("light");
    onRequireLogin?.();
  };

  return (
    <>
      <Card>
        <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
          로그인하면 작물별 가이드를 볼 수 있어요
        </PretendardFont>
        <PretendardFont style={{ fontSize: 14, color: C.textAlt, lineHeight: 22, marginTop: 8 }}>
          {"적합한 수정벌 · 방사 시기와 수량\n설치 방법 · 온도·군세·농약 주의사항"}
        </PretendardFont>

        {/* 예시 미리보기: 실제 결과와 같은 글자 위계로만 보여줍니다. */}
        <Pressable onPress={handleRequireLogin} className="mt-4 active:opacity-80">
          <View className="rounded-lg px-3.5 py-3" style={{ backgroundColor: C.bgAlt }}>
            <View className="flex-row items-baseline justify-between">
              <PretendardFont weight="bold" style={{ fontSize: 15, color: C.text }}>
                딸기
              </PretendardFont>
              <PretendardFont style={{ fontSize: 12, color: C.ter }}>예시</PretendardFont>
            </View>
            <PretendardFont style={{ fontSize: 13, color: C.sec, marginTop: 2 }}>
              개화기 전후 투입 · 농약 살포 전 확인
            </PretendardFont>
          </View>
        </Pressable>
      </Card>

      <PrimaryButton label="로그인하고 가이드 보기" onPress={handleRequireLogin} />
    </>
  );
}

function MemberCropGuideSection() {
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
    triggerHaptic("light");
  };

  const handleCropChange = (crop: string) => {
    setSelectedCrop(crop);
    setIsSubmitted(false);
    triggerHaptic("light");
  };

  const handleSubmit = () => {
    if (!selectedCategory || !selectedCrop) return;
    triggerHaptic("medium");
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    triggerHaptic("light");
  };

  const categoryOptions = categories?.map((c) => c.category) ?? [];
  const cropOptions =
    categories?.find((c) => c.category === selectedCategory)?.crops ?? [];
  const canSubmit = !!selectedCategory && !!selectedCrop;
  const isNotFound = (guideRawError as any)?.response?.status === 404;

  if (categoriesLoading) {
    return <StatusCard loading title="작물 목록을 불러오는 중이에요" />;
  }

  if (categoriesError) {
    return (
      <StatusCard
        title="목록을 불러오지 못했어요"
        message="네트워크 상태를 확인해 주세요"
        action={{ label: "다시 시도", onPress: () => refetchCategories() }}
      />
    );
  }

  if (isSubmitted && guideLoading) {
    return <StatusCard loading title="가이드를 불러오는 중이에요" />;
  }

  if (isSubmitted && guideError) {
    return (
      <StatusCard
        title={isNotFound ? "이 작물의 가이드가 아직 없어요" : "잠시 오류가 생겼어요"}
        message={isNotFound ? "다른 작물을 골라 보세요" : "네트워크 상태를 확인해 주세요"}
        action={{ label: "다른 작물 보기", onPress: handleReset }}
      />
    );
  }

  if (isSubmitted && guide) {
    return <GuideResult guide={guide} onReset={handleReset} />;
  }

  return (
    <Card>
      <SectionHeader title="작물 선택" />
      <View style={{ gap: 8 }}>
        <FilterDropdown
          label="작물 대분류"
          placeholder="대분류"
          value={selectedCategory ?? ""}
          options={categoryOptions}
          onSelect={handleCategoryChange}
        />
        <FilterDropdown
          label="작물명"
          placeholder={selectedCategory ? "작물" : "대분류를 먼저 고르세요"}
          value={selectedCrop ?? ""}
          options={cropOptions}
          onSelect={handleCropChange}
          disabled={!selectedCategory}
        />
      </View>
      <View style={{ marginTop: 12 }}>
        <PrimaryButton label="가이드 보기" onPress={handleSubmit} disabled={!canSubmit} />
      </View>
    </Card>
  );
}

function GuideResult({ guide, onReset }: { guide: CropGuide; onReset: () => void }) {
  const applicableVarieties = guide.applicableVarieties ?? [];
  const pollinators = guide.pollinators ?? [];
  const colonyManagement = guide.precautions?.colonyManagement ?? [];
  const temperature = guide.precautions?.temperature ?? [];
  const pesticideSafety = guide.precautions?.pesticideSafety ?? [];
  const highlights = guide.effectiveness?.highlights ?? [];
  const source = guide.effectiveness?.source ?? "";

  return (
    <>
      <Card>
        <PretendardFont style={{ fontSize: 13, color: C.sec }}>{guide.category}</PretendardFont>
        <PretendardFont weight="bold" style={{ fontSize: 20, color: C.text, marginTop: 2 }}>
          {guide.name}
        </PretendardFont>
        <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: C.bg }}>
          <InfoRow label="적용 시기" value={guide.usagePeriod} />
          {applicableVarieties.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <InfoRow label="적용 품종" value={applicableVarieties.join(", ")} />
            </View>
          )}
        </View>
      </Card>

      {pollinators.map((pollinator, i) => (
        <PollinatorCard key={i} pollinator={pollinator} />
      ))}

      {(colonyManagement.length > 0 || temperature.length > 0 || pesticideSafety.length > 0) && (
        <Card>
          <SectionHeader title="주의사항" />
          {colonyManagement.length > 0 && <PrecautionGroup title="군세 관리" items={colonyManagement} />}
          {temperature.length > 0 && <PrecautionGroup title="온도 관리" items={temperature} />}
          {pesticideSafety.length > 0 && <PrecautionGroup title="농약 안전" items={pesticideSafety} last />}
        </Card>
      )}

      {(highlights.length > 0 || source) && (
        <Card>
          <SectionHeader title="효과" />
          <BulletList items={highlights} />
          {source ? (
            <PretendardFont style={{ fontSize: 12, color: C.ter, marginTop: 10 }}>
              출처: {source}
            </PretendardFont>
          ) : null}
        </Card>
      )}

      <PrimaryButton label="다른 작물 가이드 보기" onPress={onReset} secondary />
    </>
  );
}

function PollinatorCard({ pollinator }: { pollinator: Pollinator }) {
  const installationSteps = pollinator.installationSteps ?? [];
  return (
    <Card>
      <View className="flex-row items-baseline justify-between" style={{ marginBottom: 12 }}>
        <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
          {pollinator.insectType}
        </PretendardFont>
        <PretendardFont style={{ fontSize: 13, color: C.sec }}>
          {pollinator.durationDays}일 활동
        </PretendardFont>
      </View>

      <View style={{ gap: 8 }}>
        <InfoRow label="투입 시기" value={pollinator.inputTiming} />
        <InfoRow label="방사량" value={pollinator.releaseQuantity} />
      </View>
      {installationSteps.length > 0 && (
        <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: C.bg }}>
          <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.sec, marginBottom: 6 }}>
            설치 방법
          </PretendardFont>
          {installationSteps.map((step, i) => (
            <View key={i} className="flex-row items-start" style={{ gap: 8, marginBottom: 6 }}>
              <PretendardFont
                weight="semibold"
                style={{ width: 16, fontSize: 14, color: C.sec, lineHeight: 22, fontVariant: ["tabular-nums"] }}
              >
                {i + 1}
              </PretendardFont>
              <PretendardFont style={{ flex: 1, fontSize: 14.5, color: C.text, lineHeight: 22 }}>
                {step}
              </PretendardFont>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start">
      <PretendardFont style={{ width: 72, fontSize: 13, color: C.sec, lineHeight: 22 }}>
        {label}
      </PretendardFont>
      <PretendardFont style={{ flex: 1, fontSize: 14.5, color: C.text, lineHeight: 22 }}>
        {value}
      </PretendardFont>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <View key={i} className="flex-row items-start" style={{ gap: 8, marginBottom: 6 }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.ter, marginTop: 9 }} />
          <PretendardFont style={{ flex: 1, fontSize: 14.5, color: C.text, lineHeight: 22 }}>
            {item}
          </PretendardFont>
        </View>
      ))}
    </>
  );
}

function PrecautionGroup({
  title,
  items,
  last,
}: {
  title: string;
  items: string[];
  last?: boolean;
}) {
  return (
    <View style={{ marginBottom: last ? 0 : 12 }}>
      <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.sec, marginBottom: 6 }}>
        {title}
      </PretendardFont>
      <BulletList items={items} />
    </View>
  );
}

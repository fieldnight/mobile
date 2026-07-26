import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import AppHeader from "@/components/AppHeader";
import { BottomSheet } from "@/components/BottomSheet";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { HEADER_HEIGHT, useScrollHeader } from "@/hooks";

const STAGES = [
  { value: "S1", label: "새로 심었어요", helper: "뿌리를 내리는 중" },
  { value: "S2", label: "잎과 포기가 커져요", helper: "꽃 피기 전" },
  { value: "S3", label: "꽃이 피고 있어요", helper: "벌이 다니는 시기" },
  { value: "S4", label: "작은 열매가 맺혔어요", helper: "착과가 진행 중" },
  { value: "S5", label: "열매가 커지고 있어요", helper: "색이 들기 시작함" },
  { value: "S6", label: "수확하고 있어요", helper: "출하가 진행 중" },
];

const AREA_OPTIONS = [
  { value: "under100", label: "100평 미만", numeric: 250 },
  { value: "100to300", label: "100~300평", numeric: 660 },
  { value: "300to600", label: "300~600평", numeric: 1485 },
  { value: "600to1000", label: "600~1,000평", numeric: 2645 },
  { value: "over1000", label: "1,000평 이상", numeric: 3960 },
  { value: "unknown", label: "잘 모르겠어요", numeric: 660 },
];

const GROWTH_OPTIONS = [
  {
    value: "slow",
    label: "조금 느린 편",
    helper: "자가평가 0~44점 · 최근 7일 변화가 주변보다 적음",
    score: 35,
    rangeLabel: "0~44점",
  },
  {
    value: "similar",
    label: "비슷한 편",
    helper: "자가평가 45~64점 · 최근 7일 변화가 주변과 비슷",
    score: 55,
    rangeLabel: "45~64점",
  },
  {
    value: "good",
    label: "잘 자라는 편",
    helper: "자가평가 65~100점 · 최근 7일 변화가 주변보다 큼",
    score: 75,
    rangeLabel: "65~100점",
  },
  {
    value: "unknown",
    label: "잘 모르겠어요",
    helper: "점수에서 제외 · 억지로 고르지 않아도 됨",
    score: 50,
    rangeLabel: "측정하지 않음",
  },
];

const DAY_TEMP_OPTIONS = [
  { value: "under20", label: "20℃ 이하", numeric: 19 },
  { value: "21to24", label: "21~24℃", numeric: 23 },
  { value: "25to28", label: "25~28℃", numeric: 26.5 },
  { value: "over29", label: "29℃ 이상", numeric: 30 },
  { value: "unknown", label: "잘 모르겠어요", numeric: 25 },
];

const NIGHT_TEMP_OPTIONS = [
  { value: "under5", label: "5℃ 미만", numeric: 4 },
  { value: "5to9", label: "5~9℃", numeric: 7 },
  { value: "10to14", label: "10~14℃", numeric: 12 },
  { value: "over15", label: "15℃ 이상", numeric: 17 },
  { value: "unknown", label: "잘 모르겠어요", numeric: 10 },
];

const HUMIDITY_OPTIONS = [
  {
    value: "dry",
    label: "건조한 편",
    helper: "최근 7일 낮 평균 50% 미만",
    day: 45,
    night: 60,
  },
  {
    value: "normal",
    label: "대체로 보통",
    helper: "최근 7일 낮 평균 50~70%",
    day: 60,
    night: 78,
  },
  {
    value: "humid",
    label: "습한 편",
    helper: "최근 7일 낮 평균 71~85%",
    day: 78,
    night: 90,
  },
  {
    value: "veryHumid",
    label: "매우 습한 편",
    helper: "최근 7일 낮 평균 86% 이상",
    day: 90,
    night: 96,
  },
  {
    value: "unknown",
    label: "잘 모르겠어요",
    helper: "온습도 기록이 없어도 괜찮아요",
    day: 65,
    night: 80,
  },
];

const HARVEST_PERIOD_OPTIONS = [
  { value: "notStarted", label: "아직 출하 전", days: 0 },
  { value: "within2w", label: "시작한 지 2주 안", days: 10 },
  { value: "2to4w", label: "2~4주 정도", days: 21 },
  { value: "1to2m", label: "1~2개월 정도", days: 45 },
  { value: "over2m", label: "2개월 이상", days: 75 },
  { value: "unknown", label: "잘 모르겠어요", days: 30 },
];

const WEEKLY_SHIPMENT_OPTIONS = [
  { value: "none", label: "아직 없음", helper: "출하 전이에요", numeric: 0 },
  {
    value: "under100",
    label: "100kg 미만",
    helper: "2kg 상자 약 50개 미만",
    numeric: 60,
  },
  {
    value: "100to300",
    label: "100~300kg",
    helper: "2kg 상자 약 50~150개",
    numeric: 200,
  },
  {
    value: "300to600",
    label: "300~600kg",
    helper: "2kg 상자 약 150~300개",
    numeric: 450,
  },
  {
    value: "over600",
    label: "600kg 이상",
    helper: "정확하지 않아도 괜찮아요",
    numeric: 750,
  },
  {
    value: "unknown",
    label: "잘 모르겠어요",
    helper: "생산량 예측 범위가 넓어져요",
    numeric: 180,
  },
];

const SHIPMENT_TREND_OPTIONS = [
  {
    value: "down",
    label: "지난주보다 줄었어요",
    helper: "직전 7일보다 10% 이상 감소",
  },
  {
    value: "same",
    label: "지난주와 비슷해요",
    helper: "직전 7일 대비 -10~+10%",
  },
  {
    value: "up",
    label: "지난주보다 늘었어요",
    helper: "직전 7일보다 10% 이상 증가",
  },
  {
    value: "unknown",
    label: "잘 모르겠어요",
    helper: "비교할 직전 7일 기록 없음",
  },
];

const HIVE_COUNT_OPTIONS = [
  { value: "one", label: "1통", numeric: 1 },
  { value: "two", label: "2통", numeric: 2 },
  { value: "threePlus", label: "3통 이상", numeric: 3 },
  { value: "unknown", label: "잘 모르겠어요", numeric: 1 },
];

const BEE_COVERAGE_AREA_OPTIONS = [
  {
    value: "sameAsFarm",
    label: "농장 전체와 같아요",
    helper: "1단계에서 고른 재배면적을 사용",
    numeric: null,
  },
  {
    value: "under100",
    label: "100평 미만",
    helper: "호박벌이 실제 다니는 하우스 면적",
    numeric: 250,
  },
  {
    value: "100to300",
    label: "100~300평",
    helper: "계산용 대표값 약 200평",
    numeric: 660,
  },
  {
    value: "300to600",
    label: "300~600평",
    helper: "계산용 대표값 약 450평",
    numeric: 1485,
  },
  {
    value: "600to1000",
    label: "600~1,000평",
    helper: "계산용 대표값 약 800평",
    numeric: 2645,
  },
  {
    value: "over1000",
    label: "1,000평 이상",
    helper: "계산용 대표값 약 1,200평",
    numeric: 3960,
  },
  {
    value: "unknown",
    label: "잘 모르겠어요",
    helper: "농장 전체 면적으로 대신 계산",
    numeric: null,
  },
];

const WORKER_COUNT_OPTIONS = [
  {
    value: "under60",
    label: "60마리 미만",
    helper: "판매처·제품 표기 기준",
    numeric: 45,
  },
  {
    value: "60to79",
    label: "60~79마리",
    helper: "판매처·제품 표기 기준",
    numeric: 70,
  },
  {
    value: "80to120",
    label: "80~120마리",
    helper: "v1 참고범위의 중심",
    numeric: 100,
  },
  {
    value: "over120",
    label: "120마리 이상",
    helper: "꽃 수와 함께 과밀 여부 확인",
    numeric: 140,
  },
  {
    value: "unknown",
    label: "잘 모르겠어요",
    helper: "판매처 안내서에서 확인 가능",
    numeric: 80,
  },
];

const HIVE_AGE_OPTIONS = [
  {
    value: "within2w",
    label: "들인 지 2주 안",
    helper: "0~14일",
    days: 10,
  },
  {
    value: "2to4w",
    label: "2~4주 정도",
    helper: "15~28일",
    days: 21,
  },
  {
    value: "1to2m",
    label: "1~2개월 정도",
    helper: "29~59일 · 45일부터 교체 점검",
    days: 45,
  },
  {
    value: "over2m",
    label: "2개월 이상",
    helper: "60일 이상 · 활력·교체 우선 점검",
    days: 75,
  },
  {
    value: "unknown",
    label: "잘 모르겠어요",
    helper: "설치일 기록 없음",
    days: 42,
  },
];

const BEE_TRAFFIC_OPTIONS = [
  {
    value: "low",
    label: "5분에 0~2마리",
    helper: "v1 활력 점검 기준 이하",
    numeric: 1,
  },
  {
    value: "middle",
    label: "5분에 3~5마리",
    helper: "기준 관찰 범위",
    numeric: 4,
  },
  {
    value: "active",
    label: "5분에 6마리 이상",
    helper: "꽃 수와 과방문 여부도 함께 확인",
    numeric: 8,
  },
  {
    value: "unknown",
    label: "관찰하지 못했어요",
    helper: "맑은 날 오전 9~11시에 다시 관찰",
    numeric: 3,
  },
];

const MIDDAY_BEE_OPTIONS = [
  {
    value: "none",
    label: "10분에 0마리",
    helper: "시간당 환산 0마리",
    numeric: 0,
  },
  {
    value: "one",
    label: "10분에 1마리",
    helper: "시간당 환산 약 6마리",
    numeric: 1,
  },
  {
    value: "twoToThree",
    label: "10분에 2~3마리",
    helper: "시간당 환산 약 12~18마리",
    numeric: 2.5,
  },
  {
    value: "fourPlus",
    label: "10분에 4마리 이상",
    helper: "시간당 환산 약 24마리 이상",
    numeric: 4,
  },
  {
    value: "unknown",
    label: "관찰하지 못했어요",
    helper: "낮 11~14시에 꽃 위 벌을 관찰",
    numeric: 0,
  },
];

const OPEN_FLOWER_OPTIONS = [
  {
    value: "under10",
    label: "1㎡에 10송이 미만",
    helper: "대표 지점 3곳의 평균",
    numeric: 7,
  },
  {
    value: "10to24",
    label: "1㎡에 10~24송이",
    helper: "대표 지점 3곳의 평균",
    numeric: 17,
  },
  {
    value: "25to35",
    label: "1㎡에 25~35송이",
    helper: "상업용 벌통 문헌 참고구간",
    numeric: 30,
  },
  {
    value: "over35",
    label: "1㎡에 36송이 이상",
    helper: "대표 지점 3곳의 평균",
    numeric: 40,
  },
  {
    value: "unknown",
    label: "세어보지 못했어요",
    helper: "1m×1m 구역 세 곳만 대략 세기",
    numeric: 25,
  },
];

const PESTICIDE_SAFETY_OPTIONS = [
  {
    value: "none7d",
    label: "최근 7일 살포 안 함",
    helper: "호박벌 노출 위험 낮음",
  },
  {
    value: "waitPassed",
    label: "제품의 대기시간이 지남",
    helper: "약제 라벨의 벌 안전시간 확인",
  },
  {
    value: "waiting",
    label: "대기시간이 아직 안 지남",
    helper: "벌통 개방·재투입 금지",
  },
  {
    value: "unknown",
    label: "잘 모르겠어요",
    helper: "약제명과 살포시각 확인 필요",
  },
];

const EMPTY_INPUT = {
  farmId: "",
  location: "",
  areaRange: "100to300",
  stage: "S3",
  growthCompared: "similar",
  dayTempBand: "25to28",
  nightTempBand: "10to14",
  humidityBand: "normal",
  harvestPeriod: "notStarted",
  weeklyShipmentRange: "none",
  shipmentTrend: "same",
  useBumblebee: false,
  hiveCountBand: "one",
  beeCoverageAreaRange: "sameAsFarm",
  workersPerHiveBand: "unknown",
  hiveAgeBand: "unknown",
  beeTraffic: "unknown",
  middayBeeTraffic: "unknown",
  openFlowerDensity: "unknown",
  pesticideSafety: "unknown",
};

const SAMPLE_INPUT = {
  farmId: "산청 딸기농장",
  location: "경상남도 산청군",
  areaRange: "100to300",
  stage: "S6",
  growthCompared: "similar",
  dayTempBand: "25to28",
  nightTempBand: "5to9",
  humidityBand: "humid",
  harvestPeriod: "1to2m",
  weeklyShipmentRange: "100to300",
  shipmentTrend: "same",
  useBumblebee: true,
  hiveCountBand: "one",
  beeCoverageAreaRange: "sameAsFarm",
  workersPerHiveBand: "80to120",
  hiveAgeBand: "1to2m",
  beeTraffic: "middle",
  middayBeeTraffic: "one",
  openFlowerDensity: "25to35",
  pesticideSafety: "none7d",
};

function findOption(options, value) {
  return options.find((option) => option.value === value) ?? options[0];
}

function getAnalysisDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const season =
    month <= 2 || month === 12
      ? "겨울"
      : month <= 5
        ? "봄"
        : month <= 8
          ? "여름"
          : "가을";

  return {
    value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    label: `${year}년 ${month}월 ${day}일`,
    month,
    season,
  };
}

function Section({ icon, title, description, children }) {
  return (
    <Card style={{ padding: 18 }}>
      <View className="mb-5">
        <View className="flex-row items-center" style={{ gap: 9 }}>
          <View
            style={{
              width: 3.5,
              height: 18,
              borderRadius: 2,
              backgroundColor: C.primary,
            }}
          />
          <PretendardFont
            weight="bold"
            className="text-[19px] leading-6"
            style={{ color: C.text }}
          >
            {title}
          </PretendardFont>
        </View>
        {description ? (
          <PretendardFont
            className="mt-2 text-[15px] leading-6"
            style={{ color: C.sec }}
          >
            {description}
          </PretendardFont>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

function TextField({ label, value, onChangeText, placeholder, optional }) {
  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center">
        <PretendardFont
          weight="semibold"
          className="text-[15px]"
          style={{ color: C.text }}
        >
          {label}
        </PretendardFont>
        {optional ? (
          <PretendardFont className="ml-1 text-[13px]" style={{ color: C.sec }}>
            선택
          </PretendardFont>
        ) : null}
      </View>
      <View
        className="h-12 flex-row items-center rounded-2xl px-4"
        style={{ backgroundColor: "#EEF2F6" }}
      >
        <TextInput
          className="h-12 flex-1 text-[17px]"
          style={{ color: C.text }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.ter}
        />
      </View>
    </View>
  );
}

function ChoiceGroup({
  title,
  helper,
  options,
  value,
  onChange,
  columns = 2,
}) {
  const width = columns === 3 ? "31.8%" : columns === 1 ? "100%" : "48.5%";

  return (
    <View className="mb-6">
      <PretendardFont
        weight="bold"
        className="text-[17px] leading-6"
        style={{ color: C.text }}
      >
        {title}
      </PretendardFont>
      {helper ? (
        <PretendardFont
          className="mt-1 text-[14px] leading-5"
          style={{ color: C.textAlt }}
        >
          {helper}
        </PretendardFont>
      ) : null}
      <View className="mt-3 flex-row flex-wrap gap-x-2 gap-y-2">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPressIn={() => {
                if (!selected) onChange(option.value);
              }}
              onPress={() => onChange(option.value)}
              className="justify-center rounded-2xl border px-3 py-3"
              android_ripple={{ color: C.recommendCtaBorder }}
              style={({ pressed }) => ({
                width,
                minHeight: option.helper ? 66 : 52,
                borderWidth: selected ? 0 : 1,
                borderColor: C.border,
                backgroundColor: selected ? C.primary : "#EEF2F6",
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              <PretendardFont
                weight={selected ? "bold" : "semibold"}
                className="text-[15px] leading-5"
                style={{ color: selected ? C.white : C.text }}
              >
                {option.label}
              </PretendardFont>
              {option.helper ? (
                <PretendardFont
                  weight="medium"
                  className="mt-1 text-[13px] leading-[18px]"
                  style={{ color: selected ? C.white : C.sec }}
                >
                  {option.helper}
                </PretendardFont>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function QuickFacts({ items, onMore }) {
  return (
    <View className="mb-5">
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <View
            key={`${item.icon}-${item.label}`}
            className="flex-row items-center rounded-full px-3 py-2"
            style={{ backgroundColor: "#EEF2F6" }}
          >
            <Feather name={item.icon} size={15} color={C.primary} />
            <PretendardFont
              weight="semibold"
              className="ml-1.5 text-[13px]"
              style={{ color: C.text }}
            >
              {item.label}
            </PretendardFont>
          </View>
        ))}
        {onMore ? (
          <Pressable
            onPress={onMore}
            className="flex-row items-center rounded-full px-3 py-2 active:opacity-60"
            style={{ backgroundColor: C.primarySoft }}
          >
            <Feather name="help-circle" size={15} color={C.primary} />
            <PretendardFont
              weight="bold"
              className="ml-1.5 text-[13px]"
              style={{ color: C.primary }}
            >
              기준 보기
            </PretendardFont>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ReportBenefit({ icon, children }) {
  return (
    <View className="mb-3 flex-row items-start">
      <View
        className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full"
        style={{ backgroundColor: C.primarySoft }}
      >
        <Feather name={icon} size={14} color={C.primary} />
      </View>
      <PretendardFont
        weight="medium"
        className="flex-1 text-[15px] leading-6"
        style={{ color: C.text }}
      >
        {children}
      </PretendardFont>
    </View>
  );
}

const WIZARD_STEPS = [
  { number: 1, label: "농장 정보" },
  { number: 2, label: "딸기 상태" },
  { number: 3, label: "하우스 환경" },
  { number: 4, label: "출하 흐름" },
  { number: 5, label: "호박벌" },
];

function WizardProgress({ currentStep }) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const active = index <= currentStep;

          return (
            <View
              key={step.number}
              className="flex-row items-center"
              style={{
                flex: index < WIZARD_STEPS.length - 1 ? 1 : 0,
              }}
            >
              <View
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{
                  backgroundColor: active ? C.primary : C.white,
                  borderWidth: active ? 0 : 1,
                  borderColor: C.border,
                }}
              >
                <PretendardFont
                  weight="bold"
                  style={{
                    fontSize: 14,
                    color: active ? C.white : C.ter,
                  }}
                >
                  {step.number}
                </PretendardFont>
              </View>
              {index < WIZARD_STEPS.length - 1 ? (
                <View
                  className="mx-1 h-0.5 flex-1"
                  style={{
                    backgroundColor:
                      index < currentStep ? C.primary : C.border,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      <View className="mt-3 flex-row items-center justify-between">
        <PretendardFont
          weight="bold"
          style={{ fontSize: 17, color: C.text }}
        >
          {currentStep + 1}. {WIZARD_STEPS[currentStep].label}
        </PretendardFont>
        <PretendardFont style={{ fontSize: 13, color: C.sec }}>
          {currentStep + 1} / {WIZARD_STEPS.length}
        </PretendardFont>
      </View>
    </View>
  );
}

function WizardPage({
  width,
  children,
  onScroll,
  scrollEventThrottle,
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{
        padding: 16,
        paddingTop: 14,
        paddingBottom: 28,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
    >
      {children}
    </ScrollView>
  );
}

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const pagerRef = useRef(null);
  const [form, setForm] = useState(EMPTY_INPUT);
  const [isLoading, setIsLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [guideVisible, setGuideVisible] = useState(false);
  const [measurementGuideVisible, setMeasurementGuideVisible] =
    useState(false);
  const analysisDate = getAnalysisDate();
  const selectedFarmArea = findOption(AREA_OPTIONS, form.areaRange);
  const selectedBeeArea = findOption(
    BEE_COVERAGE_AREA_OPTIONS,
    form.beeCoverageAreaRange,
  );
  const selectedHiveCount = findOption(
    HIVE_COUNT_OPTIONS,
    form.hiveCountBand,
  );
  const beeAreaM2 = selectedBeeArea.numeric ?? selectedFarmArea.numeric;
  const beePyeongPerHive = Math.round(
    beeAreaM2 / 3.3058 / selectedHiveCount.numeric,
  );
  const hivesPer1000M2 = (selectedHiveCount.numeric * 1000) / beeAreaM2;

  useEffect(() => {
    pagerRef.current?.scrollTo({
      x: currentStep * width,
      animated: false,
    });
  }, [width]);

  const setValue = (key, value) => {
    setForm((current) =>
      current[key] === value ? current : { ...current, [key]: value },
    );
  };

  const fillSample = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setForm(SAMPLE_INPUT);
  };

  const goToStep = (nextStep) => {
    if (nextStep < 0 || nextStep >= WIZARD_STEPS.length) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(nextStep);
    pagerRef.current?.scrollTo({
      x: nextStep * width,
      animated: true,
    });
  };

  const makeReport = () => {
    const area = findOption(AREA_OPTIONS, form.areaRange);
    const stage = findOption(STAGES, form.stage);
    const growth = findOption(GROWTH_OPTIONS, form.growthCompared);
    const dayTemp = findOption(DAY_TEMP_OPTIONS, form.dayTempBand);
    const nightTemp = findOption(NIGHT_TEMP_OPTIONS, form.nightTempBand);
    const humidity = findOption(HUMIDITY_OPTIONS, form.humidityBand);
    const harvest = findOption(HARVEST_PERIOD_OPTIONS, form.harvestPeriod);
    const shipment = findOption(
      WEEKLY_SHIPMENT_OPTIONS,
      form.weeklyShipmentRange,
    );
    const shipmentTrend = findOption(
      SHIPMENT_TREND_OPTIONS,
      form.shipmentTrend,
    );
    const hiveCount = findOption(HIVE_COUNT_OPTIONS, form.hiveCountBand);
    const beeCoverageArea = findOption(
      BEE_COVERAGE_AREA_OPTIONS,
      form.beeCoverageAreaRange,
    );
    const workersPerHive = findOption(
      WORKER_COUNT_OPTIONS,
      form.workersPerHiveBand,
    );
    const hiveAge = findOption(HIVE_AGE_OPTIONS, form.hiveAgeBand);
    const beeTraffic = findOption(BEE_TRAFFIC_OPTIONS, form.beeTraffic);
    const middayBeeTraffic = findOption(
      MIDDAY_BEE_OPTIONS,
      form.middayBeeTraffic,
    );
    const openFlowerDensity = findOption(
      OPEN_FLOWER_OPTIONS,
      form.openFlowerDensity,
    );
    const pesticideSafety = findOption(
      PESTICIDE_SAFETY_OPTIONS,
      form.pesticideSafety,
    );
    const beeCoverageAreaM2 = beeCoverageArea.numeric ?? area.numeric;

    const payload = {
      ...form,
      inputPrecision: "approximate",
      analysisDate: analysisDate.value,
      analysisDateLabel: analysisDate.label,
      analysisMonth: analysisDate.month,
      seasonLabel: analysisDate.season,
      farmId: form.farmId || "이름 미입력 농장",
      areaM2: String(area.numeric),
      areaRangeLabel: area.label,
      stageLabel: stage.label,
      progress: String(
        { S1: 10, S2: 25, S3: 40, S4: 55, S5: 70, S6: 85 }[form.stage] ??
          40,
      ),
      growthComparedLabel: growth.label,
      growthScoreHint: String(growth.score),
      growthScoreRangeLabel: growth.rangeLabel,
      dayTemp: String(dayTemp.numeric),
      dayTempLabel: dayTemp.label,
      nightTemp: String(nightTemp.numeric),
      nightTempLabel: nightTemp.label,
      dayHumidity: String(humidity.day),
      nightHumidity: String(humidity.night),
      humidityLabel: humidity.label,
      humidityQuantLabel: humidity.helper,
      shipment7d: String(shipment.numeric),
      shipment7dLabel: shipment.label,
      shipmentDays: String(harvest.days),
      harvestPeriodLabel: harvest.label,
      shipmentTrendLabel: shipmentTrend.label,
      shipmentTrendQuantLabel: shipmentTrend.helper,
      shipmentTotal: String(
        Math.round(shipment.numeric * Math.max(1, harvest.days / 7) * 0.85),
      ),
      cumulativeShipmentProvided: false,
      hiveCount: String(hiveCount.numeric),
      hiveCountLabel: hiveCount.label,
      beeCoverageAreaM2: String(beeCoverageAreaM2),
      beeCoverageAreaLabel:
        beeCoverageArea.value === "sameAsFarm"
          ? `농장 전체 ${area.label}`
          : beeCoverageArea.label,
      workersPerHive: String(workersPerHive.numeric),
      workersPerHiveLabel: workersPerHive.label,
      hiveAgeDays: String(hiveAge.days),
      hiveAgeLabel: hiveAge.label,
      morningTraffic: String(beeTraffic.numeric),
      beeTrafficLabel: beeTraffic.label,
      middayVisibleBees10m: String(middayBeeTraffic.numeric),
      middayBeeTrafficLabel: middayBeeTraffic.label,
      openFlowersM2: String(openFlowerDensity.numeric),
      openFlowerDensityLabel: openFlowerDensity.label,
      pesticideSafetyLabel: pesticideSafety.label,
    };

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setTimeout(() => {
      router.push({
        pathname: "/report-result",
        params: { data: JSON.stringify(payload) },
      });
      setIsLoading(false);
    }, 80);
  };

  if (showIntro) {
    return (
      <View className="flex-1" style={{ backgroundColor: C.bg }}>
        <AppHeader
          title="딸기 농장 리포트"
          onBack={() => router.back()}
          isScrolled={isScrolled}
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingTop: HEADER_HEIGHT + 18,
            paddingBottom: 28,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          <Card style={{ padding: 20 }}>
            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: C.recommendCtaBg }}
            >
              <Feather name="bar-chart-2" size={27} color={C.primary} />
            </View>
            <PretendardFont
              weight="black"
              className="mt-5 text-[24px] leading-8"
              style={{ color: C.text }}
            >
              우리 농장 딸기,{`\n`}지금 잘 크고 있을까요?
            </PretendardFont>
            <PretendardFont
              className="mt-3 text-[16px] leading-7"
              style={{ color: C.textAlt }}
            >
              농장 크기와 위치, 지금 딸기의 생육단계, 최근 7일 온습도와 출하
              흐름을 알려주세요. 정확한 숫자가 아니어도 가장 가까운 범위를
              고르면 괜찮아요.
            </PretendardFont>
            <PretendardFont
              weight="semibold"
              className="mt-3 text-[16px] leading-7"
              style={{ color: C.text }}
            >
              같은 생육단계·비슷한 시기의 농가와 비교해서 현재 등급, 단계별
              적정 온습도, 예상 추가 수확량, 이번 주에 먼저 바꿀 개선방안까지
              한 번에 정리해드릴게요.
            </PretendardFont>
            <View
              className="mt-5 flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: C.recommendCtaBg }}
            >
              <Feather name="check-circle" size={21} color={C.success} />
              <PretendardFont
                weight="bold"
                className="ml-3 flex-1 text-[15px] leading-6"
                style={{ color: C.text }}
              >
                정확한 장부가 없어도 가장 가까운 범위를 고르면 됩니다.
              </PretendardFont>
            </View>
          </Card>

          <Card>
            <View className="flex-row items-center">
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: C.recommendCtaBg }}
              >
                <Feather name="database" size={20} color={C.primary} />
              </View>
              <PretendardFont
                weight="bold"
                className="ml-3 text-xl"
                style={{ color: C.text }}
              >
                어떤 데이터를 참고했나요?
              </PretendardFont>
            </View>

            <View className="mt-5 flex-row gap-2">
              {[
                { value: "513,545", label: "전체 데이터 점검" },
                { value: "42,466", label: "등급 분석 행" },
                { value: "4곳", label: "생산예측 검증" },
              ].map((item) => (
                <View
                  key={item.label}
                  className="flex-1 items-center rounded-2xl px-2 py-4"
                  style={{ backgroundColor: C.bgAlt }}
                >
                  <PretendardFont
                    weight="black"
                    className="text-lg"
                    style={{ color: C.primary }}
                  >
                    {item.value}
                  </PretendardFont>
                  <PretendardFont
                    weight="semibold"
                    className="mt-1 text-center text-[12px] leading-4"
                    style={{ color: C.textAlt }}
                  >
                    {item.label}
                  </PretendardFont>
                </View>
              ))}
            </View>

            <PretendardFont
              className="mt-4 text-[15px] leading-6"
              style={{ color: C.textAlt }}
            >
              스마트팜 공공데이터 513,545행을 먼저 점검했어요. 그중 농가와
              시점이 연결되는 5개 농가 42,466행을 선별해 등급 기준을 만들고,
              출하 이력이 이어지는 4개 농가 자료로 생산량 예측을 확인했어요.
            </PretendardFont>
            <PretendardFont
              weight="semibold"
              className="mt-2 text-[14px] leading-5"
              style={{ color: C.sec }}
            >
              아직은 파일럿이라 전국 농가의 공인등급은 아니지만, 우리 농장의
              현재 위치와 다음 행동을 살펴보는 참고자료로 쓸 수 있어요.
            </PretendardFont>
          </Card>

          <Card>
            <PretendardFont
              weight="bold"
              className="mb-2 text-xl"
              style={{ color: C.text }}
            >
              어떤 정보를 고르나요?
            </PretendardFont>
            <PretendardFont
              className="mb-4 text-[15px] leading-6"
              style={{ color: C.textAlt }}
            >
              농장 규모부터 최근 7일의 대략적인 상태까지 순서대로 물어봐요.
            </PretendardFont>
            <QuickFacts
              items={[
                { icon: "home", label: "농장 위치·크기" },
                { icon: "sun", label: "딸기 생육단계" },
                { icon: "thermometer", label: "낮·밤 온습도" },
                { icon: "package", label: "최근 출하 흐름" },
                { icon: "hexagon", label: "호박벌·선택사항" },
              ]}
            />
          </Card>

          <Card>
            <PretendardFont
              weight="bold"
              className="mb-4 text-xl"
              style={{ color: C.text }}
            >
              리포트에서 확인할 수 있어요
            </PretendardFont>
            <ReportBenefit icon="award">
              현재 생육단계에서 우리 농장이 A~D 중 어디인지와 그 이유
            </ReportBenefit>
            <ReportBenefit icon="layers">
              S1~S6 생육단계별 권장 온습도와 현재 환경관리등급
            </ReportBenefit>
            <ReportBenefit icon="users">
              같은 생육단계·비슷한 시기의 상위 농가와 우리 농장의 차이
            </ReportBenefit>
            <ReportBenefit icon="trending-up">
              분석 날짜부터 앞으로 30일과 남은 작기의 예상 추가 출하 범위
            </ReportBenefit>
            <ReportBenefit icon="check-circle">
              A등급과 상위 10%에 가까워지기 위한 개선방안과 재확인 시점
            </ReportBenefit>
          </Card>
        </ScrollView>

        <View
          className="border-t bg-white px-5 pt-3"
          style={{
            borderColor: C.border,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowIntro(false);
            }}
            className="h-16 flex-row items-center justify-center rounded-2xl"
            style={{ backgroundColor: C.primary }}
          >
            <PretendardFont weight="bold" className="mr-2 text-[17px] text-white">
              내 농장 정보 입력하기
            </PretendardFont>
            <Feather name="arrow-right" size={21} color={C.white} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: C.bg }}>
      <AppHeader
        title="딸기 농장 리포트"
        onBack={() => router.back()}
        isScrolled={isScrolled}
      />

      <View
        className="border-b bg-white px-5 pb-3"
        style={{ paddingTop: HEADER_HEIGHT + 12, borderColor: C.border }}
      >
        <WizardProgress currentStep={currentStep} />
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Feather name="check-circle" size={15} color={C.success} />
            <PretendardFont
              weight="semibold"
              className="ml-1.5 text-[13px]"
              style={{ color: C.textAlt }}
            >
              대략 골라도 괜찮아요
            </PretendardFont>
          </View>
          <Pressable
            onPress={() => setGuideVisible(true)}
            className="flex-row items-center active:opacity-60"
          >
            <PretendardFont
              weight="bold"
              className="text-sm"
              style={{ color: C.primary }}
            >
              리포트 안내
            </PretendardFont>
            <Feather name="chevron-right" size={16} color={C.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ width: width * WIZARD_STEPS.length }}
      >
        <WizardPage
          width={width}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          <Section
            icon="home"
            title="농장 위치와 크기"
            description="정확한 주소나 평수를 몰라도 가장 가까운 답을 선택하면 됩니다."
          >
            <Pressable
              onPress={fillSample}
              className="mb-5 flex-row items-center justify-center rounded-2xl border py-3 active:opacity-80"
              style={{
                backgroundColor: C.recommendCtaBg,
                borderColor: C.recommendCtaBorder,
              }}
            >
              <Feather name="zap" size={17} color={C.primary} />
              <PretendardFont
                weight="bold"
                className="ml-2 text-[15px]"
                style={{ color: C.text }}
              >
                예시 농장으로 채워보기
              </PretendardFont>
            </Pressable>
            <TextField
              label="농장 이름"
              optional
              value={form.farmId}
              onChangeText={(value) => setValue("farmId", value)}
              placeholder="예: 산청 딸기농장"
            />
            <TextField
              label="농장이 있는 지역"
              value={form.location}
              onChangeText={(value) => setValue("location", value)}
              placeholder="예: 경남 산청군"
            />
            <ChoiceGroup
              title="딸기를 재배하는 전체 평수"
              helper="여러 동이면 모두 합친 면적"
              options={AREA_OPTIONS}
              value={form.areaRange}
              onChange={(value) => setValue("areaRange", value)}
            />
          </Section>
        </WizardPage>

        <WizardPage
          width={width}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          <Section
            icon="sun"
            title="딸기가 지금 어떤 모습인가요?"
            description="농장에서 보이는 모습과 가장 가까운 답을 골라주세요."
          >
            <QuickFacts
              items={[
                { icon: "calendar", label: "최근 7일" },
                { icon: "eye", label: "같은 구역 관찰" },
              ]}
              onMore={() => setMeasurementGuideVisible(true)}
            />
            <ChoiceGroup
              title="현재 가장 가까운 모습"
              options={STAGES}
              value={form.stage}
              onChange={(value) => setValue("stage", value)}
            />
            <ChoiceGroup
              title="주변 농가와 비교하면"
              helper="최근 7일 변화 기준 · 자가평가 점수로 환산"
              options={GROWTH_OPTIONS}
              value={form.growthCompared}
              onChange={(value) => setValue("growthCompared", value)}
              columns={1}
            />
          </Section>
        </WizardPage>

        <WizardPage
          width={width}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          <Section
            icon="thermometer"
            title="최근 일주일 하우스 상태"
            description="센서가 없어도 가장 가까운 구간을 고르면 됩니다."
          >
            <QuickFacts
              items={[
                { icon: "calendar", label: "최근 7일" },
                { icon: "sun", label: "낮 10~16시" },
                { icon: "moon", label: "밤 0~6시" },
              ]}
              onMore={() => setMeasurementGuideVisible(true)}
            />
            <ChoiceGroup
              title="낮 온도 · 10~16시 평균"
              options={DAY_TEMP_OPTIONS}
              value={form.dayTempBand}
              onChange={(value) => setValue("dayTempBand", value)}
            />
            <ChoiceGroup
              title="밤·새벽 온도 · 0~6시 평균"
              options={NIGHT_TEMP_OPTIONS}
              value={form.nightTempBand}
              onChange={(value) => setValue("nightTempBand", value)}
            />
            <ChoiceGroup
              title="낮 상대습도 · 10~16시 평균"
              options={HUMIDITY_OPTIONS}
              value={form.humidityBand}
              onChange={(value) => setValue("humidityBand", value)}
              columns={1}
            />
          </Section>
        </WizardPage>

        <WizardPage
          width={width}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          <Section
            icon="package"
            title="요즘 출하 흐름"
            description="최근 기록만으로 현재 출하 속도를 비교합니다."
          >
            <QuickFacts
              items={[
                { icon: "calendar", label: analysisDate.label },
                { icon: "package", label: "최근 7일" },
                { icon: "repeat", label: "직전 7일과 비교" },
              ]}
              onMore={() => setMeasurementGuideVisible(true)}
            />
            <ChoiceGroup
              title="첫 수확을 시작한 지 얼마나 됐나요?"
              options={HARVEST_PERIOD_OPTIONS}
              value={form.harvestPeriod}
              onChange={(value) => setValue("harvestPeriod", value)}
            />
            <ChoiceGroup
              title="최근 7일 전체 출하량"
              helper="2kg 상자 수×2로 계산"
              options={WEEKLY_SHIPMENT_OPTIONS}
              value={form.weeklyShipmentRange}
              onChange={(value) => setValue("weeklyShipmentRange", value)}
              columns={1}
            />
            <ChoiceGroup
              title="지난주와 비교한 출하 흐름"
              helper="최근 7일과 직전 7일 비교"
              options={SHIPMENT_TREND_OPTIONS}
              value={form.shipmentTrend}
              onChange={(value) => setValue("shipmentTrend", value)}
              columns={1}
            />
          </Section>
        </WizardPage>

        <WizardPage
          width={width}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          <Section
            icon="hexagon"
            title="호박벌 상태도 함께 볼까요?"
            description="사용 중인 농가만 간단한 관찰값을 추가해요."
          >
            <View
              className="mb-5 flex-row items-center justify-between rounded-2xl p-4"
              style={{ backgroundColor: "#EEF2F6" }}
            >
              <View className="flex-1 pr-3">
                <PretendardFont
                  weight="semibold"
                  className="text-[15px]"
                  style={{ color: C.text }}
                >
                  호박벌을 사용하고 있어요
                </PretendardFont>
                <PretendardFont
                  className="mt-1 text-sm leading-5"
                  style={{ color: C.textAlt }}
                >
                  논문에 나온 온도별 활동 경향과 비교해요.
                </PretendardFont>
              </View>
              <Switch
                value={form.useBumblebee}
                onValueChange={(value) => setValue("useBumblebee", value)}
                trackColor={{ false: C.ter, true: C.primary }}
                thumbColor={C.white}
              />
            </View>

            {form.useBumblebee ? (
              <>
                <QuickFacts
                  items={[
                    { icon: "sun", label: "오전 출입 5분" },
                    { icon: "clock", label: "낮 꽃 방문 10분" },
                    { icon: "grid", label: "꽃 1㎡×3곳" },
                  ]}
                  onMore={() => setMeasurementGuideVisible(true)}
                />
                <ChoiceGroup
                  title="현재 사용하는 호박벌 통 수"
                  options={HIVE_COUNT_OPTIONS}
                  value={form.hiveCountBand}
                  onChange={(value) => setValue("hiveCountBand", value)}
                />
                <ChoiceGroup
                  title="호박벌이 실제로 다니는 하우스 면적"
                  helper="벌이 다니는 동들의 면적만 합산"
                  options={BEE_COVERAGE_AREA_OPTIONS}
                  value={form.beeCoverageAreaRange}
                  onChange={(value) =>
                    setValue("beeCoverageAreaRange", value)
                  }
                  columns={1}
                />
                <View
                  className="mb-5 rounded-2xl p-4"
                  style={{ backgroundColor: "#EEF2F6" }}
                >
                  <PretendardFont
                    weight="semibold"
                    className="text-sm leading-6"
                    style={{ color: C.text }}
                  >
                    현재 선택 기준: 1통당 약 {beePyeongPerHive}평 · 1,000㎡당{" "}
                    {hivesPer1000M2.toFixed(1)}통
                  </PretendardFont>
                  <PretendardFont
                    className="mt-1 text-[13px] leading-5"
                    style={{ color: C.sec }}
                  >
                    v1 문헌 참고선은 1,000㎡당 약 0.5~1.0통이며 꽃 수와 제품별
                    권장량을 함께 확인합니다.
                  </PretendardFont>
                </View>
                <ChoiceGroup
                  title="벌통 1통의 일벌 수"
                  helper="구매 제품·판매처 안내 기준"
                  options={WORKER_COUNT_OPTIONS}
                  value={form.workersPerHiveBand}
                  onChange={(value) => setValue("workersPerHiveBand", value)}
                  columns={1}
                />
                <ChoiceGroup
                  title="지금 벌통을 들인 지 얼마나 됐나요?"
                  options={HIVE_AGE_OPTIONS}
                  value={form.hiveAgeBand}
                  onChange={(value) => setValue("hiveAgeBand", value)}
                  columns={1}
                />
                <ChoiceGroup
                  title="오전 9~11시 · 벌통 입구 5분 출입 합계"
                  helper="나간 벌 + 들어온 벌"
                  options={BEE_TRAFFIC_OPTIONS}
                  value={form.beeTraffic}
                  onChange={(value) => setValue("beeTraffic", value)}
                  columns={1}
                />
                <ChoiceGroup
                  title="낮 11~14시 · 꽃 위 벌 10분 관찰"
                  helper="꽃을 만지는 벌만 세기"
                  options={MIDDAY_BEE_OPTIONS}
                  value={form.middayBeeTraffic}
                  onChange={(value) => setValue("middayBeeTraffic", value)}
                  columns={1}
                />
                <ChoiceGroup
                  title="현재 활짝 핀 꽃 수"
                  helper="1m×1m 대표구역 세 곳 평균"
                  options={OPEN_FLOWER_OPTIONS}
                  value={form.openFlowerDensity}
                  onChange={(value) => setValue("openFlowerDensity", value)}
                  columns={1}
                />
                <ChoiceGroup
                  title="최근 약제 살포와 벌 안전 대기시간"
                  options={PESTICIDE_SAFETY_OPTIONS}
                  value={form.pesticideSafety}
                  onChange={(value) => setValue("pesticideSafety", value)}
                  columns={1}
                />
              </>
            ) : (
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: C.recommendCtaBg }}
              >
                <PretendardFont
                  className="text-[15px] leading-6"
                  style={{ color: C.textAlt }}
                >
                  호박벌 항목은 선택사항입니다. 사용하지 않는 농가는 이 상태로
                  리포트를 만들어도 됩니다.
                </PretendardFont>
              </View>
            )}
          </Section>
        </WizardPage>
      </ScrollView>

      <View
        className="border-t bg-white px-5 pt-3"
        style={{
          borderColor: C.border,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0 || isLoading}
            className="h-14 flex-row items-center justify-center rounded-2xl"
            style={{
              width: 112,
              backgroundColor: C.bgAlt,
              opacity: currentStep === 0 ? 0.45 : 1,
            }}
          >
            <Feather name="chevron-left" size={20} color={C.textAlt} />
            <PretendardFont
              weight="bold"
              className="ml-1 text-base"
              style={{ color: C.textAlt }}
            >
              이전
            </PretendardFont>
          </Pressable>

          <Pressable
            onPress={
              currentStep === WIZARD_STEPS.length - 1
                ? makeReport
                : () => goToStep(currentStep + 1)
            }
            disabled={isLoading}
            className="h-14 flex-1 flex-row items-center justify-center rounded-2xl"
            style={{ backgroundColor: C.primary }}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color={C.white} size="small" />
                <PretendardFont
                  weight="bold"
                  className="ml-2 text-base text-white"
                >
                  비슷한 농가와 비교 중...
                </PretendardFont>
              </>
            ) : currentStep === WIZARD_STEPS.length - 1 ? (
              <>
                <Feather name="bar-chart-2" size={20} color={C.white} />
                <PretendardFont
                  weight="bold"
                  className="ml-2 text-base text-white"
                >
                  리포트 보기
                </PretendardFont>
              </>
            ) : (
              <>
                <PretendardFont
                  weight="bold"
                  className="mr-1 text-base text-white"
                >
                  다음
                </PretendardFont>
                <Feather name="chevron-right" size={20} color={C.white} />
              </>
            )}
          </Pressable>
        </View>
      </View>

      <BottomSheet
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="예측 리포트에서 알려드려요"
        snapHeight={0.72}
      >
        <View
          className="mb-5 rounded-2xl p-4"
          style={{ backgroundColor: C.recommendCtaBg }}
        >
          <PretendardFont
            weight="bold"
            className="text-lg"
            style={{ color: C.text }}
          >
            대략 알고 있는 만큼만 답해도 괜찮아요
          </PretendardFont>
          <PretendardFont
            className="mt-2 text-sm leading-6"
            style={{ color: C.textAlt }}
          >
            농장 규모와 딸기 상태, 하우스 온습도, 최근 출하 흐름을 비슷한
            시기의 농가 데이터와 비교해 이해하기 쉽게 정리합니다.
          </PretendardFont>
        </View>

        <ReportBenefit icon="award">
          지금 우리 농장의 생육 환경이 A~D 중 어느 수준인지 알려드려요.
        </ReportBenefit>
        <ReportBenefit icon="thermometer">
          현재 생육 단계에 알맞은 온도와 습도에서 얼마나 벗어났는지
          보여드려요.
        </ReportBenefit>
        <ReportBenefit icon="trending-up">
          지금 흐름이 이어질 때 예상되는 생산량과 상위 농가의 차이를 비교해요.
        </ReportBenefit>
        <ReportBenefit icon="check-circle">
          한 단계 더 좋아지기 위해 지금 먼저 할 일을 쉬운 말로 알려드려요.
        </ReportBenefit>
        <ReportBenefit icon="hexagon">
          호박벌을 사용한다면 활동 상태와 점검할 관리 항목도 함께 안내해요.
        </ReportBenefit>

        <View
          className="mt-2 rounded-2xl p-4"
          style={{ backgroundColor: "#EEF2F6" }}
        >
          <PretendardFont
            weight="semibold"
            className="text-sm leading-6"
            style={{ color: C.textAlt }}
          >
            출하량은 입력한 분석 날짜와 계절, 첫 수확 후 지난 기간을 함께
            고려해 비교합니다. 정확한 장부 수치가 없어도 가장 가까운 범위를
            골라주세요.
          </PretendardFont>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={measurementGuideVisible}
        onClose={() => setMeasurementGuideVisible(false)}
        title="같은 기준으로 재는 방법"
        snapHeight={0.76}
      >
        <ReportBenefit icon="sun">
          온도·습도는 최근 7일 중 낮 10~16시와 밤 0~6시를 나눠 평균냅니다.
          센서가 없으면 같은 시간에 3일 이상 본 값을 고릅니다.
        </ReportBenefit>
        <ReportBenefit icon="eye">
          딸기 상태는 같은 구역을 최근 7일 동안 보고 새잎·꽃·열매 변화로
          판단합니다. 자가평가 점수는 실측값이 아닙니다.
        </ReportBenefit>
        <ReportBenefit icon="package">
          출하는 최근 7일 총량과 바로 전 7일 총량을 비교해 증감률을 냅니다.
        </ReportBenefit>
        <ReportBenefit icon="hexagon">
          호박벌은 비·강풍·약제 살포가 없는 날 오전 9~11시 벌통 입구를 5분,
          낮 11~14시 꽃 위 벌을 10분 관찰합니다.
        </ReportBenefit>
        <ReportBenefit icon="grid">
          활짝 핀 꽃은 1m×1m 대표 구역 세 곳을 세어 평균냅니다.
        </ReportBenefit>

        <View
          className="mt-2 rounded-2xl p-4"
          style={{ backgroundColor: C.recommendCtaBg }}
        >
          <PretendardFont
            weight="semibold"
            className="text-[14px] leading-6"
            style={{ color: C.textAlt }}
          >
            오전이 항상 가장 활발하다는 뜻은 아닙니다. 매번 같은 조건으로
            비교하기 위한 관찰 시간이며, 낮 꽃 방문도 함께 봅니다.
          </PretendardFont>
        </View>
      </BottomSheet>
    </View>
  );
}

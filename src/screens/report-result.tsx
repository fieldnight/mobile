import { Children, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import AppHeader from "@/components/AppHeader";
import { BottomSheet } from "@/components/BottomSheet";
import { Card as BaseCard } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { C as HiveC } from "@/constants/hive-colors";
import { HEADER_HEIGHT, useScrollHeader } from "@/hooks";

const C = {
  ...HiveC,
  bg: "#0A101B",
  surface: "#111A29",
  surfaceAlt: "#182438",
  text: "#F4F7FB",
  textAlt: "#C4CFDC",
  sec: "#91A0B5",
  ter: "#73839A",
  border: "#2B3A50",
  sectionBorder: "#33445C",
  bgAlt: "#182438",
  primary: "#76C7E6",
  primarySoft: "#173247",
  recommendCtaBg: "#142B3D",
  recommendCtaBorder: "#28536B",
  selected: "#173247",
  infoBg: "#142B3D",
  success: "#45D49A",
  warning: "#F3B95F",
  error: "#FF7E91",
};

function Card({ children, style, ...props }) {
  return (
    <BaseCard
      {...props}
      style={{
        backgroundColor: C.surface,
        borderColor: C.border,
        shadowColor: "#000000",
        shadowOpacity: 0.28,
        shadowRadius: 16,
        elevation: 2,
        ...(style || {}),
      }}
    >
      {children}
    </BaseCard>
  );
}

const STAGE_INFO = {
  S1: {
    name: "새로 심고 뿌리 내리는 시기",
    shortName: "뿌리 내리는 중",
    day: "30℃ 이하",
    night: "12~15℃",
    dayRange: [-10, 30],
    nightRange: [12, 15],
    remainingWeeks: 24,
  },
  S2: {
    name: "잎과 포기가 커지는 시기",
    shortName: "잎·포기 생장 중",
    day: "26~27℃",
    night: "10℃ 안팎",
    dayRange: [26, 27],
    nightRange: [8, 12],
    remainingWeeks: 22,
  },
  S3: {
    name: "꽃이 피고 벌이 다니는 시기",
    shortName: "꽃 피는 중",
    day: "23~27℃",
    night: "8~12℃",
    dayRange: [23, 27],
    nightRange: [8, 12],
    remainingWeeks: 18,
  },
  S4: {
    name: "작은 열매가 맺히는 시기",
    shortName: "작은 열매가 맺힘",
    day: "23~25℃",
    night: "5~10℃",
    dayRange: [23, 25],
    nightRange: [5, 10],
    remainingWeeks: 16,
  },
  S5: {
    name: "열매가 커지고 색이 드는 시기",
    shortName: "열매가 커지는 중",
    day: "23~27℃",
    night: "6~8℃",
    dayRange: [23, 27],
    nightRange: [6, 8],
    remainingWeeks: 14,
  },
  S6: {
    name: "수확하고 출하하는 시기",
    shortName: "수확·출하 중",
    day: "23~27℃",
    night: "6~7℃",
    dayRange: [23, 27],
    nightRange: [6, 7],
    remainingWeeks: 10,
  },
};

const FALLBACK = {
  farmId: "산청 딸기농장",
  location: "경상남도 산청군",
  areaM2: "660",
  areaRangeLabel: "100~300평",
  stage: "S6",
  stageLabel: "수확하고 있어요",
  growthCompared: "similar",
  growthComparedLabel: "비슷한 편",
  growthScoreHint: "55",
  growthScoreRangeLabel: "45~64점",
  dayTemp: "26.5",
  dayTempLabel: "25~28℃",
  nightTemp: "7",
  nightTempLabel: "5~9℃",
  dayHumidity: "75",
  nightHumidity: "90",
  humidityLabel: "습한 편",
  humidityQuantLabel: "최근 7일 낮 평균 71~85%",
  shipment7d: "200",
  shipment7dLabel: "100~300kg",
  shipmentDays: "45",
  harvestPeriodLabel: "1~2개월 정도",
  shipmentTrend: "same",
  shipmentTrendLabel: "지난주와 비슷해요",
  shipmentTrendQuantLabel: "직전 7일 대비 -10~+10%",
  shipmentTotal: "1093",
  cumulativeShipmentProvided: false,
  analysisDate: "2026-07-26",
  analysisDateLabel: "2026년 7월 26일",
  analysisMonth: 7,
  seasonLabel: "여름",
  inputPrecision: "approximate",
  useBumblebee: true,
  hiveCount: "1",
  hiveCountLabel: "1통",
  beeCoverageAreaM2: "660",
  beeCoverageAreaLabel: "농장 전체 100~300평",
  workersPerHive: "100",
  workersPerHiveLabel: "80~120마리",
  hiveAgeDays: "45",
  hiveAgeLabel: "1~2개월 정도",
  morningTraffic: "4",
  beeTrafficLabel: "5분에 3~5마리",
  middayVisibleBees10m: "1",
  middayBeeTrafficLabel: "10분에 1마리",
  openFlowersM2: "30",
  openFlowerDensityLabel: "1㎡에 25~35송이",
  pesticideSafety: "none7d",
  pesticideSafetyLabel: "최근 7일 살포 안 함",
};

const WEEKLY_SHIPMENT_BOUNDS = {
  none: { low: 0, high: 0 },
  under100: { low: 20, high: 100 },
  "100to300": { low: 100, high: 300 },
  "300to600": { low: 300, high: 600 },
  over600: { low: 600, high: 900 },
};

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== "" ? parsed : fallback;
}

function addDays(dateValue, days) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(String(dateValue))
    ? new Date(`${dateValue}T00:00:00`)
    : new Date();
  parsed.setDate(parsed.getDate() + days);
  return `${parsed.getFullYear()}년 ${parsed.getMonth() + 1}월 ${parsed.getDate()}일`;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function scoreForRange(value, range) {
  const [minimum, maximum] = range;
  if (value >= minimum && value <= maximum) return 100;

  const distance = value < minimum ? minimum - value : value - maximum;
  return clamp(100 - distance * 15);
}

function gradeForScore(score) {
  if (score >= 75) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}

function colorForGrade(grade) {
  if (grade === "A") return C.success;
  if (grade === "B") return C.primary;
  if (grade === "C") return C.warning;
  return C.error;
}

function statusForRange(value, range, isUnknown) {
  if (isUnknown) return "기록 없음";
  const [minimum, maximum] = range;
  if (value >= minimum && value <= maximum) return "맞는 편";

  const distance = value < minimum ? minimum - value : value - maximum;
  return distance <= 3 ? "조금 조정" : "차이가 큼";
}

function gradeDescription(grade) {
  if (grade === "A") return "A · 75~100점 · 비교농가 중 좋은 구간";
  if (grade === "B") return "B · 55~74점 · 비교농가 중 보통 이상 구간";
  if (grade === "C") return "C · 40~54점 · 조정이 필요한 구간";
  return "D · 0~39점 · 우선 점검 구간";
}

function ScoreBar({ label, score, color, note }) {
  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-end justify-between">
        <View className="flex-1 pr-4">
          <PretendardFont
            weight="semibold"
            className="text-[15px]"
            style={{ color: C.text }}
          >
            {label}
          </PretendardFont>
          <PretendardFont
            className="mt-1 text-sm leading-5"
            style={{ color: C.textAlt }}
          >
            {note}
          </PretendardFont>
        </View>
        <PretendardFont
          weight="bold"
          className="text-xl"
          style={{ color: C.text }}
        >
          {Math.round(score)}
          <PretendardFont className="text-sm" style={{ color: C.sec }}>
            점
          </PretendardFont>
        </PretendardFont>
      </View>
      <View
        className="h-3 overflow-hidden rounded-full"
        style={{ backgroundColor: C.border }}
      >
        <View
          className="h-full rounded-full"
          style={{ width: `${clamp(score)}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

function SectionTitle({ icon, title, subtitle }) {
  const accent =
    {
      award: "#B69AF8",
      layers: C.primary,
      calendar: "#9BA9BB",
      "bar-chart-2": C.warning,
      thermometer: "#FB923C",
      "trending-up": C.success,
      package: "#60A5FA",
      hexagon: C.warning,
      "check-circle": C.success,
    }[icon] || C.primary;

  return (
    <View className="mb-4">
      <View className="flex-row items-center" style={{ gap: 9 }}>
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: C.surfaceAlt,
          }}
        >
          <Feather name={icon} size={18} color={accent} />
        </View>
        <PretendardFont
          weight="bold"
          className="flex-1 text-[19px] leading-6"
          style={{ color: C.text }}
        >
          {title}
        </PretendardFont>
      </View>
      {subtitle ? (
        <PretendardFont
          className="mt-2 text-[14px] leading-5"
          style={{ color: C.sec }}
        >
          {subtitle}
        </PretendardFont>
      ) : null}
    </View>
  );
}

function StageGradeRow({
  code,
  stage,
  score,
  grade,
  isCurrent,
  hasEnvironmentInput,
}) {
  const gradeColor = grade ? colorForGrade(grade) : C.sec;

  return (
    <View
      className="mb-2.5 flex-row items-center rounded-2xl border p-3.5"
      style={{
        backgroundColor: isCurrent ? C.recommendCtaBg : C.surfaceAlt,
        borderColor: isCurrent ? C.recommendCtaBorder : C.border,
      }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{
          backgroundColor: isCurrent ? C.primary : C.bgAlt,
        }}
      >
        <PretendardFont
          weight="black"
          className="text-[15px]"
          style={{ color: isCurrent ? C.white : C.textAlt }}
        >
          {code}
        </PretendardFont>
      </View>

      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <PretendardFont
            weight="bold"
            className="flex-shrink text-[15px]"
            style={{ color: C.text }}
          >
            {stage.shortName}
          </PretendardFont>
          <View
            className="ml-2 rounded-full px-2 py-1"
            style={{ backgroundColor: isCurrent ? C.primary : C.bgAlt }}
          >
            <PretendardFont
              weight="bold"
              className="text-xs"
              style={{ color: isCurrent ? C.white : C.textAlt }}
            >
              {isCurrent ? "현재" : "가정"}
            </PretendardFont>
          </View>
        </View>
        <PretendardFont
          className="mt-1 text-[13px]"
          style={{ color: C.textAlt }}
        >
          권장 낮 {stage.day} · 밤 {stage.night}
        </PretendardFont>
      </View>

      <View className="ml-2 min-w-[52px] items-end">
        <PretendardFont
          weight="black"
          className="text-2xl"
          style={{ color: gradeColor }}
        >
          {hasEnvironmentInput ? grade : "—"}
        </PretendardFont>
        <PretendardFont
          weight="semibold"
          className="text-[13px]"
          style={{ color: C.sec }}
        >
          {hasEnvironmentInput ? `${score.toFixed(0)}점` : "입력 부족"}
        </PretendardFont>
      </View>
    </View>
  );
}

function ComparisonRow({
  icon = "activity",
  label,
  current,
  target,
  status,
  targetPrefix = "이 시기 권장 범위",
}) {
  const good = ["맞는 편", "기준 안", "대기시간 지남"].includes(status);
  const unknown = ["기록 없음", "입력 부족", "확인 필요"].includes(status);
  const statusColor = good
    ? C.success
    : unknown
      ? C.sec
      : ["조금 조정", "경계"].includes(status)
        ? C.warning
        : C.error;
  const statusBackground = good
    ? "#123529"
    : unknown
      ? C.surfaceAlt
      : ["조금 조정", "경계"].includes(status)
        ? "#3A2E19"
        : "#3A1E29";

  return (
    <View
      className="mb-3 rounded-2xl border p-4"
      style={{ backgroundColor: C.surfaceAlt, borderColor: C.border }}
    >
      <View className="flex-row items-center">
        <View
          className="mr-2.5 h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: C.recommendCtaBg }}
        >
          <Feather name={icon} size={16} color={C.primary} />
        </View>
        <PretendardFont
          weight="bold"
          className="flex-1 text-[16px]"
          style={{ color: C.text }}
        >
          {label}
        </PretendardFont>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: statusBackground }}
        >
          <PretendardFont
            weight="bold"
            className="text-[13px]"
            style={{ color: statusColor }}
          >
            {status}
          </PretendardFont>
        </View>
      </View>
      <PretendardFont
        weight="bold"
        className="mt-3 text-[18px] leading-6"
        style={{ color: C.text }}
      >
        {current}
      </PretendardFont>
      <View className="mt-2 flex-row items-start">
        <Feather name="target" size={14} color={C.sec} />
        <PretendardFont
          className="ml-1.5 flex-1 text-[14px] leading-5"
          style={{ color: C.textAlt }}
        >
          {targetPrefix} {target}
        </PretendardFont>
      </View>
    </View>
  );
}

function ConditionRow({ icon = "check", label, value }) {
  return (
    <View className="mb-3 flex-row items-start">
      <View
        className="mr-3 h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: C.recommendCtaBg }}
      >
        <Feather name={icon} size={15} color={C.primary} />
      </View>
      <View className="flex-1">
        <PretendardFont className="text-[13px]" style={{ color: C.textAlt }}>
          {label}
        </PretendardFont>
        <PretendardFont
          weight="semibold"
          className="mt-0.5 text-[16px] leading-5"
          style={{ color: C.text }}
        >
          {value}
        </PretendardFont>
      </View>
    </View>
  );
}

function QuickFacts({ items }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => (
        <View
          key={`${item.icon}-${item.label}`}
          className="flex-row items-center rounded-full px-3 py-2"
          style={{ backgroundColor: C.surfaceAlt }}
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
    </View>
  );
}

function ResultSections({
  children,
  oneAtATime,
  width,
  onPageChange,
  onScroll,
  scrollEventThrottle,
}) {
  const sections = Children.toArray(children);

  if (oneAtATime) {
    return (
      <ScrollView
        horizontal
        pagingEnabled
        className="flex-1"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          onPageChange(
            Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1)),
          );
        }}
      >
        {sections.map((section, index) => (
          <ScrollView
            key={index}
            style={{ width }}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 28,
            }}
            showsVerticalScrollIndicator={false}
          >
            {section}
          </ScrollView>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 28,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
    >
      {sections}
    </ScrollView>
  );
}

function ForecastPeriod({ title, period, low, middle, high, emphasized }) {
  return (
    <View
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: emphasized ? C.recommendCtaBg : C.bgAlt,
        borderColor: emphasized ? C.recommendCtaBorder : C.border,
      }}
    >
      <PretendardFont className="text-sm" style={{ color: C.textAlt }}>
        {period}
      </PretendardFont>
      <PretendardFont
        weight="bold"
        className="mt-1 text-[17px]"
        style={{ color: C.text }}
      >
        {title}
      </PretendardFont>
      <PretendardFont
        weight="black"
        className="mt-3 text-[25px]"
        style={{ color: C.primary }}
      >
        약 {low.toLocaleString()}~{high.toLocaleString()}kg
      </PretendardFont>
      <PretendardFont
        className="mt-1 text-sm"
        style={{ color: C.textAlt }}
      >
        선택 구간의 가운데 값으로는 약 {middle.toLocaleString()}kg
      </PretendardFont>
    </View>
  );
}

export default function ReportResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const [evidenceVisible, setEvidenceVisible] = useState(false);
  const [oneAtATime, setOneAtATime] = useState(false);
  const [resultPage, setResultPage] = useState(0);

  const input = useMemo(() => {
    try {
      const parsed = params.data ? JSON.parse(String(params.data)) : {};
      return { ...FALLBACK, ...parsed };
    } catch {
      return FALLBACK;
    }
  }, [params.data]);

  const stage = STAGE_INFO[input.stage] || STAGE_INFO.S3;
  const area = number(input.areaM2, 660);
  const dayTemp = number(input.dayTemp, 26);
  const nightTemp = number(input.nightTemp, 10);
  const dayHumidity = number(input.dayHumidity, 65);
  const nightHumidity = number(input.nightHumidity, 80);
  const shipment7d = number(input.shipment7d, 0);
  const growthScore = number(input.growthScoreHint, 55);
  const hasShipment =
    shipment7d > 0 &&
    input.weeklyShipmentRange !== "unknown" &&
    input.harvestPeriod !== "notStarted";

  const temperatureScore =
    (scoreForRange(dayTemp, stage.dayRange) +
      scoreForRange(nightTemp, stage.nightRange)) /
    2;
  const humidityScore =
    (scoreForRange(dayHumidity, [50, 70]) +
      scoreForRange(nightHumidity, [80, 100])) /
    2;
  const environmentScore = temperatureScore * 0.7 + humidityScore * 0.3;
  const hasEnvironmentInput =
    input.dayTempBand !== "unknown" &&
    input.nightTempBand !== "unknown" &&
    input.humidityBand !== "unknown";
  const stageEnvironmentGrades = Object.entries(STAGE_INFO).map(
    ([code, stageInfo]) => {
      const stageTemperatureScore =
        (scoreForRange(dayTemp, stageInfo.dayRange) +
          scoreForRange(nightTemp, stageInfo.nightRange)) /
        2;
      const stageEnvironmentScore =
        stageTemperatureScore * 0.7 + humidityScore * 0.3;

      return {
        code,
        stage: stageInfo,
        score: stageEnvironmentScore,
        grade: gradeForScore(stageEnvironmentScore),
      };
    },
  );

  const areaPyeong = Math.round(area / 3.3058);
  const weeklyYield = shipment7d / area;
  const normalizedWeeklyShipment = weeklyYield * 991.74;
  const top10WeeklyShipment = 0.788 * 991.74;
  const productionScore = hasShipment
    ? clamp((weeklyYield / 0.5) * 100)
    : 50;

  const overallScore = hasShipment
    ? environmentScore * 0.35 + growthScore * 0.3 + productionScore * 0.35
    : environmentScore * 0.55 + growthScore * 0.45;

  const grade = gradeForScore(overallScore);

  const trendMultiplier =
    input.shipmentTrend === "up"
      ? 1.15
      : input.shipmentTrend === "down"
        ? 0.85
        : 1;
  const weeklyBounds =
    WEEKLY_SHIPMENT_BOUNDS[input.weeklyShipmentRange] ??
    WEEKLY_SHIPMENT_BOUNDS.none;
  const predictionDays = Math.min(90, stage.remainingWeeks * 7);
  const predictionWeeks = predictionDays / 7;
  const predictionWeeksLabel = predictionWeeks.toFixed(
    predictionDays % 7 === 0 ? 0 : 1,
  );
  const forecastEndDate = addDays(input.analysisDate, predictionDays);
  const forecastForDays = (days) => {
    const weeks = days / 7;

    return {
      low: Math.round(weeklyBounds.low * weeks * trendMultiplier),
      middle: Math.round(shipment7d * weeks * trendMultiplier),
      high: Math.round(weeklyBounds.high * weeks * trendMultiplier),
    };
  };
  const forecast30 = forecastForDays(30);
  const forecastPeriod = forecastForDays(predictionDays);

  const dayTempStatus = statusForRange(
    dayTemp,
    stage.dayRange,
    input.dayTempBand === "unknown",
  );
  const nightTempStatus = statusForRange(
    nightTemp,
    stage.nightRange,
    input.nightTempBand === "unknown",
  );
  const humidityStatus =
    input.humidityBand === "unknown"
      ? "기록 없음"
      : humidityScore >= 82
        ? "맞는 편"
        : humidityScore >= 62
          ? "조금 조정"
          : "차이가 큼";

  const beeActivity =
    dayTemp <= 25
      ? clamp(100 - Math.abs(dayTemp - 25) * 2.1)
      : clamp(100 - (dayTemp - 25) * 6);
  const hiveCount = number(input.hiveCount, 1);
  const beeCoverageArea = number(input.beeCoverageAreaM2, area);
  const workersPerHive = number(input.workersPerHive, 80);
  const hiveAgeDays = number(input.hiveAgeDays, 42);
  const morningTraffic = number(input.morningTraffic, 0);
  const middayVisibleBees10m = number(input.middayVisibleBees10m, 0);
  const middayVisibleBees1h = middayVisibleBees10m * 6;
  const openFlowersM2 = number(input.openFlowersM2, 25);
  const hiveDensity = (hiveCount * 1000) / beeCoverageArea;
  const pyeongPerHive = beeCoverageArea / 3.3058 / hiveCount;
  const workersPer660M2 =
    (hiveCount * workersPerHive * 660) / beeCoverageArea;
  const beeCoverageUnknown =
    input.beeCoverageAreaRange === "unknown" ||
    (input.beeCoverageAreaRange === "sameAsFarm" &&
      input.areaRange === "unknown");

  const beeTemperatureStatus =
    input.dayTempBand === "unknown"
      ? "입력 부족"
      : beeActivity >= 70
        ? "기준 안"
        : beeActivity >= 50
          ? "경계"
          : "점검 필요";
  const hiveDensityStatus =
    beeCoverageUnknown
      ? "입력 부족"
      : hiveDensity >= 0.5 && hiveDensity <= 1
        ? "기준 안"
        : hiveDensity >= 0.25 && hiveDensity <= 2
          ? "경계"
          : "점검 필요";
  const workerDensityStatus =
    input.workersPerHiveBand === "unknown" || beeCoverageUnknown
      ? "입력 부족"
      : workersPer660M2 >= 80 && workersPer660M2 <= 120
        ? "기준 안"
        : workersPer660M2 >= 60 && workersPer660M2 <= 140
          ? "경계"
          : "점검 필요";
  const hiveAgeStatus =
    input.hiveAgeBand === "unknown"
      ? "입력 부족"
      : hiveAgeDays < 45
        ? "기준 안"
        : hiveAgeDays < 60
          ? "경계"
          : "점검 필요";
  const morningTrafficStatus =
    input.beeTraffic === "unknown"
      ? "입력 부족"
      : morningTraffic <= 2
        ? "점검 필요"
        : "기준 안";
  const middayTrafficStatus =
    input.middayBeeTraffic === "unknown" ||
    input.openFlowerDensity === "unknown"
      ? "입력 부족"
      : middayVisibleBees1h > 10 && openFlowersM2 < 25
        ? "점검 필요"
        : "기준 안";
  const pesticideStatus =
    input.pesticideSafety === "waiting"
      ? "점검 필요"
      : input.pesticideSafety === "unknown"
        ? "확인 필요"
        : input.pesticideSafety === "waitPassed"
          ? "대기시간 지남"
          : "기준 안";

  const beeStatuses = [
    beeTemperatureStatus,
    hiveDensityStatus,
    workerDensityStatus,
    hiveAgeStatus,
    morningTrafficStatus,
    middayTrafficStatus,
  ];
  const beeCritical = input.pesticideSafety === "waiting";
  const beeImportantCount = beeStatuses.filter(
    (status) => status === "점검 필요",
  ).length;
  const beeBoundaryCount = beeStatuses.filter(
    (status) => status === "경계",
  ).length;
  const beeUnknownCount =
    beeStatuses.filter((status) => status === "입력 부족").length +
    (input.pesticideSafety === "unknown" ? 1 : 0);
  const beeGradeLetter = beeCritical
    ? "D"
    : beeImportantCount >= 2
      ? "D"
      : beeImportantCount === 1
        ? "C"
        : beeBoundaryCount > 0
          ? "B"
          : "A";
  const beeGrade = `${beeGradeLetter}${beeUnknownCount > 0 ? " · 잠정" : ""}`;

  const resultSummary =
    environmentScore >= 75 && productionScore < 55
      ? `하우스 환경은 ${environmentScore.toFixed(0)}점으로 A구간(75점 이상)이지만 최근 출하는 ${productionScore.toFixed(0)}점으로 B구간 아래입니다.`
      : environmentScore < 60
        ? `하우스 환경이 ${environmentScore.toFixed(0)}점으로 조정구간(60점 미만)입니다. 현재 생육시기의 온습도 범위부터 확인하세요.`
        : `현재 종합 ${overallScore.toFixed(0)}점으로 ${grade}구간입니다. 최근 7일 출하량을 같은 요일에 다시 기록해 변화율을 확인하세요.`;

  const goHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/home");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: C.bg }}>
      <AppHeader
        title="딸기 농장 리포트"
        onBack={() => router.back()}
        rightAction={{ icon: "x", onPress: goHome }}
        isScrolled={isScrolled}
        tone="dark"
      />

      <View
        className="border-b px-5 pb-3"
        style={{
          paddingTop: HEADER_HEIGHT + 10,
          borderColor: C.border,
          backgroundColor: C.surface,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <PretendardFont
              weight="bold"
              className="text-lg"
              style={{ color: C.text }}
            >
              농장 분석 결과
            </PretendardFont>
            <PretendardFont
              className="mt-1 text-sm"
              numberOfLines={1}
              style={{ color: C.textAlt }}
            >
              {input.farmId} · {input.location || "지역 미입력"}
            </PretendardFont>
          </View>
          <Pressable
            onPress={() => {
              setOneAtATime((current) => !current);
              setResultPage(0);
            }}
            className="h-11 flex-row items-center rounded-xl border px-3 active:opacity-70"
            style={{
              backgroundColor: oneAtATime ? C.primary : C.surfaceAlt,
              borderColor: oneAtATime ? C.primary : C.recommendCtaBorder,
            }}
          >
            <Feather
              name={oneAtATime ? "list" : "columns"}
              size={17}
              color={oneAtATime ? C.white : C.primary}
            />
            <PretendardFont
              weight="bold"
              className="ml-2 text-[14px]"
              style={{ color: oneAtATime ? C.white : C.primary }}
            >
              {oneAtATime ? "전체 이어보기" : "하나씩 보기"}
            </PretendardFont>
          </Pressable>
        </View>
        {oneAtATime ? (
          <View className="mt-3 flex-row items-center justify-between">
            <PretendardFont
              weight="semibold"
              className="text-[13px]"
              style={{ color: C.textAlt }}
            >
              화면을 옆으로 밀어 다음 결과를 보세요
            </PretendardFont>
            <PretendardFont
              weight="bold"
              className="text-[13px]"
              style={{ color: C.primary }}
            >
              {resultPage + 1} / {input.useBumblebee ? 10 : 9}
            </PretendardFont>
          </View>
        ) : null}
      </View>

      <ResultSections
        oneAtATime={oneAtATime}
        width={width}
        onPageChange={setResultPage}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <Card style={{ padding: 20 }}>
          <SectionTitle
            icon="award"
            title={`현재 단계 · ${stage.shortName}`}
            subtitle={gradeDescription(grade)}
          />
          <View className="mt-6 flex-row items-center justify-between">
            <View
              className="h-28 w-28 items-center justify-center rounded-full border-[6px]"
              style={{
                borderColor: C.primary,
                backgroundColor: C.primarySoft,
              }}
            >
              <PretendardFont
                weight="black"
                className="text-5xl"
                style={{ color: C.primary }}
              >
                {grade}
              </PretendardFont>
              <PretendardFont
                className="mt-1 text-[13px]"
                style={{ color: C.sec }}
              >
                현재 종합등급
              </PretendardFont>
            </View>
            <View className="flex-1 items-end pl-5">
              <PretendardFont className="text-sm" style={{ color: C.sec }}>
                종합 점수
              </PretendardFont>
              <PretendardFont
                weight="black"
                className="mt-1 text-[34px]"
                style={{ color: C.text }}
              >
                {overallScore.toFixed(0)}
                <PretendardFont className="text-base" style={{ color: C.sec }}>
                  점
                </PretendardFont>
              </PretendardFont>
              <View
                className="mt-2 rounded-full px-3 py-1.5"
                style={{ backgroundColor: C.bgAlt }}
              >
                <PretendardFont
                  weight="bold"
                  className="text-[13px]"
                  style={{ color: C.textAlt }}
                >
                  대략 입력한 정보 기준
                </PretendardFont>
              </View>
            </View>
          </View>

          <View
            className="mt-6 rounded-2xl p-4"
            style={{ backgroundColor: C.recommendCtaBg }}
          >
            <PretendardFont
              weight="semibold"
              className="text-[15px] leading-6"
              style={{ color: C.text }}
            >
              {resultSummary}
            </PretendardFont>
          </View>
        </Card>

        <Card>
          <SectionTitle
            icon="layers"
            title="생육단계별 환경관리등급"
            subtitle="최근 7일 온습도를 S1~S6의 권장범위에 각각 대입했습니다."
          />

          <View className="mb-4">
            <QuickFacts
              items={[
                { icon: "sun", label: `낮 ${input.dayTempLabel}` },
                { icon: "moon", label: `밤 ${input.nightTempLabel}` },
                { icon: "droplet", label: input.humidityQuantLabel },
              ]}
            />
          </View>

          {stageEnvironmentGrades.map((stageGrade) => (
            <StageGradeRow
              key={stageGrade.code}
              code={stageGrade.code}
              stage={stageGrade.stage}
              score={stageGrade.score}
              grade={stageGrade.grade}
              isCurrent={stageGrade.code === input.stage}
              hasEnvironmentInput={hasEnvironmentInput}
            />
          ))}

          <View
            className="mt-1 flex-row items-start rounded-2xl p-4"
            style={{ backgroundColor: C.bgAlt }}
          >
            <Feather name="info" size={18} color={C.primary} />
            <PretendardFont
              className="ml-2 flex-1 text-[14px] leading-5"
              style={{ color: C.textAlt }}
            >
              <PretendardFont weight="bold" style={{ color: C.text }}>
                현재
              </PretendardFont>
              는 선택한 생육단계의 입력값 기준입니다. 다른 단계의{" "}
              <PretendardFont weight="bold" style={{ color: C.text }}>
                가정
              </PretendardFont>
              등급은 지금 온습도를 그대로 유지했을 때의 결과입니다. 실제 단계별
              등급은 각 단계의 최근 7일 기록이 필요합니다.
            </PretendardFont>
          </View>
        </Card>

        <Card>
          <SectionTitle
            icon="calendar"
            title="이번 비교에 사용한 조건"
            subtitle="날짜·생육단계·면적을 맞춘 뒤 비교합니다."
          />
          <ConditionRow
            icon="calendar"
            label="분석 날짜와 계절"
            value={`${input.analysisDateLabel} · ${input.seasonLabel}`}
          />
          <ConditionRow icon="sun" label="현재 딸기 모습" value={stage.name} />
          <ConditionRow
            icon="maximize-2"
            label="농장 크기"
            value={`${input.areaRangeLabel} · 계산용 대표값 약 ${areaPyeong}평`}
          />
          <ConditionRow
            icon="package"
            label="수확을 시작한 뒤 지난 기간"
            value={input.harvestPeriodLabel}
          />
          <ConditionRow
            icon="clock"
            label="온습도 측정시간"
            value="최근 7일 · 낮 10~16시 평균 · 밤 0~6시 평균"
          />
          <QuickFacts
            items={[
              { icon: "filter", label: "같은 계절 우선" },
              { icon: "calendar", label: "부족 시 앞뒤 달 포함" },
            ]}
          />
        </Card>

        <Card>
          <SectionTitle
            icon="bar-chart-2"
            title="왜 이 등급이 나왔나요?"
            subtitle="답한 항목만 점수에 반영했습니다."
          />
          <ScoreBar
            label="하우스 온도·습기"
            score={environmentScore}
            color="#FB923C"
            note={`온도 70% + 습도 30% · 현재 딸기 모습의 권장범위와 비교`}
          />
          <ScoreBar
            label="딸기가 자라는 상태"
            score={growthScore}
            color="#B69AF8"
            note={`‘${input.growthComparedLabel}’ 자가평가 · 입력 구간 ${input.growthScoreRangeLabel}`}
          />
          {hasShipment ? (
            <ScoreBar
              label="최근 출하 흐름"
              score={productionScore}
              color={C.success}
              note={`최근 7일 ${input.shipment7dLabel} · ${input.shipmentTrendQuantLabel}`}
            />
          ) : (
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: C.bgAlt }}
            >
              <PretendardFont
                weight="semibold"
                className="text-sm"
                style={{ color: C.text }}
              >
                출하 전이거나 출하량을 모르는 경우
              </PretendardFont>
              <PretendardFont
                className="mt-1 text-sm leading-5"
                style={{ color: C.textAlt }}
              >
                출하 점수는 빼고 하우스 상태와 딸기 생육만으로 등급을 냅니다.
              </PretendardFont>
            </View>
          )}
        </Card>

        <Card>
          <SectionTitle
            icon="thermometer"
            title="지금 하우스 상태는 어떤가요?"
            subtitle={`${stage.shortName} 권장범위와 비교`}
          />
          <ComparisonRow
            icon="sun"
            label="낮 온도 · 최근 7일 10~16시 평균"
            current={input.dayTempLabel || `${dayTemp}℃`}
            target={stage.day}
            status={dayTempStatus}
          />
          <ComparisonRow
            icon="moon"
            label="밤·새벽 온도 · 최근 7일 0~6시 평균"
            current={input.nightTempLabel || `${nightTemp}℃`}
            target={stage.night}
            status={nightTempStatus}
          />
          <ComparisonRow
            icon="droplet"
            label="낮 상대습도 · 최근 7일 10~16시 평균"
            current={
              input.humidityBand === "unknown"
                ? "기록 없음"
                : `${input.humidityLabel} · ${input.humidityQuantLabel}`
            }
            target="낮 50~70% · 밤 80~100%"
            status={humidityStatus}
          />
        </Card>

        <Card>
          <SectionTitle
            icon="trending-up"
            title="출하가 좋은 농가와 얼마나 차이 날까요?"
            subtitle="300평·최근 7일 기준"
          />

          {hasShipment ? (
            <>
              <View
                className="mb-4 rounded-2xl border p-4"
                style={{ backgroundColor: C.bgAlt, borderColor: C.border }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <PretendardFont
                      className="text-sm"
                      style={{ color: C.textAlt }}
                    >
                      우리 농장 최근 7일
                    </PretendardFont>
                    <PretendardFont
                      weight="bold"
                      className="mt-1 text-xl"
                      style={{ color: C.text }}
                    >
                      {input.shipment7dLabel}
                    </PretendardFont>
                    <PretendardFont
                      className="mt-1 text-[13px]"
                      style={{ color: C.sec }}
                    >
                      약 {areaPyeong}평을 기준으로 300평 환산 시{" "}
                      {Math.round(normalizedWeeklyShipment)}kg
                    </PretendardFont>
                  </View>
                  <View className="items-end">
                    <PretendardFont
                      className="text-sm"
                      style={{ color: C.textAlt }}
                    >
                      잘하는 농가 참고선
                    </PretendardFont>
                    <PretendardFont
                      weight="bold"
                      className="mt-1 text-xl"
                      style={{ color: C.primary }}
                    >
                      약 {Math.round(top10WeeklyShipment)}kg
                    </PretendardFont>
                    <PretendardFont
                      className="mt-1 text-[13px]"
                      style={{ color: C.sec }}
                    >
                      300평·최근 7일 환산
                    </PretendardFont>
                  </View>
                </View>
                <View
                  className="mt-4 h-3 overflow-hidden rounded-full"
                  style={{ backgroundColor: C.border }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (normalizedWeeklyShipment / top10WeeklyShipment) * 100,
                      )}%`,
                      backgroundColor: C.primary,
                    }}
                  />
                </View>
                <PretendardFont
                  weight="semibold"
                  className="mt-3 text-[15px] leading-5"
                  style={{ color: C.textAlt }}
                >
                  참고선의 약{" "}
                  {Math.round(
                    (normalizedWeeklyShipment / top10WeeklyShipment) * 100,
                  )}
                  % · 선택구간 가운데 값 사용
                </PretendardFont>
                <View className="mt-3">
                  <QuickFacts
                    items={[
                      { icon: "users", label: "농가 비교용" },
                      { icon: "maximize-2", label: "300평 환산" },
                    ]}
                  />
                </View>
              </View>
            </>
          ) : (
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: C.recommendCtaBg }}
            >
              <PretendardFont
                weight="semibold"
                className="text-[15px]"
                style={{ color: C.text }}
              >
                아직 출하 전이라 생산 속도는 비교하지 않았습니다.
              </PretendardFont>
              <PretendardFont
                className="mt-1 text-sm leading-6"
                style={{ color: C.textAlt }}
              >
                첫 출하가 시작된 뒤 최근 일주일의 대략적인 출하량을 추가하면 비교할
                수 있습니다.
              </PretendardFont>
            </View>
          )}
        </Card>

        <Card>
          <SectionTitle
            icon="package"
            title="앞으로 얼마나 더 출하할까요?"
            subtitle={
              hasShipment
                ? "오늘 이후 추가 출하량 · 과거 출하 제외"
                : "최근 출하량이 있어야 기간별 추가 출하량을 계산할 수 있습니다."
            }
          />

          {hasShipment ? (
            <>
              <View
                className="mb-4 rounded-2xl p-4"
                 style={{ backgroundColor: C.surfaceAlt }}
              >
                <QuickFacts
                  items={[
                    { icon: "calendar", label: input.analysisDateLabel },
                    { icon: "package", label: `7일 ${input.shipment7dLabel}` },
                    {
                      icon: "trending-up",
                      label: `흐름 ×${trendMultiplier.toFixed(2)}`,
                    },
                    {
                      icon: "flag",
                      label: `${forecastEndDate}까지`,
                    },
                  ]}
                />
              </View>

              <View className="gap-3">
                <ForecastPeriod
                  period={`${input.analysisDateLabel}부터 30일 동안`}
                  title="앞으로 30일 추가 출하 예상"
                  low={forecast30.low}
                  middle={forecast30.middle}
                  high={forecast30.high}
                />
                <ForecastPeriod
                  period={`${input.analysisDateLabel}~${forecastEndDate}`}
                  title="예측 종료일까지 추가 출하 예상"
                  low={forecastPeriod.low}
                  middle={forecastPeriod.middle}
                  high={forecastPeriod.high}
                  emphasized
                />
              </View>

              <View
                className="mt-4 rounded-2xl border p-4"
                style={{
                  backgroundColor: C.recommendCtaBg,
                  borderColor: C.recommendCtaBorder,
                }}
              >
                <PretendardFont
                  weight="bold"
                  className="text-[15px]"
                  style={{ color: C.text }}
                >
                  가운데 예상값은 이렇게 계산했어요
                </PretendardFont>
                <PretendardFont
                  weight="semibold"
                  className="mt-2 text-[15px] leading-6"
                  style={{ color: C.textAlt }}
                >
                  최근 7일 대표값 {shipment7d.toLocaleString()}kg ×{" "}
                  {predictionWeeksLabel}주 × 출하 흐름{" "}
                  {trendMultiplier.toFixed(2)} = 약{" "}
                  {forecastPeriod.middle.toLocaleString()}kg
                </PretendardFont>
                <View className="mt-3">
                  <QuickFacts
                    items={[
                      { icon: "maximize-2", label: "면적 재곱셈 없음" },
                      { icon: "package", label: "추가 출하량" },
                    ]}
                  />
                </View>
              </View>

              <View
                className="mt-3 flex-row items-start rounded-2xl p-4"
                style={{ backgroundColor: C.bgAlt }}
              >
                <Feather name="alert-circle" size={18} color={C.primary} />
                <PretendardFont
                  weight="semibold"
                  className="ml-2 flex-1 text-[14px] leading-5"
                  style={{ color: C.textAlt }}
                >
                  누적 출하량이 없어 작기 전체 총생산량은 표시하지 않습니다.
                </PretendardFont>
              </View>
            </>
          ) : (
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: C.recommendCtaBg }}
            >
              <PretendardFont
                weight="bold"
                className="text-[15px]"
                style={{ color: C.text }}
              >
                지금은 생산량 숫자를 표시하지 않아요
              </PretendardFont>
              <PretendardFont
                className="mt-2 text-sm leading-6"
                style={{ color: C.textAlt }}
              >
                출하를 시작한 뒤 최근 7일 농장 전체 출하량을 입력하면 앞으로 30일과
                예측 종료일까지의 추가 출하량을 나눠 보여드립니다.
              </PretendardFont>
            </View>
          )}
        </Card>

        {input.useBumblebee ? (
          <Card>
            <SectionTitle
              icon="hexagon"
              title="호박벌 정량 점검"
              subtitle="벌통 밀도·일벌 수·설치일·정해진 시간의 관찰값을 따로 비교한 v1 잠정 결과입니다."
            />

            <View className="mb-3 flex-row gap-3">
              <View
                className="flex-1 rounded-2xl p-4"
                style={{ backgroundColor: C.recommendCtaBg }}
              >
                <PretendardFont className="text-sm" style={{ color: C.textAlt }}>
                  관리등급
                </PretendardFont>
                <PretendardFont
                  weight="black"
                  className="mt-1 text-xl"
                  style={{ color: C.primary }}
                >
                  {beeGrade}
                </PretendardFont>
              </View>
              <View
                className="flex-1 rounded-2xl p-4"
                style={{ backgroundColor: C.primarySoft }}
              >
                <PretendardFont className="text-sm" style={{ color: C.textAlt }}>
                  온도 적합도 proxy
                </PretendardFont>
                <PretendardFont
                  weight="black"
                  className="mt-1 text-2xl"
                  style={{ color: C.primary }}
                >
                  {beeActivity.toFixed(0)}점
                </PretendardFont>
              </View>
            </View>

            <View
              className="mb-4 rounded-2xl border p-4"
              style={{
                backgroundColor: C.recommendCtaBg,
                borderColor: C.recommendCtaBorder,
              }}
            >
              <QuickFacts
                items={[
                  { icon: "sun", label: "오전 출입 5분" },
                  { icon: "clock", label: "낮 꽃 방문 10분" },
                  { icon: "grid", label: "꽃 1㎡×3곳" },
                ]}
              />
              <PretendardFont
                weight="semibold"
                className="mt-3 text-[14px] leading-5"
                style={{ color: C.textAlt }}
              >
                같은 시간·같은 방법으로 재야 지난 리포트와 비교할 수 있어요.
              </PretendardFont>
            </View>

            <ComparisonRow
              icon="thermometer"
              label="주간 온도 적합도"
              current={`${input.dayTempLabel} · proxy ${beeActivity.toFixed(0)}점`}
              target="25~25.7℃ 최고점 부근 · 32.7℃에서 약 30점"
              status={beeTemperatureStatus}
              targetPrefix="문헌 기반 곡선"
            />
            <ComparisonRow
              icon="home"
              label="벌통 밀도"
              current={`${input.hiveCountLabel} / ${input.beeCoverageAreaLabel} · ${hiveDensity.toFixed(2)}통/1,000㎡ · 1통당 약 ${Math.round(pyeongPerHive)}평`}
              target="0.5~1.0통/1,000㎡ · 1통당 약 303~605평"
              status={hiveDensityStatus}
              targetPrefix="v1 문헌 참고선"
            />
            <ComparisonRow
              icon="users"
              label="일벌 밀도"
              current={`약 ${Math.round(workersPer660M2)}마리/660㎡ · 1통 ${input.workersPerHiveLabel}`}
              target="약 80~120마리/660㎡"
              status={workerDensityStatus}
              targetPrefix="v1 관리 참고선"
            />
            <ComparisonRow
              icon="calendar"
              label="벌통 사용기간"
              current={`${input.hiveAgeLabel} · 대표값 ${hiveAgeDays}일`}
              target="30~50일 점검 · 약 45일부터 교체 검토"
              status={hiveAgeStatus}
              targetPrefix="관리 시점"
            />
            <ComparisonRow
              icon="log-in"
              label="오전 벌통 출입"
              current={`${input.beeTrafficLabel} · 대표값 ${morningTraffic}마리/5분`}
              target="5분 합계 3마리 이상"
              status={morningTrafficStatus}
              targetPrefix="v1 활력 참고선"
            />
            <ComparisonRow
              icon="sun"
              label="낮 꽃 방문"
              current={`${input.middayBeeTrafficLabel} · 시간당 약 ${middayVisibleBees1h}마리 환산`}
              target={`꽃 ${input.openFlowerDensityLabel} · 시간당 10마리 초과 시 꽃 부족 여부 확인`}
              status={middayTrafficStatus}
              targetPrefix="과방문 점검"
            />
            <ComparisonRow
              icon="shield"
              label="약제 안전"
              current={input.pesticideSafetyLabel}
              target="사용한 약제 라벨의 벌 안전 대기시간 충족"
              status={pesticideStatus}
              targetPrefix="필수 조건"
            />

            <Pressable
              onPress={() => setEvidenceVisible(true)}
              className="mt-2 flex-row items-center justify-center rounded-2xl border py-3.5 active:opacity-60"
              style={{ backgroundColor: C.bgAlt, borderColor: C.border }}
            >
              <Feather name="book-open" size={17} color={C.primary} />
              <PretendardFont
                weight="bold"
                className="ml-2 text-[14px]"
                style={{ color: C.primary }}
              >
                관찰시간·문헌 기준 보기
              </PretendardFont>
            </Pressable>
          </Card>
        ) : null}

        <Card>
          <SectionTitle
            icon="check-circle"
            title="이번 주에 먼저 할 일"
            subtitle="한 번에 많이 바꾸지 않고 확인하기 쉬운 순서로 알려드립니다."
          />
          {[
            {
              icon: "droplet",
              title:
                humidityStatus === "맞는 편"
                  ? "현재 습기 상태를 유지하세요"
                  : "아침 비닐과 잎의 물방울부터 확인하세요",
              body:
                humidityStatus === "맞는 편"
                  ? "현재 딸기 시기에 크게 벗어나지 않습니다."
                  : "물방울이 오래 남으면 환기 시간과 관수 시간을 먼저 점검하세요.",
            },
            {
              icon: "package",
              title: "최근 7일 출하량을 한 번 더 적어두세요",
              body: "정확한 누적량보다 같은 요일에 일주일 출하량을 반복해서 보는 것이 흐름을 판단하기 쉽습니다.",
            },
            {
              icon: "repeat",
              title: "다음 리포트에서도 같은 기준으로 답하세요",
              body: "대략적인 답이라도 같은 방식으로 반복하면 좋아지는지 나빠지는지 확인할 수 있습니다.",
            },
          ].map((item) => (
            <View key={item.icon} className="mb-4 flex-row items-start">
              <View
                className="mr-3 h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: C.recommendCtaBg }}
              >
                <Feather name={item.icon} size={16} color={C.primary} />
              </View>
              <View className="flex-1">
                <PretendardFont
                  weight="semibold"
                  className="text-[15px] leading-5"
                  style={{ color: C.text }}
                >
                  {item.title}
                </PretendardFont>
                <PretendardFont
                  className="mt-1 text-sm leading-6"
                  style={{ color: C.textAlt }}
                >
                  {item.body}
                </PretendardFont>
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <PretendardFont
            weight="bold"
            className="mb-3 text-[17px]"
            style={{ color: C.text }}
          >
            결과 이용 범위
          </PretendardFont>
          <QuickFacts
            items={[
              { icon: "users", label: "기준농가 5곳" },
              { icon: "edit-3", label: "대략 입력" },
              { icon: "book-open", label: "호박벌 문헌 proxy" },
            ]}
          />
          <PretendardFont
            className="mt-3 text-[14px] leading-5"
            style={{ color: C.textAlt }}
          >
            시험용 비교이며 전국 공인등급은 아닙니다.
          </PretendardFont>
        </Card>
      </ResultSections>

      <View
        className="flex-row gap-3 border-t px-5 pt-3"
        style={{
          borderColor: C.border,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: C.surface,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-16 flex-1 flex-row items-center justify-center rounded-2xl border"
          style={{ backgroundColor: C.surfaceAlt, borderColor: C.border }}
        >
          <Feather name="edit-3" size={19} color={C.textAlt} />
          <PretendardFont
            weight="bold"
            className="ml-2 text-base"
            style={{ color: C.textAlt }}
          >
            입력 다시 보기
          </PretendardFont>
        </Pressable>
        <Pressable
          onPress={goHome}
          className="h-16 flex-[1.25] flex-row items-center justify-center rounded-2xl"
          style={{ backgroundColor: C.primary }}
        >
          <Feather name="check" size={21} color={C.white} />
          <PretendardFont weight="bold" className="ml-2 text-base text-white">
            확인했어요
          </PretendardFont>
        </Pressable>
      </View>

      <BottomSheet
        visible={evidenceVisible}
        onClose={() => setEvidenceVisible(false)}
        title="호박벌 측정·문헌 기준"
        snapHeight={0.78}
        tone="dark"
      >
        <ConditionRow
          icon="sun"
          label="오전 출입"
          value="9~11시 중 벌통 입구를 5분 관찰 · 나간 벌과 들어온 벌 합계"
        />
        <ConditionRow
          icon="clock"
          label="낮 꽃 방문"
          value="11~14시 중 대표구역을 10분 관찰 · 시간당 값으로 환산"
        />
        <ConditionRow
          icon="grid"
          label="개화 밀도"
          value="1m×1m 대표구역 세 곳의 활짝 핀 꽃 수 평균"
        />
        <ConditionRow
          icon="thermometer"
          label="온도 proxy"
          value="25~25.7℃ 부근을 높은 값으로 두고 32.7℃까지 감점"
        />
        <ConditionRow
          icon="droplet"
          label="습도 사용법"
          value="보편적인 활동계수가 부족해 활동점수에는 곱하지 않고 환경 경고로만 사용"
        />

        <View
          className="mt-2 rounded-2xl p-4"
          style={{ backgroundColor: C.recommendCtaBg }}
        >
          <PretendardFont
            weight="semibold"
            className="text-[14px] leading-6"
            style={{ color: C.textAlt }}
          >
            오전이 항상 가장 활발하다는 뜻은 아닙니다. 다음 측정과 비교할 수
            있도록 관찰 조건을 고정한 것이며 낮 관찰을 함께 사용합니다.
          </PretendardFont>
        </View>
      </BottomSheet>
    </View>
  );
}

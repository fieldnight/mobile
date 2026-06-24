/**
 * 벌통 설정 화면
 * - 자동제어 스케줄은 서버 API로 조회/등록/삭제합니다.
 * - 날씨 지역은 기존처럼 로컬 설정으로 저장합니다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KMA_REGIONS } from "@/types";
import { BeeBoxCard } from "@/components/BeeboxCard";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { AutoControlScheduleSection } from "@/features/hive-control";
import { useSyncHiveList } from "@/features/hive";
import { useHiveStore } from "@/stores/useHiveStore";
import { Spacing } from "../constants";

const BG_IMAGE = require("../../assets/df.jpg");

export const WEATHER_REGION_KEY = "webee_weather_region";
export const DATA_INTERVAL_KEY = "webee_data_interval";
export const AUTO_SCHEDULE_KEY = "webee_auto_schedule";

export interface WeatherRegion {
  stn: number;
  name: string;
}

export default function HiveSettingsScreen() {
  const insets = useSafeAreaInsets();
  const hives = useHiveStore((state) => state.hives);

  useSyncHiveList();

  const [selectedHiveId, setSelectedHiveId] = useState<string | undefined>(
    hives[0]?.id,
  );
  const [selectedStn, setSelectedStn] = useState<number>(108);
  const [searchText, setSearchText] = useState("");
  const [savedMessage, setSavedMessage] = useState(false);
  const savedMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedHive =
    hives.find((hive) => hive.id === selectedHiveId) ?? hives[0];

  useEffect(() => {
    if (!hives.length) return;
    if (!selectedHiveId || !hives.some((hive) => hive.id === selectedHiveId)) {
      setSelectedHiveId(hives[0].id);
    }
  }, [hives, selectedHiveId]);

  const filteredRegions = useMemo(() => {
    if (!searchText.trim()) return KMA_REGIONS;
    return KMA_REGIONS.filter((region) =>
      region.name.includes(searchText.trim()),
    );
  }, [searchText]);

  const selectedRegionName =
    KMA_REGIONS.find((region) => region.stn === selectedStn)?.name || "서울";

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const showSavedMessage = () => {
    if (savedMessageTimerRef.current) clearTimeout(savedMessageTimerRef.current);
    setSavedMessage(true);
    savedMessageTimerRef.current = setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleSelectRegion = async (region: WeatherRegion) => {
    haptic();
    const prev = selectedStn;
    setSelectedStn(region.stn);
    try {
      await AsyncStorage.setItem(
        WEATHER_REGION_KEY,
        JSON.stringify({ stn: region.stn, name: region.name }),
      );
      showSavedMessage();
    } catch {
      setSelectedStn(prev);
    }
  };

  return (
    <ImageBackground source={BG_IMAGE} resizeMode="cover" className="flex-1">
      <HiveTabBar />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingTop: Spacing.sm,
          gap: 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between rounded-2xl border border-white/50 bg-white/70 px-4 py-3">
          <View className="flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-900">
              <Feather name="clock" size={16} color={C.white} />
            </View>
            <View>
              <PretendardFont
                weight="bold"
                className="text-[14px] text-gray-900"
              >
                실시간 데이터는 5분마다 업데이트돼요
              </PretendardFont>
              <PretendardFont className="mt-0.5 text-[12px] leading-[17px] text-gray-800">
                센서 데이터는 최대 5분 기준 안에서 반영돼요.
              </PretendardFont>
            </View>
          </View>
          <Feather name="info" size={18} color={C.sec} />
        </View>

        <BeeBoxCard delay={100} variant="setting">
          <HiveScheduleTargetPicker
            hives={hives.map((hive) => ({ id: hive.id, name: hive.name }))}
            selectedHiveId={selectedHive?.id}
            onSelectHive={(hiveId) => {
              haptic();
              setSelectedHiveId(hiveId);
            }}
          />
          <AutoControlScheduleSection
            hiveId={selectedHive?.id}
            hiveName={selectedHive?.name}
          />
        </BeeBoxCard>

        <BeeBoxCard delay={200} variant="setting">
          <View className="mb-3 flex-row items-center gap-2.5">
            <View
              className="items-center justify-center rounded-lg p-2"
              style={{ backgroundColor: C.bg }}
            >
              <Feather name="map-pin" size={18} color={C.text} />
            </View>
            <View className="flex-1">
              <PretendardFont
                weight="bold"
                className="text-[18px] text-toss-text"
              >
                일기예보 지역 설정
              </PretendardFont>
              <PretendardFont className="mt-0.5 text-[14px] leading-[20px] text-toss-sec">
                농장과 가까운 관측 지역을 선택해주세요.
              </PretendardFont>
            </View>
          </View>

          <View
            className="mb-3 flex-row items-center justify-between rounded-xl p-3.5"
            style={{ backgroundColor: C.bg }}
          >
            <PretendardFont
              weight="semibold"
              className="text-[16px] text-toss-text"
            >
              현재 지역
            </PretendardFont>
            <View className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1.5">
              <Feather name="map-pin" size={13} color={C.text} />
              <PretendardFont
                weight="bold"
                className="text-[16px] text-toss-blue"
              >
                {selectedRegionName}
              </PretendardFont>
            </View>
          </View>

          <View
            className="mb-3 flex-row items-center gap-2 rounded-xl px-3 py-2.5"
            style={{
              backgroundColor: C.white,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Feather name="search" size={16} color={C.text} />
            <TextInput
              className="m-0 flex-1 p-0 text-[16px] text-toss-text"
              placeholder="지역 검색..."
              placeholderTextColor={C.sec}
              value={searchText}
              onChangeText={setSearchText}
              data-testid="input-search-region"
            />
            {searchText.length > 0 && (
              <Pressable
                onPress={() => setSearchText("")}
                data-testid="button-clear-search"
              >
                <Feather name="x-circle" size={16} color={C.text} />
              </Pressable>
            )}
          </View>

          {searchText.trim() ? (
            <View className="flex-row flex-wrap gap-2">
              {filteredRegions.map((region) => (
                <RegionChip
                  key={region.stn}
                  region={region}
                  isSelected={region.stn === selectedStn}
                  onPress={handleSelectRegion}
                />
              ))}
              {filteredRegions.length === 0 && (
                <PretendardFont className="w-full py-5 text-center text-[14px] text-toss-sec">
                  검색 결과가 없어요.
                </PretendardFont>
              )}
            </View>
          ) : (
            <RegionGroupPicker
              selectedStn={selectedStn}
              onSelect={handleSelectRegion}
            />
          )}
        </BeeBoxCard>
      </ScrollView>

      {savedMessage && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="absolute left-0 right-0 z-[999] mx-auto max-w-[200px] flex-row items-center justify-center gap-1.5 self-center rounded-full bg-black/75 px-5 py-2.5"
          style={{ top: insets.top + 60 }}
        >
          <Feather name="check-circle" size={16} color={C.white} />
          <PretendardFont weight="semibold" className="text-[14px] text-white">
            저장됐어요
          </PretendardFont>
        </Animated.View>
      )}
    </ImageBackground>
  );
}

// 이름과 지역명이 같아 타이틀이 불필요한 단일 지역은 최상단 행에 모읍니다.
const SINGLE_REGIONS = ["서울", "대전", "세종"];

const REGION_GROUPS: { name: string; cities: string[] }[] = [
  { name: "인천", cities: ["인천", "강화", "백령도"] },
  { name: "경기", cities: ["수원", "동두천", "파주", "양평", "이천"] },
  { name: "강원", cities: ["속초", "춘천", "북춘천", "원주", "강릉", "북강릉", "동해", "대관령", "영월", "인제", "홍천", "태백", "정선군"] },
  { name: "충북", cities: ["충주", "청주", "서청주", "제천", "보은", "추풍령"] },
  { name: "충남", cities: ["서산", "천안", "보령", "부여", "홍성"] },
  { name: "전북", cities: ["군산", "전주", "부안", "임실", "정읍", "남원", "장수", "고창", "고창군", "순창군"] },
  { name: "전남", cities: ["광주", "목포", "여수", "순천", "영광군", "보성군", "강진군", "장흥", "해남", "고흥", "광양시", "진도군", "완도", "흑산도"] },
  { name: "경북", cities: ["대구", "안동", "상주", "포항", "울진", "울릉도", "봉화", "영주", "문경", "청송군", "영덕", "의성", "구미", "영천", "경주시"] },
  { name: "경남", cities: ["울산", "부산", "북부산", "창원", "북창원", "통영", "진주", "김해시", "양산시", "의령군", "함양군", "거창", "합천", "밀양", "산청", "거제", "남해"] },
  { name: "제주", cities: ["제주", "고산", "성산", "서귀포"] },
];

function RegionChip({
  region,
  isSelected,
  onPress,
}: {
  region: WeatherRegion;
  isSelected: boolean;
  onPress: (region: WeatherRegion) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(region)}
      className="rounded-full px-3.5 py-2 active:opacity-70"
      style={{
        borderWidth: 1,
        borderColor: isSelected ? C.primary : C.border,
        backgroundColor: isSelected ? C.primarySoft : C.white,
      }}
      data-testid={`button-region-${region.stn}`}
    >
      <PretendardFont
        weight={isSelected ? "bold" : "medium"}
        style={{ fontSize: 14, color: isSelected ? C.primary : C.text }}
      >
        {region.name}
      </PretendardFont>
    </Pressable>
  );
}

function RegionGroupPicker({
  selectedStn,
  onSelect,
}: {
  selectedStn: number;
  onSelect: (region: WeatherRegion) => void;
}) {
  const singleRegions = KMA_REGIONS.filter((r) => SINGLE_REGIONS.includes(r.name));

  // 선택된 그룹은 처음부터 열어둡니다.
  const initialOpen = useMemo(() => {
    const map: Record<string, boolean> = {};
    REGION_GROUPS.forEach(({ name, cities }) => {
      const regions = KMA_REGIONS.filter((r) => cities.includes(r.name));
      if (regions.some((r) => r.stn === selectedStn)) map[name] = true;
    });
    return map;
  }, [selectedStn]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  return (
    <View className="gap-1">
      {/* 단일 지역(서울·대전·세종) — 타이틀 없이 한 줄에 */}
      <View className="flex-row flex-wrap gap-2 pb-1">
        {singleRegions.map((region) => (
          <RegionChip
            key={region.stn}
            region={region}
            isSelected={region.stn === selectedStn}
            onPress={onSelect}
          />
        ))}
      </View>

      {REGION_GROUPS.map(({ name, cities }) => {
        const isOpen = !!openGroups[name];
        const regions = KMA_REGIONS.filter((r) => cities.includes(r.name));
        const hasSelected = regions.some((r) => r.stn === selectedStn);
        const isInline = regions.length <= 5;

        return (
          <View key={name}>
            {isInline ? (
              <View className="flex-row flex-wrap items-center gap-2 py-1">
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 15, color: hasSelected ? C.primary : C.text }}
                >
                  {name}
                </PretendardFont>
                {regions.map((region) => (
                  <RegionChip
                    key={region.stn}
                    region={region}
                    isSelected={region.stn === selectedStn}
                    onPress={onSelect}
                  />
                ))}
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => toggleGroup(name)}
                  className="flex-row items-center justify-between py-2.5 active:opacity-70"
                >
                  <PretendardFont
                    weight="bold"
                    style={{ fontSize: 15, color: hasSelected ? C.primary : C.text }}
                  >
                    {name}
                  </PretendardFont>
                  <Feather
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={hasSelected ? C.primary : C.text}
                  />
                </Pressable>

                {isOpen && (
                  <View className="mb-1 flex-row flex-wrap gap-2 px-1">
                    {regions.map((region) => (
                      <RegionChip
                        key={region.stn}
                        region={region}
                        isSelected={region.stn === selectedStn}
                        onPress={onSelect}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

function HiveScheduleTargetPicker({
  hives,
  selectedHiveId,
  onSelectHive,
}: {
  hives: Array<{ id: string; name: string }>;
  selectedHiveId?: string;
  onSelectHive: (hiveId: string) => void;
}) {
  if (hives.length <= 1) return null;

  return (
    <View className="mb-4">
      <PretendardFont weight="bold" className="mb-2 text-[13px] text-toss-text">
        스케줄 적용 벌통
      </PretendardFont>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {hives.map((hive) => {
          const selected = hive.id === selectedHiveId;
          return (
            <Pressable
              key={hive.id}
              onPress={() => onSelectHive(hive.id)}
              className="rounded-full px-3.5 py-2 active:opacity-70"
              style={{
                backgroundColor: selected ? C.primary : C.white,
                borderWidth: 1,
                borderColor: selected ? C.primary : C.border,
              }}
            >
              <PretendardFont
                weight="bold"
                style={{ fontSize: 13, color: selected ? C.white : C.text }}
              >
                {hive.name}
              </PretendardFont>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

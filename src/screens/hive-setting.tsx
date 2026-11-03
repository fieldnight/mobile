/**
 * 벌통 설정 화면
 * - 자동제어 스케줄은 서버 API로 조회/등록/삭제합니다.
 * - 날씨 지역은 기존처럼 로컬 설정으로 저장합니다.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { BounceScrollView } from "@/components/refresh/BounceScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideFooterOnScroll } from "@/stores/useFooterVisibility";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KMA_REGIONS } from "@/types";
import { Card } from "@/components/hive/hive-shared";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { C } from "@/constants/hive-colors";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { useSyncHiveList } from "@/features/hive";
import { useOrderedHives } from "@/features/hive";
import { RISE_DURATION_MS, riseDelay } from "@/features/hive-home";
import { createHiveWifiAdapter } from "@/features/hive-wifi";
import { DeviceWifiSetupSheet } from "@/features/device-wifi-setup";
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
  // 아래로 스크롤하면 하단 탭바를 숨기고, 위로 당기면 다시 보여줍니다.
  const footerScroll = useHideFooterOnScroll();
  const hives = useOrderedHives();

  useSyncHiveList();

  // 벌통 홈의 Wi-Fi 카드에서 들어오면 그 벌통을 먼저 선택합니다.
  const { selectedHiveId: routeHiveId } = useLocalSearchParams<{ selectedHiveId?: string }>();
  const [selectedHiveId, setSelectedHiveId] = useState<string | undefined>(
    routeHiveId ?? hives[0]?.id,
  );
  const [selectedStn, setSelectedStn] = useState<number>(108);
  const [searchText, setSearchText] = useState("");
  const [wifiSetupVisible, setWifiSetupVisible] = useState(false);
  const [hiveSelectVisible, setHiveSelectVisible] = useState(false);
  const { show: showToast } = useAppToast();

  const selectedHive =
    hives.find((hive) => hive.id === selectedHiveId) ?? hives[0];

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(WEATHER_REGION_KEY).then((value) => {
      if (!active || !value) return;
      const saved = JSON.parse(value) as WeatherRegion;
      if (KMA_REGIONS.some((region) => region.stn === saved.stn)) setSelectedStn(saved.stn);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

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

  const handleSelectRegion = async (region: WeatherRegion) => {
    const prev = selectedStn;
    setSelectedStn(region.stn);
    try {
      await AsyncStorage.setItem(
        WEATHER_REGION_KEY,
        JSON.stringify({ stn: region.stn, name: region.name }),
      );
      showToast(`날씨 지역을 ${region.name}(으)로 바꿨어요`, "success");
    } catch {
      setSelectedStn(prev);
      showToast("날씨 지역을 저장하지 못했어요. 다시 시도해 주세요.", "error");
    }
  };

  return (
    <ImageBackground source={BG_IMAGE} resizeMode="cover" className="flex-1">
      <HiveTabBar />
      <BounceScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingTop: Spacing.xs,
          gap: Spacing.xl,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={footerScroll.onScroll}
        scrollEventThrottle={footerScroll.scrollEventThrottle}
      >
        <Card duration={RISE_DURATION_MS} delay={riseDelay(0)} translucent style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View className="flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-900">
              <Feather name="clock" size={16} color={C.white} />
            </View>
            <View>
              <PretendardFont
                weight="bold"
                className="text-[14px] text-gray-900"
              >
                실시간 데이터는 수신 즉시 반영돼요
              </PretendardFont>
              <PretendardFont className="mt-0.5 text-[12px] leading-[17px] text-gray-800">
                벌통 센서 값이 도착하면 화면이 바로 업데이트돼요.
              </PretendardFont>
            </View>
          </View>
          <Feather name="info" size={18} color={C.sec} />
        </Card>

        <Card duration={RISE_DURATION_MS} delay={riseDelay(1)} translucent>
          <View className="flex-row items-center gap-3">
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: C.infoBg }}
            >
              <Feather name="wifi" size={19} color={C.primary} />
            </View>
            <View className="flex-1">
              <PretendardFont
                weight="bold"
                className="text-[17px] text-toss-text"
              >
                벌통 Wi-Fi 설정
              </PretendardFont>
              <PretendardFont className="mt-0.5 text-[13px] leading-[19px] text-toss-sec">
                설치 장소가 바뀌거나 공유기를 교체했을 때 다시 연결해요.
              </PretendardFont>
            </View>
          </View>

          {selectedHive && (
            <Pressable
              onPress={() => {
                if (hives.length < 2) return;
                setHiveSelectVisible(true);
              }}
              className="mt-4 flex-row items-center justify-between rounded-xl px-3.5 py-3 active:opacity-70"
              style={{ backgroundColor: C.bg }}
            >
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 13, color: C.textAlt }}
              >
                설정할 벌통
              </PretendardFont>
              <View className="flex-row items-center gap-1">
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 13, color: C.text }}
                >
                  {selectedHive.name}
                </PretendardFont>
                {hives.length > 1 && (
                  <Feather name="chevron-down" size={16} color={C.sec} />
                )}
              </View>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              setWifiSetupVisible(true);
            }}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
            style={{ backgroundColor: C.primary }}
          >
            <Feather name="refresh-cw" size={16} color={C.white} />
            <PretendardFont
              weight="bold"
              style={{ fontSize: 14, color: C.white }}
            >
              Wi-Fi 연결·변경
            </PretendardFont>
          </Pressable>
        </Card>

        <Card duration={RISE_DURATION_MS} delay={riseDelay(2)} translucent>
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
        </Card>
      </BounceScrollView>

      <DeviceWifiSetupSheet
        visible={wifiSetupVisible}
        onClose={() => setWifiSetupVisible(false)}
        mode="change"
        initialDeviceId={selectedHive?.macAddress}
        adapter={createHiveWifiAdapter("change", selectedHive?.macAddress ?? "")}
        onProvisioned={() => showToast("벌통 Wi-Fi를 바꿨어요.", "success")}
      />

      <BottomSheet
        visible={hiveSelectVisible}
        onClose={() => setHiveSelectVisible(false)}
        title="설정할 벌통 선택"
        snapHeight={0.55}
      >
        <View>
          {hives.map((hive) => {
            const isSelected = hive.id === selectedHiveId;
            return (
              <Pressable
                key={hive.id}
                onPress={() => {
                  setSelectedHiveId(hive.id);
                  setHiveSelectVisible(false);
                }}
                className="mb-2 flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-80"
                style={{ backgroundColor: C.bg }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 14.5, color: C.text }}
                >
                  {hive.name}
                </PretendardFont>
                <View
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: isSelected ? C.primary : C.white }}
                >
                  <Feather
                    name={isSelected ? "check" : "circle"}
                    size={15}
                    color={isSelected ? C.white : C.border}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
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


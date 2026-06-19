/**
 * 벌통 설정 화면
 * - 기상 지역, 데이터 간격, 자동 스케줄 설정을 저장/로드
 * - useEffect : AsyncStorage에서 이전 설정 불러오기
 * - filteredRegions : 검색어에 따른 지역 필터링
 * - handleSelectRegion/handleSelectInterval/handleToggleSchedule : 선택값 저장 + 저장 완료 메시지 처리
 */
import { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Switch,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KMA_REGIONS, DATA_INTERVALS } from "@/types";
import { BeeBoxCard } from "@/components/BeeboxCard";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { HiveTabBar } from "@/components/hive/HiveTabBar";
import { Spacing } from "../constants";

const BG_IMAGE = require("../../assets/df.jpg");

export const WEATHER_REGION_KEY = "webee_weather_region";
export const DATA_INTERVAL_KEY = "webee_data_interval";
export const AUTO_SCHEDULE_KEY = "webee_auto_schedule";

export interface ScheduleSlot {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
  enabled: boolean;
}

export interface WeatherRegion {
  stn: number;
  name: string;
}

export default function HiveSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedStn, setSelectedStn] = useState<number>(108);
  const [searchText, setSearchText] = useState("");
  const [savedMessage, setSavedMessage] = useState(false);
  const [dataInterval, setDataInterval] = useState<number>(5);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([
    { id: "dawn", label: "새벽", startHour: 0, endHour: 6, enabled: false },
    { id: "morning", label: "오전", startHour: 6, endHour: 12, enabled: true },
    { id: "after", label: "오후", startHour: 12, endHour: 18, enabled: true },
    { id: "night", label: "야간", startHour: 18, endHour: 24, enabled: false },
  ]);

  useEffect(() => {
    AsyncStorage.getItem(WEATHER_REGION_KEY).then((val) => {
      if (val) {
        const parsed = JSON.parse(val);
        setSelectedStn(parsed.stn);
      }
    });
    AsyncStorage.getItem(DATA_INTERVAL_KEY).then((val) => {
      if (val) setDataInterval(parseInt(val));
    });
    AsyncStorage.getItem(AUTO_SCHEDULE_KEY).then((val) => {
      if (val) setScheduleSlots(JSON.parse(val));
    });
  }, []);

  const filteredRegions = useMemo(() => {
    if (!searchText.trim()) return KMA_REGIONS;
    return KMA_REGIONS.filter((r) => r.name.includes(searchText.trim()));
  }, [searchText]);

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelectRegion = async (region: WeatherRegion) => {
    haptic();
    setSelectedStn(region.stn);
    await AsyncStorage.setItem(
      WEATHER_REGION_KEY,
      JSON.stringify({ stn: region.stn, name: region.name }),
    );
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleSelectInterval = async (value: number) => {
    haptic();
    setDataInterval(value);
    await AsyncStorage.setItem(DATA_INTERVAL_KEY, String(value));
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleToggleSchedule = async (slotId: string) => {
    haptic();
    const updated = scheduleSlots.map((s) =>
      s.id === slotId ? { ...s, enabled: !s.enabled } : s,
    );
    setScheduleSlots(updated);
    await AsyncStorage.setItem(AUTO_SCHEDULE_KEY, JSON.stringify(updated));
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const selectedRegionName =
    KMA_REGIONS.find((r) => r.stn === selectedStn)?.name || "서울";

  return (
    <ImageBackground source={BG_IMAGE} resizeMode="cover" className="flex-1">
      <HiveTabBar />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingTop: Spacing.sm,
          gap: 16,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 센서 데이터 수신 주기 안내: 전체보기의 얇은 스트립 UI와 같은 톤입니다. */}
        <View className="flex-row items-center justify-between rounded-2xl border border-white/50 bg-white/70 px-4 py-3">
          <View className="flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-900">
              <Feather name="clock" size={16} color={C.white} />
            </View>
            <View>
              <PretendardFont weight="bold" className="text-[14px] text-gray-900">
                실시간 온·습도는 5분마다 업데이트돼요
              </PretendardFont>
              <PretendardFont className="mt-0.5 text-[12px] leading-[17px] text-gray-800">
                센서 데이터는 최대 5분 전 기준이에요
              </PretendardFont>
            </View>
          </View>
          <Feather name="info" size={18} color={C.sec} />
        </View>

        <BeeBoxCard delay={100} variant="setting">
          <View className="mb-3 flex-row items-center gap-2.5">
            <View
              className="items-center justify-center rounded-lg p-2"
              style={{ backgroundColor: C.bg }}
            >
              <Feather name="calendar" size={18} color={C.text} />
            </View>
            <View className="flex-1">
              <PretendardFont
                weight="bold"
                className="text-[18px] text-toss-text"
              >
                자동 제어 스케줄
              </PretendardFont>
              <PretendardFont className="mt-0.5 text-[14px] leading-[20px] text-toss-sec">
                시간대별로 자동 제어를 켜거나 끌 수 있어요
              </PretendardFont>
            </View>
          </View>

          {scheduleSlots.map((slot, idx) => (
            <View
              key={slot.id}
              className="flex-row items-center justify-between py-3.5"
              style={{
                borderBottomWidth: idx < scheduleSlots.length - 1 ? 1 : 0,
                borderBottomColor: C.border,
              }}
            >
              <View className="gap-0.5">
                <PretendardFont
                  weight="semibold"
                  className="text-[16px] text-toss-text"
                >
                  {slot.label}
                </PretendardFont>
                <PretendardFont className="text-[14px] text-toss-sec">
                  {String(slot.startHour).padStart(2, "0")}:00 ~{" "}
                  {String(slot.endHour).padStart(2, "0")}:00
                </PretendardFont>
              </View>
              <Switch
                value={slot.enabled}
                onValueChange={() => handleToggleSchedule(slot.id)}
                trackColor={{ false: C.border, true: C.text }}
                thumbColor={C.white}
                data-testid={`switch-schedule-${slot.id}`}
              />
            </View>
          ))}

          <PretendardFont className="mt-2 text-[13px] leading-[18px] text-toss-ter">
            꺼진 시간대에는 자동 제어가 작동하지 않아요. 수동 제어는 언제든
            가능합니다.
          </PretendardFont>
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
                날씨 관측 지역을 선택하세요
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

          <View className="flex-row flex-wrap gap-2">
            {filteredRegions.map((region) => {
              const isSelected = region.stn === selectedStn;
              return (
                <Pressable
                  key={region.stn}
                  onPress={() => handleSelectRegion(region)}
                  className="rounded-full px-3.5 py-2"
                  style={{
                    borderWidth: 1,
                    borderColor: isSelected ? C.primary : C.border,
                    backgroundColor: isSelected ? C.primarySoft : C.white,
                  }}
                  data-testid={`button-region-${region.stn}`}
                >
                  <PretendardFont
                    weight={isSelected ? "bold" : "medium"}
                    style={{
                      fontSize: 14,
                      color: isSelected ? C.primary : C.text,
                    }}
                  >
                    {region.name}
                  </PretendardFont>
                </Pressable>
              );
            })}
            {filteredRegions.length === 0 && (
              <PretendardFont className="w-full py-5 text-center text-[14px] text-toss-sec">
                검색 결과가 없습니다
              </PretendardFont>
            )}
          </View>

          <PretendardFont className="mt-3 text-[13px] leading-[18px] text-toss-ter">
            내 농장에서 가장 가까운 관측소를 선택해 주세요.
          </PretendardFont>
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
            저장되었습니다!
          </PretendardFont>
        </Animated.View>
      )}
    </ImageBackground>
  );
}

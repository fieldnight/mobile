import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KMA_REGIONS, DATA_INTERVALS } from "@/types";
import { BeeBoxCard } from "@/components/BeeboxCard";
import AppHeader from "@/components/AppHeader";
import { router } from "expo-router";

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
    <View className="flex-1 bg-gray-100">
      <AppHeader title="설정" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BeeBoxCard delay={0}>
          <View className="mb-3 flex-row items-center gap-2.5">
            <View className="items-center justify-center rounded-lg bg-[#E8F1FF] p-2">
              <Feather name="clock" size={18} color="#3182F6" />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-toss-text">
                데이터 기록 주기
              </Text>
              <Text className="mt-0.5 text-[13px] leading-[18px] text-toss-sec">
                센서 데이터를 얼마나 자주 기록할지 선택하세요
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2.5">
            {DATA_INTERVALS.map((item) => {
              const isSelected = item.value === dataInterval;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => handleSelectInterval(item.value)}
                  className={`flex-1 items-center rounded-xl border py-3 ${isSelected ? "border-toss-blue bg-[#E8F1FF]" : "border-[#E5E8EB] bg-[#F8F9FA]"}`}
                  data-testid={`button-interval-${item.value}`}
                >
                  <Text
                    className={`text-[15px] ${isSelected ? "font-bold text-toss-blue" : "font-medium text-[#4E5968]"}`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-3 text-[12px] leading-[17px] text-toss-ter">
            주기가 짧을수록 더 정밀한 데이터를 볼 수 있지만, 저장 공간을 더 많이
            사용해요.
          </Text>
        </BeeBoxCard>

        <BeeBoxCard delay={100}>
          <View className="mb-3 flex-row items-center gap-2.5">
            <View className="items-center justify-center rounded-lg bg-[#E8F1FF] p-2">
              <Feather name="calendar" size={18} color="#3182F6" />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-toss-text">
                자동 제어 스케줄
              </Text>
              <Text className="mt-0.5 text-[13px] leading-[18px] text-toss-sec">
                시간대별로 자동 제어를 켜거나 끌 수 있어요
              </Text>
            </View>
          </View>

          {scheduleSlots.map((slot, idx) => (
            <View
              key={slot.id}
              className={`flex-row items-center justify-between py-3.5 ${idx < scheduleSlots.length - 1 ? "border-b border-[#F0F1F3]" : ""}`}
            >
              <View className="gap-0.5">
                <Text className="text-[15px] font-semibold text-toss-text">
                  {slot.label}
                </Text>
                <Text className="text-[13px] text-toss-sec">
                  {String(slot.startHour).padStart(2, "0")}:00 ~{" "}
                  {String(slot.endHour).padStart(2, "0")}:00
                </Text>
              </View>
              <Switch
                value={slot.enabled}
                onValueChange={() => handleToggleSchedule(slot.id)}
                trackColor={{ false: "#E5E8EB", true: "#D4A017" }}
                thumbColor="#FFFFFF"
                data-testid={`switch-schedule-${slot.id}`}
              />
            </View>
          ))}

          <Text className="mt-2 text-[12px] leading-[17px] text-toss-ter">
            꺼진 시간대에는 자동 제어가 작동하지 않아요. 수동 제어는 언제든
            가능합니다.
          </Text>
        </BeeBoxCard>

        <BeeBoxCard delay={200}>
          <View className="mb-3 flex-row items-center gap-2.5">
            <View className="items-center justify-center rounded-lg bg-[#E8F1FF] p-2">
              <Feather name="map-pin" size={18} color="#3182F6" />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-toss-text">
                일기예보 지역 설정
              </Text>
              <Text className="mt-0.5 text-[13px] leading-[18px] text-toss-sec">
                날씨 관측 지역을 선택하세요
              </Text>
            </View>
          </View>

          <View className="mb-3 flex-row items-center justify-between rounded-xl bg-[#F0F6FF] p-3.5">
            <Text className="text-[15px] font-semibold text-toss-text">
              현재 지역
            </Text>
            <View className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1.5">
              <Feather name="map-pin" size={13} color="#3182F6" />
              <Text className="text-[15px] font-bold text-toss-blue">
                {selectedRegionName}
              </Text>
            </View>
          </View>

          <View className="mb-3 flex-row items-center gap-2 rounded-xl border border-[#E5E8EB] bg-[#F8F9FA] px-3 py-2.5">
            <Feather name="search" size={16} color="#8B95A1" />
            <TextInput
              className="m-0 flex-1 p-0 text-[15px] text-toss-text"
              placeholder="지역 검색..."
              placeholderTextColor="#B0B8C1"
              value={searchText}
              onChangeText={setSearchText}
              data-testid="input-search-region"
            />
            {searchText.length > 0 && (
              <Pressable
                onPress={() => setSearchText("")}
                data-testid="button-clear-search"
              >
                <Feather name="x-circle" size={16} color="#8B95A1" />
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
                  className={`rounded-full border px-3.5 py-2 ${isSelected ? "border-toss-blue bg-[#E8F1FF]" : "border-[#E5E8EB] bg-[#F8F9FA]"}`}
                  data-testid={`button-region-${region.stn}`}
                >
                  <Text
                    className={`text-sm ${isSelected ? "font-bold text-toss-blue" : "font-medium text-[#4E5968]"}`}
                  >
                    {region.name}
                  </Text>
                </Pressable>
              );
            })}
            {filteredRegions.length === 0 && (
              <Text className="w-full py-5 text-center text-sm text-toss-sec">
                검색 결과가 없습니다
              </Text>
            )}
          </View>

          <Text className="mt-3 text-[12px] leading-[17px] text-toss-ter">
            내 농장에서 가장 가까운 관측소를 선택해 주세요.
          </Text>
        </BeeBoxCard>
      </ScrollView>

      {savedMessage && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="absolute left-0 right-0 z-[999] mx-auto max-w-[200px] flex-row items-center justify-center gap-1.5 self-center rounded-full bg-black/75 px-5 py-2.5"
          style={{ top: insets.top + 60 }}
        >
          <Feather name="check-circle" size={16} color="#FFFFFF" />
          <Text className="text-sm font-semibold text-white">
            저장되었습니다!
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

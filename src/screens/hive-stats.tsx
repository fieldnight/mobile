/**
 * 벌통 통계 화면
 * - 벌통 선택 / 기간 탭 / 날씨 / 차트·테이블 조합을 조립하는 최상위 Screen
 * - 상태(period, selectedHive, tableView)만 보유하고 렌더링은 하위 컴포넌트에 위임
 */

import { useState } from "react";
import { View, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";

import { Colors, Spacing } from "../constants";
import { ThemedText, Card } from "@/components/hive-shared";
import {
  HiveSelector,
  PeriodCard,
  ChartCards,
  DataTable,
} from "@/features/hive-status";
import { WeatherSection } from "../components/hive-weather";
import {
  useWeatherRegion,
  useMakeWeather,
  hiveDataMap,
} from "@/features/hive-status";
import type { Period } from "../types";

export default function HiveStatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [period, setPeriod] = useState<Period>("일간");
  const [selectedHive, setSelectedHive] = useState("1");
  const [tableView, setTableView] = useState(false);

  const { stn, regionName } = useWeatherRegion();
  const { todayWeather, weeklyWeather, loading, errorMsg } =
    useMakeWeather(stn);

  const data = hiveDataMap[selectedHive][period];
  const lastPoint = data[data.length - 1];

  const haptic = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSettings = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    (navigation as any).navigate("hive-setting");
  };

  return (
    <View className="flex-1 bg-[#F4F5F7]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-[#E5E8EB]">
        <Pressable
          onPress={() => {
            haptic();
            navigation.goBack();
          }}
          className="w-10 h-10 items-center justify-center -ml-2"
          data-testid="button-back-stats"
        >
          <Feather name="chevron-left" size={24} color={Colors.text} />
        </Pressable>
        <ThemedText className="text-lg font-semibold text-[#191F28]">
          벌통 통계
        </ThemedText>
        <Pressable
          onPress={handleSettings}
          className="w-10 h-10 items-center justify-center"
          data-testid="button-settings"
        >
          <Feather name="settings" size={20} color={Colors.text} />
        </Pressable>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: Spacing.lg,
          gap: Spacing.md,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <HiveSelector
          selectedHive={selectedHive}
          onSelect={setSelectedHive}
          currentTemp={lastPoint.temp}
          currentHumidity={lastPoint.humidity}
        />

        <PeriodCard period={period} onSelect={setPeriod}>
          <WeatherSection
            period={period}
            stn={stn}
            regionName={regionName}
            loading={loading}
            errorMsg={errorMsg}
            todayWeather={todayWeather}
            weeklyWeather={weeklyWeather}
          />
        </PeriodCard>

        {/* Section header */}
        <View className="flex-row items-center justify-between mt-2 -mb-1">
          <ThemedText className="text-base font-semibold text-[#8B95A1]">
            스마트벌통 내부 통계
          </ThemedText>
          <Pressable
            onPress={() => {
              haptic();
              setTableView((v) => !v);
            }}
            className={`flex-row items-center gap-1 px-[10px] py-[5px] rounded-[14px] border ${
              tableView
                ? "bg-[#3182F6] border-[#3182F6]"
                : "bg-white border-[#E5E8EB]"
            }`}
            data-testid="button-table-view"
          >
            <Feather
              name="grid"
              size={13}
              color={tableView ? "#FFFFFF" : Colors.textSecondary}
            />
            <ThemedText
              className={`text-[13px] font-medium ${tableView ? "text-white" : "text-[#8B95A1]"}`}
            >
              표로 보기
            </ThemedText>
          </Pressable>
        </View>

        {tableView ? (
          <DataTable data={data} period={period} />
        ) : (
          <ChartCards data={data} />
        )}

        {/* Info card */}
        <Card delay={300}>
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-[10px] bg-[#E8F2FF] items-center justify-center mr-3">
              <Feather name="info" size={18} color={Colors.primary} />
            </View>
            <View className="flex-1">
              <ThemedText className="text-[15px] font-semibold text-[#191F28]">
                적정 범위 안내
              </ThemedText>
              <ThemedText className="text-[13px] text-[#8B95A1] mt-0.5 leading-[18px]">
                온도 34~35°C, 습도 50~70%가 꿀벌에게 최적의 환경입니다.
              </ThemedText>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

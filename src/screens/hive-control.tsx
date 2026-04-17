import React, { useState } from "react";
import { View, ScrollView, Pressable, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { initialControls, BoxColor as C } from "@/types";
import { BeeBoxCard } from "@/components/BeeboxCard";
import { ControlItem } from "@/features/hive-control/UI/controlItem";
import { HiveBeeBoxCard } from "@/features/hive-control/UI/hiveBeeBoxCard";
import { QcToggleButton } from "@/features/hive-control/UI/qctoggleButton";
import { HiveDropdown } from "@/features/hive-control/UI/dropdown";
import AppHeader from "@/components/AppHeader";
import { router } from "expo-router";

interface HiveData {
  id: string;
  name: string;
  status: "online" | "offline";
  temperature: number;
  humidity: number;
  weight: number;
  beeActivity: "high" | "medium" | "low";
  lastUpdate: string;
}

const mockHives: HiveData[] = [
  {
    id: "1",
    name: "벌통 1호",
    status: "online",
    temperature: 34.5,
    humidity: 62,
    weight: 28.3,
    beeActivity: "high",
    lastUpdate: "2분 전",
  },
  {
    id: "2",
    name: "벌통 2호",
    status: "online",
    temperature: 33.8,
    humidity: 58,
    weight: 31.2,
    beeActivity: "medium",
    lastUpdate: "5분 전",
  },
  {
    id: "3",
    name: "벌통 3호",
    status: "offline",
    temperature: 0,
    humidity: 0,
    weight: 25.1,
    beeActivity: "low",
    lastUpdate: "3시간 전",
  },
];

interface ControlSetting {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  enabled: boolean;
}

interface ActiveTag {
  label: string;
  color: string;
  bg: string;
}

interface HiveControlState {
  controls: ControlSetting[];
  heaterOn: boolean;
  coolerOn: boolean;
  ventOn: boolean;
  circOn: boolean;
}

function createInitialHiveControls(): Record<string, HiveControlState> {
  const state: Record<string, HiveControlState> = {};
  mockHives.forEach((hive) => {
    state[hive.id] = {
      controls: initialControls.map((c) => ({ ...c })),
      heaterOn: false,
      coolerOn: false,
      ventOn: hive.id === "1",
      circOn: false,
    };
  });
  return state;
}

function getDisabledState(controls: ControlSetting[]) {
  const heatingAuto =
    controls.find((c) => c.id === "heating")?.enabled ?? false;
  const humidityAuto =
    controls.find((c) => c.id === "humidity")?.enabled ?? false;
  const ventilationAuto =
    controls.find((c) => c.id === "ventilation")?.enabled ?? false;
  return {
    heaterDisabled: heatingAuto,
    coolerDisabled: heatingAuto,
    ventDisabled: humidityAuto || ventilationAuto,
    circDisabled: humidityAuto || ventilationAuto,
  };
}

export default function HiveControlScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [hiveControls, setHiveControls] = useState<
    Record<string, HiveControlState>
  >(createInitialHiveControls);
  const [selectedHive, setSelectedHive] = useState<string | null>(null);
  const [qcHive, setQcHive] = useState("1");
  const [qcHiveDropdownOpen, setQcHiveDropdownOpen] = useState(false);
  const [autoHive, setAutoHive] = useState("1");
  const [autoHiveDropdownOpen, setAutoHiveDropdownOpen] = useState(false);

  const isQcAll = qcHive === "all";
  const isAutoAll = autoHive === "all";

  const getAllMergedState = (): HiveControlState => {
    const ids = mockHives.map((h) => h.id);
    const first = hiveControls[ids[0]];
    return {
      controls: first.controls.map((c, i) => ({
        ...c,
        enabled: ids.every((id) => hiveControls[id].controls[i].enabled),
      })),
      heaterOn: ids.every((id) => hiveControls[id].heaterOn),
      coolerOn: ids.every((id) => hiveControls[id].coolerOn),
      ventOn: ids.every((id) => hiveControls[id].ventOn),
      circOn: ids.every((id) => hiveControls[id].circOn),
    };
  };

  const currentQc = isQcAll ? getAllMergedState() : hiveControls[qcHive];
  const currentAuto = isAutoAll ? getAllMergedState() : hiveControls[autoHive];
  const { heaterDisabled, coolerDisabled, ventDisabled, circDisabled } =
    getDisabledState(currentQc.controls);

  const handleToggleControl = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isAutoAll) {
      const currentVal =
        currentAuto.controls.find((c) => c.id === id)?.enabled ?? false;
      const newVal = !currentVal;
      setHiveControls((prev) => {
        const next = { ...prev };
        mockHives.forEach((h) => {
          next[h.id] = {
            ...next[h.id],
            controls: next[h.id].controls.map((c) =>
              c.id === id ? { ...c, enabled: newVal } : c,
            ),
          };
        });
        return next;
      });
    } else {
      setHiveControls((prev) => ({
        ...prev,
        [autoHive]: {
          ...prev[autoHive],
          controls: prev[autoHive].controls.map((c) =>
            c.id === id ? { ...c, enabled: !c.enabled } : c,
          ),
        },
      }));
    }
  };

  const handleHivePress = (hiveId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedHive(selectedHive === hiveId ? null : hiveId);
  };

  const handleSettings = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    (navigation as any).navigate("hive-setting");
  };

  const handleStatsPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    (navigation as any).navigate("hive-stats");
  };

  const hapticLight = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleQuickControl = (
    key: "heaterOn" | "coolerOn" | "ventOn" | "circOn",
  ) => {
    hapticLight();
    if (isQcAll) {
      const newVal = !currentQc[key];
      const updates: Partial<HiveControlState> = { [key]: newVal };
      if (key === "heaterOn" && newVal) updates.coolerOn = false;
      if (key === "coolerOn" && newVal) updates.heaterOn = false;
      if (key === "ventOn" && newVal) updates.circOn = false;
      if (key === "circOn" && newVal) updates.ventOn = false;
      setHiveControls((prev) => {
        const next = { ...prev };
        mockHives.forEach((h) => {
          next[h.id] = { ...next[h.id], ...updates };
        });
        return next;
      });
    } else {
      setHiveControls((prev) => {
        const cur = prev[qcHive];
        const newVal = !cur[key];
        const updates: Partial<HiveControlState> = { [key]: newVal };
        if (key === "heaterOn" && newVal) updates.coolerOn = false;
        if (key === "coolerOn" && newVal) updates.heaterOn = false;
        if (key === "ventOn" && newVal) updates.circOn = false;
        if (key === "circOn" && newVal) updates.ventOn = false;
        return { ...prev, [qcHive]: { ...cur, ...updates } };
      });
    }
  };

  const selectedQcHiveName =
    mockHives.find((h) => h.id === qcHive)?.name ?? mockHives[0].name;
  const selectedAutoHiveName =
    mockHives.find((h) => h.id === autoHive)?.name ?? mockHives[0].name;

  const onlineCount = mockHives.filter((h) => h.status === "online").length;

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header */}

      <AppHeader
        title="내 농장"
        onBack={() => router.back()}
        rightAction={{
          icon: "settings",
          color: "#191F28",
          onPress: handleSettings,
          testId: "button-settings",
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary BeeBoxCard */}
        <BeeBoxCard delay={0}>
          <View className="flex-row justify-between items-center">
            <View>
              <Text style={{ fontSize: 18, fontWeight: "600", color: C.text }}>
                연결된 벌통
              </Text>
              <Text style={{ fontSize: 13, color: C.sec, marginTop: 2 }}>
                실시간 모니터링 중
              </Text>
            </View>
            <View className="items-end gap-2">
              <View className="flex-row items-baseline">
                <Text
                  style={{ fontSize: 32, fontWeight: "700", color: C.primary }}
                >
                  {onlineCount}
                </Text>
                <Text style={{ fontSize: 16, color: C.sec, marginLeft: 4 }}>
                  / {mockHives.length}대
                </Text>
              </View>
              <Pressable
                onPress={handleStatsPress}
                className="flex-row items-center gap-1 rounded-lg"
                style={{
                  backgroundColor: "#2C2C2C",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
                data-testid="button-stats"
              >
                <Feather name="bar-chart-2" size={14} color="#FFFFFF" />
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}
                  onPress={handleStatsPress}
                >
                  통계 보기
                </Text>
              </Pressable>
            </View>
          </View>
        </BeeBoxCard>

        {/* Quick Control BeeBoxCard */}
        <View className="relative z-10">
          <BeeBoxCard delay={50}>
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontSize: 16, fontWeight: "600", color: C.text }}>
                빠른 제어
              </Text>
              <Pressable
                onPress={() => {
                  hapticLight();
                  setQcHiveDropdownOpen(!qcHiveDropdownOpen);
                }}
                className="flex-row items-center gap-1.5 rounded-lg"
                style={{
                  backgroundColor: C.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
                data-testid="button-qc-hive-selector"
              >
                <Feather name="box" size={14} color={C.primary} />
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: C.text }}
                >
                  {selectedQcHiveName}
                </Text>
                <Feather
                  name={qcHiveDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={C.sec}
                />
              </Pressable>
            </View>

            <View className="flex-row gap-2">
              <QcToggleButton
                label="히터"
                icon="sun"
                isOn={currentQc.heaterOn}
                disabled={heaterDisabled}
                onColor={C.error}
                bgOn="#FFEBEE"
                onPress={() => toggleQuickControl("heaterOn")}
                testId="button-heater"
              />
              <QcToggleButton
                label="쿨러"
                icon="wind"
                isOn={currentQc.coolerOn}
                disabled={coolerDisabled}
                onColor={C.primary}
                bgOn="#E3F2FD"
                onPress={() => toggleQuickControl("coolerOn")}
                testId="button-cooler"
              />
              <QcToggleButton
                label="환기"
                icon="refresh-cw"
                isOn={currentQc.ventOn}
                disabled={ventDisabled}
                onColor={C.success}
                bgOn="#E8F5E9"
                onPress={() => toggleQuickControl("ventOn")}
                testId="button-vent"
              />
              <QcToggleButton
                label="순환"
                icon="rotate-cw"
                isOn={currentQc.circOn}
                disabled={circDisabled}
                onColor={C.warning}
                bgOn="#FFF3E0"
                onPress={() => toggleQuickControl("circOn")}
                testId="button-circ"
              />
            </View>
          </BeeBoxCard>

          {qcHiveDropdownOpen && (
            <HiveDropdown
              hives={mockHives}
              selectedId={qcHive}
              onSelect={(id) => {
                hapticLight();
                setQcHive(id);
                setQcHiveDropdownOpen(false);
              }}
              onClose={() => setQcHiveDropdownOpen(false)}
              testPrefix="qc"
            />
          )}
        </View>

        {/* Hive Status Section */}
        <View style={{ marginTop: 8, marginBottom: -4 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: C.sec }}>
            벌통 현황
          </Text>
        </View>

        {mockHives.map((hive, index) => {
          const hc = hiveControls[hive.id];
          const hcDisabled = getDisabledState(hc.controls);
          const tags: ActiveTag[] = [];
          hc.controls.forEach((c) => {
            if (c.enabled) {
              const tagConfig: Record<
                string,
                { label: string; color: string; bg: string }
              > = {
                ventilation: {
                  label: "자동환기",
                  color: "#4A4A4A",
                  bg: "#F0F0F0",
                },
                heating: { label: "온도유지", color: "#4A4A4A", bg: "#F0F0F0" },
                humidity: {
                  label: "습도조절",
                  color: "#4A4A4A",
                  bg: "#F0F0F0",
                },
                alert: { label: "알림", color: "#4A4A4A", bg: "#F0F0F0" },
              };
              if (tagConfig[c.id]) tags.push(tagConfig[c.id]);
            }
          });
          if (hc.heaterOn && !hcDisabled.heaterDisabled)
            tags.push({ label: "히터", color: "#333333", bg: "#E8E8E8" });
          if (hc.coolerOn && !hcDisabled.coolerDisabled)
            tags.push({ label: "쿨러", color: "#333333", bg: "#E8E8E8" });
          if (hc.ventOn && !hcDisabled.ventDisabled)
            tags.push({ label: "환기팬", color: "#333333", bg: "#E8E8E8" });
          if (hc.circOn && !hcDisabled.circDisabled)
            tags.push({ label: "순환", color: "#333333", bg: "#E8E8E8" });
          return (
            <BeeBoxCard key={hive.id} delay={100 + index * 50}>
              <HiveBeeBoxCard
                hive={hive}
                onPress={() => handleHivePress(hive.id)}
                activeTags={tags}
              />
            </BeeBoxCard>
          );
        })}

        {/* Auto Control BeeBoxCard */}
        <View style={{ position: "relative", zIndex: 9 }}>
          <BeeBoxCard delay={300}>
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontSize: 16, fontWeight: "600", color: C.text }}>
                자동 제어
              </Text>
              <Pressable
                onPress={() => {
                  hapticLight();
                  setAutoHiveDropdownOpen(!autoHiveDropdownOpen);
                }}
                className="flex-row items-center gap-1.5 rounded-lg"
                style={{
                  backgroundColor: C.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
                data-testid="button-auto-hive-selector"
              >
                <Feather name="box" size={14} color={C.primary} />
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: C.text }}
                >
                  {selectedAutoHiveName}
                </Text>
                <Feather
                  name={autoHiveDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={C.sec}
                />
              </Pressable>
            </View>

            {currentAuto.controls.map((control) => (
              <React.Fragment key={control.id}>
                <View
                  className="my-2"
                  style={{ height: 1, backgroundColor: C.border }}
                />
                <ControlItem control={control} onToggle={handleToggleControl} />
              </React.Fragment>
            ))}
          </BeeBoxCard>

          {autoHiveDropdownOpen && (
            <HiveDropdown
              hives={mockHives}
              selectedId={autoHive}
              onSelect={(id) => {
                hapticLight();
                setAutoHive(id);
                setAutoHiveDropdownOpen(false);
              }}
              onClose={() => setAutoHiveDropdownOpen(false)}
              testPrefix="auto"
            />
          )}
        </View>

        {/* Add Hive Button */}
        <BeeBoxCard delay={400}>
          <Pressable
            className="flex-row items-center justify-center gap-2 py-2"
            data-testid="button-add-hive"
          >
            <Feather name="plus-circle" size={22} color={C.primary} />
            <Text style={{ fontSize: 15, fontWeight: "500", color: C.primary }}>
              새 벌통 연결하기
            </Text>
          </Pressable>
        </BeeBoxCard>
      </ScrollView>
    </View>
  );
}

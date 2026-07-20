import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Circle, G, Line, Polyline } from "react-native-svg";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useHiveStore } from "@/stores/useHiveStore";
import { useSyncHiveList } from "@/features/hive";
import {
  DoorOpenerBackground,
  DoorOpenerHeroVisual,
  EMPTY_BEE_TRAFFIC_COUNTS,
  DraggableHiveSection,
  NfcDoorCardSection,
} from "@/features/door-opener";
import type { NfcDoorCardConfig } from "@/features/door-opener/components/nfcDoorCards";
import { DEFAULT_NFC_DOOR_CARDS } from "@/features/door-opener/components/nfcDoorCards";
import {
  buildDoorOpenerRuntimeState,
  getDoorOpenerRuntimeText,
  loadDoorOpenerRuntimeState,
  saveDoorOpenerRuntimeState,
  type DoorOpenerRuntimeState,
} from "@/features/door-opener/model/doorOpenerRuntime";
import type { GateActionAppConnectionStatus } from "@/features/door-opener/components/NfcDoorCardSection";
import {
  setActiveHceCard,
  subscribeHceResult,
  subscribeHceStats,
} from "@/features/door-opener/model/webeeHce";
import type {
  BeeTrafficCounts,
  HceClimateSample,
  HceResultEvent,
  HceStatsBucket,
  HceStatsEvent,
} from "@/features/door-opener/model/webeeHce";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 18;
const GAP = 16;
const CARD_W = (SCREEN_W - H_PAD * 2 - GAP) / 2 - 1;
const STATS_PANEL_PAD = 16;
const STATS_PAGE_GAP = 12;
const STATS_PAGE_W = SCREEN_W - H_PAD * 2 - STATS_PANEL_PAD * 2;
const STATS_CHART_W = Math.max(260, STATS_PAGE_W - 64);
const STATS_CHART_H = 210;
const STATS_CHART_PAD_X = 18;
const STATS_CHART_PAD_Y = 50;
const STATS_HOUR_AXIS_W = 76;

type DoorOpenerTab = "control" | "stats";
const COUNT_STATUS_CARD = DEFAULT_NFC_DOOR_CARDS.find(
  (card) => card.mode === "count_status",
)!;

interface StatsChartPoint {
  label: string;
  value: number;
}

interface StatsChartSeries {
  label: string;
  color: string;
  points: StatsChartPoint[];
}

interface HourlyStatsPoint {
  label: string;
  entered: number;
  exited: number;
  temperatureC?: number;
  humidityPercent?: number;
  climateSlots?: HourlyClimateSlot[];
}

interface HourlyClimateSlot {
  label: string;
  temperatureC?: number;
  humidityPercent?: number;
}

const SAMPLE_HOURLY_STATS: HourlyStatsPoint[] = [
  {
    label: "06시",
    entered: 12,
    exited: 18,
    temperatureC: 31.4,
    humidityPercent: 64,
    climateSlots: createSampleClimateSlots("06", 31.4, 64),
  },
  {
    label: "07시",
    entered: 34,
    exited: 49,
    temperatureC: 32.1,
    humidityPercent: 62,
    climateSlots: createSampleClimateSlots("07", 32.1, 62),
  },
  {
    label: "08시",
    entered: 66,
    exited: 82,
    temperatureC: 33.6,
    humidityPercent: 59,
    climateSlots: createSampleClimateSlots("08", 33.6, 59),
  },
  {
    label: "09시",
    entered: 91,
    exited: 121,
    temperatureC: 34.7,
    humidityPercent: 58,
    climateSlots: createSampleClimateSlots("09", 34.7, 58),
  },
  {
    label: "10시",
    entered: 114,
    exited: 138,
    temperatureC: 35.8,
    humidityPercent: 56,
    climateSlots: createSampleClimateSlots("10", 35.8, 56),
  },
  {
    label: "11시",
    entered: 102,
    exited: 126,
    temperatureC: 35.2,
    humidityPercent: 57,
    climateSlots: createSampleClimateSlots("11", 35.2, 57),
  },
  {
    label: "12시",
    entered: 88,
    exited: 95,
    temperatureC: 34.6,
    humidityPercent: 60,
    climateSlots: createSampleClimateSlots("12", 34.6, 60),
  },
];

interface DoorDeviceStats {
  deviceId: string;
  runtimeState?: DoorOpenerRuntimeState;
  bootCounts?: BeeTrafficCounts;
  buckets: HceStatsBucket[];
  climateSamples: HceClimateSample[];
  hourlyActive?: boolean;
  lastUpdatedAt?: number;
}

interface DoorStatsState {
  devices: Record<string, DoorDeviceStats>;
  lastDeviceId?: string;
}

function getKnownApduDeviceId(deviceId: string | undefined) {
  const trimmed = deviceId?.trim();
  return trimmed && trimmed.toLowerCase() !== "unknown" ? trimmed : undefined;
}

export default function DoorOpenerScreen() {
  const insets = useSafeAreaInsets();
  const hives = useHiveStore((s) => s.hives);
  const reorderHives = useHiveStore((s) => s.reorderHives);
  const [deleting, setDeleting] = useState(false);
  const [trafficCounts, setTrafficCounts] = useState<BeeTrafficCounts>(
    EMPTY_BEE_TRAFFIC_COUNTS,
  );
  const [runtimeState, setRuntimeState] =
    useState<DoorOpenerRuntimeState | null>(null);
  const [appConnectionStatus, setAppConnectionStatus] =
    useState<GateActionAppConnectionStatus>("idle");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<DoorOpenerTab>("control");
  const [statsState, setStatsState] = useState<DoorStatsState>({ devices: {} });
  const [selectedStatsDeviceId, setSelectedStatsDeviceId] = useState<
    string | undefined
  >();
  const activeHceCardRef = useRef<NfcDoorCardConfig | null>(null);
  useSyncHiveList();

  const activeHive = hives[0];
  const gateConnected = false;

  useEffect(() => {
    let cancelled = false;

    const restoreRuntime = async () => {
      const restored = await loadDoorOpenerRuntimeState();
      if (!restored || cancelled) return;
      setRuntimeState(restored);
      if (restored.counts) setTrafficCounts(restored.counts);
    };

    restoreRuntime();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const runtimeText = useMemo(
    () => getDoorOpenerRuntimeText(runtimeState, new Date(nowTick)),
    [nowTick, runtimeState],
  );

  const handleHceResult = useCallback(
    (event: HceResultEvent, card: NfcDoorCardConfig) => {
      const nextRuntimeState = buildDoorOpenerRuntimeState(card, event);
      setRuntimeState(nextRuntimeState);
      saveDoorOpenerRuntimeState(nextRuntimeState);

      if (event.counts) {
        setTrafficCounts(event.counts);
      }

      const deviceId = getKnownApduDeviceId(event.deviceId);
      if (!deviceId) {
        console.warn(
          "[DoorOpener] HCE result did not include ESP32 device id",
          event.result,
        );
        return;
      }

      setSelectedStatsDeviceId(deviceId);
      setStatsState((prev) => {
        const current = prev.devices[deviceId] ?? {
          deviceId,
          buckets: [],
          climateSamples: [],
        };

        return {
          devices: {
            ...prev.devices,
            [deviceId]: {
              ...current,
              runtimeState: nextRuntimeState,
              bootCounts: event.counts ?? current.bootCounts,
              lastUpdatedAt: Date.now(),
            },
          },
          lastDeviceId: deviceId,
        };
      });
    },
    [],
  );

  const handleHceStats = useCallback((event: HceStatsEvent) => {
    if (event.type === "unknown") return;
    const deviceId = getKnownApduDeviceId(
      "deviceId" in event ? event.deviceId : undefined,
    );
    if (!deviceId) {
      console.warn(
        "[DoorOpener] HCE stats did not include ESP32 device id",
        event.raw,
      );
      return;
    }

    setSelectedStatsDeviceId(deviceId);

    setStatsState((prev) => {
      const current = prev.devices[deviceId] ?? {
        deviceId,
        buckets: [],
        climateSamples: [],
      };
      const updated: DoorDeviceStats = {
        ...current,
        buckets: [...current.buckets],
        climateSamples: [...current.climateSamples],
        lastUpdatedAt: Date.now(),
      };

      if (event.type === "boot") {
        updated.bootCounts = event.counts;
      }

      if (event.type === "bucket") {
        const existingIndex = updated.buckets.findIndex(
          (bucket) => bucket.start === event.start && bucket.end === event.end,
        );
        const bucket: HceStatsBucket = {
          deviceId: event.deviceId,
          start: event.start,
          end: event.end,
          closed: event.closed,
          counts: event.counts,
        };

        if (existingIndex >= 0) {
          updated.buckets[existingIndex] = bucket;
        } else {
          updated.buckets.push(bucket);
        }

        updated.buckets.sort((a, b) => a.start.localeCompare(b.start));
        updated.bootCounts = sumBucketTrafficCounts(updated.buckets);
      }

      if (event.type === "climate") {
        const existingIndex = updated.climateSamples.findIndex(
          (sample) => sample.time === event.time,
        );
        const sample: HceClimateSample = {
          deviceId: event.deviceId,
          time: event.time,
          temperatureC: event.temperatureC,
          humidityPercent: event.humidityPercent,
        };

        if (existingIndex >= 0) {
          updated.climateSamples[existingIndex] = sample;
        } else {
          updated.climateSamples.push(sample);
        }

        updated.climateSamples.sort((a, b) => a.time.localeCompare(b.time));
      }

      if (event.type === "end") {
        updated.hourlyActive = event.hourlyActive;
      }

      return {
        devices: {
          ...prev.devices,
          [deviceId]: updated,
        },
        lastDeviceId: deviceId,
      };
    });
  }, []);

  const handleHceCardActivated = useCallback((card: NfcDoorCardConfig) => {
    activeHceCardRef.current = card;
  }, []);

  // The HCE service can respond after the card modal closes or while the
  // statistics tab is shown, so subscriptions belong to the screen itself.
  useEffect(() => {
    const resultSubscription = subscribeHceResult((event) => {
      const card = activeHceCardRef.current;
      if (card) handleHceResult(event, card);
      else if (event.counts) setTrafficCounts(event.counts);
    });
    const statsSubscription = subscribeHceStats(handleHceStats);

    return () => {
      resultSubscription.remove();
      statsSubscription.remove();
    };
  }, [handleHceResult, handleHceStats]);

  useEffect(() => {
    if (activeTab !== "stats") return;

    let cancelled = false;
    activeHceCardRef.current = COUNT_STATUS_CARD;

    const activateStatsHce = async () => {
      const ok = await setActiveHceCard(COUNT_STATUS_CARD);
      if (cancelled) return;

      if (!ok) {
        console.warn("[DoorOpener] 통계 화면 HCE 활성화 실패");
        return;
      }

      console.log("[DoorOpener] 통계 화면 HCE 활성화 완료");
    };

    activateStatsHce();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === "stats") {
      setRefreshing(false);
      return;
    }
    setRefreshKey((value) => value + 1);
  }, [activeTab]);

  const handleRefreshEnd = useCallback(() => {
    setRefreshing(false);
  }, []);

  return (
    <View className="flex-1">
      <DoorOpenerBackground />
      <DoorOpenerTabs activeTab={activeTab} onChange={setActiveTab} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingTop: 18,
          paddingBottom: insets.bottom + 96,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.white}
            colors={[C.primary]}
            progressBackgroundColor="rgba(255,255,255,0.92)"
          />
        }
      >
        <Animated.View entering={FadeInDown.delay(110).duration(380)}>
          {activeTab === "control" ? (
            <NfcDoorCardSection
              cardWidth={CARD_W}
              deleting={deleting}
              onToggleDeleting={() => setDeleting((value) => !value)}
              onHceCardActivated={handleHceCardActivated}
              runtimeState={runtimeState}
              runtimeText={runtimeText}
              hiveId={activeHive?.id}
              onSyncStatusChange={setAppConnectionStatus}
              refreshKey={refreshKey}
              onRefreshEnd={handleRefreshEnd}
            />
          ) : (
            <DoorStatsPanel
              stats={statsState}
              now={new Date(nowTick)}
              selectedDeviceId={selectedStatsDeviceId}
              onSelectDevice={setSelectedStatsDeviceId}
              fallbackCounts={trafficCounts}
              fallbackRuntimeState={runtimeState}
              fallbackRuntimeText={runtimeText}
              appConnectionStatus={appConnectionStatus}
              gateConnected={gateConnected}
            />
          )}
        </Animated.View>

        {activeTab === "control" ? (
          <Animated.View entering={FadeInDown.delay(220).duration(380)}>
            <DraggableHiveSection
              hives={hives}
              cardWidth={CARD_W}
              onReorder={reorderHives}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DoorOpenerTabs({
  activeTab,
  onChange,
}: {
  activeTab: DoorOpenerTab;
  onChange: (tab: DoorOpenerTab) => void;
}) {
  return (
    <View
      className="bg-white"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: "#EEF0F2",
      }}
    >
      <View className="h-16 flex-row items-end px-2">
        {(
          [
            ["control", "개폐기"],
            ["stats", "통계"],
          ] as const
        ).map(([tab, label]) => {
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              className="h-16 flex-1 items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
              onPress={() => onChange(tab)}
            >
              <PretendardFont
                weight={active ? "bold" : "semibold"}
                style={{ fontSize: 17, color: active ? C.text : C.ter }}
              >
                {label}
              </PretendardFont>

              <View
                className="absolute bottom-0 h-[3px] rounded-full"
                style={{
                  width: active ? 68 : 0,
                  backgroundColor: active ? C.text : "transparent",
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DoorStatsPanel({
  stats,
  now,
  selectedDeviceId,
  onSelectDevice,
  fallbackCounts,
  fallbackRuntimeState,
  fallbackRuntimeText,
  appConnectionStatus,
  gateConnected,
}: {
  stats: DoorStatsState;
  now: Date;
  selectedDeviceId?: string;
  onSelectDevice: (deviceId: string) => void;
  fallbackCounts: BeeTrafficCounts;
  fallbackRuntimeState: DoorOpenerRuntimeState | null;
  fallbackRuntimeText: string | null;
  appConnectionStatus: GateActionAppConnectionStatus;
  gateConnected: boolean;
}) {
  const pagerRef = useRef<ScrollView>(null);
  const devices = Object.values(stats.devices).sort((a, b) => {
    if (a.deviceId === stats.lastDeviceId) return -1;
    if (b.deviceId === stats.lastDeviceId) return 1;
    return a.deviceId.localeCompare(b.deviceId);
  });
  const selectedDevice =
    (selectedDeviceId ? stats.devices[selectedDeviceId] : undefined) ??
    devices[0];
  const selectedIndex = Math.max(
    0,
    devices.findIndex((device) => device.deviceId === selectedDevice?.deviceId),
  );
  const selectedRuntimeState =
    selectedDevice?.runtimeState ?? fallbackRuntimeState;
  const selectedRuntimeText = selectedRuntimeState
    ? getDoorOpenerRuntimeText(selectedRuntimeState, now)
    : fallbackRuntimeText;

  useEffect(() => {
    if (!selectedDevice) return;

    pagerRef.current?.scrollTo({
      x: selectedIndex * (STATS_PAGE_W + STATS_PAGE_GAP),
      animated: true,
    });
  }, [selectedDevice?.deviceId, selectedIndex]);

  const handlePageScrollEnd = useCallback(
    (offsetX: number) => {
      const index = Math.round(offsetX / (STATS_PAGE_W + STATS_PAGE_GAP));
      const nextDevice =
        devices[Math.min(Math.max(index, 0), devices.length - 1)];
      if (nextDevice) onSelectDevice(nextDevice.deviceId);
    },
    [devices, onSelectDevice],
  );

  return (
    <View className="mb-8">
      <DoorOpenerHeroVisual
        counts={selectedDevice?.bootCounts ?? fallbackCounts}
        runtimeState={selectedRuntimeState}
        runtimeText={selectedRuntimeText}
        appConnectionStatus={appConnectionStatus}
        gateConnected={gateConnected}
      />

      <View
        className="mt-3 rounded-3xl px-5 py-4"
        style={{ backgroundColor: "rgba(248,209,92,0.96)" }}
      >
        <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
          통계 수신 대기 중
        </PretendardFont>

        <PretendardFont
          weight="medium"
          style={{
            marginTop: 4,
            fontSize: 14,
            lineHeight: 20,
            color: "rgba(28,34,44,0.72)",
          }}
        >
          매일 자정에 초기화: 통계 화면을 개폐기에 대면 밤 12시부터 현재까지의
          온습도, 출입 기록을 받아와요
        </PretendardFont>
      </View>

      <View
        className="mt-3 rounded-[28px] p-4"
        style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
      >
        <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
          <PretendardFont weight="bold" style={{ fontSize: 20, color: C.white }}>
            개폐기 통계
          </PretendardFont>
          <StatsQueryBadge label="벌 출입 1시간 단위 조회" />
          <StatsQueryBadge label="온습도 10분 단위 조회" />
        </View>

        {devices.length > 0 ? (
          <>
            <View className="mt-4 flex-row items-center justify-between">
              <PretendardFont
                weight="bold"
                numberOfLines={1}
                style={{ flex: 1, fontSize: 15, color: C.white }}
              >
                {selectedDevice?.deviceId}
              </PretendardFont>
              <PretendardFont
                weight="semibold"
                style={{
                  marginLeft: 10,
                  fontSize: 14,
                  color: "rgba(255,255,255,0.68)",
                }}
              >
                {selectedIndex + 1}/{devices.length}
              </PretendardFont>
            </View>

            <ScrollView
              ref={pagerRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={STATS_PAGE_W + STATS_PAGE_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ gap: STATS_PAGE_GAP }}
              onMomentumScrollEnd={(event) =>
                handlePageScrollEnd(event.nativeEvent.contentOffset.x)
              }
            >
              {devices.map((device) => (
                <View key={device.deviceId} style={{ width: STATS_PAGE_W }}>
                  <DeviceStatsPage device={device} now={now} />
                </View>
              ))}
            </ScrollView>

            <View className="mt-3 flex-row justify-center" style={{ gap: 6 }}>
              {devices.map((device) => {
                const selected = selectedDevice?.deviceId === device.deviceId;
                return (
                  <Pressable
                    key={device.deviceId}
                    className="h-2 rounded-full active:opacity-70"
                    style={{
                      width: selected ? 18 : 7,
                      backgroundColor: selected
                        ? C.white
                        : "rgba(255,255,255,0.34)",
                    }}
                    onPress={() => onSelectDevice(device.deviceId)}
                  />
                );
              })}
            </View>
          </>
        ) : null}

        {!selectedDevice ? <ExampleStatsCharts /> : null}
      </View>
    </View>
  );
}

function DeviceStatsPage({
  device,
  now,
}: {
  device: DoorDeviceStats;
  now: Date;
}) {
  const hourlyStats = getHourlyStatsPoints(
    device.buckets,
    device.climateSamples,
  );

  return (
    <View
      className="mt-4 rounded-3xl p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
    >
      <PretendardFont weight="bold" style={{ fontSize: 17, color: C.white }}>
        {device.deviceId}
      </PretendardFont>

      {device.lastUpdatedAt ? (
        <PretendardFont
          weight="semibold"
          style={{ marginTop: 5, fontSize: 13.5, color: "#DDFBEA" }}
        >
          마지막 NFC 업데이트 ·{" "}
          {new Date(device.lastUpdatedAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </PretendardFont>
      ) : null}

      {device.runtimeState ? (
        <DeviceRuntimeCard state={device.runtimeState} now={now} />
      ) : (
        <View
          className="mt-3 rounded-3xl p-4"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <PretendardFont
            weight="bold"
            style={{ fontSize: 16, color: C.white }}
          >
            진행중 카드 없음
          </PretendardFont>
        </View>
      )}

      {device.bootCounts ? (
        <StatsCountsCard title="부팅 후 전체" counts={device.bootCounts} />
      ) : null}

      {device.hourlyActive === false ? (
        <PretendardFont
          weight="semibold"
          style={{ marginTop: 12, fontSize: 14, color: "#F8D15C" }}
        >
          아직 시간별 집계가 시작되지 않았어요. 앱 카드를 찍어 폰 시간을 전달해
          주세요.
        </PretendardFont>
      ) : null}

      <HourlyStatsChartCard
        title={hourlyStats ? "시간별 통계" : "시간별 통계 예시"}
        points={hourlyStats ?? SAMPLE_HOURLY_STATS}
      />
    </View>
  );
}

function ExampleStatsCharts() {
  return (
    <View className="mt-4">
      <HourlyStatsChartCard
        title="시간별 통계 예시"
        points={SAMPLE_HOURLY_STATS}
      />
    </View>
  );
}

function StatsQueryBadge({ label }: { label: string }) {
  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
    >
      <PretendardFont
        weight="bold"
        style={{ fontSize: 12.5, color: "#DDFBEA" }}
      >
        {label}
      </PretendardFont>
    </View>
  );
}

function HourlyStatsChartCard({
  title,
  points,
}: {
  title: string;
  points: HourlyStatsPoint[];
}) {
  const series: StatsChartSeries[] = [
    {
      label: "들어온 벌",
      color: "#B7F3E5",
      points: points.map((point) => ({
        label: point.label,
        value: point.entered,
      })),
    },
    {
      label: "나간 벌",
      color: "#F8D15C",
      points: points.map((point) => ({
        label: point.label,
        value: point.exited,
      })),
    },
  ];
  const visibleSeries = series.filter((item) => item.points.length > 0);
  if (visibleSeries.length === 0) return null;

  const axisWidth = STATS_HOUR_AXIS_W * points.length;
  const chartWidth = Math.max(STATS_CHART_W, axisWidth);
  const sharedBounds = getChartBounds(
    visibleSeries.flatMap((item) => item.points.map((point) => point.value)),
  );
  const getAxisX = (index: number) =>
    STATS_HOUR_AXIS_W * index + STATS_HOUR_AXIS_W / 2;
  const pointLabels = points.map((point, index) => ({
    key: `${point.label}-${index}`,
    entered: point.entered,
    exited: point.exited,
    x: getAxisX(index),
    y: Math.min(
      getChartY(point.entered, sharedBounds),
      getChartY(point.exited, sharedBounds),
    ),
  }));

  return (
    <View
      className="rounded-3xl p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
    >
      <View className="flex-row gap-5">
        <PretendardFont weight="bold" style={{ fontSize: 18, color: C.white }}>
          {title}
        </PretendardFont>

        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {visibleSeries.map((item) => (
            <View key={item.label} className="flex-row items-center">
              <View
                className="mr-2 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 14.5, color: "rgba(255,255,255,0.82)" }}
              >
                {item.label}
              </PretendardFont>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 14 }}
      >
        <View style={{ width: chartWidth }}>
          <View style={{ width: chartWidth, height: STATS_CHART_H }}>
            <Svg width={chartWidth} height={STATS_CHART_H}>
              {[0, 1, 2, 3].map((lineIndex) => {
                const y =
                  STATS_CHART_PAD_Y +
                  ((STATS_CHART_H - STATS_CHART_PAD_Y * 2) / 3) * lineIndex;
                return (
                  <Line
                    key={`grid-${lineIndex}`}
                    x1={STATS_HOUR_AXIS_W / 2}
                    y1={y}
                    x2={chartWidth - STATS_HOUR_AXIS_W / 2}
                    y2={y}
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth={1}
                  />
                );
              })}

              {points.map((_, index) => {
                const x = getAxisX(index);
                return (
                  <Line
                    key={`axis-${index}`}
                    x1={x}
                    y1={STATS_CHART_PAD_Y}
                    x2={x}
                    y2={STATS_CHART_H - 6}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1}
                  />
                );
              })}

              {visibleSeries.map((item) => {
                const chartPoints = item.points.map((point, index) => ({
                  x: getAxisX(index),
                  y: getChartY(point.value, sharedBounds),
                }));

                return (
                  <G key={item.label}>
                    <Polyline
                      points={chartPoints
                        .map((point) => `${point.x},${point.y}`)
                        .join(" ")}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {chartPoints.map((point, index) => (
                      <Circle
                        key={`${item.label}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={4.2}
                        fill={item.color}
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth={1}
                      />
                    ))}
                  </G>
                );
              })}
            </Svg>

            {pointLabels.map((item) => (
              <View
                key={item.key}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: item.x - 32,
                  top: Math.max(2, item.y - 66),
                  width: 64,
                  alignItems: "center",
                }}
              >
                <PretendardFont
                  weight="bold"
                  style={{
                    fontSize: 20,
                    lineHeight: 24,
                    color: "#B7F3E5",
                    textShadowColor: "rgba(0,0,0,0.35)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  입 {item.entered}
                </PretendardFont>
                <PretendardFont
                  weight="bold"
                  style={{
                    fontSize: 20,
                    lineHeight: 24,
                    color: "#F8D15C",
                    textShadowColor: "rgba(0,0,0,0.35)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  출 {item.exited}
                </PretendardFont>
              </View>
            ))}
          </View>

          <View className="flex-row">
            {points.map((point, index) => {
              const climateSlots = getDisplayClimateSlots(point);

              return (
                <View
                  key={`${point.label}-${index}`}
                  style={{ width: STATS_HOUR_AXIS_W, paddingHorizontal: 1 }}
                >
                  <PretendardFont
                    weight="bold"
                    style={{
                      fontSize: 16,
                      color: C.white,
                      textAlign: "center",
                    }}
                  >
                    {point.label}
                  </PretendardFont>

                  <View
                    className="mt-1.5 rounded-2xl px-1 py-1"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.16)",
                    }}
                  >
                    {climateSlots.map((slot, slotIndex) => (
                      <View
                        key={`${slot.label}-${slotIndex}`}
                        className="justify-center"
                        style={{ height: 23 }}
                      >
                        <PretendardFont
                          weight="bold"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.82}
                          style={{
                            fontSize: 12.2,
                            lineHeight: 16,
                            color: C.white,
                            textAlign: "center",
                          }}
                        >
                          {formatClimateSlot(slot)}
                        </PretendardFont>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function DeviceRuntimeCard({
  state,
  now,
}: {
  state: DoorOpenerRuntimeState;
  now: Date;
}) {
  const runtimeText = getDoorOpenerRuntimeText(state, now);
  const active = state.status === "ok" && state.mode !== "count_status";

  return (
    <View
      className="mt-3 rounded-3xl p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
    >
      <PretendardFont
        weight="bold"
        style={{ fontSize: 16, color: active ? "#F8D15C" : C.white }}
      >
        {active ? "현재 진행중 카드" : "마지막 찍은 카드"} · {state.title}
      </PretendardFont>
      {runtimeText ? (
        <PretendardFont
          weight="bold"
          style={{
            marginTop: 6,
            fontSize: 14.5,
            lineHeight: 20,
            color: C.white,
          }}
        >
          {runtimeText}
        </PretendardFont>
      ) : (
        <PretendardFont
          weight="medium"
          style={{
            marginTop: 6,
            fontSize: 14,
            lineHeight: 20,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          즉시 실행 카드라 다음 예약 시간은 없어요.
        </PretendardFont>
      )}
      <PretendardFont
        weight="medium"
        numberOfLines={1}
        style={{
          marginTop: 5,
          fontSize: 12.5,
          color: "rgba(255,255,255,0.66)",
        }}
      >
        APDU · {state.result}
      </PretendardFont>
    </View>
  );
}

function StatsCountsCard({
  title,
  counts,
}: {
  title: string;
  counts: BeeTrafficCounts;
}) {
  return (
    <View
      className="mt-3 rounded-3xl p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
    >
      <PretendardFont weight="bold" style={{ fontSize: 16, color: C.white }}>
        {title}
      </PretendardFont>
      <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
        <StatsMiniTile label="입구 입장" count={counts.entranceIn} />
        <StatsMiniTile label="입구 퇴장" count={counts.entranceOut} />
        <StatsMiniTile label="출구 입장" count={counts.exitIn} />
        <StatsMiniTile label="출구 퇴장" count={counts.exitOut} />
      </View>
    </View>
  );
}

function StatsMiniTile({
  label,
  count,
  suffix = "",
}: {
  label: string;
  count: number;
  suffix?: string;
}) {
  return (
    <View
      className="flex-1 rounded-2xl px-3 py-2"
      style={{ minWidth: "46%", backgroundColor: "rgba(255,255,255,0.12)" }}
    >
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 13, color: "rgba(255,255,255,0.72)" }}
      >
        {label}
      </PretendardFont>
      <PretendardFont
        weight="bold"
        style={{ marginTop: 2, fontSize: 25, color: C.white }}
      >
        {Number.isInteger(count) ? count : count.toFixed(1)}
        {suffix}
      </PretendardFont>
    </View>
  );
}

function getHourlyStatsPoints(
  buckets: HceStatsBucket[],
  climateSamples: HceClimateSample[],
): HourlyStatsPoint[] | null {
  const latestBuckets = buckets.slice(-7);
  if (latestBuckets.length > 0) {
    return latestBuckets.map((bucket) => {
      const bucketClimateSamples = climateSamples.filter((sample) =>
        isClimateSampleInBucket(sample.time, bucket.start, bucket.end),
      );
      const climate = getAverageClimate(bucketClimateSamples);

      return {
        label: formatChartHour(bucket.start),
        entered: bucket.counts.entranceIn + bucket.counts.exitIn,
        exited: bucket.counts.entranceOut + bucket.counts.exitOut,
        temperatureC: climate?.temperatureC,
        humidityPercent: climate?.humidityPercent,
        climateSlots: getClimateSlots(bucket.start, bucketClimateSamples),
      };
    });
  }

  const hourlyClimate = getHourlyClimatePoints(climateSamples);
  return hourlyClimate.length > 0 ? hourlyClimate.slice(-7) : null;
}

function sumBucketTrafficCounts(buckets: HceStatsBucket[]): BeeTrafficCounts {
  return buckets.reduce(
    (sum, bucket) => ({
      entranceIn: sum.entranceIn + bucket.counts.entranceIn,
      entranceOut: sum.entranceOut + bucket.counts.entranceOut,
      exitIn: sum.exitIn + bucket.counts.exitIn,
      exitOut: sum.exitOut + bucket.counts.exitOut,
    }),
    { ...EMPTY_BEE_TRAFFIC_COUNTS },
  );
}

function getHourlyClimatePoints(
  samples: HceClimateSample[],
): HourlyStatsPoint[] {
  const grouped = new Map<string, HceClimateSample[]>();

  samples.forEach((sample) => {
    const hourKey = /^\d{12}$/.test(sample.time)
      ? sample.time.slice(0, 10)
      : sample.time;
    grouped.set(hourKey, [...(grouped.get(hourKey) ?? []), sample]);
  });

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hourKey, hourSamples]) => {
      const climate = getAverageClimate(hourSamples);
      return {
        label:
          hourKey.length === 10 ? formatChartHour(`${hourKey}00`) : hourKey,
        entered: 0,
        exited: 0,
        temperatureC: climate?.temperatureC,
        humidityPercent: climate?.humidityPercent,
        climateSlots: getClimateSlots(`${hourKey}00`, hourSamples),
      };
    });
}

function getClimateSlots(
  hourValue: string,
  samples: HceClimateSample[],
): HourlyClimateSlot[] {
  const hour = getHourText(hourValue);
  const grouped = new Map<string, HceClimateSample[]>();

  samples.forEach((sample) => {
    const minute = getTenMinuteText(sample.time);
    grouped.set(minute, [...(grouped.get(minute) ?? []), sample]);
  });

  return [0, 10, 20, 30, 40, 50].map((minute) => {
    const minuteText = String(minute).padStart(2, "0");
    const climate = getAverageClimate(grouped.get(minuteText) ?? []);

    return {
      label: `${hour}:${minuteText}`,
      temperatureC: climate?.temperatureC,
      humidityPercent: climate?.humidityPercent,
    };
  });
}

function getDisplayClimateSlots(point: HourlyStatsPoint): HourlyClimateSlot[] {
  const slots = point.climateSlots?.length
    ? point.climateSlots
    : createFallbackClimateSlots(point);

  return slots.slice(0, 6).map((slot) => ({
    label: slot.label,
    temperatureC: slot.temperatureC ?? point.temperatureC,
    humidityPercent: slot.humidityPercent ?? point.humidityPercent,
  }));
}

function createSampleClimateSlots(
  hour: string,
  temperatureC: number,
  humidityPercent: number,
): HourlyClimateSlot[] {
  const temperatureOffsets = [-0.4, -0.1, 0.2, 0, 0.3, 0.1];
  const humidityOffsets = [2, 1, 0, -1, -2, -1];

  return [0, 10, 20, 30, 40, 50].map((minute, index) => ({
    label: `${hour}:${String(minute).padStart(2, "0")}`,
    temperatureC: temperatureC + temperatureOffsets[index],
    humidityPercent: humidityPercent + humidityOffsets[index],
  }));
}

function createFallbackClimateSlots(
  point: HourlyStatsPoint,
): HourlyClimateSlot[] {
  const hour = point.label.replace("시", "").padStart(2, "0");

  return [0, 10, 20, 30, 40, 50].map((minute) => ({
    label: `${hour}:${String(minute).padStart(2, "0")}`,
    temperatureC: point.temperatureC,
    humidityPercent: point.humidityPercent,
  }));
}

function getAverageClimate(samples: HceClimateSample[]) {
  if (samples.length === 0) return undefined;

  const totals = samples.reduce(
    (sum, sample) => ({
      temperatureC: sum.temperatureC + sample.temperatureC,
      humidityPercent: sum.humidityPercent + sample.humidityPercent,
    }),
    { temperatureC: 0, humidityPercent: 0 },
  );

  return {
    temperatureC: totals.temperatureC / samples.length,
    humidityPercent: totals.humidityPercent / samples.length,
  };
}

function isClimateSampleInBucket(time: string, start: string, end: string) {
  if (/^\d{12}$/.test(time) && /^\d{12}$/.test(start) && /^\d{12}$/.test(end)) {
    return time >= start && time <= end;
  }

  return /^\d{12}$/.test(time) && /^\d{12}$/.test(start)
    ? time.slice(0, 10) === start.slice(0, 10)
    : false;
}

function getChartBounds(values: number[]) {
  const safeValues = values.filter(Number.isFinite);
  const rawMin = safeValues.length ? Math.min(...safeValues) : 0;
  const rawMax = safeValues.length ? Math.max(...safeValues) : 1;
  const range = Math.max(rawMax - rawMin, 1);
  const padding = range * 0.14;

  return {
    min: rawMin - padding,
    max: rawMax + padding,
  };
}

function getChartX(index: number, total: number) {
  if (total <= 1) return STATS_CHART_W / 2;

  const chartWidth = STATS_CHART_W - STATS_CHART_PAD_X * 2;
  return STATS_CHART_PAD_X + (chartWidth / (total - 1)) * index;
}

function getChartY(value: number, bounds: { min: number; max: number }) {
  const chartHeight = STATS_CHART_H - STATS_CHART_PAD_Y * 2;
  const ratio = (value - bounds.min) / Math.max(bounds.max - bounds.min, 1);
  return STATS_CHART_H - STATS_CHART_PAD_Y - chartHeight * ratio;
}

function formatChartHour(value: string) {
  if (!/^\d{12}$/.test(value)) return value;
  return `${Number(value.slice(8, 10))}시`;
}

function getHourText(value: string) {
  if (/^\d{12}$/.test(value)) return value.slice(8, 10);
  return value.replace("시", "").padStart(2, "0").slice(0, 2);
}

function getTenMinuteText(value: string) {
  if (!/^\d{12}$/.test(value)) return "00";

  const minute = Math.floor(Number(value.slice(10, 12)) / 10) * 10;
  return String(minute).padStart(2, "0");
}

function formatClimateSlot(slot: HourlyClimateSlot) {
  const temperature =
    slot.temperatureC === undefined
      ? "--"
      : formatStatsNumber(slot.temperatureC);
  const humidity =
    slot.humidityPercent === undefined
      ? "--"
      : formatStatsNumber(slot.humidityPercent);

  return `${temperature}° ${humidity}%`;
}

function formatStatsNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

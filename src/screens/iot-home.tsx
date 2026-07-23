import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
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
  createDoorActivityReport,
  sendAssistantMessage,
} from "@/features/assistant";
import type {
  DoorActivityGateState,
  DoorActivityReportRequest,
  DoorActivityReportResponse,
} from "@/features/assistant";
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
import { createMockDoorDeviceStats } from "@/features/door-opener/model/mockDoorStats";
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
const STATS_HOUR_AXIS_W = 96;
const DOOR_STATS_CACHE_STORAGE_KEY = "ourbee:door-opener-stats-cache:v2";

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
    entered: 2,
    exited: 3,
    temperatureC: 24.9,
    humidityPercent: 66,
    climateSlots: createSampleClimateSlots("06", 24.9, 66),
  },
  {
    label: "07시",
    entered: 5,
    exited: 6,
    temperatureC: 25.3,
    humidityPercent: 64,
    climateSlots: createSampleClimateSlots("07", 25.3, 64),
  },
  {
    label: "08시",
    entered: 7,
    exited: 8,
    temperatureC: 26.1,
    humidityPercent: 62,
    climateSlots: createSampleClimateSlots("08", 26.1, 62),
  },
  {
    label: "09시",
    entered: 8,
    exited: 10,
    temperatureC: 27,
    humidityPercent: 60,
    climateSlots: createSampleClimateSlots("09", 27, 60),
  },
  {
    label: "10시",
    entered: 7,
    exited: 7,
    temperatureC: 27.8,
    humidityPercent: 59,
    climateSlots: createSampleClimateSlots("10", 27.8, 59),
  },
  {
    label: "11시",
    entered: 5,
    exited: 5,
    temperatureC: 28.1,
    humidityPercent: 58,
    climateSlots: createSampleClimateSlots("11", 28.1, 58),
  },
  {
    label: "12시",
    entered: 4,
    exited: 3,
    temperatureC: 28.3,
    humidityPercent: 59,
    climateSlots: createSampleClimateSlots("12", 28.3, 59),
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
  isMock?: boolean;
}

interface DoorStatsState {
  devices: Record<string, DoorDeviceStats>;
  lastDeviceId?: string;
}

type DoorAiReportStatus = "GOOD" | "NORMAL" | "CAUTION";

interface DoorAiMetricRow {
  label: string;
  value: string;
  note: string;
  status?: DoorAiReportStatus;
}

interface DoorAiSolution {
  title: string;
  description: string;
}

interface DoorAiReport {
  status: DoorAiReportStatus;
  summary: string;
  observations: string[];
  details: {
    overview: DoorAiMetricRow[];
    activityAnalysis: DoorAiMetricRow[];
    climateAnalysis: DoorAiMetricRow[];
    hourlyAnalysis: string;
    solutionGuide: DoorAiSolution[];
  };
  sources: string[];
  generatedAt: number;
}

function isDoorStatsState(value: unknown): value is DoorStatsState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<DoorStatsState>;
  return !!state.devices && typeof state.devices === "object";
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
  const [statsCacheHydrated, setStatsCacheHydrated] = useState(false);
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

  // Keep the most recently received NFC statistics while navigating away from
  // this screen or restarting the app. The ESP32 remains the source of truth:
  // the next statistics-card tap replaces these values with a fresh snapshot.
  useEffect(() => {
    let cancelled = false;

    const restoreStats = async () => {
      try {
        const raw = await AsyncStorage.getItem(DOOR_STATS_CACHE_STORAGE_KEY);
        if (!raw || cancelled) return;
        const cached: unknown = JSON.parse(raw);
        if (!isDoorStatsState(cached)) return;
        setStatsState(cached);
        if (cached.lastDeviceId) setSelectedStatsDeviceId(cached.lastDeviceId);
      } catch (error) {
        console.warn("[DoorOpener] Failed to restore stats cache", error);
      } finally {
        if (!cancelled) setStatsCacheHydrated(true);
      }
    };

    restoreStats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!statsCacheHydrated) return;
    const devices = Object.fromEntries(
      Object.entries(statsState.devices).filter(([, device]) => !device.isMock),
    );
    const lastDeviceId =
      statsState.lastDeviceId && devices[statsState.lastDeviceId]
        ? statsState.lastDeviceId
        : undefined;
    AsyncStorage.setItem(
      DOOR_STATS_CACHE_STORAGE_KEY,
      JSON.stringify({ devices, lastDeviceId }),
    ).catch(
      (error) => console.warn("[DoorOpener] Failed to save stats cache", error),
    );
  }, [statsCacheHydrated, statsState]);

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
      /* 통계 카드는 조회 전용이므로, 화면의 진행 중 개폐 설정을 덮어쓰지 않는다. */
      if (card.mode === "count_status") {
        if (event.counts) setTrafficCounts(event.counts);
        return;
      }
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

      if (event.type === "begin") {
        /* 새 통계 수신마다 이전 날짜의 캐시를 버리고 오늘 스냅샷으로 교체한다. */
        updated.bootCounts = {
          entranceIn: 0,
          entranceOut: 0,
          exitIn: 0,
          exitOut: 0,
        };
        updated.buckets = [];
        updated.climateSamples = [];
        updated.hourlyActive = undefined;
      }

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
  appConnectionStatus,
  gateConnected,
}: {
  stats: DoorStatsState;
  now: Date;
  selectedDeviceId?: string;
  onSelectDevice: (deviceId: string) => void;
  fallbackCounts: BeeTrafficCounts;
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
  const latestClimate = selectedDevice?.climateSamples.length
    ? selectedDevice.climateSamples[selectedDevice.climateSamples.length - 1]
    : undefined;

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
        latestClimate={latestClimate}
        appConnectionStatus={appConnectionStatus}
        gateConnected={gateConnected}
      />

      <DoorAiReportCard
        device={selectedDevice}
        fallbackCounts={fallbackCounts}
      />

      <View
        className="mt-2 rounded-[28px] p-4"
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
            <View className="mt-4 flex-row items-center justify-between" style={{ display: "none" }}>
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
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
          <PretendardFont
            weight="bold"
            numberOfLines={1}
            style={{ flexShrink: 1, fontSize: 17, color: C.white }}
          >
            {device.deviceId}
          </PretendardFont>
        </View>
        {device.lastUpdatedAt ? (
          <PretendardFont
            weight="semibold"
            style={{ marginLeft: 10, fontSize: 13.5, color: "#DDFBEA" }}
          >
            {new Date(device.lastUpdatedAt).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </PretendardFont>
        ) : null}
      </View>

      {device.isMock ? null : device.runtimeState ? (
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

function DoorAiReportCard({
  device,
  fallbackCounts,
}: {
  device?: DoorDeviceStats;
  fallbackCounts: BeeTrafficCounts;
}) {
  const [report, setReport] = useState<DoorAiReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const exampleDevice = useMemo(() => createMockDoorDeviceStats(new Date()), []);
  const reportDevice = device ?? exampleDevice;
  const isExampleReport = !device;
  const counts = reportDevice.bootCounts ??
    (reportDevice ? sumBucketTrafficCounts(reportDevice.buckets) : fallbackCounts);
  const latestClimate = reportDevice.climateSamples.length
    ? reportDevice.climateSamples[reportDevice.climateSamples.length - 1]
    : undefined;
  const hourlyStats = getHourlyStatsPoints(
    reportDevice.buckets,
    reportDevice.climateSamples,
  );
  const hasData =
    isExampleReport ||
    !!reportDevice.bootCounts ||
    !!reportDevice.buckets.length ||
    !!reportDevice.climateSamples.length ||
    Object.values(fallbackCounts).some((value) => value > 0);

  useEffect(() => {
    setReport(null);
    setError("");
    setDetailVisible(false);
  }, [device?.deviceId, device?.lastUpdatedAt]);

  const requestReport = async () => {
    if (!hasData || loading) return;

    setLoading(true);
    setError("");

    try {
      const reportRequest = buildDoorActivityReportRequest({
        device: reportDevice,
        counts,
        hourlyStats,
      });
      const response = await createDoorActivityReport(reportRequest);
      setReport(toDoorAiReport(response));
    } catch (reportError) {
      console.warn(
        "[DoorOpener] 전용 벌 활동 리포트 API 실패, 챗봇 메시지 API로 재시도",
        reportError,
      );

      try {
        const response = await sendAssistantMessage({
          input: buildDoorAiReportPrompt({
            device: reportDevice,
            counts,
            latestClimate,
            hourlyStats,
          }),
          conversationId: `door-report-${reportDevice.deviceId}-${Date.now()}`,
          mode: "RAG",
        });

        setReport(parseDoorAiReport(response.answer, response.sources));
      } catch (fallbackError) {
        console.warn("[DoorOpener] 벌 활동 리포트 fallback 실패", fallbackError);
        setError("AI 리포트를 불러오지 못했어요. 카드를 다시 눌러 주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = () => {
    if (report) {
      setDetailVisible(true);
      return;
    }
    requestReport();
  };

  const statusMeta = getDoorAiStatusMeta(report?.status);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={report ? "AI 벌 활동 상세 리포트 열기" : "AI 벌 활동 리포트 만들기"}
        disabled={!hasData || loading}
        onPress={handleCardPress}
        className="mt-3 rounded-3xl px-5 py-4 active:opacity-85"
        style={{
          minHeight: 116,
          backgroundColor: "rgba(248,209,92,0.96)",
          opacity: hasData ? 1 : 0.82,
        }}
      >
        <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
          <PretendardFont weight="bold" style={{ flex: 1, fontSize: 17, color: C.text }}>
            {isExampleReport ? "AI 벌 활동 리포트 예시" : "AI 벌 활동 리포트"}
          </PretendardFont>
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: statusMeta.backgroundColor }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 12, color: statusMeta.color }}>
              {loading ? "분석 중" : statusMeta.label}
            </PretendardFont>
          </View>
        </View>

        {loading ? (
          <View className="mt-5 flex-row items-center" style={{ gap: 10 }}>
            <ActivityIndicator size="small" color={C.text} />
            <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.text }}>
              출입량과 온습도를 분석하고 있어요
            </PretendardFont>
          </View>
        ) : report ? (
          <>
            <PretendardFont
              weight="bold"
              style={{ marginTop: 10, fontSize: 15, lineHeight: 21, color: C.text }}
            >
              {report.summary}
            </PretendardFont>
            {report.observations.slice(0, 2).map((observation, index) => (
              <PretendardFont
                key={`${observation}-${index}`}
                weight="medium"
                style={{ marginTop: 5, fontSize: 13, lineHeight: 19, color: "rgba(28,34,44,0.76)" }}
              >
                - {observation}
              </PretendardFont>
            ))}
            <PretendardFont
              weight="bold"
              style={{ marginTop: 11, fontSize: 12.5, color: "rgba(28,34,44,0.64)" }}
            >
              눌러서 전체 리포트 보기 &gt;
            </PretendardFont>
          </>
        ) : (
          <>
            <PretendardFont
              weight="medium"
              style={{ marginTop: 7, fontSize: 14, lineHeight: 20, color: "rgba(28,34,44,0.72)" }}
            >
              {hasData
                ? isExampleReport
                  ? "예시 출입량과 온습도로 리포트 흐름을 먼저 확인해요."
                  : "받아온 벌 출입량과 온습도로 자세한 활동 리포트를 만들어요."
                : "통계 화면을 개폐기에 대면 온습도와 벌 출입 기록을 받아와요."}
            </PretendardFont>
            {hasData ? (
              <PretendardFont
                weight="bold"
                style={{ marginTop: 11, fontSize: 13, color: C.text }}
              >
                {isExampleReport ? "예시 리포트 받아오기" : "눌러서 AI 리포트 만들기"}
              </PretendardFont>
            ) : null}
          </>
        )}

        {error ? (
          <PretendardFont
            weight="semibold"
            style={{ marginTop: 10, fontSize: 13, lineHeight: 19, color: "#8E2F25" }}
          >
            {error}
          </PretendardFont>
        ) : null}
      </Pressable>

      <DoorAiReportModal
        visible={detailVisible}
        report={report}
        counts={counts}
        latestClimate={latestClimate}
        loading={loading}
        onClose={() => setDetailVisible(false)}
        onRefresh={requestReport}
      />
    </>
  );
}

function DoorAiReportModal({
  visible,
  report,
  counts,
  latestClimate,
  loading,
  onClose,
  onRefresh,
}: {
  visible: boolean;
  report: DoorAiReport | null;
  counts: BeeTrafficCounts;
  latestClimate?: HceClimateSample;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  if (!report) return null;

  const statusMeta = getDoorAiStatusMeta(report.status);
  const incoming = counts.entranceIn + counts.exitIn;
  const outgoing = counts.entranceOut + counts.exitOut;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="AI 리포트 닫기"
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(11,18,27,0.62)",
          }}
        />

        <View
          style={{
            maxHeight: "88%",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottomWidth: 1, borderBottomColor: "#E8ECF0" }}
          >
            <View style={{ flex: 1 }}>
              <PretendardFont weight="bold" style={{ fontSize: 20, color: C.text }}>
                벌 활동 상세 리포트
              </PretendardFont>
              <PretendardFont
                weight="medium"
                style={{ marginTop: 3, fontSize: 12.5, color: "#7A8491" }}
              >
                {new Date(report.generatedAt).toLocaleString("ko-KR")}
              </PretendardFont>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: "#F1F3F5" }}
            >
              <PretendardFont weight="bold" style={{ fontSize: 20, color: C.text }}>
                X
              </PretendardFont>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34 }}
          >
            <View className="flex-row items-center" style={{ gap: 9 }}>
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: statusMeta.backgroundColor }}
              >
                <PretendardFont weight="bold" style={{ fontSize: 13, color: statusMeta.color }}>
                  {statusMeta.label}
                </PretendardFont>
              </View>
              <PretendardFont weight="bold" style={{ flex: 1, fontSize: 17, color: C.text }}>
                {report.summary}
              </PretendardFont>
            </View>

            <View
              className="mt-5 flex-row flex-wrap"
              style={{ borderTopWidth: 1, borderLeftWidth: 1, borderColor: "#E5E9ED" }}
            >
              <DoorReportMetric label="들어온 벌" value={`${incoming}마리`} />
              <DoorReportMetric label="나간 벌" value={`${outgoing}마리`} />
              <DoorReportMetric
                label="최근 온도"
                value={latestClimate ? `${latestClimate.temperatureC.toFixed(1)}°C` : "-"}
              />
              <DoorReportMetric
                label="최근 습도"
                value={latestClimate ? `${latestClimate.humidityPercent.toFixed(1)}%` : "-"}
              />
            </View>

            <DoorReportSection title="눈에 띄는 변화" items={report.observations} />
            <DoorReportSolutionSection solutions={report.details.solutionGuide} />
            <DoorReportTableSection title="오늘 한눈에" rows={report.details.overview} />
            <DoorReportTableSection title="활동 분석" rows={report.details.activityAnalysis} />
            <DoorReportTableSection title="온습도 분석" rows={report.details.climateAnalysis} />
            <DoorReportSection title="시간대별 흐름" text={report.details.hourlyAnalysis} />
            <DoorReportSection title="참고 자료" items={report.sources} />

            <View className="mt-6 flex-row" style={{ gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={onRefresh}
                className="min-h-12 flex-1 items-center justify-center rounded-xl active:opacity-75"
                style={{ backgroundColor: "#F8D15C", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
                    다시 분석
                  </PretendardFont>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                className="min-h-12 flex-1 items-center justify-center rounded-xl active:opacity-75"
                style={{ backgroundColor: "#202833" }}
              >
                <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
                  닫기
                </PretendardFont>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DoorReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        width: "50%",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#E5E9ED",
      }}
    >
      <PretendardFont weight="medium" style={{ fontSize: 12.5, color: "#7A8491" }}>
        {label}
      </PretendardFont>
      <PretendardFont weight="bold" style={{ marginTop: 3, fontSize: 18, color: C.text }}>
        {value}
      </PretendardFont>
    </View>
  );
}

function DoorReportSection({
  title,
  text,
  items = [],
}: {
  title: string;
  text?: string;
  items?: string[];
}) {
  const visibleItems = items.filter(Boolean);
  if (!text && visibleItems.length === 0) return null;

  return (
    <View className="mt-6">
      <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
        {title}
      </PretendardFont>
      {text ? (
        <PretendardFont
          weight="medium"
          style={{ marginTop: 8, fontSize: 14, lineHeight: 22, color: "#4F5A67" }}
        >
          {text}
        </PretendardFont>
      ) : null}
      {visibleItems.map((item, index) => (
        <PretendardFont
          key={`${item}-${index}`}
          weight="medium"
          style={{ marginTop: 7, fontSize: 14, lineHeight: 21, color: "#4F5A67" }}
        >
          - {item}
        </PretendardFont>
      ))}
    </View>
  );
}

function DoorReportTableSection({
  title,
  rows,
}: {
  title: string;
  rows: DoorAiMetricRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <View className="mt-6">
      <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
        {title}
      </PretendardFont>
      <View className="mt-3" style={{ borderTopWidth: 1, borderTopColor: "#E5E9ED" }}>
        {rows.map((row, index) => {
          const statusMeta = row.status ? getDoorAiStatusMeta(row.status) : null;

          return (
            <View
              key={`${row.label}-${row.value}-${index}`}
              className="flex-row items-start py-3"
              style={{
                gap: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E9ED",
              }}
            >
              <View style={{ flex: 1 }}>
                {row.label ? (
                  <PretendardFont weight="semibold" style={{ fontSize: 13, color: "#68727E" }}>
                    {row.label}
                  </PretendardFont>
                ) : null}
                {row.note ? (
                  <PretendardFont
                    weight="medium"
                    style={{ marginTop: row.label ? 3 : 0, fontSize: 13.5, lineHeight: 20, color: "#4F5A67" }}
                  >
                    {row.note}
                  </PretendardFont>
                ) : null}
              </View>
              {row.value ? (
                <PretendardFont
                  weight="bold"
                  style={{
                    maxWidth: "42%",
                    textAlign: "right",
                    fontSize: 15,
                    lineHeight: 20,
                    color: statusMeta?.color ?? C.text,
                  }}
                >
                  {row.value}
                </PretendardFont>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DoorReportSolutionSection({ solutions }: { solutions: DoorAiSolution[] }) {
  if (solutions.length === 0) return null;

  return (
    <View className="mt-6">
      <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
        앞으로 이렇게 해보세요
      </PretendardFont>
      {solutions.map((solution, index) => (
        <View
          key={`${solution.title}-${index}`}
          className="py-3"
          style={{ borderBottomWidth: 1, borderBottomColor: "#E5E9ED" }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
            {solution.title}
          </PretendardFont>
          <PretendardFont
            weight="medium"
            style={{ marginTop: 5, fontSize: 14, lineHeight: 22, color: "#4F5A67" }}
          >
            {solution.description}
          </PretendardFont>
        </View>
      ))}
    </View>
  );
}

function buildDoorActivityReportRequest({
  device,
  counts,
  hourlyStats,
}: {
  device?: DoorDeviceStats;
  counts: BeeTrafficCounts;
  hourlyStats: HourlyStatsPoint[] | null;
}): DoorActivityReportRequest {
  const buckets = device?.buckets ?? [];
  const latestGateState = getLatestGateState(device);

  return {
    deviceId: device?.deviceId ?? "unknown",
    analysisDate: formatReportDate(new Date()),
    timezone: "Asia/Seoul",
    trafficSummary: {
      entered: counts.entranceIn + counts.exitIn,
      exited: counts.entranceOut + counts.exitOut,
    },
    latestGateState,
    hourlyStats: (hourlyStats ?? []).slice(-24).map((point) => {
      const time = toReportHourTime(point.label);
      const bucket = buckets.find(
        (item) => toReportLocalTime(item.start) === time,
      );

      return {
        time,
        entered: point.entered,
        exited: point.exited,
        gateState: getBucketGateState(bucket) ?? latestGateState,
        temperatureC: point.temperatureC ?? null,
        humidityPercent: point.humidityPercent ?? null,
      };
    }),
    climateSamples: (device?.climateSamples ?? []).slice(-144).map((sample) => ({
      time: toReportLocalTime(sample.time),
      temperatureC: sample.temperatureC,
      humidityPercent: sample.humidityPercent,
    })),
  };
}

function toDoorAiReport(response: DoorActivityReportResponse): DoorAiReport {
  const generatedAt = new Date(response.generatedAt).getTime();

  return {
    status: response.status,
    summary: response.summary,
    observations: response.observations ?? [],
    details: {
      overview: response.details?.overview ?? [],
      activityAnalysis: response.details?.activityAnalysis ?? [],
      climateAnalysis: response.details?.climateAnalysis ?? [],
      hourlyAnalysis: response.details?.hourlyAnalysis ?? "",
      solutionGuide: response.details?.solutionGuide ?? [],
    },
    sources: response.sources ?? [],
    generatedAt: Number.isFinite(generatedAt) ? generatedAt : Date.now(),
  };
}

function getLatestGateState(
  device: DoorDeviceStats | undefined,
): DoorActivityGateState {
  const latestBucket = device?.buckets.length
    ? device.buckets[device.buckets.length - 1]
    : undefined;
  const bucketState = getBucketGateState(latestBucket);
  if (bucketState) return bucketState;

  if (device?.runtimeState?.mode === "open_now") return "OPEN";
  if (device?.runtimeState?.mode === "close_now") return "CLOSED";
  return "UNKNOWN";
}

function getBucketGateState(
  bucket: HceStatsBucket | undefined,
): DoorActivityGateState | undefined {
  if (!bucket) return undefined;
  return bucket.closed ? "CLOSED" : "OPEN";
}

function formatReportDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toReportHourTime(label: string) {
  const match = label.match(/(\d{1,2})시/);
  if (!match) return toReportLocalTime(label);
  return `${String(Number(match[1])).padStart(2, "0")}:00`;
}

function toReportLocalTime(value: string) {
  if (/^\d{12}$/.test(value)) {
    return `${value.slice(8, 10)}:${value.slice(10, 12)}`;
  }

  if (/^\d{2}:\d{2}$/.test(value)) return value;
  return value;
}

function buildDoorAiReportPrompt({
  device,
  counts,
  latestClimate,
  hourlyStats,
}: {
  device?: DoorDeviceStats;
  counts: BeeTrafficCounts;
  latestClimate?: HceClimateSample;
  hourlyStats: HourlyStatsPoint[] | null;
}) {
  const hourlyText = (hourlyStats ?? [])
    .slice(-24)
    .map(
      (point) =>
        `${point.label}: 들어옴 ${point.entered}마리, 나감 ${point.exited}마리` +
        (point.temperatureC == null ? "" : `, 온도 ${point.temperatureC.toFixed(1)}°C`) +
        (point.humidityPercent == null ? "" : `, 습도 ${point.humidityPercent.toFixed(1)}%`),
    )
    .join("\n");
  const latestBucket = device?.buckets.length
    ? device.buckets[device.buckets.length - 1]
    : undefined;
  const bucketText = (device?.buckets ?? [])
    .slice(-24)
    .map(
      (bucket) =>
        `${bucket.start}~${bucket.end}: ${bucket.closed ? "닫힘" : "열림"}, ` +
        `입구 IN ${bucket.counts.entranceIn}, 입구 OUT ${bucket.counts.entranceOut}, ` +
        `출구 IN ${bucket.counts.exitIn}, 출구 OUT ${bucket.counts.exitOut}`,
    )
    .join("\n");
  const climateText = (device?.climateSamples ?? [])
    .slice(-144)
    .map(
      (sample) =>
        `${sample.time}: ${sample.temperatureC.toFixed(1)}°C, ${sample.humidityPercent.toFixed(1)}%`,
    )
    .join("\n");

  return [
    "다음은 스마트 벌통 개폐기에서 오늘 자정부터 현재까지 수집한 하루 단위 데이터입니다.",
    "등록된 수정벌 업체 자료 중 현재 데이터와 관련된 내용만 참고해 농가용 활동 리포트를 작성하세요.",
    "토스 앱처럼 쉽고 다정한 존댓말로 작성하세요. 딱딱한 보고서체, 메모체, 명사로 끝나는 문장은 쓰지 마세요.",
    "모든 설명은 사용자가 읽자마자 의미와 다음 행동을 이해할 수 있는 완전한 문장으로 작성하세요.",
    "summary는 오늘 상태의 핵심을 1~2문장으로 설명하세요.",
    "observations는 꼭 필요한 변화만 2~3개 작성하고, 각 항목은 한 문장으로 끝내세요.",
    "status는 아래 기준을 순서대로 적용해 하나만 선택하세요.",
    "CAUTION: 최근 30분의 온도 표본이 모두 24~27°C를 벗어났거나, 최근 완료된 2시간의 활동량이 각각 직전 3시간 평균보다 30% 이상 낮은 경우입니다.",
    "GOOD: 비교할 데이터가 충분하고 최근 30분의 온도 표본이 모두 24~27°C이며 최근 완료된 시간의 활동량 감소가 직전 3시간 평균의 15% 미만인 경우입니다.",
    "NORMAL: CAUTION과 GOOD 조건에 해당하지 않거나 비교할 데이터가 부족한 경우입니다.",
    "시간당 활동량은 해당 시간의 들어온 벌과 나간 벌을 더한 값입니다. 들어온 벌과 나간 벌의 단순 차이만으로 CAUTION을 정하지 마세요.",
    "details.overview, details.activityAnalysis, details.climateAnalysis는 화면의 표에 바로 넣을 수 있는 배열로 작성하세요.",
    "표의 각 항목은 label, value, note만 사용하세요. label은 항목 이름, value는 단위가 포함된 짧은 값, note는 비교 기준이나 의미를 설명하는 한 문장입니다.",
    "각 표는 2~4개 항목만 작성하고, 같은 내용을 다른 표에서 반복하지 마세요. 상태 표시가 필요할 때만 status에 GOOD, NORMAL, CAUTION 중 하나를 넣으세요.",
    "details.hourlyAnalysis는 시간당 온도와 습도 변화, 같은 시간의 벌 활동 마릿수 변화를 함께 비교해 1~2문장으로 작성하세요.",
    "details.hourlyAnalysis에서는 함께 나타난 변화만 설명하고 온습도가 활동량 변화의 원인이라고 단정하지 마세요.",
    "details.solutionGuide는 분석보다 앞으로 어떻게 관리하면 좋은지에 집중해 3~5개의 배열로 작성하세요.",
    "solutionGuide에는 지금 바로 할 일, 30분 뒤 다시 볼 수치, 오늘 저녁 확인할 점, 다음날 같은 시간에 비교할 점을 우선 포함하세요.",
    "각 해결 방법은 짧은 title과 2~3문장의 description만 사용하세요. 한 문장마다 항목을 따로 만들지 마세요.",
    "앱에서 온도나 환기 값을 설정하라는 안내는 금지합니다. 현재 앱에는 해당 설정 기능이 없습니다.",
    "온도를 낮춰야 한다면 직사광선을 피하는 방법, 차광막 사용, 설치 위치와 주변 공기 흐름처럼 현장에서 가능한 방법을 구체적으로 설명하세요.",
    "환기가 필요하다면 환기구와 출입구의 막힘 제거, 벽이나 바닥과의 간격 확보 등 실제로 공기가 흐르게 만드는 방법을 설명하세요.",
    "'환기를 확인하세요'처럼 막연하게 끝내지 말고 무엇을 어떻게 바꿀지, 언제 다시 측정할지, 어느 수치가 되면 괜찮다고 볼지를 포함하세요.",
    "수정벌이 가장 잘 활동하는 온도 기준은 24~27°C로 사용하세요.",
    "제공되지 않은 수치나 원인을 만들어내지 말고, 데이터가 부족하면 명확히 적으세요.",
    "장치가 자동으로 제어됐다고 단정하거나 앱에 없는 기능을 안내하지 마세요. 현장에서 실행할 수 있는 조치만 안내하세요.",
    "반드시 아래 JSON 객체만 출력하세요. 마크다운 코드 블록과 추가 설명은 금지합니다.",
    '{"status":"GOOD|NORMAL|CAUTION","summary":"오늘 상태를 설명하는 1~2문장","observations":["눈에 띄는 변화 한 문장"],"details":{"overview":[{"label":"오늘 총 출입","value":"80마리","note":"들어옴 38마리, 나감 42마리예요.","status":"NORMAL"}],"activityAnalysis":[{"label":"최근 활동 변화","value":"보통","note":"직전 시간과 큰 차이 없이 움직이고 있어요.","status":"NORMAL"}],"climateAnalysis":[{"label":"최근 온도","value":"28.3°C","note":"권장 상한보다 1.3°C 높아요.","status":"CAUTION"}],"hourlyAnalysis":"오전 10시 이후 온도가 27°C를 넘었고, 같은 시간 활동량은 조금 줄었어요. 두 변화가 함께 나타났지만 온도가 직접 원인이라고 단정하기는 어려워요.","solutionGuide":[{"title":"지금 그늘을 먼저 만들어주세요","description":"직사광선이 닿는다면 차광막이나 주변 구조물로 그늘을 만들어 주세요. 바로 이동하기 어렵다면 벌통 위쪽 열이 쌓이지 않게 덮개와 주변 물건을 먼저 정리해요."},{"title":"30분 뒤 온도를 다시 봐주세요","description":"조치 후 30분 뒤 최근 온도가 27°C 이하로 내려오는지 확인해 주세요. 내려가지 않으면 그늘 면적을 넓히거나 주변 공기 흐름을 더 확보해요."},{"title":"저녁에는 돌아온 벌을 비교해요","description":"해가 약해진 뒤 들어온 벌과 나간 벌 차이가 줄어드는지 확인해 주세요. 차이가 계속 벌어지면 다음날 같은 시간대 활동량과 함께 다시 비교해요."}]}}',
    `장치: ${device?.deviceId ?? "확인되지 않음"}`,
    `누적 출입: 들어옴 ${counts.entranceIn + counts.exitIn}마리, 나감 ${counts.entranceOut + counts.exitOut}마리`,
    latestClimate
      ? `최근 온습도: ${latestClimate.temperatureC.toFixed(1)}°C, ${latestClimate.humidityPercent.toFixed(1)}% (${latestClimate.time})`
      : "최근 온습도: 수집되지 않음",
    latestBucket
      ? `최근 개폐 상태: ${latestBucket.closed ? "닫힘" : "열림"} (${latestBucket.start}~${latestBucket.end})`
      : "최근 개폐 상태: 수집되지 않음",
    hourlyText ? `시간별 요약:\n${hourlyText}` : "시간별 요약: 수집되지 않음",
    bucketText
      ? `하루 출입 및 개폐 원본(1시간 단위):\n${bucketText}`
      : "하루 출입 및 개폐 원본: 수집되지 않음",
    climateText
      ? `하루 온습도 원본(10분 단위):\n${climateText}`
      : "하루 온습도 원본: 수집되지 않음",
  ].join("\n");
}

function parseDoorAiReport(answer: string, sources: string[]): DoorAiReport {
  const trimmed = answer.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");

  try {
    if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error("JSON not found");
    const value = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
    const details =
      value.details && typeof value.details === "object"
        ? (value.details as Record<string, unknown>)
        : {};
    const rawStatus = typeof value.status === "string" ? value.status.toUpperCase() : "NORMAL";
    const status: DoorAiReportStatus =
      rawStatus === "GOOD" || rawStatus === "CAUTION" ? rawStatus : "NORMAL";

    return {
      status,
      summary: getDoorReportText(value.summary) || "수집된 개폐기 데이터를 분석했어요.",
      observations: getDoorReportTextList(value.observations),
      details: {
        overview: getDoorReportMetricRows(details.overview, "종합 분석"),
        activityAnalysis: getDoorReportMetricRows(details.activityAnalysis, "활동 분석"),
        climateAnalysis: getDoorReportMetricRows(details.climateAnalysis, "온습도 분석"),
        hourlyAnalysis: getDoorReportText(details.hourlyAnalysis),
        solutionGuide: getDoorReportSolutionList(
          details.solutionGuide,
          value.recommendation,
          details.actionItems,
        ),
      },
      sources,
      generatedAt: Date.now(),
    };
  } catch {
    return {
      status: "NORMAL",
      summary: trimmed || "AI 분석 결과를 확인해 주세요.",
      observations: [],
      details: {
        overview: trimmed ? [{ label: "분석 결과", value: "", note: trimmed }] : [],
        activityAnalysis: [],
        climateAnalysis: [],
        hourlyAnalysis: "",
        solutionGuide: [
          {
            title: "원본 통계를 확인해 주세요",
            description: "AI 응답 형식을 읽지 못했어요. 수집된 출입량과 온습도를 직접 확인해 주세요.",
          },
        ],
      },
      sources,
      generatedAt: Date.now(),
    };
  }
}

function getDoorReportText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getDoorReportTextList(value: unknown) {
  return Array.isArray(value)
    ? value.map(getDoorReportText).filter((item): item is string => !!item)
    : [];
}

function getDoorReportMetricRows(value: unknown, fallbackLabel = "") {
  if (typeof value === "string") {
    const note = value.trim();
    return note ? [{ label: fallbackLabel, value: "", note }] : [];
  }
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): DoorAiMetricRow[] => {
    if (typeof item === "string") {
      const note = item.trim();
      return note ? [{ label: fallbackLabel, value: "", note }] : [];
    }
    if (!item || typeof item !== "object") return [];

    const row = item as Record<string, unknown>;
    const label = getDoorReportText(row.label);
    const displayValue =
      typeof row.value === "number" ? String(row.value) : getDoorReportText(row.value);
    const note = [
      getDoorReportText(row.note),
      getDoorReportText(row.comparison),
      getDoorReportText(row.description),
    ]
      .filter(Boolean)
      .join(" ");
    const rawStatus = getDoorReportText(row.status).toUpperCase();
    const status: DoorAiReportStatus | undefined =
      rawStatus === "GOOD" || rawStatus === "NORMAL" || rawStatus === "CAUTION"
        ? rawStatus
        : undefined;

    if (!label && !displayValue && !note) return [];
    return [{ label, value: displayValue, note, status }];
  });
}

function getDoorReportSolutionList(
  value: unknown,
  legacyRecommendation?: unknown,
  legacyActionItems?: unknown,
): DoorAiSolution[] {
  const solutions = Array.isArray(value)
    ? value.flatMap((item): DoorAiSolution[] => {
        if (typeof item === "string") {
          const description = item.trim();
          return description ? [{ title: "해결 방법", description }] : [];
        }
        if (!item || typeof item !== "object") return [];

        const solution = item as Record<string, unknown>;
        const title = getDoorReportText(solution.title);
        const description = getDoorReportText(solution.description);
        return title || description
          ? [{ title: title || "해결 방법", description }]
          : [];
      })
    : [];

  if (solutions.length > 0) return solutions;

  const legacyText = [
    getDoorReportText(value),
    getDoorReportText(legacyRecommendation),
    ...getDoorReportTextList(legacyActionItems),
  ]
    .filter(Boolean)
    .join(" ");

  return legacyText ? [{ title: "해결 방법", description: legacyText }] : [];
}

function getDoorAiStatusMeta(status?: DoorAiReportStatus) {
  if (status === "GOOD") {
    return { label: "좋음", color: "#116349", backgroundColor: "#DDF5E9" };
  }
  if (status === "CAUTION") {
    return { label: "주의", color: "#963E27", backgroundColor: "#FFE2D7" };
  }
  if (status === "NORMAL") {
    return { label: "보통", color: "#2C5F87", backgroundColor: "#DDEFFC" };
  }
  return { label: "분석 전", color: "#5B6470", backgroundColor: "rgba(255,255,255,0.58)" };
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
        {label.replace(" 조회", "")}
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
        nestedScrollEnabled
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
                        className="items-center justify-center"
                        style={{ minHeight: 25 }}
                      >
                        <PretendardFont
                          weight="bold"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.82}
                          style={{
                            fontSize: 13.2,
                            lineHeight: 18,
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
          display: "none",
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
  if (buckets.length > 0) {
    const bucketsByHour = new Map<string, HceStatsBucket[]>();

    buckets.forEach((bucket) => {
      const hourKey = getStatsHourKey(bucket.start);
      bucketsByHour.set(hourKey, [...(bucketsByHour.get(hourKey) ?? []), bucket]);
    });

    return [...bucketsByHour.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-24)
      .map(([hourKey, hourBuckets]) => {
        const hourClimateSamples = climateSamples.filter(
          (sample) => getStatsHourKey(sample.time) === hourKey,
        );
        const climate = getAverageClimate(hourClimateSamples);
        const counts = sumBucketTrafficCounts(hourBuckets);
        const hourValue = hourKey.length === 10 ? `${hourKey}00` : hourKey;

        return {
          label: formatChartHour(hourValue),
          entered: counts.entranceIn + counts.exitIn,
          exited: counts.entranceOut + counts.exitOut,
          temperatureC: climate?.temperatureC,
          humidityPercent: climate?.humidityPercent,
          climateSlots: getClimateSlots(hourValue, hourClimateSamples),
        };
      });
  }

  const hourlyClimate = getHourlyClimatePoints(climateSamples);
  return hourlyClimate.length > 0 ? hourlyClimate.slice(-24) : null;
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
  if (point.climateSlots?.length) {
    return point.climateSlots.filter(
      (slot) =>
        slot.temperatureC !== undefined || slot.humidityPercent !== undefined,
    );
  }

  return createFallbackClimateSlots(point);
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

function getStatsHourKey(value: string) {
  return /^\d{12}$/.test(value) ? value.slice(0, 10) : value;
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

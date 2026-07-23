import type { DoorOpenerRuntimeState } from "./doorOpenerRuntime";
import type {
  BeeTrafficCounts,
  HceClimateSample,
  HceStatsBucket,
} from "./webeeHce";

export const MOCK_DOOR_DEVICE_ID = "ESP32-MOCK-001";

interface MockDoorDeviceStats {
  deviceId: string;
  runtimeState: DoorOpenerRuntimeState;
  bootCounts: BeeTrafficCounts;
  buckets: HceStatsBucket[];
  climateSamples: HceClimateSample[];
  hourlyActive: boolean;
  lastUpdatedAt: number;
  isMock: true;
}

const MOCK_HOURLY_COUNTS = [
  { hour: 6, entranceIn: 1, entranceOut: 1, exitIn: 1, exitOut: 2 },
  { hour: 7, entranceIn: 3, entranceOut: 2, exitIn: 2, exitOut: 4 },
  { hour: 8, entranceIn: 4, entranceOut: 3, exitIn: 3, exitOut: 5 },
  { hour: 9, entranceIn: 5, entranceOut: 4, exitIn: 3, exitOut: 6 },
  { hour: 10, entranceIn: 4, entranceOut: 3, exitIn: 3, exitOut: 4 },
  { hour: 11, entranceIn: 3, entranceOut: 2, exitIn: 2, exitOut: 3 },
  { hour: 12, entranceIn: 2, entranceOut: 1, exitIn: 2, exitOut: 2 },
];

const TEMPERATURE_BY_HOUR: Record<number, number> = {
  6: 24.9,
  7: 25.3,
  8: 26.1,
  9: 27.0,
  10: 27.8,
  11: 28.1,
  12: 28.3,
};

const HUMIDITY_BY_HOUR: Record<number, number> = {
  6: 66,
  7: 64,
  8: 62,
  9: 60,
  10: 59,
  11: 58,
  12: 59,
};

const TEMPERATURE_OFFSETS = [-0.4, -0.1, 0.2, 0, 0.3, 0.1];
const HUMIDITY_OFFSETS = [2, 1, 0, -1, -2, -1];

export function createMockDoorDeviceStats(now = new Date()): MockDoorDeviceStats {
  const buckets = MOCK_HOURLY_COUNTS.map((item) => ({
    deviceId: MOCK_DOOR_DEVICE_ID,
    start: toStatsTimestamp(now, item.hour, 0),
    end: toStatsTimestamp(now, item.hour + 1, 0),
    closed: false,
    counts: {
      entranceIn: item.entranceIn,
      entranceOut: item.entranceOut,
      exitIn: item.exitIn,
      exitOut: item.exitOut,
    },
  }));
  const climateSamples = MOCK_HOURLY_COUNTS.flatMap((item) =>
    createMockClimateSamples(now, item.hour),
  );
  const bootCounts = sumCounts(buckets);
  const runtimeState: DoorOpenerRuntimeState = {
    deviceId: MOCK_DOOR_DEVICE_ID,
    cardId: "mock-window-card",
    title: "오전 활동 운영",
    description: "샘플 수신 데이터로 만든 운영 카드예요.",
    detail: "08:00부터 18:00까지 열림",
    mode: "window",
    start: "08:00",
    end: "18:00",
    repeat: true,
    activatedAt: now.getTime() - 1000 * 60 * 72,
    result: `OK|window|D=${MOCK_DOOR_DEVICE_ID}|C=${formatCounts(bootCounts)}`,
    status: "ok",
    command: "window",
    counts: bootCounts,
  };

  return {
    deviceId: MOCK_DOOR_DEVICE_ID,
    runtimeState,
    bootCounts,
    buckets,
    climateSamples,
    hourlyActive: true,
    lastUpdatedAt: now.getTime(),
    isMock: true,
  };
}

function createMockClimateSamples(now: Date, hour: number): HceClimateSample[] {
  const temperature = TEMPERATURE_BY_HOUR[hour] ?? 32;
  const humidity = HUMIDITY_BY_HOUR[hour] ?? 60;

  return [0, 10, 20, 30, 40, 50].map((minute, index) => ({
    deviceId: MOCK_DOOR_DEVICE_ID,
    time: toStatsTimestamp(now, hour, minute),
    temperatureC: temperature + TEMPERATURE_OFFSETS[index],
    humidityPercent: humidity + HUMIDITY_OFFSETS[index],
  }));
}

function sumCounts(buckets: HceStatsBucket[]): BeeTrafficCounts {
  return buckets.reduce(
    (total, bucket) => ({
      entranceIn: total.entranceIn + bucket.counts.entranceIn,
      entranceOut: total.entranceOut + bucket.counts.entranceOut,
      exitIn: total.exitIn + bucket.counts.exitIn,
      exitOut: total.exitOut + bucket.counts.exitOut,
    }),
    { entranceIn: 0, entranceOut: 0, exitIn: 0, exitOut: 0 },
  );
}

function toStatsTimestamp(base: Date, hour: number, minute: number) {
  const next = new Date(base);
  next.setHours(hour, minute, 0, 0);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
    String(next.getHours()).padStart(2, "0"),
    String(next.getMinutes()).padStart(2, "0"),
  ].join("");
}

function formatCounts(counts: BeeTrafficCounts) {
  return [
    counts.entranceIn,
    counts.entranceOut,
    counts.exitIn,
    counts.exitOut,
  ].join(",");
}

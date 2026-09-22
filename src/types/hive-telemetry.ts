/** MQTT에서 백엔드를 거쳐 HIVE_TELEMETRY SSE로 전달되는 측정 상태. */
export interface HiveTelemetry {
  internalTemperature: number | null;
  internalHumidity: number | null;
  externalTemperature: number | null;
  externalHumidity: number | null;
  co2?: number | null;
  peltierMode?: string | null;
  peltierDutyPct?: number | null;
  fanHotDutyPct?: number | null;
  fanColdDutyPct?: number | null;
  fanState?: string | null;
  targetTemperature?: number | null;
  internalSensorValid?: boolean | null;
  externalSensorValid?: boolean | null;
  peltierCoolCurrentA?: number | null;
  peltierHeatCurrentA?: number | null;
  hwIssue?: string | null;
  hwIssueTimestamp?: string | null;
  recordedAt?: string;
}

export interface HiveHardwareIssue {
  code: string;
  /** ISO 8601 또는 UNSYNCED_BOOT. 임의로 날짜로 변환하지 않습니다. */
  timestamp: string | null;
}

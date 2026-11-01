import { View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useDoorDeviceState } from "@/stores/useDoorDeviceState";
import { useGateStore } from "@/stores/useGateStore";
import { gateDisplayName, normalizeGateMac } from "../model/deviceCardState";
import { getDoorOpenerRuntimeText } from "../model/doorOpenerRuntime";

type DeviceRecord = ReturnType<typeof useDoorDeviceState.getState>["records"][string] | undefined;

/** 적용 카드 상태를 칩 문구·색과 설명 한 줄로 바꿉니다. */
function describe(record: DeviceRecord, now: Date) {
  if (!record) {
    return { chip: "미확인", tone: "muted" as const, caption: "" };
  }
  const source = record.source === "offline" ? "NFC" : "온라인";
  const checkedAt = record.confirmedAt
    ? `${source} · ${new Date(record.confirmedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 확인`
    : `${source} · 이전 적용 기록`;
  if (!record.runtime) return { chip: "적용 없음", tone: "muted" as const, caption: checkedAt };
  const runtime = record.confirmedAt > 0 ? getDoorOpenerRuntimeText(record.runtime, now) : null;
  return { chip: record.runtime.title, tone: "active" as const, caption: runtime ? `${runtime} · ${checkedAt}` : checkedAt };
}

function StatusChip({ label, tone }: { label: string; tone: "active" | "muted" }) {
  const active = tone === "active";
  return (
    <View className="h-6 px-2 justify-center rounded-md" style={{ backgroundColor: active ? C.primary : C.bgAlt }}>
      <PretendardFont weight="semibold" numberOfLines={1} style={{ maxWidth: 140, fontSize: 12.5, color: active ? C.white : C.textAlt }}>
        {label}
      </PretendardFont>
    </View>
  );
}

/** 개폐기 한 대의 적용 카드 상태 행. showName이면 개폐기 이름을 앞에 씁니다. */
export function DeviceCardStatus({ deviceId, now, showName = false }: {
  deviceId: string; now: Date; showName?: boolean;
}) {
  const record = useDoorDeviceState(state => state.records[normalizeGateMac(deviceId) ?? deviceId]);
  const gates = useGateStore(state => state.gates);
  const { chip, tone, caption } = describe(record, now);
  const name = gateDisplayName(deviceId, gates);

  return (
    <View
      accessible
      accessibilityLabel={`${showName ? `${name}, ` : ""}적용 카드 ${chip}${caption ? `. ${caption}` : ""}`}
      className="py-2.5 gap-0.5"
    >
      <View className="flex-row items-center justify-between gap-3">
        <PretendardFont weight="bold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, color: C.text }}>
          {showName ? name : "적용 카드"}
        </PretendardFont>
        <StatusChip label={chip} tone={tone} />
      </View>
      {caption ? (
        <PretendardFont numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 18, color: C.sec }}>{caption}</PretendardFont>
      ) : null}
    </View>
  );
}

/**
 * 개폐기별 적용 카드 — 흰 패널 하나에 개폐기마다 한 행씩 둡니다.
 * 반투명 카드를 여러 장 띄우면 뒤쪽 개폐기 사진이 비쳐 읽기 어려워 불투명한 한 덩어리로 묶었습니다.
 */
export function DeviceCardStatusList({ deviceIds, now }: { deviceIds: string[]; now: Date }) {
  const gates = useGateStore(state => state.gates);
  const records = useDoorDeviceState(state => state.records);
  const ids = [...new Set([...deviceIds, ...Object.keys(records), ...gates.map(gate => gate.macAddress)]
    .map(normalizeGateMac).filter((id): id is string => !!id))];
  if (!ids.length) return null;

  return (
    <View className="mb-4 px-4 pt-3 pb-1 rounded-xl" style={{ backgroundColor: C.white }}>
      <PretendardFont accessibilityRole="header" weight="bold" style={{ fontSize: 16, color: C.text }}>개폐기별 적용 카드</PretendardFont>
      <View className="mt-0.5">
        {ids.map((id, index) => (
          <View key={id} style={{ borderTopWidth: index ? 1 : 0, borderTopColor: C.border }}>
            <DeviceCardStatus deviceId={id} now={now} showName />
          </View>
        ))}
      </View>
    </View>
  );
}

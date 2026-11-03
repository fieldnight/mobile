import { ScrollView, View } from "react-native";
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

/** 개폐기 카드 줄 치수. 부모(iot-home) 좌우 여백만큼 화면 끝까지 넓혀 옆 카드가 가장자리에서 보이게 합니다. */
const RAIL_CARD_W = 156;
const RAIL_CARD_H = 104;
const RAIL_GAP = 10;
const RAIL_BLEED = 18;

/** 개폐기 한 대 = 카드 한 장. 이름, 적용 중인 카드, 확인 시각을 담습니다. */
function DeviceStatusCard({ deviceId, now }: { deviceId: string; now: Date }) {
  const record = useDoorDeviceState(state => state.records[normalizeGateMac(deviceId) ?? deviceId]);
  const gates = useGateStore(state => state.gates);
  const { chip, tone, caption } = describe(record, now);
  const name = gateDisplayName(deviceId, gates);

  return (
    <View
      accessible
      accessibilityLabel={`${name}, 적용 카드 ${chip}${caption ? `. ${caption}` : ""}`}
      className="justify-between rounded-[10px] p-3"
      style={{ width: RAIL_CARD_W, height: RAIL_CARD_H, backgroundColor: C.white }}
    >
      <PretendardFont weight="bold" numberOfLines={1} style={{ fontSize: 15, color: C.text }}>
        {name}
      </PretendardFont>
      <View className="gap-1">
        <View className="flex-row">
          <StatusChip label={chip} tone={tone} />
        </View>
        {caption ? (
          <PretendardFont numberOfLines={1} style={{ fontSize: 11.5, color: C.sec }}>{caption}</PretendardFont>
        ) : null}
      </View>
    </View>
  );
}

/** 개폐기별 적용 카드 — 개폐기마다 카드 한 장씩, 옆으로 넘겨 봅니다. */
export function DeviceCardStatusList({ deviceIds, now }: { deviceIds: string[]; now: Date }) {
  const gates = useGateStore(state => state.gates);
  const records = useDoorDeviceState(state => state.records);
  const ids = [...new Set([...deviceIds, ...Object.keys(records), ...gates.map(gate => gate.macAddress)]
    .map(normalizeGateMac).filter((id): id is string => !!id))];
  if (!ids.length) return null;

  return (
    <View className="mb-5">
      <PretendardFont accessibilityRole="header" weight="bold" className="mb-2.5" style={{ fontSize: 17, color: C.text }}>
        개폐기별 적용 카드
      </PretendardFont>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -RAIL_BLEED }}
        contentContainerStyle={{ paddingHorizontal: RAIL_BLEED, gap: RAIL_GAP }}
      >
        {ids.map(id => <DeviceStatusCard key={id} deviceId={id} now={now} />)}
      </ScrollView>
    </View>
  );
}

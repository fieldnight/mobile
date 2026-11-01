import { Image, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { BeeTrafficCounts, HceClimateSample } from "../model/webeeHce";
import type { GateActionAppConnectionStatus } from "./NfcDoorCardSection";

const DOOR_OPENER_IMAGE = require("../../../../assets/images/door-opener-3d.png");

export const EMPTY_BEE_TRAFFIC_COUNTS: BeeTrafficCounts = {
  entranceIn: 0,
  entranceOut: 0,
  exitIn: 0,
  exitOut: 0,
};

export type GateConnectionCheckStatus = "registered" | "unregistered";

/**
 * 리포트 탭 상단 요약
 * - 연결 상태 한 줄 + 벌 출입 요약 카드(큰 숫자 두 개, 아래로 입구·출구·온습도 행).
 * - 흰 면 위에 숫자를 크게 두고 나머지는 회색 작은 글자로만 둡니다.
 */
export function DoorOpenerHeroVisual({
  counts = EMPTY_BEE_TRAFFIC_COUNTS,
  latestClimate,
  appConnectionStatus = "idle",
  gateConnectionStatus = "unregistered",
}: {
  counts?: BeeTrafficCounts;
  latestClimate?: HceClimateSample;
  appConnectionStatus?: GateActionAppConnectionStatus;
  gateConnectionStatus?: GateConnectionCheckStatus;
}) {
  const incomingCount = counts.entranceIn + counts.exitIn;
  const outgoingCount = counts.entranceOut + counts.exitOut;
  const appOn = appConnectionStatus === "online" || appConnectionStatus === "syncing";
  const appText =
    appConnectionStatus === "syncing" ? "동기화 중" : appConnectionStatus === "online" ? "연결됨" : "오프라인";
  const gateRegistered = gateConnectionStatus === "registered";

  return (
    <View style={{ gap: 10 }}>
      <View className="h-12 flex-row items-center rounded-2xl px-4" style={{ gap: 18, backgroundColor: C.white }}>
        <StatusDot label="앱" text={appText} on={appOn} />
        <StatusDot label="개폐기" text={gateRegistered ? "등록됨" : "미등록"} on={gateRegistered} />
      </View>

      <View className="rounded-2xl px-5 pb-1.5 pt-5" style={{ backgroundColor: C.white }}>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: C.bgAlt }}>
            <Image source={DOOR_OPENER_IMAGE} resizeMode="contain" style={{ width: 34, height: 34 }} />
          </View>
          <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
            벌 출입
          </PretendardFont>
        </View>

        <View className="mt-5 flex-row">
          <BigCount label="들어온 벌" count={incomingCount} />
          <View style={{ width: 1, marginHorizontal: 18, backgroundColor: C.border }} />
          <BigCount label="나간 벌" count={outgoingCount} />
        </View>

        <View className="mt-4" style={{ borderTopWidth: 1, borderTopColor: C.border }}>
          <DetailRow label="입구" value={`들어옴 ${counts.entranceIn} · 나감 ${counts.entranceOut}`} />
          <DetailRow label="출구" value={`들어옴 ${counts.exitIn} · 나감 ${counts.exitOut}`} />
          <DetailRow label="온도" value={latestClimate ? `${latestClimate.temperatureC.toFixed(1)}°C` : undefined} />
          <DetailRow label="습도" value={latestClimate ? `${latestClimate.humidityPercent.toFixed(0)}%` : undefined} />
        </View>
      </View>
    </View>
  );
}

function StatusDot({ label, text, on }: { label: string; text: string; on: boolean }) {
  return (
    <View className="flex-row items-center" style={{ gap: 7 }}>
      <View className="rounded-full" style={{ width: 8, height: 8, backgroundColor: on ? C.success : C.ter }} />
      <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.textAlt }}>
        {label} <PretendardFont weight="bold" style={{ color: C.text }}>{text}</PretendardFont>
      </PretendardFont>
    </View>
  );
}

function BigCount({ label, count }: { label: string; count: number }) {
  return (
    <View className="flex-1">
      <PretendardFont weight="medium" style={{ fontSize: 13.5, color: C.sec }}>
        {label}
      </PretendardFont>
      <PretendardFont weight="bold" style={{ marginTop: 4, fontSize: 28, lineHeight: 34, color: C.text }}>
        {count.toLocaleString("ko-KR")}
        <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.text }}>마리</PretendardFont>
      </PretendardFont>
    </View>
  );
}

/** 이름은 왼쪽 회색, 값은 오른쪽 진한 글자. 값이 없으면 연한 대시를 둡니다. */
function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <PretendardFont weight="medium" style={{ fontSize: 14.5, color: C.textAlt }}>
        {label}
      </PretendardFont>
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 15, color: value ? C.text : C.ter, fontVariant: ["tabular-nums"] }}
      >
        {value ?? "–"}
      </PretendardFont>
    </View>
  );
}

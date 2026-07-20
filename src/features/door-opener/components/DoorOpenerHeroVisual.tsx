import { Image, useWindowDimensions, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { DoorOpenerRuntimeState } from "../model/doorOpenerRuntime";
import type { BeeTrafficCounts } from "../model/webeeHce";
import type { GateActionAppConnectionStatus } from "./NfcDoorCardSection";

const DOOR_OPENER_IMAGE = require("../../../../assets/images/door-opener-3d.png");

export const EMPTY_BEE_TRAFFIC_COUNTS: BeeTrafficCounts = {
  entranceIn: 0,
  entranceOut: 0,
  exitIn: 0,
  exitOut: 0,
};

export function DoorOpenerHeroVisual({
  counts = EMPTY_BEE_TRAFFIC_COUNTS,
  runtimeState,
  runtimeText,
  appConnectionStatus = "idle",
  gateConnected = false,
}: {
  counts?: BeeTrafficCounts;
  runtimeState?: DoorOpenerRuntimeState | null;
  runtimeText?: string | null;
  appConnectionStatus?: GateActionAppConnectionStatus;
  gateConnected?: boolean;
}) {
  const { width } = useWindowDimensions();
  const imageSize = Math.min(width * 0.42, 168);
  const incomingCount = counts.entranceIn + counts.exitIn;
  const outgoingCount = counts.entranceOut + counts.exitOut;

  return (
    <View
      className="flex-row items-center"
      style={{ minHeight: imageSize + 42, marginLeft: -8 }}
    >
      <Image
        source={DOOR_OPENER_IMAGE}
        resizeMode="contain"
        style={{
          width: imageSize,
          height: imageSize,
        }}
      />

      <View className="ml-2 flex-1">
        <View className="mb-2 flex-row gap-2">
          <ConnectionChip
            label="앱"
            status={appConnectionStatus === "online" || appConnectionStatus === "syncing"}
            text={appConnectionStatus === "syncing" ? "동기화중" : appConnectionStatus === "online" ? "연결됨" : "오프라인"}
          />
          <ConnectionChip
            label="개폐기"
            status={gateConnected}
            text={gateConnected ? "연결됨" : "오프라인"}
          />
        </View>

        <View className="flex-row gap-2">
          <TrafficMainTile label="들어온 벌" count={incomingCount} />
          <TrafficMainTile label="나간 벌" count={outgoingCount} />
        </View>

        <View className="mt-2 flex-row gap-2">
          <TrafficCountLine label="입구 IN" count={counts.entranceIn} />
          <TrafficCountLine label="입구 OUT" count={counts.entranceOut} />
        </View>
        <View className="mt-1.5 flex-row gap-2">
          <TrafficCountLine label="출구 IN" count={counts.exitIn} />
          <TrafficCountLine label="출구 OUT" count={counts.exitOut} />
        </View>

        <RuntimeSummary state={runtimeState} runtimeText={runtimeText} />
      </View>
    </View>
  );
}

function ConnectionChip({
  label,
  status,
  text,
}: {
  label: string;
  status: boolean;
  text: string;
}) {
  return (
    <View
      className="flex-row items-center rounded-full px-2.5 py-1"
      style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
    >
      <View
        className="mr-1.5 rounded-full"
        style={{
          width: 7,
          height: 7,
          backgroundColor: status ? "#34D399" : "rgba(255,255,255,0.45)",
        }}
      />
      <PretendardFont
        weight="bold"
        numberOfLines={1}
        style={{ fontSize: 11.5, color: C.white }}
      >
        {label} {text}
      </PretendardFont>
    </View>
  );
}

function TrafficMainTile({ label, count }: { label: string; count: number }) {
  return (
    <View
      className="flex-1 rounded-2xl px-3 py-2.5"
      style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
    >
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 14, color: "rgba(255,255,255,0.74)" }}
      >
        {label}
      </PretendardFont>
      <View className="mt-0.5 flex-row items-end">
        <PretendardFont weight="bold" style={{ fontSize: 31, color: C.white }}>
          {count}
        </PretendardFont>
        <PretendardFont
          weight="semibold"
          style={{ marginBottom: 4, marginLeft: 3, fontSize: 13.5, color: "#F8D15C" }}
        >
          마리
        </PretendardFont>
      </View>
    </View>
  );
}

function TrafficCountLine({ label, count }: { label: string; count: number }) {
  return (
    <View className="flex-1 flex-row items-center justify-between">
      <PretendardFont
        weight="semibold"
        numberOfLines={1}
        style={{ fontSize: 13, color: "rgba(255,255,255,0.74)" }}
      >
        {label}
      </PretendardFont>
      <PretendardFont weight="bold" style={{ fontSize: 16, color: C.white }}>
        {count}
      </PretendardFont>
    </View>
  );
}

function RuntimeSummary({
  state,
  runtimeText,
}: {
  state?: DoorOpenerRuntimeState | null;
  runtimeText?: string | null;
}) {
  if (!state) return null;

  const active = state.status === "ok" && state.mode !== "count_status";

  return (
    <View
      className="mt-3 rounded-2xl px-3 py-2.5"
      style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
    >
      <PretendardFont
        weight="bold"
        numberOfLines={1}
        style={{ fontSize: 15, color: active ? "#F8D15C" : C.white }}
      >
        {active ? "실행중" : "마지막 카드"} · {state.title}
      </PretendardFont>
      {runtimeText ? (
        <PretendardFont
          weight="bold"
          numberOfLines={1}
          style={{ marginTop: 2, fontSize: 14, color: C.white }}
        >
          {runtimeText}
        </PretendardFont>
      ) : null}
      <PretendardFont
        weight="medium"
        numberOfLines={1}
        style={{ marginTop: 2, fontSize: 12.5, color: "rgba(255,255,255,0.68)" }}
      >
        마지막 APDU · {state.result}
      </PretendardFont>
    </View>
  );
}

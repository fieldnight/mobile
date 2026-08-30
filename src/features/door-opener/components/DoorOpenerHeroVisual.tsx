import { Image, useWindowDimensions, View } from "react-native";
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

export function DoorOpenerHeroVisual({
  counts = EMPTY_BEE_TRAFFIC_COUNTS,
  latestClimate,
  appConnectionStatus = "idle",
  gateConnected = false,
}: {
  counts?: BeeTrafficCounts;
  latestClimate?: HceClimateSample;
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

        <ClimateSummary sample={latestClimate} />

      </View>
    </View>
  );
}

function ClimateSummary({ sample }: { sample?: HceClimateSample }) {
  return (
    <View
      className="mt-3 flex-row items-center justify-between rounded-2xl px-3 py-2"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}
    >
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 12.5, color: C.textAlt }}
      >
        온습도
      </PretendardFont>
      {sample ? (
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <PretendardFont weight="bold" style={{ fontSize: 15, color: C.text }}>
            {sample.temperatureC.toFixed(1)}°C
          </PretendardFont>
          <PretendardFont weight="bold" style={{ fontSize: 15, color: "#1B9C79" }}>
            {sample.humidityPercent.toFixed(0)}%
          </PretendardFont>
        </View>
      ) : (
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 12.5, color: C.ter }}
        >
          카드로 수신 대기
        </PretendardFont>
      )}
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
      style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}
    >
      <View
        className="mr-1.5 rounded-full"
        style={{
          width: 7,
          height: 7,
          backgroundColor: status ? "#34D399" : "rgba(25,31,40,0.28)",
        }}
      />
      <PretendardFont
        weight="bold"
        numberOfLines={1}
        style={{ fontSize: 11.5, color: C.text }}
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
      style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}
    >
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 14, color: C.textAlt }}
      >
        {label}
      </PretendardFont>
      <View className="mt-0.5 flex-row items-end">
        <PretendardFont weight="bold" style={{ fontSize: 31, color: C.text }}>
          {count}
        </PretendardFont>
        <PretendardFont
          weight="semibold"
          style={{ marginBottom: 4, marginLeft: 3, fontSize: 13.5, color: "#B8860B" }}
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
        style={{ fontSize: 13, color: C.textAlt }}
      >
        {label}
      </PretendardFont>
      <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
        {count}
      </PretendardFont>
    </View>
  );
}

import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { T } from "@/features/hive-home";
import { useGateStore } from "@/stores/useGateStore";
import { useGateModeStore } from "@/stores/useGateModeStore";
import { useDoorDeviceState } from "@/stores/useDoorDeviceState";
import { useDoorStatsCache } from "@/features/door-opener/hooks/useDoorStatsCache";
import { gateDisplayName, normalizeGateMac } from "@/features/door-opener/model/deviceCardState";

export function DoorDeviceCollection() {
  const gates = useGateStore(state => state.gates);
  const records = useDoorDeviceState(state => state.records);
  const stats = useDoorStatsCache();
  const ids = [...new Set([...gates.map(gate => gate.macAddress), ...Object.keys(records), ...Object.keys(stats)]
    .map(normalizeGateMac).filter((id): id is string => !!id))];
  const open = (deviceId?: string) => {
    useGateModeStore.getState().setMode("offline");
    router.push({ pathname: "/iot-home", params: { tab: "stats", ...(deviceId ? { deviceId } : {}) } });
  };
  return <View style={{ marginTop: 20, marginBottom: 22, gap: 10 }}>
    <View style={{ paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <PretendardFont weight="bold" style={{ fontSize: 17, color: T.ink }}>개폐기 모아보기</PretendardFont>
      <Tap accessibilityRole="button" onPress={() => open()} style={{ padding: 6 }}>
        <PretendardFont style={{ fontSize: 12, color: T.inkSoft }}>전체 보기 ›</PretendardFont>
      </Tap>
    </View>
    {ids.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
      {ids.map(id => {
        const record = records[id];
        const device = stats[id];
        const counts = device?.bootCounts;
        const samples = device?.climateSamples ?? [];
        const temperature = samples[samples.length - 1]?.temperatureC;
        return <Tap key={id} accessibilityRole="button" accessibilityLabel={`${gateDisplayName(id, gates)} 개폐기 리포트 열기`}
          onPress={() => open(id)} style={({ pressed }) => ({ width: 245, padding: 16, borderRadius: 20,
            backgroundColor: pressed ? T.keyPressed : T.panel, gap: 8 })}>
          <PretendardFont weight="bold" numberOfLines={1} style={{ fontSize: 15, color: T.ink }}>{gateDisplayName(id, gates)}</PretendardFont>
          <PretendardFont weight="semibold" numberOfLines={1} style={{ fontSize: 13, color: T.inkSoft }}>
            {record ? record.runtime ? `적용 카드 · ${record.runtime.title}` : "적용 카드 없음 · 취소 확인" : "적용 카드 상태 미확인"}
          </PretendardFont>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
            <View style={{ gap: 4 }}>
              <PretendardFont style={{ fontSize: 11, color: T.muted }}>누적 출입</PretendardFont>
              <PretendardFont weight="semibold" style={{ fontSize: 13, color: T.ink }}>
                {counts ? `입 ${counts.entranceIn + counts.exitIn} · 출 ${counts.entranceOut + counts.exitOut}회` : "미수신"}
              </PretendardFont>
            </View>
            <View style={{ gap: 4, alignItems: "flex-end" }}>
              <PretendardFont style={{ fontSize: 11, color: T.muted }}>온도</PretendardFont>
              <PretendardFont weight="semibold" style={{ fontSize: 16, color: T.ink }}>
                {temperature != null && Number.isFinite(temperature) ? `${temperature.toFixed(1)}℃` : "미수신"}
              </PretendardFont>
            </View>
          </View>
          <PretendardFont numberOfLines={1} style={{ fontSize: 10.5, color: T.muted }}>
            {device?.lastUpdatedAt ? `NFC 기록 ${new Date(device.lastUpdatedAt).toLocaleString("ko-KR")}` : "NFC 통계 수신 전"}
          </PretendardFont>
        </Tap>;
      })}
    </ScrollView> : <Tap accessibilityRole="button" onPress={() => open()}
      style={{ marginHorizontal: 16, backgroundColor: T.panel, borderRadius: 20, padding: 18 }}>
      <PretendardFont style={{ color: T.inkSoft, fontSize: 13 }}>개폐기를 등록하거나 NFC로 통신하면 여기에 모아 보여드려요.</PretendardFont>
    </Tap>}
  </View>;
}

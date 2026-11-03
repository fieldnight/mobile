/**
 * 홈 최상단 실시간 벌통 배너
 * - 벌통 하나의 내부 온도를 크게 보여주고, 권장 구간(24~27°C) 게이지에 현재 위치를 찍습니다.
 * - 벌통이 여러 개면 좌우로 넘겨 봅니다(온라인 벌통이 앞). 누르면 그 벌통의 스마트벌통 화면으로 갑니다.
 * - 로그인 전이나 벌통이 없으면 연결을 권하는 카드로 바뀝니다.
 */
import { useState } from "react";
import { FlatList, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { useOrderedHives } from "@/features/hive";
import { useHiveControlSettings } from "@/features/hive-control";
import { COMFORT_MAX, COMFORT_MIN, formatValue, getHiveCondition, R, T } from "@/features/hive-home";
import { useAuthStore } from "@/stores/useAuthStore";
import type { HiveData } from "@/types/hive-control";

const GAUGE_MIN = 16;
const GAUGE_MAX = 36;
const SIDE = 16;

const ratio = (value: number) => Math.min(1, Math.max(0, (value - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)));

export function LiveHiveHero() {
  const { width } = useWindowDimensions();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hives = useOrderedHives();
  const [index, setIndex] = useState(0);

  if (!isAuthenticated || hives.length === 0) {
    return <ConnectCard loggedIn={isAuthenticated} />;
  }

  return (
    <View>
      <FlatList
        data={hives}
        keyExtractor={(hive) => hive.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: SIDE }}>
            <HeroCard hive={item} />
          </View>
        )}
      />
      {hives.length > 1 ? (
        <View
          accessible
          accessibilityLabel={`벌통 ${hives.length}개 중 ${index + 1}번째. 좌우로 넘겨 다른 벌통을 볼 수 있어요`}
          style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }}
        >
          {hives.map((hive, i) => (
            <View key={hive.id} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? T.ink : "#C9CFD6" }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function HeroCard({ hive }: { hive: HiveData }) {
  const condition = getHiveCondition(hive);
  const online = hive.status === "online";
  const settings = useHiveControlSettings(hive.id);
  const target = settings.data?.controls.find((entry) => entry.type === "TEMPERATURE")?.targetValue ?? null;
  const temp = hive.temperature;
  const hasTemp = temp != null && Number.isFinite(temp);

  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${hive.name}, 내부 ${formatValue(temp)}도, ${condition.message}. 눌러서 스마트벌통 화면 열기`}
      onPress={() => router.push({ pathname: "/hive-control", params: { selectedHiveId: hive.id } })}
      style={({ pressed }) => ({ borderRadius: 28, padding: 22, backgroundColor: pressed ? "#FAFBFC" : T.panel })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: online ? T.good : T.off }} />
          <PretendardFont weight="semibold" numberOfLines={1} style={{ fontSize: 15, color: T.ink, flexShrink: 1 }}>{hive.name}</PretendardFont>
          <PretendardFont style={{ fontSize: 12.5, color: T.muted }}>{online ? `실시간 · ${hive.lastUpdate}` : "오프라인"}</PretendardFont>
        </View>
        <Feather name="chevron-right" size={18} color={T.muted} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14 }}>
        <View>
          <PretendardFont style={{ fontSize: 13, color: T.muted }}>내부 온도</PretendardFont>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 60, lineHeight: 68, letterSpacing: -2.4, color: online ? T.ink : T.muted, fontVariant: ["tabular-nums"] }}
            >
              {formatValue(temp)}
            </PretendardFont>
            <PretendardFont weight="medium" style={{ fontSize: 22, marginTop: 10, color: T.muted }}>°C</PretendardFont>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6, paddingBottom: 8 }}>
          <Meta label="습도" value={`${formatValue(hive.humidity, 0)}%`} />
          <Meta label="기계" value={`${formatValue(hive.externalTemperature)}°`} />
          <Meta label="목표" value={target != null ? `${target.toFixed(1)}°` : "–"} />
        </View>
      </View>

      {/* 온도 게이지: 16~36°C 위에 권장 구간과 현재 위치를 표시합니다. */}
      <View accessible={false} style={{ marginTop: 14 }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: T.line }}>
          <View
            style={{
              position: "absolute",
              left: `${ratio(COMFORT_MIN) * 100}%`,
              width: `${(ratio(COMFORT_MAX) - ratio(COMFORT_MIN)) * 100}%`,
              height: 8,
              borderRadius: 4,
              backgroundColor: online ? "#BFE3C8" : T.offSoft,
            }}
          />
          {hasTemp ? (
            <View
              style={{
                position: "absolute",
                left: `${ratio(temp) * 100}%`,
                top: -5,
                marginLeft: -9,
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 4,
                borderColor: online ? condition.color : T.off,
                backgroundColor: T.panel,
              }}
            />
          ) : null}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <PretendardFont style={{ fontSize: 11.5, color: T.muted }}>{GAUGE_MIN}°</PretendardFont>
          <PretendardFont style={{ fontSize: 11.5, color: T.good }}>권장 {COMFORT_MIN}~{COMFORT_MAX}°</PretendardFont>
          <PretendardFont style={{ fontSize: 11.5, color: T.muted }}>{GAUGE_MAX}°</PretendardFont>
        </View>
      </View>

      <View style={{ marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.chip, backgroundColor: condition.soft }}>
        <PretendardFont weight="semibold" style={{ fontSize: 13, color: condition.color }}>{condition.message}</PretendardFont>
      </View>
    </Tap>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
      <PretendardFont style={{ fontSize: 12, color: T.muted }}>{label}</PretendardFont>
      <PretendardFont weight="semibold" style={{ fontSize: 15, color: T.ink, fontVariant: ["tabular-nums"] }}>{value}</PretendardFont>
    </View>
  );
}

function ConnectCard({ loggedIn }: { loggedIn: boolean }) {
  return (
    <View style={{ paddingHorizontal: SIDE }}>
      <Tap
        accessibilityRole="button"
        onPress={() => router.push(loggedIn ? "/hive-control" : "/login")}
        style={({ pressed }) => ({ borderRadius: 28, padding: 22, backgroundColor: pressed ? "#FAFBFC" : T.panel })}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: T.brandSoft }}>
          <Feather name="thermometer" size={20} color="#2B7DA3" />
        </View>
        <PretendardFont weight="bold" style={{ marginTop: 14, fontSize: 20, lineHeight: 28, letterSpacing: -0.3, color: T.ink }}>
          {loggedIn ? "스마트벌통을 연결해 보세요" : "로그인하면 벌통 온도가\n여기에 바로 보여요"}
        </PretendardFont>
        <PretendardFont style={{ marginTop: 6, fontSize: 14, lineHeight: 21, color: T.inkSoft }}>
          수정벌이 지내기 좋은 24~27°C를 지키는지 한눈에 확인하고, 목표 온도도 바로 바꿀 수 있어요.
        </PretendardFont>
        <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <PretendardFont weight="bold" style={{ fontSize: 15, color: T.ink }}>{loggedIn ? "벌통 등록하기" : "로그인하기"}</PretendardFont>
          <Feather name="chevron-right" size={17} color={T.ink} />
        </View>
      </Tap>
    </View>
  );
}

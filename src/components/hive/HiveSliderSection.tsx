import React from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type {
  ActiveTag,
  HiveControlState,
  HiveData,
} from "@/types/hive-control";
import { buildActiveTags } from "@/types/hive-control";

const HIVE_IMAGE = require("../../../assets/images/beehive3.png");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface HiveSliderSectionProps {
  hives: HiveData[];
  hiveControls: Record<string, HiveControlState>;
  allView: boolean;
  selectedIndex: number;
  itemWidth: number;
  sliderRef: React.RefObject<ScrollView | null>;
  onHivePress: (id: string) => void;
  onSlideEnd: (index: number) => void;
}

function getActiveTags(
  hiveControls: Record<string, HiveControlState>,
  hiveId: string,
) {
  const control = hiveControls[hiveId];
  return control ? buildActiveTags(control) : [];
}

// ---- 공통 상태 배지 ---------------------------------------------------------
// 벌통 연결 상태를 dot + 텍스트로 표시합니다. 슬라이더에서는 이미지 위에 absolute로 고정.
// location을 넘기면 배지 바로 아래줄에 위치를 표시합니다.
function StatusBadge({
  status,
  location,
}: {
  status: "online" | "offline";
  location?: string;
}) {
  const isOnline = status === "online";
  return (
    <View className="flex-col gap-1">
      <View className="flex-row items-center gap-1.5">
        {/* 연결 상태 dot */}
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: isOnline ? C.success : C.ter,
          }}
        />
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 13, color: C.text }}
        >
          {isOnline ? "연결됨" : "오프라인"}
        </PretendardFont>
      </View>
      {/* 벌통 위치 — 배지 아래줄 */}
      {location ? (
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 13, color: C.text }}
        >
          {location}
        </PretendardFont>
      ) : null}
    </View>
  );
}

// 라벨 + 값을 타일 형태로 보여주는 정보 셀
function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-1 rounded-xl p-2.5"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      <PretendardFont style={{ fontSize: 11, color: C.text }}>
        {label}
      </PretendardFont>
      <PretendardFont
        weight="semibold"
        style={{ marginTop: 2, fontSize: 13, color: C.text }}
      >
        {value}
      </PretendardFont>
    </View>
  );
}

// 내부/외부 온습도 한 줄 표시 — 전체보기 카드용
function MetricPair({
  title,
  temperature,
  humidity,
}: {
  title: string;
  temperature: number;
  humidity: number;
}) {
  return (
    <View className="mb-3">
      <PretendardFont style={{ marginBottom: 4, fontSize: 11, color: C.text }}>
        {title}
      </PretendardFont>
      <View
        className="rounded-xl px-3 py-2"
        style={{ backgroundColor: "#F8FAFC" }}
      >
        <PretendardFont weight="bold" style={{ fontSize: 15, color: C.text }}>
          온도 {temperature}°C · 습도 {humidity}%
        </PretendardFont>
      </View>
    </View>
  );
}

// 켜진 자동·수동 제어 기능을 태그 pill로 나열합니다.
// maxVisible 초과분은 +N 으로 표시합니다.
function TagRow({
  tags,
  maxVisible,
}: {
  tags: ActiveTag[];
  maxVisible: number;
}) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = Math.max(tags.length - visibleTags.length, 0);

  return (
    <View>
      <PretendardFont
        weight="bold"
        style={{ marginBottom: 3, fontSize: 13, color: C.textSx }}
      >
        제어 기능
      </PretendardFont>
      <View className="flex-row flex-wrap gap-1.5">
        {tags.length > 0 ? (
          <>
            {visibleTags.map((tag, index) => (
              <View
                key={`${tag.label}-${index}`}
                className="rounded-lg px-2.5 py-1"
                style={{ backgroundColor: "rgba(233, 240, 255, 0.68)" }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 14, color: C.text }}
                >
                  {tag.label}
                </PretendardFont>
              </View>
            ))}
            {hiddenCount > 0 && (
              <View
                className="rounded-lg p-2"
                style={{ backgroundColor: "rgba(233, 240, 255, 0.68)" }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 10, color: C.text }}
                >
                  +{hiddenCount}
                </PretendardFont>
              </View>
            )}
          </>
        ) : (
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 13, color: C.ter }}
          >
            켜진 기능 없음
          </PretendardFont>
        )}
      </View>
    </View>
  );
}

// ---- 슬라이더 헤더 ----------------------------------------------------------
// 벌통 이름과 위치를 한 row로 표시합니다. (연결 상태는 이미지 위 absolute로 별도 표시)
function HeroHeader({ hive }: { hive: HiveData }) {
  return (
    <PretendardFont
      weight="bold"
      style={{ fontSize: 20, color: C.text }}
      className="mb-3"
    >
      {hive.name}
    </PretendardFont>
  );
}

// 슬라이더 패널 내 내부/외부 온습도 한 줄 표시 — 구분선 없이 타이틀만 굵게
function PanelMetric({
  title,
  temperature,
  humidity,
}: {
  title: string;
  temperature: number;
  humidity: number;
}) {
  return (
    <View>
      <PretendardFont weight="bold" style={{ fontSize: 12, color: C.textSx }}>
        {title}
      </PretendardFont>
      <PretendardFont
        weight="bold"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        style={{ fontSize: 16, color: C.text }}
      >
        온도 {temperature}°Cㅤ습도 {humidity}%
      </PretendardFont>
    </View>
  );
}

// 슬라이더 카드 오른쪽 반투명 패널 — 온습도 + 제어 태그
function SensorPanel({
  hive,
  activeTags,
}: {
  hive: HiveData;
  activeTags: ActiveTag[];
}) {
  return (
    <View
      className="flex-1 p-3 rounded-xl gap-2"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.312)",
      }}
    >
      <PanelMetric
        title="내부"
        temperature={hive.temperature}
        humidity={hive.humidity}
      />
      <PanelMetric
        title="외부"
        temperature={hive.externalTemperature ?? hive.temperature}
        humidity={hive.externalHumidity ?? hive.humidity}
      />
      <View className="pb-1">
        <TagRow tags={activeTags} maxVisible={2} />
      </View>
    </View>
  );
}

// 슬라이더 한 페이지 — 오른쪽 62% 영역에 헤더 + 센서 패널 배치
function HiveHeroSlide({
  hive,
  activeTags,
}: {
  hive: HiveData;
  activeTags: ActiveTag[];
}) {
  return (
    <View className="h-full self-start px-3" style={{ width: "62%" }}>
      <HeroHeader hive={hive} />
      <SensorPanel hive={hive} activeTags={activeTags} />
    </View>
  );
}

export function HiveSliderSection({
  hives,
  hiveControls,
  allView,
  selectedIndex,
  itemWidth,
  sliderRef,
  onHivePress,
  onSlideEnd,
}: HiveSliderSectionProps) {
  const pageWidth = itemWidth;

  // 전체보기: 카드 스택
  if (allView) {
    return (
      <View className="mt-1 gap-3">
        {hives.map((hive) => (
          <View
            key={hive.id}
            className="rounded-[20px] p-4"
            style={{
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.05)",
              backgroundColor: "rgba(255, 255, 255, 0.474)",
            }}
          >
            <HiveBeeBoxCard
              hive={hive}
              onPress={() => onHivePress(hive.id)}
              activeTags={getActiveTags(hiveControls, hive.id)}
            />
          </View>
        ))}
      </View>
    );
  }

  const SLIDER_HEIGHT = 280;

  return (
    <View className="mb-10">
      <View
        style={{ position: "relative", height: SLIDER_HEIGHT }}
        className="mb-[-20]"
      >
        {/* 벌통 이미지 — 오른쪽 하단 고정 */}
        <Image
          source={HIVE_IMAGE}
          style={{
            position: "absolute",
            bottom: 10,
            right: -20,
            width: 180,
            height: 200,
            opacity: 0.8,
          }}
          resizeMode="contain"
        />
        {/* 연결 상태 배지 + 위치 — 이미지 위에 absolute 고정 */}
        <View style={{ position: "absolute", top: 35, right: 30, zIndex: 10 }}>
          <StatusBadge
            status={hives[selectedIndex]?.status ?? "offline"}
            location={hives[selectedIndex]?.location}
          />
        </View>

        {/* 가로 슬라이더 */}
        <ScrollView
          ref={sliderRef}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={pageWidth}
          decelerationRate="fast"
          style={{
            position: "absolute",
            top: 20,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          contentContainerStyle={{ alignItems: "stretch" }}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / pageWidth,
            );
            onSlideEnd(Math.max(0, Math.min(index, hives.length - 1)));
          }}
        >
          {hives.map((hive) => (
            <Pressable
              key={hive.id}
              onPress={() => onHivePress(hive.id)}
              style={{
                width: pageWidth,
                height: SLIDER_HEIGHT,
                paddingHorizontal: 10,
                paddingTop: 8,
                paddingBottom: 50,
              }}
            >
              <HiveHeroSlide
                hive={hive}
                activeTags={getActiveTags(hiveControls, hive.id)}
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 페이지 인디케이터 dot */}
      <View className="flex-row items-center justify-center gap-1.5 ml-[-280]">
        {hives.map((_, index) => (
          <View
            key={index}
            style={{
              height: 6,
              borderRadius: 3,
              width: index === selectedIndex ? 16 : 5,
              backgroundColor: index === selectedIndex ? C.text : C.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ---- 전체보기 카드 ----------------------------------------------------------
// 전체보기 화면에서 벌통 하나를 카드 형태로 보여줍니다.
function HiveBeeBoxCard({
  hive,
  onPress,
  activeTags,
}: {
  hive: HiveData;
  onPress: () => void;
  activeTags: ActiveTag[];
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      style={animatedStyle}
      data-testid={`hive-BeeBoxcard-${hive.id}`}
    >
      <View>
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-3">
            <PretendardFont
              weight="bold"
              style={{ fontSize: 18, color: C.text }}
            >
              {hive.name}
            </PretendardFont>
            {hive.location ? (
              <PretendardFont
                style={{ marginTop: 2, fontSize: 15, color: C.text }}
              >
                {hive.location}
              </PretendardFont>
            ) : null}
          </View>
          <StatusBadge status={hive.status} />
        </View>

        {/* 설치일 / 벌 교체일 */}
        <View className="flex-row gap-3 mb-3">
          <InfoTile label="설치일" value={hive.registeredAt ?? "-"} />
          <InfoTile label="벌 교체일" value={hive.replacedAt ?? "-"} />
        </View>

        {/* 온라인이면 온습도 + 제어 태그, 오프라인이면 안내 메시지 */}
        {hive.status === "online" ? (
          <>
            <MetricPair
              title="내부"
              temperature={hive.temperature}
              humidity={hive.humidity}
            />
            <MetricPair
              title="외부"
              temperature={hive.externalTemperature ?? hive.temperature}
              humidity={hive.externalHumidity ?? hive.humidity}
            />
            <TagRow tags={activeTags} maxVisible={6} />
          </>
        ) : (
          <View className="items-center justify-center py-3">
            <Feather name="wifi-off" size={18} color={C.ter} />
            <PretendardFont
              style={{ marginTop: 4, fontSize: 12, color: C.ter }}
            >
              연결 확인 필요
            </PretendardFont>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

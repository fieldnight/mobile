import React, { useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  withSpring,
} from "react-native-reanimated";
import { PageTitle } from "@/components/PageTitle";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { HiveData, ActiveTag, HiveControlState } from "@/types/hive-control";
import { buildActiveTags } from "@/types/hive-control";

interface HiveSliderSectionProps {
  hives: HiveData[];
  hiveControls: Record<string, HiveControlState>;
  allView: boolean;
  selectedIndex: number;
  itemWidth: number;
  sliderRef: React.RefObject<ScrollView | null>;
  onToggleAllView?: () => void;
  onHivePress: (id: string) => void;
  onSlideEnd: (index: number) => void;
  showToggle?: boolean;
  title?: string;
  subtitle?: string;
}

/**
 * StatusBadge
 * - 벌통 연결 상태를 색상과 텍스트로 표시합니다.
 * - online/offline 상태에 따라 배경과 텍스트 색이 변경됩니다.
 */
function StatusBadge({ status }: { status: "online" | "offline" }) {
  const isOnline = status === "online";
  return (
    <View
      className="flex-row items-center rounded-xl gap-1"
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: isOnline ? "#E8F5E9" : "#FFEBEE",
      }}
    >
      <View
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: isOnline ? C.success : C.error }}
      />
      <PretendardFont
        style={{
          fontSize: 12,
          fontWeight: "500",
          color: isOnline ? C.success : C.error,
        }}
      >
        {isOnline ? "연결됨" : "오프라인"}
      </PretendardFont>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * HiveBeeBoxCard
 * - 각 벌통의 정보를 카드 형태로 표시합니다.
 * - 선택된 벌통은 테두리와 그림자로 강조됩니다.
 * - 온라인 상태일 때 온도/습도/태그 정보를 보여줍니다.
 */
function HiveBeeBoxCard({
  hive,
  onPress,
  activeTags,
  selected = false,
}: {
  hive: HiveData;
  onPress: () => void;
  activeTags: ActiveTag[];
  selected?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      data-testid={`hive-BeeBoxcard-${hive.id}`}
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 16, color: C.text }}
          >
            {hive.name}
          </PretendardFont>
          <PretendardFont
            className="mt-0.5"
            style={{ fontSize: 12, color: C.ter }}
          >
            업데이트: {hive.lastUpdate}
          </PretendardFont>
        </View>
        <StatusBadge status={hive.status} />
      </View>

      {hive.status === "online" ? (
        <>
          <View
            className="my-3"
            style={{ height: 1, backgroundColor: C.border }}
          />
          <View className="flex-row justify-around">
            <View className="flex-1 items-center gap-1">
              <Feather name="thermometer" size={16} color={C.sec} />
              <PretendardFont
                weight="bold"
                style={{ fontSize: 18, color: C.text }}
              >
                {hive.temperature}°C
              </PretendardFont>
            </View>
            <View style={{ width: 1, backgroundColor: C.border }} />
            <View className="flex-1 items-center gap-1">
              <Feather name="droplet" size={16} color={C.sec} />
              <PretendardFont
                weight="bold"
                style={{ fontSize: 18, color: C.text }}
              >
                {hive.humidity}%
              </PretendardFont>
            </View>
            <View style={{ width: 1, backgroundColor: C.border }} />
            <View className="flex-1 items-center gap-1">
              {activeTags.length > 0 ? (
                <View className="flex-row flex-wrap justify-center gap-1">
                  {activeTags.map((tag, i) => (
                    <View
                      key={i}
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: tag.bg,
                      }}
                    >
                      <PretendardFont
                        weight="semibold"
                        style={{ fontSize: 10, color: tag.color }}
                      >
                        {tag.label}
                      </PretendardFont>
                    </View>
                  ))}
                </View>
              ) : (
                <>
                  <Feather name="minus-circle" size={14} color={C.ter} />
                  <PretendardFont
                    className="mt-0.5"
                    style={{ fontSize: 12, color: C.sec }}
                  >
                    제어 없음
                  </PretendardFont>
                </>
              )}
            </View>
          </View>
        </>
      ) : (
        <View className="flex-row items-center justify-center gap-2 py-4">
          <Feather name="wifi-off" size={20} color={C.ter} />
          <PretendardFont style={{ fontSize: 14, color: C.ter }}>
            연결을 확인해주세요
          </PretendardFont>
        </View>
      )}
    </AnimatedPressable>
  );
}

/**
 * Arrow
 * - 슬라이더 양쪽에 표시되는 이동 안내 화살표입니다.
 * - 현재 페이지가 첫/마지막이 아닐 때 각각 좌우로 표시됩니다.
 */
function Arrow({
  side,
  style,
}: {
  side: "left" | "right";
  style: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0,
          bottom: 0,
          justifyContent: "center",
          ...(side === "right" ? { right: -10 } : { left: -10 }),
        },
        style,
      ]}
    >
      <PretendardFont weight="semibold" style={{ fontSize: 35, color: C.sky }}>
        {side === "right" ? ">" : "<"}
      </PretendardFont>
    </Animated.View>
  );
}

/**
 * HiveSliderSection
 * - 벌통 선택 슬라이더와 전체 보기 모드를 모두 지원합니다.
 * - stats 페이지와 control 페이지 모두에서 공통으로 사용됩니다.
 * - 제목/부제목, 전체 보기 토글, 페이징 슬라이더, 페이지 인디케이터를 렌더링합니다.
 */
export function HiveSliderSection({
  hives,
  hiveControls,
  allView,
  selectedIndex,
  itemWidth,
  sliderRef,
  onToggleAllView,
  onHivePress,
  onSlideEnd,
  showToggle = false,
  title,
  subtitle,
}: HiveSliderSectionProps) {
  const blink = useSharedValue(0.15);

  useEffect(() => {
    blink.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
    return () => cancelAnimation(blink);
  }, [blink]);

  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  const sliderContent = allView ? (
    <View style={{ gap: 8, marginBottom: 16 }}>
      {hives.map((hive, index) => (
        <HiveBeeBoxCard
          key={hive.id}
          hive={hive}
          onPress={() => onHivePress(hive.id)}
          selected={hive.id === hives[selectedIndex]?.id}
          activeTags={
            hiveControls[hive.id] ? buildActiveTags(hiveControls[hive.id]) : []
          }
        />
      ))}
    </View>
  ) : (
    <View
      style={{
        backgroundColor: C.white,
        borderRadius: 24,
        padding: 16,
        shadowColor: C.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
        marginBottom: 16,
      }}
    >
      <View>
        <View style={{ position: "relative" }}>
          <ScrollView
            ref={sliderRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={itemWidth}
            decelerationRate="fast"
            contentContainerStyle={{ paddingVertical: 8 }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
              onSlideEnd(Math.max(0, Math.min(idx, hives.length - 1)));
            }}
          >
            {hives.map((hive) => (
              <View key={hive.id} style={{ width: itemWidth }}>
                <HiveBeeBoxCard
                  hive={hive}
                  onPress={() => onHivePress(hive.id)}
                  selected={hive.id === hives[selectedIndex]?.id}
                  activeTags={
                    hiveControls[hive.id]
                      ? buildActiveTags(hiveControls[hive.id])
                      : []
                  }
                />
              </View>
            ))}
          </ScrollView>
          {selectedIndex < hives.length - 1 && (
            <Arrow side="right" style={blinkStyle} />
          )}
          {selectedIndex > 0 && <Arrow side="left" style={blinkStyle} />}
        </View>
      </View>
    </View>
  );

  return (
    <View>
      {(title || subtitle || showToggle) && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 8,
          }}
        >
          <View style={{ flex: 1, marginRight: showToggle ? 8 : 0 }}>
            {title ? (
              <PageTitle size="medium" title={title} subtitle={subtitle} />
            ) : null}
          </View>
          {showToggle && onToggleAllView ? (
            <Pressable
              onPress={onToggleAllView}
              style={{
                backgroundColor: allView ? C.primary : C.white,
                borderWidth: 1,
                borderColor: allView ? C.primary : C.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginBottom: 0,
              }}
            >
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 14, color: allView ? C.white : C.text }}
              >
                전체 보기
              </PretendardFont>
            </Pressable>
          ) : null}
        </View>
      )}
      {sliderContent}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          marginTop: 4,
        }}
      >
        {hives.map((_, i) => (
          <View
            key={i}
            style={{
              height: 5,
              width: i === selectedIndex ? 16 : 5,
              borderRadius: 3,
              backgroundColor: i === selectedIndex ? C.primary : C.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}

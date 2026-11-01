import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

/** 한 번의 비트에서 연달아 퍼지는 파동 수(둥·둥·둥) */
const RING_COUNT = 3;
/** 파동 사이 간격 */
const RING_STAGGER = 260;
/** 파동 하나가 퍼져 사라지는 시간 */
const RING_DURATION = 1500;
/** 비트가 끝나고 다음 비트까지 쉬는 시간 */
const BEAT_REST = 500;
const CYCLE = RING_STAGGER * (RING_COUNT - 1) + RING_DURATION + BEAT_REST;

/**
 * NFC 카드 뒤 파동
 * - 카드 윗변 가운데에서 동그란 파동이 세 번 연달아 퍼지고 잠깐 쉽니다. 카드가 지금 신호를 내보내고 있다는 표시입니다.
 * - 원의 아래 절반은 카드에 가려 위쪽 반원만 보입니다.
 */
export function NfcPulseRings({ size }: { size: number }) {
  const progress = useRef(Array.from({ length: RING_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = progress.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * RING_STAGGER),
          Animated.timing(value, {
            toValue: 1,
            duration: RING_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay(CYCLE - index * RING_STAGGER - RING_DURATION),
        ]),
      ),
    );
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [progress]);

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: -size / 2, left: 0, right: 0, height: size, alignItems: "center" }}
    >
      {progress.map((value, index) => (
        <Animated.View
          key={index}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            opacity: value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
            transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.15] }) }],
          }}
        />
      ))}
    </View>
  );
}

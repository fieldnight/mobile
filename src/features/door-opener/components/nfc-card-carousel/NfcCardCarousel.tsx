import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import type { NfcDoorCardConfig } from "../nfcDoorCards";
import { createLoopedItems, resolveLoopIndex, toLoopIndex } from "../../model/nfcCarousel";
import { NfcFloatingCard } from "./NfcFloatingCard";
import { NfcPulseRings } from "./NfcPulseRings";

const CARD_GAP = 14;
const MAX_CARD_WIDTH = 344;

interface NfcCardCarouselProps {
  cards: NfcDoorCardConfig[];
  initialCard: NfcDoorCardConfig;
  onActiveCardChange: (card: NfcDoorCardConfig) => void;
  /** 카드가 NFC로 신호를 내보내는 중이면 카드 뒤로 파동을 그립니다. */
  pulsing?: boolean;
}

export function NfcCardCarousel({
  cards,
  initialCard,
  onActiveCardChange,
  pulsing = false,
}: NfcCardCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(MAX_CARD_WIDTH, screenWidth - 64);
  const itemSpan = cardWidth + CARD_GAP;
  const sidePadding = Math.max(0, (screenWidth - itemSpan) / 2);
  const listRef = useRef<FlatList<NfcDoorCardConfig>>(null);
  const initialLogicalIndex = Math.max(
    0,
    cards.findIndex((candidate) => candidate.id === initialCard.id),
  );
  const [loopIndex, setLoopIndex] = useState(() =>
    toLoopIndex(initialLogicalIndex, cards.length),
  );
  const loopedCards = useMemo(() => createLoopedItems(cards), [cards]);

  const scrollToLoopIndex = useCallback(
    (nextLoopIndex: number, animated: boolean) => {
      listRef.current?.scrollToOffset({
        offset: nextLoopIndex * itemSpan,
        animated,
      });
    },
    [itemSpan],
  );

  useEffect(() => {
    const logicalIndex = Math.max(
      0,
      cards.findIndex((candidate) => candidate.id === initialCard.id),
    );
    const nextLoopIndex = toLoopIndex(logicalIndex, cards.length);
    setLoopIndex(nextLoopIndex);
    requestAnimationFrame(() => scrollToLoopIndex(nextLoopIndex, false));
  }, [cards, initialCard.id, scrollToLoopIndex]);

  const settleAt = useCallback(
    (rawLoopIndex: number) => {
      const resolution = resolveLoopIndex(rawLoopIndex, cards.length);
      const activeCard = cards[resolution.logicalIndex];
      if (!activeCard) return;

      setLoopIndex(resolution.correctedLoopIndex);
      onActiveCardChange(activeCard);

      if (resolution.correctedLoopIndex !== rawLoopIndex) {
        requestAnimationFrame(() => scrollToLoopIndex(resolution.correctedLoopIndex, false));
      }
    },
    [cards, onActiveCardChange, scrollToLoopIndex],
  );

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const rawLoopIndex = Math.round(event.nativeEvent.contentOffset.x / itemSpan);
    settleAt(rawLoopIndex);
  };

  const move = (direction: -1 | 1) => {
    if (cards.length <= 1) return;
    scrollToLoopIndex(loopIndex + direction, true);
  };

  const activeLogicalIndex = resolveLoopIndex(loopIndex, cards.length).logicalIndex;

  return (
    <View>
      {/* 파동은 목록 바깥(뒤)에 깔아야 스크롤 영역에 잘리지 않고 카드 위로 퍼집니다. */}
      {pulsing ? <NfcPulseRings size={cardWidth} /> : null}
      <FlatList
        ref={listRef}
        horizontal
        data={loopedCards}
        keyExtractor={(item, index) => `${index}-${item.id}`}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        snapToInterval={itemSpan}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        getItemLayout={(_, index) => ({ length: itemSpan, offset: itemSpan * index, index })}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item, index }) => (
          <View style={{ width: itemSpan, alignItems: "center", justifyContent: "center" }}>
            <NfcFloatingCard card={item} active={index === loopIndex} width={cardWidth} />
          </View>
        )}
      />

      <View className="mt-4 flex-row items-center justify-center gap-5">
        <CarouselButton
          icon="chevron-left"
          label="이전 카드"
          disabled={cards.length <= 1}
          onPress={() => move(-1)}
        />
        <View className="min-w-14 items-center rounded-full bg-white/10 px-3 py-2">
          <PretendardFont weight="bold" style={{ fontSize: 13, color: "#FFFFFF" }}>
            {activeLogicalIndex + 1} / {cards.length}
          </PretendardFont>
        </View>
        <CarouselButton
          icon="chevron-right"
          label="다음 카드"
          disabled={cards.length <= 1}
          onPress={() => move(1)}
        />
      </View>
    </View>
  );
}

function CarouselButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: "chevron-left" | "chevron-right";
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-70"
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <Feather name={icon} size={21} color="#111827" />
    </Pressable>
  );
}

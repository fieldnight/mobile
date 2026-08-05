import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { PretendardFont } from "@/components/PretendardFont";
import type {
  BeeMapFilter,
  BeeMapPlace,
  BeeMapUserLocation,
} from "../model/mapPlace";
import { getDistanceKm } from "../utils/distance";

const CARD_GAP = 12;

const KIND_LABEL: Record<BeeMapPlace["kind"], string> = {
  seller: "수정벌 판매처",
  farm: "스마트벌통 농장",
};

const KIND_COLOR: Record<BeeMapPlace["kind"], string> = {
  seller: "bg-sky-500",
  farm: "bg-orange-500",
};

function getEmptyTitle(filter: BeeMapFilter) {
  if (filter === "seller") return "표시할 판매처가 없습니다";
  if (filter === "farm") return "표시할 농장이 없습니다";
  return "표시할 위치가 없습니다";
}

function BeeMapPlaceCard({
  place,
  width,
  distanceKm,
  isNearest,
}: {
  place: BeeMapPlace;
  width: number;
  distanceKm?: number;
  isNearest?: boolean;
}) {
  const openPhone = () => {
    if (place.phone) Linking.openURL(`tel:${place.phone}`);
  };

  const openSource = () => {
    if (place.sourceUrl) Linking.openURL(place.sourceUrl);
  };

  return (
    <View className="rounded-2xl bg-white px-5 py-4 shadow-lg" style={{ width }}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className={`self-start rounded-full px-3 py-1 ${KIND_COLOR[place.kind]}`}>
            <PretendardFont weight="bold" className="text-xs text-white">
              {KIND_LABEL[place.kind]}
            </PretendardFont>
          </View>
          <PretendardFont
            weight="bold"
            className="mt-3 text-[21px] leading-7 text-gray-900"
          >
            {place.name}
          </PretendardFont>
        </View>
      </View>

      {!!place.address && (
        <View className="mt-3 flex-row items-start">
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={20}
            color="#475569"
          />
          <PretendardFont className="ml-2 flex-1 text-base leading-6 text-gray-700">
            {place.address}
          </PretendardFont>
        </View>
      )}

      {distanceKm !== undefined && (
        <View className="mt-3 flex-row items-center">
          <MaterialCommunityIcons
            name="navigation-variant-outline"
            size={19}
            color="#2563EB"
          />
          <PretendardFont
            weight="semibold"
            className="ml-2 text-sm text-blue-700"
          >
            내 위치에서 {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)}m`
              : `${distanceKm.toFixed(1)}km`}
            {isNearest ? " · 가장 가까운 업체" : ""}
          </PretendardFont>
        </View>
      )}

      {!!place.description && (
        <PretendardFont className="mt-2 text-base leading-6 text-gray-700">
          {place.description}
        </PretendardFont>
      )}

      <View className="mt-4 flex-row gap-2">
        {!!place.phone && (
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-xl bg-gray-900 py-3"
            onPress={openPhone}
          >
            <MaterialCommunityIcons name="phone" size={19} color="#FFFFFF" />
            <PretendardFont weight="bold" className="ml-2 text-base text-white">
              전화
            </PretendardFont>
          </Pressable>
        )}
        {!!place.sourceUrl && (
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-xl bg-main-700 py-3"
            onPress={openSource}
          >
            <MaterialCommunityIcons name="map-search" size={19} color="#1F2937" />
            <PretendardFont weight="bold" className="ml-2 text-base text-gray-900">
              {place.sourceName ?? "지도보기"}
            </PretendardFont>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function BeeMapPlaceSheet({
  places,
  selectedPlaceId,
  userLocation,
  filter,
  visibleCount,
  isRefreshing,
  onSelectPlace,
}: {
  places: BeeMapPlace[];
  selectedPlaceId?: string;
  userLocation?: BeeMapUserLocation;
  filter: BeeMapFilter;
  visibleCount: number;
  isRefreshing: boolean;
  onSelectPlace: (placeId: string) => void;
}) {
  const listRef = useRef<FlatList<BeeMapPlace>>(null);
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(280, width - 32);
  const snapInterval = cardWidth + CARD_GAP;
  const selectedIndex = useMemo(() => {
    const index = places.findIndex((place) => place.id === selectedPlaceId);
    return index >= 0 ? index : 0;
  }, [places, selectedPlaceId]);

  useEffect(() => {
    if (!places.length) return;

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
      });
    });
  }, [places.length, selectedIndex]);

  const selectVisiblePlace = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.min(
        places.length - 1,
        Math.max(0, Math.round(event.nativeEvent.contentOffset.x / snapInterval)),
      );
      const place = places[index];

      if (place && place.id !== selectedPlaceId) {
        onSelectPlace(place.id);
      }
    },
    [onSelectPlace, places, selectedPlaceId, snapInterval],
  );

  if (!places.length) {
    const title = isRefreshing ? "위치 불러오는 중" : getEmptyTitle(filter);

    return (
      <View className="rounded-2xl bg-white px-5 py-4 shadow-lg">
        <View className="flex-row items-center justify-between">
          <PretendardFont weight="bold" className="text-lg text-gray-900">
            {title}
          </PretendardFont>
          <View className="rounded-full bg-gray-100 px-3 py-1">
            <PretendardFont weight="semibold" className="text-sm text-gray-700">
              지도
            </PretendardFont>
          </View>
        </View>
        <PretendardFont className="mt-2 text-base leading-6 text-gray-700">
          판매처는 카카오 검색으로, 농장 위치는 우리 서비스 데이터로 표시합니다.
        </PretendardFont>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={places}
      horizontal
      keyExtractor={(place) => place.id}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={snapInterval}
      snapToAlignment="start"
      contentContainerStyle={{ gap: CARD_GAP }}
      getItemLayout={(_, index) => ({
        length: snapInterval,
        offset: snapInterval * index,
        index,
      })}
      onScrollEndDrag={selectVisiblePlace}
      onMomentumScrollEnd={selectVisiblePlace}
      onScrollToIndexFailed={(info) => {
        listRef.current?.scrollToOffset({
          offset: snapInterval * info.index,
          animated: true,
        });
      }}
      renderItem={({ item, index }) => (
        <BeeMapPlaceCard
          place={item}
          width={cardWidth}
          distanceKm={userLocation ? getDistanceKm(userLocation, item) : undefined}
          isNearest={Boolean(userLocation) && index === 0}
        />
      )}
    />
  );
}

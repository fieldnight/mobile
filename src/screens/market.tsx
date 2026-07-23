import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { PretendardFont } from "@/components/PretendardFont";
import {
  BeeMapFilterBar,
  BeeMapPlaceSheet,
  KakaoMapWebView,
  useBeeMapPlaces,
} from "@/features/bee-map";
import type { BeeMapFilter } from "@/features/bee-map";

export default function MarketScreen() {
  const [filter, setFilter] = useState<BeeMapFilter>("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const {
    filteredPlaces,
    counts,
    isLoading,
    isRefreshing,
    sellerError,
    refetch,
  } = useBeeMapPlaces(filter);

  const selectedPlace = useMemo(
    () => filteredPlaces.find((place) => place.id === selectedPlaceId),
    [filteredPlaces, selectedPlaceId],
  );

  const changeFilter = useCallback((value: BeeMapFilter) => {
    setFilter(value);
    setSelectedPlaceId(undefined);
  }, []);

  const refreshPlaces = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <View className="flex-1 bg-white">
      <View className="z-10 bg-white px-5 pb-3 pt-4">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <PretendardFont weight="black" className="text-[28px] text-gray-900">
              수정벌 지도
            </PretendardFont>
            <PretendardFont weight="medium" className="mt-1 text-base text-gray-700">
              {counts.all}곳 표시 중
            </PretendardFont>
          </View>

          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-gray-100"
            onPress={refreshPlaces}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={24}
              color={isRefreshing ? "#F59E0B" : "#111827"}
            />
          </Pressable>
        </View>

        <BeeMapFilterBar
          value={filter}
          counts={counts}
          onChange={changeFilter}
        />
      </View>

      <View className="flex-1">
        <KakaoMapWebView
          places={filteredPlaces}
          selectedPlaceId={selectedPlace?.id}
          onMarkerPress={setSelectedPlaceId}
        />

        {isLoading && (
          <View className="absolute inset-0 items-center justify-center bg-white/40">
            <View className="rounded-2xl bg-white px-5 py-4 shadow-lg">
              <ActivityIndicator size="large" color="#F59E0B" />
              <PretendardFont weight="semibold" className="mt-3 text-base text-gray-800">
                위치 불러오는 중
              </PretendardFont>
            </View>
          </View>
        )}

        {!!sellerError && !isLoading && (
          <View className="absolute left-4 right-4 top-4 rounded-2xl bg-white px-4 py-3 shadow-lg">
            <PretendardFont weight="bold" className="text-base text-gray-900">
              판매처 정보를 불러오지 못했습니다
            </PretendardFont>
            <PretendardFont className="mt-1 text-sm text-gray-700">
              잠시 후 다시 시도해주세요.
            </PretendardFont>
          </View>
        )}

        <View className="absolute bottom-4 left-4 right-4">
          <BeeMapPlaceSheet
            selectedPlace={selectedPlace}
            filter={filter}
            visibleCount={filteredPlaces.length}
            isRefreshing={isRefreshing}
          />
        </View>
      </View>
    </View>
  );
}

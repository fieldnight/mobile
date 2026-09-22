import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";

import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import {
  BeeMapFilterBar,
  BeeMapPlaceSheet,
  KakaoMapWebView,
  sortPlacesByDistance,
  useBeeMapPlaces,
} from "@/features/bee-map";
import type { BeeMapFilter, BeeMapUserLocation } from "@/features/bee-map";

export default function MarketScreen() {
  const [filter, setFilter] = useState<BeeMapFilter>("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const [userLocation, setUserLocation] = useState<BeeMapUserLocation>();
  const [isLocating, setIsLocating] = useState(false);
  const didRequestLocation = useRef(false);
  const { show: showToast } = useAppToast();
  const {
    filteredPlaces,
    counts,
    isLoading,
    isRefreshing,
    sellerError,
    refetch,
  } = useBeeMapPlaces(filter);

  const nearbyPlaces = useMemo(
    () => sortPlacesByDistance(filteredPlaces, userLocation),
    [filteredPlaces, userLocation],
  );

  const selectedPlace = useMemo(
    () =>
      nearbyPlaces.find((place) => place.id === selectedPlaceId) ??
      nearbyPlaces[0],
    [nearbyPlaces, selectedPlaceId],
  );

  const changeFilter = useCallback((value: BeeMapFilter) => {
    setFilter(value);
    setSelectedPlaceId(undefined);
  }, []);

  const refreshPlaces = useCallback(() => {
    refetch();
  }, [refetch]);

  const focusUserLocation = useCallback(async () => {
    if (isLocating) return;

    setIsLocating(true);

    try {
      const currentPermission = await Location.getForegroundPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        showToast(
          "현재 위치 권한을 허용하면 주변 수정벌 판매처를 확인할 수 있어요.",
          "error",
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        requestedAt: Date.now(),
      });
    } catch (error) {
      console.warn("[BeeMap] 현재 위치 조회 실패", error);
      showToast("현재 위치를 불러오지 못했어요. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setIsLocating(false);
    }
  }, [isLocating, showToast]);

  useEffect(() => {
    if (didRequestLocation.current) return;

    didRequestLocation.current = true;
    void focusUserLocation();
  }, [focusUserLocation]);

  useEffect(() => {
    if (!userLocation || !nearbyPlaces[0]) return;
    setSelectedPlaceId(nearbyPlaces[0].id);
  }, [nearbyPlaces, userLocation]);

  return (
    <View className="flex-1 bg-white">
      <View className="z-10 bg-white px-5 pb-3 pt-4">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <PretendardFont weight="black" className="text-[28px] text-gray-900">
              수정벌 지도
            </PretendardFont>
            <PretendardFont weight="medium" className="mt-1 text-base text-gray-700">
              {userLocation ? "내 위치에서 가까운 순" : `${counts.all}곳 표시 중`}
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
          places={nearbyPlaces}
          selectedPlaceId={selectedPlace?.id}
          userLocation={userLocation}
          onMarkerPress={setSelectedPlaceId}
        />

        <Pressable
          className="absolute right-4 top-4 h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg active:opacity-80"
          disabled={isLocating}
          onPress={focusUserLocation}
          style={{ opacity: isLocating ? 0.65 : 1 }}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={25}
              color="#2563EB"
            />
          )}
        </Pressable>

        {(isLoading || (isLocating && !userLocation)) && (
          <View className="absolute inset-0 items-center justify-center bg-white/40">
            <View className="rounded-2xl bg-white px-5 py-4 shadow-lg">
              <ActivityIndicator
                size="large"
                color={isLocating ? "#2563EB" : "#F59E0B"}
              />
              <PretendardFont weight="semibold" className="mt-3 text-base text-gray-800">
                {isLocating ? "현재 위치 확인 중" : "업체 불러오는 중"}
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
            places={nearbyPlaces}
            selectedPlaceId={selectedPlace?.id}
            userLocation={userLocation}
            filter={filter}
            visibleCount={nearbyPlaces.length}
            isRefreshing={isRefreshing}
            onSelectPlace={setSelectedPlaceId}
          />
        </View>
      </View>
    </View>
  );
}

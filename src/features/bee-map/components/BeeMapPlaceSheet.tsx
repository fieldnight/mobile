import { Linking, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { PretendardFont } from "@/components/PretendardFont";
import type { BeeMapFilter, BeeMapPlace } from "../model/mapPlace";

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

export function BeeMapPlaceSheet({
  selectedPlace,
  filter,
  visibleCount,
  isRefreshing,
}: {
  selectedPlace?: BeeMapPlace;
  filter: BeeMapFilter;
  visibleCount: number;
  isRefreshing: boolean;
}) {
  if (!selectedPlace) {
    const title =
      visibleCount > 0
        ? "위치를 선택하세요"
        : isRefreshing
          ? "위치 불러오는 중"
          : getEmptyTitle(filter);

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
          판매처는 카카오 검색으로, 농장 위치는 우리 데이터로 표시됩니다.
        </PretendardFont>
      </View>
    );
  }

  const openPhone = () => {
    if (selectedPlace.phone) Linking.openURL(`tel:${selectedPlace.phone}`);
  };

  const openSource = () => {
    if (selectedPlace.sourceUrl) Linking.openURL(selectedPlace.sourceUrl);
  };

  return (
    <View className="rounded-2xl bg-white px-5 py-4 shadow-lg">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View
            className={`self-start rounded-full px-3 py-1 ${KIND_COLOR[selectedPlace.kind]}`}
          >
            <PretendardFont weight="bold" className="text-xs text-white">
              {KIND_LABEL[selectedPlace.kind]}
            </PretendardFont>
          </View>
          <PretendardFont
            weight="bold"
            className="mt-3 text-[21px] leading-7 text-gray-900"
          >
            {selectedPlace.name}
          </PretendardFont>
        </View>
      </View>

      {!!selectedPlace.address && (
        <View className="mt-3 flex-row items-start">
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={20}
            color="#475569"
          />
          <PretendardFont className="ml-2 flex-1 text-base leading-6 text-gray-700">
            {selectedPlace.address}
          </PretendardFont>
        </View>
      )}

      {!!selectedPlace.description && (
        <PretendardFont className="mt-2 text-base leading-6 text-gray-700">
          {selectedPlace.description}
        </PretendardFont>
      )}

      <View className="mt-4 flex-row gap-2">
        {!!selectedPlace.phone && (
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
        {!!selectedPlace.sourceUrl && (
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-xl bg-main-700 py-3"
            onPress={openSource}
          >
            <MaterialCommunityIcons name="map-search" size={19} color="#1F2937" />
            <PretendardFont weight="bold" className="ml-2 text-base text-gray-900">
              카카오맵
            </PretendardFont>
          </Pressable>
        )}
      </View>
    </View>
  );
}

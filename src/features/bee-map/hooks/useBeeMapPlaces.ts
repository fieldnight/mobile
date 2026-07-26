import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { PUBLIC_CONFIG } from "@/lib/publicConfig";
import { getBeeSellerPlaces, getOurbeeFarmPlaces } from "../api";
import type { BeeMapFilter, BeeMapPlace } from "../model/mapPlace";

const SELLER_QUERY_KEY = ["bee-map", "seller-places"];
const FARM_QUERY_KEY = ["bee-map", "farm-places"];
const MAP_STALE_TIME = Infinity;

function applyFilter(places: BeeMapPlace[], filter: BeeMapFilter) {
  if (filter === "all") return places;
  return places.filter((place) => place.kind === filter);
}

export function useBeeMapPlaces(filter: BeeMapFilter) {
  const sellerQuery = useQuery({
    queryKey: SELLER_QUERY_KEY,
    queryFn: getBeeSellerPlaces,
    staleTime: MAP_STALE_TIME,
    retry: false,
  });

  const farmQuery = useQuery({
    queryKey: FARM_QUERY_KEY,
    queryFn: getOurbeeFarmPlaces,
    staleTime: MAP_STALE_TIME,
    retry: false,
  });

  const places = useMemo(() => {
    const sellerPlaces = sellerQuery.data ?? [];
    const farmPlaces = farmQuery.data ?? [];
    return [...sellerPlaces, ...farmPlaces];
  }, [farmQuery.data, sellerQuery.data]);

  const filteredPlaces = useMemo(
    () => applyFilter(places, filter),
    [filter, places],
  );

  const counts = useMemo(
    () => ({
      all: places.length,
      seller: places.filter((place) => place.kind === "seller").length,
      farm: places.filter((place) => place.kind === "farm").length,
    }),
    [places],
  );

  return {
    places,
    filteredPlaces,
    counts,
    isLoading: sellerQuery.isLoading || farmQuery.isLoading,
    isRefreshing: sellerQuery.isFetching || farmQuery.isFetching,
    hasMapApiKey: Boolean(PUBLIC_CONFIG.kakaoMapApiKey),
    sellerError: sellerQuery.error,
    refetch: () => Promise.all([sellerQuery.refetch(), farmQuery.refetch()]),
  };
}

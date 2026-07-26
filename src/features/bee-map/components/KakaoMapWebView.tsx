import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";

import { PretendardFont } from "@/components/PretendardFont";
import { PUBLIC_CONFIG } from "@/lib/publicConfig";
import type { BeeMapPlace, BeeMapUserLocation } from "../model/mapPlace";
import { buildMapHtml } from "../utils/mapHtml";

interface KakaoMapWebViewProps {
  places: BeeMapPlace[];
  selectedPlaceId?: string;
  userLocation?: BeeMapUserLocation;
  onMarkerPress: (placeId: string) => void;
}

export function KakaoMapWebView({
  places,
  selectedPlaceId,
  userLocation,
  onMarkerPress,
}: KakaoMapWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const html = useMemo(
    () => buildMapHtml(PUBLIC_CONFIG.kakaoMapApiKey),
    [],
  );
  const markerPayload = useMemo(
    () =>
      JSON.stringify({
        type: "setPlaces",
        places,
        selectedId: selectedPlaceId,
      }),
    [places, selectedPlaceId],
  );
  const userLocationPayload = useMemo(
    () => {
      if (!userLocation) return "";

      const selectedPlace = places.find(
        (place) => place.id === selectedPlaceId,
      );

      return JSON.stringify({
        type: "setUserLocation",
        location: userLocation,
        selectedPlace: selectedPlace
          ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
          : undefined,
      });
    },
    [places, selectedPlaceId, userLocation],
  );

  const syncMarkers = useCallback(() => {
    webViewRef.current?.postMessage(markerPayload);
  }, [markerPayload]);

  const syncUserLocation = useCallback(() => {
    if (!userLocationPayload) return;
    webViewRef.current?.postMessage(userLocationPayload);
  }, [userLocationPayload]);

  const handleLoadEnd = useCallback(() => {
    syncMarkers();
    syncUserLocation();
  }, [syncMarkers, syncUserLocation]);

  useEffect(() => {
    if (mapReady) syncMarkers();
  }, [mapReady, syncMarkers]);

  useEffect(() => {
    if (mapReady) syncUserLocation();
  }, [mapReady, syncUserLocation]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          id?: string;
          message?: string;
        };

        if (payload.type === "mapReady") {
          setMapReady(true);
          return;
        }

        if (payload.type === "markerPress" && payload.id) {
          onMarkerPress(payload.id);
          return;
        }

        if (payload.type === "mapError") {
          console.warn("[BeeMap] 카카오 지도 오류", payload.message);
        }
      } catch (error) {
        console.warn("[BeeMap] 지도 메시지 파싱 실패", error);
      }
    },
    [onMarkerPress],
  );

  if (!PUBLIC_CONFIG.kakaoMapApiKey) {
    return (
      <View className="flex-1 items-center justify-center bg-blue-50 px-8">
        <PretendardFont weight="bold" className="text-xl text-gray-900">
          지도 키가 필요해요
        </PretendardFont>
        <PretendardFont className="mt-2 text-center text-base text-gray-700">
          카카오 JavaScript Key를 앱 설정에 연결하면 지도가 표시됩니다.
        </PretendardFont>
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      source={{ html, baseUrl: PUBLIC_CONFIG.kakaoMapBaseUrl }}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      onLoadEnd={handleLoadEnd}
      onMessage={handleMessage}
      style={styles.webView}
    />
  );
}

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: "#EEF6FF",
  },
});

import Constants from "expo-constants";

type ExtraConfig = Record<string, unknown>;

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getConfigValue(extraKey: string, envKey: string): string {
  return (
    toText(extra[extraKey]) ||
    toText((process.env as Record<string, string | undefined>)[envKey])
  );
}

export const PUBLIC_CONFIG = {
  fruitPriceBaseUrl: getConfigValue(
    "fruitPriceBaseUrl",
    "EXPO_PUBLIC_BASE_URL",
  ),
  fruitPriceServiceKey: getConfigValue(
    "fruitPriceServiceKey",
    "EXPO_PUBLIC_SERVICE_KEY",
  ),
  kmaApiKey: getConfigValue("kmaApiKey", "EXPO_PUBLIC_KMA_API_KEY"),
  nongsaroBaseUrl: getConfigValue(
    "nongsaroBaseUrl",
    "EXPO_PUBLIC_NONGSARO_BASE_URL",
  ).replace(/^http:\/\//, "https://"),
  nongsaroApiKey: getConfigValue(
    "nongsaroApiKey",
    "EXPO_PUBLIC_NONGSARO_API_KEY",
  ),
  kakaoMapApiKey: getConfigValue(
    "kakaoMapApiKey",
    "EXPO_PUBLIC_KAKAO_MAP_API_KEY",
  ),
  kakaoRestApiKey: getConfigValue(
    "kakaoRestApiKey",
    "EXPO_PUBLIC_KAKAO_REST_API_KEY",
  ),
  kakaoMapBaseUrl:
    getConfigValue(
      "kakaoMapBaseUrl",
      "EXPO_PUBLIC_KAKAO_MAP_WEB_BASE_URL",
    ) || "https://webeelab.site",
};

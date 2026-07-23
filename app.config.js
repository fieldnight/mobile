const fs = require("fs");
const path = require("path");

const baseConfig = require("./app.json");

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};

  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return acc;

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) return acc;

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      acc[key] = value;
      return acc;
    }, {});
}

const dotEnv = loadDotEnv();

function envValue(name, fallback = "") {
  return process.env[name] ?? dotEnv[name] ?? fallback;
}

module.exports = () => {
  const expo = baseConfig.expo;
  const googleServicesPath = path.join(__dirname, "google-services.json");
  const hasGoogleServicesFile = fs.existsSync(googleServicesPath);
  const requireGoogleServicesFile =
    process.env.REQUIRE_GOOGLE_SERVICES_FILE === "true";

  if (requireGoogleServicesFile && !hasGoogleServicesFile) {
    throw new Error(
      "google-services.json is required for Android FCM builds.",
    );
  }

  return {
    ...expo,
    extra: {
      ...expo.extra,
      fruitPriceBaseUrl: envValue("EXPO_PUBLIC_BASE_URL"),
      fruitPriceServiceKey: envValue("EXPO_PUBLIC_SERVICE_KEY"),
      kmaApiKey: envValue("EXPO_PUBLIC_KMA_API_KEY"),
      nongsaroBaseUrl: envValue(
        "EXPO_PUBLIC_NONGSARO_BASE_URL",
        "https://api.nongsaro.go.kr/service/insectAgchApplc",
      ).replace(/^http:\/\//, "https://"),
      nongsaroApiKey: envValue("EXPO_PUBLIC_NONGSARO_API_KEY"),
      kakaoMapApiKey: envValue("EXPO_PUBLIC_KAKAO_MAP_API_KEY"),
      kakaoRestApiKey: envValue("EXPO_PUBLIC_KAKAO_REST_API_KEY"),
      kakaoMapBaseUrl: envValue(
        "EXPO_PUBLIC_KAKAO_MAP_WEB_BASE_URL",
        "https://webeelab.site",
      ),
    },
    android: {
      ...expo.android,
      ...(hasGoogleServicesFile
        ? { googleServicesFile: "./google-services.json" }
        : {}),
    },
  };
};

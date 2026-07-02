const fs = require("fs");
const path = require("path");

const baseConfig = require("./app.json");

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
    android: {
      ...expo.android,
      ...(hasGoogleServicesFile
        ? { googleServicesFile: "./google-services.json" }
        : {}),
    },
  };
};

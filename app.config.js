const fs = require("fs");
const path = require("path");

const baseConfig = require("./app.json");

module.exports = () => {
  const expo = baseConfig.expo;
  const googleServicesPath = path.join(__dirname, "google-services.json");
  const hasGoogleServicesFile = fs.existsSync(googleServicesPath);

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

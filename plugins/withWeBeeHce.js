const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const AID = "F012345678";
const SERVICE_NAME = ".WeBeeHceService";

const serviceSource = (packageName) => `package ${packageName}

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

class WeBeeHceService : HostApduService() {
  override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
    return SUCCESS_RESPONSE
  }

  override fun onDeactivated(reason: Int) = Unit

  companion object {
    private val SUCCESS_RESPONSE = byteArrayOf(0x90.toByte(), 0x00.toByte())
  }
}
`;

const apduServiceXml = `<?xml version="1.0" encoding="utf-8"?>
<host-apdu-service xmlns:android="http://schemas.android.com/apk/res/android"
  android:description="@string/app_name"
  android:requireDeviceUnlock="false">
  <aid-group
    android:category="other"
    android:description="@string/app_name">
    <aid-filter android:name="${AID}" />
  </aid-group>
</host-apdu-service>
`;

function addUsesFeature(androidManifest) {
  const usesFeature = androidManifest.manifest["uses-feature"] || [];
  const hasHceFeature = usesFeature.some((feature) => {
    return feature.$?.["android:name"] === "android.hardware.nfc.hce";
  });

  if (!hasHceFeature) {
    usesFeature.push({
      $: {
        "android:name": "android.hardware.nfc.hce",
        "android:required": "true",
      },
    });
  }

  androidManifest.manifest["uses-feature"] = usesFeature;
}

function addHceService(androidManifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  const services = application.service || [];
  const existing = services.find((service) => service.$?.["android:name"] === SERVICE_NAME);
  const serviceConfig = {
    $: {
      "android:name": SERVICE_NAME,
      "android:exported": "true",
      "android:permission": "android.permission.BIND_NFC_SERVICE",
    },
    "intent-filter": [
      {
        action: [
          {
            $: {
              "android:name": "android.nfc.cardemulation.action.HOST_APDU_SERVICE",
            },
          },
        ],
      },
    ],
    "meta-data": [
      {
        $: {
          "android:name": "android.nfc.cardemulation.host_apdu_service",
          "android:resource": "@xml/apduservice",
        },
      },
    ],
  };

  if (existing) {
    Object.assign(existing, serviceConfig);
  } else {
    services.push(serviceConfig);
  }

  application.service = services;
}

module.exports = function withWeBeeHce(config) {
  config = withAndroidManifest(config, (config) => {
    addUsesFeature(config.modResults);
    addHceService(config.modResults);
    return config;
  });

  return withDangerousMod(config, [
    "android",
    (config) => {
      const packageName = config.android?.package || AndroidConfig.Package.getPackage(config);
      const packagePath = packageName.split(".").join(path.sep);
      const mainPath = path.join(config.modRequest.platformProjectRoot, "app", "src", "main");
      const servicePath = path.join(mainPath, "java", packagePath, "WeBeeHceService.kt");
      const apduPath = path.join(mainPath, "res", "xml", "apduservice.xml");

      fs.mkdirSync(path.dirname(servicePath), { recursive: true });
      fs.mkdirSync(path.dirname(apduPath), { recursive: true });
      fs.writeFileSync(servicePath, serviceSource(packageName));
      fs.writeFileSync(apduPath, apduServiceXml);

      return config;
    },
  ]);
};

const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const AID = "F057424545";
const SERVICE_NAME = ".WeBeeHceService";

const serviceSource = (packageName) => `package ${packageName}

import android.content.Context
import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import android.util.Log

class WeBeeHceService : HostApduService() {
  override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
    if (commandApdu == null) {
      Log.w(TAG, "APDU command is null")
      return UNKNOWN_COMMAND_RESPONSE
    }

    return if (isSelectAidCommand(commandApdu)) {
      val payload = getActivePayload()
      Log.d(TAG, "SELECT AID matched, responding payload=$payload")
      payload.toByteArray(Charsets.UTF_8) + SUCCESS_RESPONSE
    } else {
      Log.w(TAG, "Unknown APDU command=" + toHexString(commandApdu))
      UNKNOWN_COMMAND_RESPONSE
    }
  }

  override fun onDeactivated(reason: Int) = Unit

  private fun getActivePayload(): String {
    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val title = prefs.getString(KEY_TITLE, "WeBee") ?: "WeBee"
    val mode = prefs.getString(KEY_MODE, "cycle") ?: "cycle"
    val start = prefs.getString(KEY_START, "") ?: ""
    val end = prefs.getString(KEY_END, "") ?: ""
    return "WBEE|" + sanitize(title) + "|" + mode + "|" + start + "|" + end
  }

  private fun sanitize(value: String): String = value.replace("|", " ").trim()

  companion object {
    private const val TAG = "WeBeeHceService"
    private const val PREFS_NAME = "webee_hce"
    private const val KEY_TITLE = "title"
    private const val KEY_MODE = "mode"
    private const val KEY_START = "start"
    private const val KEY_END = "end"

    private val SELECT_AID_COMMAND = byteArrayOf(
      0x00.toByte(),
      0xA4.toByte(),
      0x04.toByte(),
      0x00.toByte(),
      0x05.toByte(),
      0xF0.toByte(),
      0x57.toByte(),
      0x42.toByte(),
      0x45.toByte(),
      0x45.toByte()
    )
    private val SUCCESS_RESPONSE = byteArrayOf(0x90.toByte(), 0x00.toByte())
    private val UNKNOWN_COMMAND_RESPONSE = byteArrayOf(0x6D.toByte(), 0x00.toByte())

    private fun isSelectAidCommand(command: ByteArray): Boolean {
      if (command.size < SELECT_AID_COMMAND.size) return false
      return SELECT_AID_COMMAND.indices.all { index ->
        command[index] == SELECT_AID_COMMAND[index]
      }
    }

    private fun toHexString(command: ByteArray): String =
      command.joinToString(" ") { "%02X".format(it) }
  }
}
`;

const moduleSource = (packageName) => `package ${packageName}

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class WeBeeHceModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "WeBeeHceModule"

  @ReactMethod
  fun setActiveCard(card: ReadableMap, promise: Promise) {
    try {
      val title = card.getStringOrDefault("title", "WeBee")
      val mode = card.getStringOrDefault("mode", "cycle")
      val start = card.getStringOrDefault("start", "")
      val end = card.getStringOrDefault("end", "")

      reactContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_TITLE, sanitize(title))
        .putString(KEY_MODE, normalizeMode(mode))
        .putString(KEY_START, start)
        .putString(KEY_END, end)
        .apply()

      Log.d(TAG, "Active HCE card updated title=$title mode=$mode start=$start end=$end")
      promise.resolve(true)
    } catch (error: Exception) {
      Log.e(TAG, "Failed to update active HCE card", error)
      promise.reject("WEBEE_HCE_SET_ACTIVE_CARD_FAILED", error)
    }
  }

  private fun sanitize(value: String): String = value.replace("|", " ").trim()

  private fun normalizeMode(mode: String): String =
    when (mode) {
      "open", "close", "cycle" -> mode
      else -> "cycle"
    }

  private fun ReadableMap.getStringOrDefault(key: String, fallback: String): String =
    if (hasKey(key) && !isNull(key)) getString(key) ?: fallback else fallback

  companion object {
    private const val TAG = "WeBeeHceModule"
    private const val PREFS_NAME = "webee_hce"
    private const val KEY_TITLE = "title"
    private const val KEY_MODE = "mode"
    private const val KEY_START = "start"
    private const val KEY_END = "end"
  }
}
`;

const packageSource = (packageName) => `package ${packageName}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WeBeeHcePackage : ReactPackage {
  override fun createNativeModules(
    reactContext: ReactApplicationContext
  ): List<NativeModule> = listOf(WeBeeHceModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
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
      const modulePath = path.join(mainPath, "java", packagePath, "WeBeeHceModule.kt");
      const packageFilePath = path.join(mainPath, "java", packagePath, "WeBeeHcePackage.kt");
      const mainApplicationPath = path.join(mainPath, "java", packagePath, "MainApplication.kt");
      const apduPath = path.join(mainPath, "res", "xml", "apduservice.xml");

      fs.mkdirSync(path.dirname(servicePath), { recursive: true });
      fs.mkdirSync(path.dirname(apduPath), { recursive: true });
      fs.writeFileSync(servicePath, serviceSource(packageName));
      fs.writeFileSync(modulePath, moduleSource(packageName));
      fs.writeFileSync(packageFilePath, packageSource(packageName));
      if (fs.existsSync(mainApplicationPath)) {
        const mainApplication = fs.readFileSync(mainApplicationPath, "utf8");
        if (!mainApplication.includes("add(WeBeeHcePackage())")) {
          fs.writeFileSync(
            mainApplicationPath,
            mainApplication.replace(
              "// add(MyReactNativePackage())",
              "add(WeBeeHcePackage())"
            )
          );
        }
      }
      fs.writeFileSync(apduPath, apduServiceXml);

      return config;
    },
  ]);
};

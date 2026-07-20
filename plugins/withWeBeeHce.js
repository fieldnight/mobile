const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const AID = "F057424545";
const SERVICE_NAME = ".WeBeeHceService";

const serviceSource = (packageName) => `package ${packageName}

import android.content.Context
import android.content.Intent
import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class WeBeeHceService : HostApduService() {
  override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
    if (commandApdu == null) {
      Log.w(TAG, "APDU command is null")
      return UNKNOWN_COMMAND_RESPONSE
    }

    return when {
      isSelectAidCommand(commandApdu) -> {
        val payload = getActivePayload()
        Log.d(TAG, "SELECT AID matched, responding payload=$payload")
        payload.toByteArray(Charsets.UTF_8) + SUCCESS_RESPONSE
      }
      isTimeRequestCommand(commandApdu) -> {
        val phoneTime = currentPhoneTimeText()
        Log.d(TAG, "ESP32 phone time requested=$phoneTime")
        phoneTime.toByteArray(Charsets.UTF_8) + SUCCESS_RESPONSE
      }
      isStatsReportCommand(commandApdu) -> {
        val stats = parseStatsReport(commandApdu)
        Log.d(TAG, "ESP32 stats received=$stats")
        broadcastStats(stats)
        SUCCESS_RESPONSE
      }
      isResultReportCommand(commandApdu) -> {
        val result = parseResultReport(commandApdu)
        Log.d(TAG, "ESP32 result received=$result")
        broadcastResult(result)
        SUCCESS_RESPONSE
      }
      else -> {
        Log.w(TAG, "Unknown APDU command=" + toHexString(commandApdu))
        UNKNOWN_COMMAND_RESPONSE
      }
    }
  }

  override fun onDeactivated(reason: Int) = Unit

  private fun getActivePayload(): String {
    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val title = prefs.getString(KEY_TITLE, "WeBee") ?: "WeBee"
    val mode = prefs.getString(KEY_MODE, "window") ?: "window"
    val start = prefs.getString(KEY_START, "") ?: ""
    val end = prefs.getString(KEY_END, "") ?: ""
    val repeat = prefs.getBoolean(KEY_REPEAT, false)
    val repeatFlag = if (repeat) "1" else "0"
    val phoneTime = ""
    val wireTitle = sanitize(title).take(4).ifBlank { "WBEE" }
    return "WBEE|" + wireTitle + "|" + mode + "|" + start + "|" + end + "|" + repeatFlag + "|" + phoneTime
  }

  private fun sanitize(value: String): String = value.replace("|", " ").trim()

  private fun broadcastResult(result: String) {
    sendBroadcast(
      Intent(ACTION_HCE_RESULT)
        .setPackage(packageName)
        .putExtra(EXTRA_RESULT, result)
    )
  }

  private fun broadcastStats(stats: String) {
    sendBroadcast(
      Intent(ACTION_HCE_STATS)
        .setPackage(packageName)
        .putExtra(EXTRA_STATS, stats)
    )
  }

  companion object {
    private const val TAG = "WeBeeHceService"
    private const val PREFS_NAME = "webee_hce"
    private const val KEY_TITLE = "title"
    private const val KEY_MODE = "mode"
    private const val KEY_START = "start"
    private const val KEY_END = "end"
    private const val KEY_REPEAT = "repeat"
    const val ACTION_HCE_RESULT = "${packageName}.WEBEE_HCE_RESULT"
    const val EXTRA_RESULT = "result"
    const val ACTION_HCE_STATS = "${packageName}.WEBEE_HCE_STATS"
    const val EXTRA_STATS = "stats"
    private const val RESULT_CLA = 0x80.toByte()
    private const val RESULT_INS = 0x52.toByte()
    private const val STATS_INS = 0x53.toByte()
    private const val TIME_INS = 0x54.toByte()

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
      return matchesSelectAidCommand(command, 0) ||
        (command.isNotEmpty() &&
          (command[0] == 0x02.toByte() || command[0] == 0x03.toByte()) &&
          matchesSelectAidCommand(command, 1))
    }

    private fun matchesSelectAidCommand(command: ByteArray, offset: Int): Boolean {
      if (command.size < offset + SELECT_AID_COMMAND.size) return false
      return SELECT_AID_COMMAND.indices.all { index ->
        command[offset + index] == SELECT_AID_COMMAND[index]
      }
    }

    private fun isResultReportCommand(command: ByteArray): Boolean =
      resultApduOffset(command) >= 0

    private fun isStatsReportCommand(command: ByteArray): Boolean =
      statsApduOffset(command) >= 0

    private fun isTimeRequestCommand(command: ByteArray): Boolean =
      timeApduOffset(command) >= 0

    private fun currentPhoneTimeText(): String =
      SimpleDateFormat("yyyy-MM-dd-HH:mm", Locale.US).format(Date())

    private fun parseResultReport(command: ByteArray): String =
      parseTextReport(command, resultApduOffset(command))

    private fun parseStatsReport(command: ByteArray): String =
      parseTextReport(command, statsApduOffset(command))

    private fun parseTextReport(command: ByteArray, apduOffset: Int): String {
      if (apduOffset < 0) return ""

      val lc = command[apduOffset + 4].toInt() and 0xFF
      val payloadStart = apduOffset + 5
      val available = command.size - payloadStart
      val payloadLength = minOf(lc, available)

      if (payloadLength <= 0) return ""

      return command
        .copyOfRange(payloadStart, payloadStart + payloadLength)
        .toString(Charsets.UTF_8)
        .trim()
    }

    private fun resultApduOffset(command: ByteArray): Int =
      when {
        command.size >= 5 && command[0] == RESULT_CLA && command[1] == RESULT_INS -> 0
        command.size >= 6 &&
          (command[0] == 0x02.toByte() || command[0] == 0x03.toByte()) &&
          command[1] == RESULT_CLA &&
          command[2] == RESULT_INS -> 1
        else -> -1
      }

    private fun statsApduOffset(command: ByteArray): Int =
      when {
        command.size >= 5 && command[0] == RESULT_CLA && command[1] == STATS_INS -> 0
        command.size >= 6 &&
          (command[0] == 0x02.toByte() || command[0] == 0x03.toByte()) &&
          command[1] == RESULT_CLA &&
          command[2] == STATS_INS -> 1
        else -> -1
      }

    private fun timeApduOffset(command: ByteArray): Int =
      when {
        command.size >= 5 && command[0] == RESULT_CLA && command[1] == TIME_INS -> 0
        command.size >= 6 &&
          (command[0] == 0x02.toByte() || command[0] == 0x03.toByte()) &&
          command[1] == RESULT_CLA &&
          command[2] == TIME_INS -> 1
        else -> -1
      }

    private fun toHexString(command: ByteArray): String =
      command.joinToString(" ") { "%02X".format(it) }
  }
}
`;

const moduleSource = (packageName) => `package ${packageName}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class WeBeeHceModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private var listenerCount = 0
  private var receiverRegistered = false
  private val hceReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      when (intent?.action) {
        WeBeeHceService.ACTION_HCE_RESULT -> {
          val result = intent.getStringExtra(WeBeeHceService.EXTRA_RESULT).orEmpty()
          Log.d(TAG, "Broadcast HCE result received=$result")
          emitResult(result)
        }
        WeBeeHceService.ACTION_HCE_STATS -> {
          val stats = intent.getStringExtra(WeBeeHceService.EXTRA_STATS).orEmpty()
          Log.d(TAG, "Broadcast HCE stats received=$stats")
          emitStats(stats)
        }
      }
    }
  }

  override fun getName(): String = "WeBeeHceModule"

  @ReactMethod
  fun setActiveCard(card: ReadableMap, promise: Promise) {
    try {
      val title = card.getStringOrDefault("title", "WeBee")
      val mode = card.getStringOrDefault("mode", "window")
      val start = card.getStringOrDefault("start", "")
      val end = card.getStringOrDefault("end", "")
      val repeat = card.getBooleanOrDefault("repeat", false)

      reactContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_TITLE, sanitize(title))
        .putString(KEY_MODE, normalizeMode(mode))
        .putString(KEY_START, sanitize(start))
        .putString(KEY_END, sanitize(end))
        .putBoolean(KEY_REPEAT, repeat)
        .apply()

      Log.d(TAG, "Active HCE card updated title=$title mode=$mode start=$start end=$end repeat=$repeat")
      promise.resolve(true)
    } catch (error: Exception) {
      Log.e(TAG, "Failed to update active HCE card", error)
      promise.reject("WEBEE_HCE_SET_ACTIVE_CARD_FAILED", error)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    listenerCount += 1
    if (eventName == RESULT_EVENT_NAME || eventName == STATS_EVENT_NAME) {
      registerHceReceiver()
    }
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount = (listenerCount - count).coerceAtLeast(0)
    if (listenerCount == 0) {
      unregisterHceReceiver()
    }
  }

  override fun invalidate() {
    unregisterHceReceiver()
    super.invalidate()
  }

  private fun sanitize(value: String): String = value.replace("|", " ").trim()

  private fun normalizeMode(mode: String): String =
    when (mode) {
      "open_now",
      "close_now",
      "open_at",
      "close_at",
      "window",
      "alternate_24h",
      "lock_days",
      "count_status",
      "activity_boost",
      "overpollination_guard",
      "return_limit" -> mode
      else -> "window"
    }

  private fun registerHceReceiver() {
    if (receiverRegistered) return

    val filter = IntentFilter().apply {
      addAction(WeBeeHceService.ACTION_HCE_RESULT)
      addAction(WeBeeHceService.ACTION_HCE_STATS)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactContext.registerReceiver(hceReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      reactContext.registerReceiver(hceReceiver, filter)
    }
    receiverRegistered = true
    Log.d(TAG, "HCE receiver registered")
  }

  private fun unregisterHceReceiver() {
    if (!receiverRegistered) return

    try {
      reactContext.unregisterReceiver(hceReceiver)
      Log.d(TAG, "HCE receiver unregistered")
    } catch (error: IllegalArgumentException) {
      Log.w(TAG, "HCE receiver was already unregistered", error)
    } finally {
      receiverRegistered = false
    }
  }

  private fun emitResult(result: String) {
    val params = Arguments.createMap().apply {
      putString("result", result)
    }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(RESULT_EVENT_NAME, params)
  }

  private fun emitStats(stats: String) {
    val params = Arguments.createMap().apply {
      putString("stats", stats)
    }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(STATS_EVENT_NAME, params)
  }

  private fun ReadableMap.getStringOrDefault(key: String, fallback: String): String =
    if (hasKey(key) && !isNull(key)) getString(key) ?: fallback else fallback

  private fun ReadableMap.getBooleanOrDefault(key: String, fallback: Boolean): Boolean =
    if (hasKey(key) && !isNull(key)) getBoolean(key) else fallback

  companion object {
    private const val TAG = "WeBeeHceModule"
    private const val PREFS_NAME = "webee_hce"
    private const val RESULT_EVENT_NAME = "WeBeeHceResult"
    private const val STATS_EVENT_NAME = "WeBeeHceStats"
    private const val KEY_TITLE = "title"
    private const val KEY_MODE = "mode"
    private const val KEY_START = "start"
    private const val KEY_END = "end"
    private const val KEY_REPEAT = "repeat"
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
          const patched = mainApplication.replace(
            "// add(MyReactNativePackage())",
            "add(WeBeeHcePackage())"
          );
          if (patched === mainApplication) {
            console.warn(
              "[withWeBeeHce] MainApplication.kt에 '// add(MyReactNativePackage())' 주석을 찾지 못했습니다. WeBeeHcePackage()를 수동으로 등록해 주세요."
            );
          } else {
            fs.writeFileSync(mainApplicationPath, patched);
          }
        }
      }
      fs.writeFileSync(apduPath, apduServiceXml);

      return config;
    },
  ]);
};

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import {
  getHiveSetupPassword,
  getHiveSetupSsid,
  isValidHiveDeviceId,
  normalizeHiveDeviceId,
  openHiveSetupPage,
  openWifiSettings,
} from "../model/hiveWifiProvisioning";

type SetupStep = "wifi" | "website" | "confirm";
export type HiveWifiSetupMode = "register" | "change";

interface HiveWifiSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  mode?: HiveWifiSetupMode;
  initialDeviceId?: string;
  onProvisioned?: (deviceId: string) => void;
}

const INPUT_BG = "#EEF2F6";
const SETUP_COPY = {
  register: {
    sheetTitle: "벌통 Wi-Fi 연결",
    hotspotTitle: "벌통 핫스팟에 연결해주세요",
    hotspotDescription:
      "휴대폰 Wi-Fi 설정에서 Hive-로 시작하는 벌통 네트워크를 선택한 뒤 앱으로 돌아오세요.",
    websiteTitle: "브라우저에서 공유기 Wi-Fi를 등록해주세요",
    websiteDescription:
      "벌통이 사용할 현장 공유기의 Wi-Fi 이름과 비밀번호를 입력하고 Save and restart를 누르세요.",
    confirmTitle: "벌통 MAC 주소를 확인해주세요",
    confirmDescription:
      "이 주소가 서버 등록과 MQTT 토픽에 동일하게 사용됩니다.",
    completeLabel: "확인하고 벌통 등록으로 돌아가기",
  },
  change: {
    sheetTitle: "연결 Wi-Fi 변경",
    hotspotTitle: "벌통을 Wi-Fi 변경 모드로 준비해주세요",
    hotspotDescription:
      "벌통 전원을 다시 켠 뒤 5분 안에 휴대폰 Wi-Fi 설정에서 해당 벌통의 Hive- 네트워크에 연결해주세요.",
    websiteTitle: "새 공유기 Wi-Fi로 교체해주세요",
    websiteDescription:
      "현재 정보 대신 사용할 새 공유기의 Wi-Fi 이름과 비밀번호를 정확히 입력하고 Save and restart를 누르세요.",
    confirmTitle: "Wi-Fi 변경 요청이 저장됐어요",
    confirmDescription:
      "벌통 MAC 주소는 그대로 유지되며, 재부팅 후 새 공유기로 연결됩니다.",
    completeLabel: "Wi-Fi 변경을 마치고 돌아가기",
  },
} as const;

const WIFI_CHANGE_NOTICES = [
  "새 공유기는 2.4GHz Wi-Fi여야 합니다.",
  "저장하면 벌통이 재부팅되어 잠시 오프라인으로 표시됩니다.",
  "Wi-Fi 이름과 비밀번호가 틀리면 Hive 설정 네트워크가 다시 나타날 때까지 약 30초 정도 걸릴 수 있습니다.",
] as const;
const WIFI_CHANGE_AFTER_SAVE_NOTICES = WIFI_CHANGE_NOTICES.slice(1);

function safeInitialDeviceId(value?: string) {
  const normalized = normalizeHiveDeviceId(value ?? "");
  return isValidHiveDeviceId(normalized) ? normalized : "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Wi-Fi 설정 중 문제가 생겼어요. 다시 시도해주세요.";
}

/**
 * 벌통 핫스팟 연결 → 펌웨어 웹 설정 → MAC 확인 흐름입니다.
 * 공유기 비밀번호는 앱이 받거나 저장하지 않고 벌통 웹페이지에서만 입력합니다.
 */
export function HiveWifiSetupSheet({
  visible,
  onClose,
  mode = "register",
  initialDeviceId,
  onProvisioned,
}: HiveWifiSetupSheetProps) {
  const [step, setStep] = useState<SetupStep>("wifi");
  const [deviceId, setDeviceId] = useState(() =>
    safeInitialDeviceId(initialDeviceId),
  );
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [openingPage, setOpeningPage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedDeviceId = normalizeHiveDeviceId(deviceId);
  const validDeviceId = isValidHiveDeviceId(normalizedDeviceId);
  const setupSsid = validDeviceId
    ? getHiveSetupSsid(normalizedDeviceId)
    : "Hive-AA:BB:CC:DD:EE:FF";
  const setupPassword = getHiveSetupPassword();
  const copy = SETUP_COPY[mode];

  useEffect(() => {
    if (!visible) return;
    setStep("wifi");
    setDeviceId(safeInitialDeviceId(initialDeviceId));
    setSettingsOpened(false);
    setOpeningPage(false);
    setErrorMessage("");
  }, [initialDeviceId, visible]);

  const haptic = () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  };

  const handleOpenSettings = async () => {
    haptic();
    setErrorMessage("");

    try {
      await openWifiSettings();
      setSettingsOpened(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleOpenSetupPage = async () => {
    if (openingPage) return;
    haptic();
    setOpeningPage(true);
    setErrorMessage("");

    try {
      await openHiveSetupPage();
      setStep("website");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setOpeningPage(false);
    }
  };

  const handleWebsiteConfirmed = () => {
    haptic();
    setErrorMessage("");
    setStep("confirm");
  };

  const handleComplete = () => {
    if (!validDeviceId) return;
    haptic();
    onProvisioned?.(normalizedDeviceId);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={copy.sheetTitle}
      snapHeight={0.86}
      dragCloseEnabled={!openingPage}
    >
      <StepHeader step={step} />

      {step === "wifi" ? (
        <>
          <InfoPanel
            icon="wifi"
            title={copy.hotspotTitle}
            description={copy.hotspotDescription}
          />

          <View className="mt-4 gap-2">
            <SetupValue icon="radio" label="연결할 Wi-Fi" value={setupSsid} />
            <SetupValue icon="key" label="기본 비밀번호" value={setupPassword} />
          </View>

          {mode === "change" ? (
            <CautionPanel
              title="Wi-Fi를 바꾸기 전에 확인해주세요"
              notices={WIFI_CHANGE_NOTICES}
            />
          ) : null}

          <SecondaryButton
            label={settingsOpened ? "Wi-Fi 설정 다시 열기" : "휴대폰 Wi-Fi 설정 열기"}
            onPress={handleOpenSettings}
          />

          {settingsOpened ? (
            <PrimaryButton
              label={openingPage ? "설정 페이지 여는 중..." : "벌통 Wi-Fi 연결 후 설정 페이지 열기"}
              disabled={openingPage}
              loading={openingPage}
              onPress={handleOpenSetupPage}
            />
          ) : null}
        </>
      ) : null}

      {step === "website" ? (
        <>
          <InfoPanel
            icon="external-link"
            title={copy.websiteTitle}
            description={copy.websiteDescription}
          />

          <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: C.infoBg }}>
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 13, lineHeight: 21, color: C.textAlt }}
            >
              브라우저에 “Saved. The Smart Hive is restarting.”가 표시되면 설정이 저장된 것입니다. 그 뒤 이 앱으로 돌아오세요.
            </PretendardFont>
          </View>

          {mode === "change" ? (
            <CautionPanel
              title="저장 후에는 이렇게 동작해요"
              notices={WIFI_CHANGE_AFTER_SAVE_NOTICES}
            />
          ) : null}

          <SecondaryButton
            label={openingPage ? "설정 페이지 여는 중..." : "설정 페이지 다시 열기"}
            disabled={openingPage}
            onPress={handleOpenSetupPage}
          />
          <PrimaryButton
            label="Saved 메시지를 확인했어요"
            onPress={handleWebsiteConfirmed}
          />
        </>
      ) : null}

      {step === "confirm" ? (
        <>
          <InfoPanel
            icon="check-circle"
            title={copy.confirmTitle}
            description={copy.confirmDescription}
            success
          />

          <FieldLabel
            label={mode === "change" ? "등록된 벌통 MAC 주소" : "벌통 MAC 주소"}
          />
          <TextInput
            value={deviceId}
            onChangeText={setDeviceId}
            editable={mode !== "change"}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="AA:BB:CC:DD:EE:FF"
            placeholderTextColor={C.ter}
            className="rounded-2xl px-4 py-3 text-[14px]"
            style={{
              minHeight: 50,
              backgroundColor: INPUT_BG,
              color: mode === "change" ? C.sec : C.text,
              fontFamily: "Pretendard-Medium",
            }}
            testID="input-hive-device-id"
          />

          <PretendardFont
            style={{ marginTop: 10, fontSize: 12, lineHeight: 19, color: C.sec }}
          >
            {mode === "change"
              ? "Wi-Fi를 변경해도 등록된 MAC 주소와 MQTT 토픽은 바뀌지 않습니다."
              : `연결했던 Wi-Fi가 ${setupSsid}였다면 Hive- 뒤의 주소를 입력하면 됩니다. 하이픈 없이 12자리로 입력해도 자동 정리됩니다.`}
          </PretendardFont>

          {!validDeviceId && deviceId.trim() ? (
            <PretendardFont
              style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: C.error }}
            >
              MAC 주소를 AA:BB:CC:DD:EE:FF 형식으로 확인해주세요.
            </PretendardFont>
          ) : null}

          <PrimaryButton
            label={copy.completeLabel}
            disabled={!validDeviceId}
            onPress={handleComplete}
          />
        </>
      ) : null}

      {errorMessage ? (
        <View
          className="mt-4 flex-row items-start gap-2 rounded-xl px-3.5 py-3"
          style={{ backgroundColor: "#FFF1F2" }}
        >
          <Feather name="alert-circle" size={17} color={C.error} />
          <PretendardFont
            style={{ flex: 1, fontSize: 13, lineHeight: 19, color: C.error }}
          >
            {errorMessage}
          </PretendardFont>
        </View>
      ) : null}
    </BottomSheet>
  );
}

function CautionPanel({
  title,
  notices,
}: {
  title: string;
  notices: readonly string[];
}) {
  return (
    <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <View className="flex-row items-center gap-2">
        <Feather name="alert-triangle" size={17} color="#B45309" />
        <PretendardFont weight="bold" className="text-[13px] text-amber-800">
          {title}
        </PretendardFont>
      </View>
      <View className="mt-2.5 gap-1.5">
        {notices.map((notice) => (
          <View key={notice} className="flex-row items-start gap-2">
            <View className="mt-2 h-1 w-1 rounded-full bg-amber-600" />
            <PretendardFont className="flex-1 text-[12px] leading-[19px] text-amber-800">
              {notice}
            </PretendardFont>
          </View>
        ))}
      </View>
    </View>
  );
}

function StepHeader({ step }: { step: SetupStep }) {
  const activeStep = step === "wifi" ? 1 : step === "website" ? 2 : 3;

  return (
    <View className="mb-5 flex-row items-center">
      {[1, 2, 3].map((number) => (
        <View key={number} className="flex-1 flex-row items-center">
          <View
            className="h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: number <= activeStep ? C.primary : C.border }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 12, color: C.white }}>
              {number}
            </PretendardFont>
          </View>
          {number < 3 ? (
            <View
              className="mx-2 h-0.5 flex-1"
              style={{ backgroundColor: number < activeStep ? C.primary : C.border }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function SetupValue({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-gray-300 px-3.5 py-3">
      <Feather name={icon} size={16} color={C.primary} />
      <View className="flex-1">
        <PretendardFont style={{ fontSize: 11.5, color: C.sec }}>{label}</PretendardFont>
        <PretendardFont
          weight="semibold"
          style={{ marginTop: 2, fontSize: 13, color: C.text }}
        >
          {value}
        </PretendardFont>
      </View>
    </View>
  );
}

function InfoPanel({
  icon,
  title,
  description,
  success,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  success?: boolean;
}) {
  return (
    <View
      className="flex-row gap-3 rounded-2xl p-4"
      style={{ backgroundColor: success ? "#E8F8F0" : C.infoBg }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
        <Feather name={icon} size={18} color={success ? C.success : C.primary} />
      </View>
      <View className="flex-1">
        <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
          {title}
        </PretendardFont>
        <PretendardFont
          style={{ marginTop: 4, fontSize: 12.5, lineHeight: 19, color: C.textAlt }}
        >
          {description}
        </PretendardFont>
      </View>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <PretendardFont
      weight="bold"
      style={{ marginTop: 20, marginBottom: 8, fontSize: 13, color: C.text }}
    >
      {label}
    </PretendardFont>
  );
}

function PrimaryButton({
  label,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-80"
      style={{ backgroundColor: disabled ? C.border : C.primary, minHeight: 54 }}
    >
      {loading ? <ActivityIndicator size="small" color={C.white} /> : null}
      <PretendardFont weight="bold" style={{ fontSize: 15, color: C.white }}>
        {label}
      </PretendardFont>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="mt-6 items-center justify-center rounded-2xl py-4 active:opacity-80"
      style={{
        minHeight: 54,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: disabled ? C.border : C.primary,
      }}
    >
      <PretendardFont
        weight="bold"
        style={{ fontSize: 15, color: disabled ? C.ter : C.primary }}
      >
        {label}
      </PretendardFont>
    </Pressable>
  );
}

import { useEffect, useMemo, useState } from "react";
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
  disconnectHiveWifi,
  getHiveSetupPassword,
  getHiveSetupSsid,
  getHiveWifiStatus,
  isValidHiveDeviceId,
  normalizeHiveDeviceId,
  openWifiSettings,
  sendRouterCredentials,
} from "../model/hiveWifiProvisioning";

type SetupStep = "device" | "network" | "sending" | "success";

interface HiveWifiSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  initialDeviceId?: string;
  onProvisioned?: (deviceId: string) => void;
}

const INPUT_BG = "#EEF2F6";

function safeInitialDeviceId(value?: string) {
  const normalized = normalizeHiveDeviceId(value ?? "");
  return isValidHiveDeviceId(normalized) ? normalized : "test-01";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Wi-Fi 설정 중 문제가 생겼어요. 다시 시도해주세요.";
}

/**
 * 스마트벌통 최초 연결과 Wi-Fi 변경에서 함께 사용하는 설정 시트입니다.
 * 현장 공유기 비밀번호는 상태나 저장소에 보관하지 않고 ESP32에 한 번만 전달합니다.
 */
export function HiveWifiSetupSheet({
  visible,
  onClose,
  initialDeviceId,
  onProvisioned,
}: HiveWifiSetupSheetProps) {
  const [step, setStep] = useState<SetupStep>("device");
  const [deviceId, setDeviceId] = useState(() =>
    safeInitialDeviceId(initialDeviceId),
  );
  const [routerSsid, setRouterSsid] = useState("");
  const [routerPassword, setRouterPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const setupSsid = useMemo(() => getHiveSetupSsid(deviceId), [deviceId]);
  const setupPassword = getHiveSetupPassword();
  const setupPasswordLabel = setupPassword || "벌통 라벨에서 확인";
  const normalizedDeviceId = normalizeHiveDeviceId(deviceId);
  const validDeviceId = isValidHiveDeviceId(normalizedDeviceId);
  const validRouterCredentials =
    routerSsid.trim().length > 0 &&
    routerSsid.trim().length <= 32 &&
    (routerPassword.length === 0 ||
      (routerPassword.length >= 8 && routerPassword.length <= 63));

  useEffect(() => {
    if (!visible) return;
    setStep("device");
    setDeviceId(safeInitialDeviceId(initialDeviceId));
    setRouterSsid("");
    setRouterPassword("");
    setPasswordVisible(false);
    setSettingsOpened(false);
    setConnecting(false);
    setErrorMessage("");
  }, [initialDeviceId, visible]);

  const haptic = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  const handleClose = () => {
    setRouterPassword("");
    void disconnectHiveWifi();
    onClose();
  };

  const handleOpenSettings = async () => {
    if (!validDeviceId) return;
    haptic();
    setErrorMessage("");

    try {
      await openWifiSettings();
      setSettingsOpened(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleConfirmConnection = async () => {
    if (!validDeviceId || connecting) return;
    haptic();
    setConnecting(true);
    setErrorMessage("");

    try {
      const status = await getHiveWifiStatus();
      if (status.setupSsid && status.setupSsid !== setupSsid) {
        throw new Error(`연결된 벌통이 ${setupSsid}인지 확인해주세요.`);
      }
      setStep("network");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setConnecting(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!validRouterCredentials || step === "sending") return;
    haptic();
    setStep("sending");
    setErrorMessage("");

    try {
      await sendRouterCredentials(routerSsid, routerPassword);
      setRouterPassword("");
      await disconnectHiveWifi();
      setStep("success");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStep("network");
    }
  };

  const handleComplete = () => {
    haptic();
    onProvisioned?.(normalizedDeviceId);
    handleClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="벌통 Wi-Fi 연결"
      snapHeight={0.86}
      dragCloseEnabled={!connecting && step !== "sending"}
    >
      <StepHeader step={step} />

      {step === "device" && (
        <>
          <InfoPanel
            icon="power"
            title="벌통 전원을 켜주세요"
            description="처음 켠 벌통은 자체 Wi-Fi를 만들어요. 휴대폰 설정에서 아래 Wi-Fi를 선택해주세요."
          />

          <FieldLabel label="벌통 번호" />
          <TextInput
            value={deviceId}
            onChangeText={setDeviceId}
            editable={!connecting}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="test-01"
            placeholderTextColor={C.ter}
            className="rounded-2xl px-4 py-3 text-[14px]"
            style={{
              minHeight: 50,
              backgroundColor: INPUT_BG,
              color: C.text,
              fontFamily: "Pretendard-Medium",
            }}
            testID="input-hive-device-id"
          />

          <View className="mt-3 flex-row items-center gap-2 rounded-xl bg-gray-300 px-3.5 py-3">
            <Feather name="wifi" size={16} color={C.primary} />
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 13, color: C.text, flex: 1 }}
            >
              앱이 연결할 Wi-Fi: {setupSsid}
            </PretendardFont>
          </View>

          <View className="mt-2 flex-row items-center gap-2 rounded-xl bg-gray-300 px-3.5 py-3">
            <Feather name="key" size={16} color={C.primary} />
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 13, color: C.text, flex: 1 }}
            >
              처음 연결 비밀번호: {setupPasswordLabel}
            </PretendardFont>
          </View>

          <SecondaryButton
            label={settingsOpened ? "Wi-Fi 설정 다시 열기" : "휴대폰 Wi-Fi 설정 열기"}
            disabled={!validDeviceId}
            onPress={handleOpenSettings}
          />

          {settingsOpened && (
            <PrimaryButton
              label={connecting ? "연결 확인 중..." : "벌통 Wi-Fi에 연결했어요"}
              disabled={connecting}
              loading={connecting}
              onPress={handleConfirmConnection}
            />
          )}
        </>
      )}

      {(step === "network" || step === "sending") && (
        <>
          <InfoPanel
            icon="check-circle"
            title={`${setupSsid} 연결됨`}
            description="이제 벌통이 앞으로 사용할 농장·현장 Wi-Fi를 입력해주세요."
            success
          />

          <FieldLabel label="현장 Wi-Fi 이름" />
          <TextInput
            value={routerSsid}
            onChangeText={setRouterSsid}
            editable={step !== "sending"}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="공유기 Wi-Fi 이름"
            placeholderTextColor={C.ter}
            className="rounded-2xl px-4 py-3 text-[14px]"
            style={{
              minHeight: 50,
              backgroundColor: INPUT_BG,
              color: C.text,
              fontFamily: "Pretendard-Medium",
            }}
            testID="input-router-ssid"
          />

          <FieldLabel label="현장 Wi-Fi 비밀번호" />
          <View
            className="flex-row items-center rounded-2xl px-4"
            style={{ minHeight: 50, backgroundColor: INPUT_BG }}
          >
            <TextInput
              value={routerPassword}
              onChangeText={setRouterPassword}
              editable={step !== "sending"}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              placeholder="8자 이상 입력"
              placeholderTextColor={C.ter}
              className="flex-1 py-3 text-[14px]"
              style={{
                color: C.text,
                fontFamily: "Pretendard-Medium",
              }}
              testID="input-router-password"
            />
            <Pressable
              onPress={() => setPasswordVisible((value) => !value)}
              disabled={step === "sending"}
              hitSlop={10}
              accessibilityLabel={
                passwordVisible ? "비밀번호 숨기기" : "비밀번호 보기"
              }
            >
              <Feather
                name={passwordVisible ? "eye-off" : "eye"}
                size={18}
                color={C.sec}
              />
            </Pressable>
          </View>

          <PretendardFont
            style={{ marginTop: 10, fontSize: 12, lineHeight: 18, color: C.sec }}
          >
            비밀번호는 앱에 저장하지 않고 벌통으로 한 번만 전달해요.
          </PretendardFont>

          <PrimaryButton
            label={step === "sending" ? "벌통에 전달 중..." : "Wi-Fi 정보 전달하기"}
            disabled={!validRouterCredentials || step === "sending"}
            loading={step === "sending"}
            onPress={handleSendCredentials}
          />
        </>
      )}

      {step === "success" && (
        <View className="items-center py-5">
          <View
            className="mb-5 h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "#E8F8F0" }}
          >
            <Feather name="check" size={30} color={C.success} />
          </View>
          <PretendardFont
            weight="bold"
            style={{ fontSize: 20, color: C.text, textAlign: "center" }}
          >
            Wi-Fi 정보를 전달했어요
          </PretendardFont>
          <PretendardFont
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 22,
              color: C.sec,
              textAlign: "center",
            }}
          >
            벌통이 재시작한 뒤 현장 Wi-Fi와 MQTT 서버에 연결해요. 보통 10~30초 정도
            걸립니다.
          </PretendardFont>
          <PrimaryButton label="완료" onPress={handleComplete} />
        </View>
      )}

      {!!errorMessage && (
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
      )}
    </BottomSheet>
  );
}

function StepHeader({ step }: { step: SetupStep }) {
  const activeStep = step === "device" ? 1 : step === "success" ? 3 : 2;

  return (
    <View className="mb-5 flex-row items-center">
      {[1, 2, 3].map((number) => (
        <View key={number} className="flex-1 flex-row items-center">
          <View
            className="h-7 w-7 items-center justify-center rounded-full"
            style={{
              backgroundColor: number <= activeStep ? C.primary : C.border,
            }}
          >
            <PretendardFont
              weight="bold"
              style={{ fontSize: 12, color: C.white }}
            >
              {number}
            </PretendardFont>
          </View>
          {number < 3 && (
            <View
              className="mx-2 h-0.5 flex-1"
              style={{
                backgroundColor: number < activeStep ? C.primary : C.border,
              }}
            />
          )}
        </View>
      ))}
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
      <View
        className="h-9 w-9 items-center justify-center rounded-full bg-white"
      >
        <Feather
          name={icon}
          size={18}
          color={success ? C.success : C.primary}
        />
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
      style={{
        backgroundColor: disabled ? C.border : C.primary,
        minHeight: 54,
      }}
    >
      {loading && <ActivityIndicator size="small" color={C.white} />}
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

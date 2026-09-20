import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import {
  getGateWifiStatus,
  getGateSetupPassword,
  getGateSetupSsid,
  isValidGateDeviceId,
  normalizeGateDeviceId,
  openWifiSettings,
  sendGateRouterCredentials,
} from "../model/gateWifiProvisioning";

type SetupStep = "wifi" | "credentials" | "confirm";
export type GateWifiSetupMode = "register" | "change";

interface GateWifiSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  mode?: GateWifiSetupMode;
  initialDeviceId?: string;
  onProvisioned?: (deviceId: string) => void;
}

const INPUT_BG = "#EEF2F6";
const SETUP_COPY = {
  register: {
    sheetTitle: "개폐기 Wi-Fi 연결",
    hotspotTitle: "개폐기 핫스팟에 연결해주세요",
    hotspotDescription:
      "휴대폰 Wi-Fi 설정에서 BeeGate-Setup 네트워크를 선택한 뒤 앱으로 돌아오세요.",
    credentialsTitle: "공유기 Wi-Fi 정보를 입력해주세요",
    credentialsDescription:
      "개폐기가 사용할 현장 공유기의 Wi-Fi 이름과 비밀번호를 입력하면 개폐기로 바로 전달돼요.",
    confirmTitle: "개폐기 MAC 주소를 확인해주세요",
    confirmDescription: "이 주소가 서버 등록과 명령 전송에 동일하게 사용됩니다.",
    completeLabel: "확인하고 개폐기 등록으로 돌아가기",
  },
  change: {
    sheetTitle: "연결 Wi-Fi 변경",
    hotspotTitle: "개폐기를 Wi-Fi 변경 모드로 준비해주세요",
    hotspotDescription:
      "개폐기 전원을 다시 켠 뒤 5분 안에 BeeGate-Setup 네트워크에 연결해주세요.",
    credentialsTitle: "새 공유기 Wi-Fi로 교체해주세요",
    credentialsDescription:
      "현재 정보 대신 사용할 새 공유기의 Wi-Fi 이름과 비밀번호를 정확히 입력해주세요.",
    confirmTitle: "Wi-Fi 변경 요청이 저장됐어요",
    confirmDescription: "개폐기 MAC 주소는 그대로 유지되며, 재부팅 후 새 공유기로 연결됩니다.",
    completeLabel: "Wi-Fi 변경을 마치고 돌아가기",
  },
} as const;

const AFTER_SAVE_NOTICES = [
  "저장하면 개폐기가 자동으로 재부팅돼요.",
  "재부팅되면 BeeGate-Setup 대신 방금 등록한 공유기로 자동 연결을 시도해요.",
  "이제 휴대폰도 원래 쓰던 홈 Wi-Fi로 다시 전환해주세요. 개폐기 Wi-Fi에 계속 붙어 있으면 앱이 인터넷에 연결되지 않아요.",
] as const;

const RETRY_NOTICES = [
  "설정 AP는 전원을 켠 뒤 5분 동안 열려 있고, 공유기 연결에 실패하면 계속 열려 있어요.",
  "그 상태에서 휴대폰을 BeeGate-Setup에 다시 연결하고 처음부터 다시 시도해주세요.",
  "아이폰은 셀룰러 데이터가 켜져 있으면 이 요청이 인터넷 쪽으로 새서 실패할 수 있어요. 저장 전 잠시 셀룰러 데이터를 꺼주세요.",
] as const;

function safeInitialDeviceId(value?: string) {
  const normalized = normalizeGateDeviceId(value ?? "");
  return isValidGateDeviceId(normalized) ? normalized : "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Wi-Fi 설정 중 문제가 생겼어요. 다시 시도해주세요.";
}

/**
 * 개폐기 핫스팟 연결 → 공유기 Wi-Fi 정보 입력(앱이 직접 POST) → MAC 확인 흐름입니다.
 * 공유기 SSID/비밀번호는 앱이 http://192.168.4.1/wifi로 직접 전달하며(개폐기 내장
 * 웹서버, 백엔드 API 아님), 앱 자체에는 저장하지 않습니다. 설정 저장 후 부모 등록 화면에서
 * 서버의 온라인 상태가 새로 갱신되는지 확인합니다.
 */
export function GateWifiSetupSheet({
  visible,
  onClose,
  mode = "register",
  initialDeviceId,
  onProvisioned,
}: GateWifiSetupSheetProps) {
  const session = useRef(0);
  const [step, setStep] = useState<SetupStep>("wifi");
  const [deviceId, setDeviceId] = useState(() => safeInitialDeviceId(initialDeviceId));
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [routerSsid, setRouterSsid] = useState("");
  const [routerPassword, setRouterPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedDeviceId = normalizeGateDeviceId(deviceId);
  const validDeviceId = isValidGateDeviceId(normalizedDeviceId);
  const setupSsid = getGateSetupSsid();
  const setupPassword = getGateSetupPassword();
  const copy = SETUP_COPY[mode];

  useEffect(() => {
    session.current++;
    if (!visible) return;
    setStep("wifi");
    setDeviceId(safeInitialDeviceId(initialDeviceId));
    setSettingsOpened(false);
    setRouterSsid("");
    setRouterPassword("");
    setSubmitting(false);
    setErrorMessage("");
    return () => { session.current++; };
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

  const handleGoToCredentials = async () => {
    if (submitting) return;
    const currentSession = session.current;
    haptic();
    setErrorMessage("");
    setSubmitting(true);
    try {
      const status = await getGateWifiStatus();
      if (currentSession !== session.current) return;
      if (mode === "change" && status.macAddress !== normalizedDeviceId) {
        throw new Error("등록된 개폐기와 다른 기기에 연결됐어요. Wi-Fi를 다시 확인해주세요.");
      }
      setDeviceId(status.macAddress);
      setStep("credentials");
    } catch (error) {
      if (currentSession === session.current) setErrorMessage(getErrorMessage(error));
    } finally {
      if (currentSession === session.current) setSubmitting(false);
    }
  };

  const handleSendCredentials = async () => {
    if (submitting) return;
    const currentSession = session.current;
    haptic();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const status = await getGateWifiStatus();
      if (currentSession !== session.current) return;
      if (status.macAddress !== normalizedDeviceId) throw new Error("연결된 개폐기가 바뀌었어요. 설정을 닫고 다시 진행해주세요.");
      await sendGateRouterCredentials(routerSsid, routerPassword);
      if (currentSession !== session.current) return;
      setRouterPassword("");
      setStep("confirm");
    } catch (error) {
      if (currentSession === session.current) setErrorMessage(getErrorMessage(error));
    } finally {
      if (currentSession === session.current) setSubmitting(false);
    }
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
      dragCloseEnabled={!submitting}
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

          <CautionPanel
            title="연결에 실패하면"
            notices={RETRY_NOTICES}
          />

          <SecondaryButton
            label={settingsOpened ? "Wi-Fi 설정 다시 열기" : "휴대폰 Wi-Fi 설정 열기"}
            onPress={handleOpenSettings}
          />

          {settingsOpened ? (
            <PrimaryButton
              label={submitting ? "개폐기 확인 중..." : "개폐기 Wi-Fi 연결 확인"}
              disabled={submitting}
              loading={submitting}
              onPress={handleGoToCredentials}
            />
          ) : null}
        </>
      ) : null}

      {step === "credentials" ? (
        <>
          <InfoPanel
            icon="wifi"
            title={copy.credentialsTitle}
            description={copy.credentialsDescription}
          />

          <FieldLabel label="현장 공유기 Wi-Fi 이름" />
          <TextInput
            value={routerSsid}
            onChangeText={setRouterSsid}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="집이나 농장 공유기 SSID"
            placeholderTextColor={C.ter}
            editable={!submitting}
            className="rounded-2xl px-4 py-3 text-[14px]"
            style={{
              minHeight: 50,
              backgroundColor: INPUT_BG,
              color: C.text,
              fontFamily: "Pretendard-Medium",
            }}
            testID="input-router-ssid"
          />

          <FieldLabel label="공유기 Wi-Fi 비밀번호" />
          <TextInput
            value={routerPassword}
            onChangeText={setRouterPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="8자 이상"
            placeholderTextColor={C.ter}
            editable={!submitting}
            className="rounded-2xl px-4 py-3 text-[14px]"
            style={{
              minHeight: 50,
              backgroundColor: INPUT_BG,
              color: C.text,
              fontFamily: "Pretendard-Medium",
            }}
            testID="input-router-password"
          />

          <CautionPanel title="저장하면 이렇게 동작해요" notices={AFTER_SAVE_NOTICES} />
          <CautionPanel title="연결에 실패하면" notices={RETRY_NOTICES} />

          <PrimaryButton
            label={submitting ? "개폐기로 전송 중..." : "이 Wi-Fi로 저장하기"}
            disabled={submitting || !routerSsid.trim()}
            loading={submitting}
            onPress={handleSendCredentials}
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

          <View className="mt-4 flex-row items-start gap-2 rounded-2xl p-4" style={{ backgroundColor: "#FFF7E6" }}>
            <Feather name="info" size={17} color="#B45309" />
            <PretendardFont style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: "#8A5A0A" }}>
              Wi-Fi 정보가 저장됐어요. 휴대폰을 인터넷에 연결한 뒤 돌아가서 개폐기 등록을 마무리해주세요.
            </PretendardFont>
          </View>

          <FieldLabel label={mode === "change" ? "등록된 개폐기 MAC 주소" : "개폐기 MAC 주소"} />
          <TextInput
            value={deviceId}
            onChangeText={setDeviceId}
            editable={false}
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
            testID="input-gate-device-id"
          />

          <PretendardFont style={{ marginTop: 10, fontSize: 12, lineHeight: 19, color: C.sec }}>
            {mode === "change"
              ? "Wi-Fi를 변경해도 등록된 MAC 주소는 바뀌지 않습니다."
              : "연결된 개폐기에서 직접 확인한 MAC 주소입니다."}
          </PretendardFont>

          {!validDeviceId && deviceId.trim() ? (
            <PretendardFont style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: C.error }}>
              MAC 주소를 AA:BB:CC:DD:EE:FF 형식으로 확인해주세요.
            </PretendardFont>
          ) : null}

          <PrimaryButton label={copy.completeLabel} disabled={!validDeviceId} onPress={handleComplete} />
        </>
      ) : null}

      {errorMessage ? (
        <View className="mt-4 flex-row items-start gap-2 rounded-xl px-3.5 py-3" style={{ backgroundColor: "#FFF1F2" }}>
          <Feather name="alert-circle" size={17} color={C.error} />
          <PretendardFont style={{ flex: 1, fontSize: 13, lineHeight: 19, color: C.error }}>
            {errorMessage}
          </PretendardFont>
        </View>
      ) : null}
    </BottomSheet>
  );
}

function CautionPanel({ title, notices }: { title: string; notices: readonly string[] }) {
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
  const activeStep = step === "wifi" ? 1 : step === "credentials" ? 2 : 3;

  return (
    <View className="mb-5 flex-row items-center">
      {[1, 2, 3].map((number) => (
        <View key={number} className="flex-1 flex-row items-center">
          <View
            className="h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: number <= activeStep ? C.gatePrimary : C.border }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 12, color: C.white }}>
              {number}
            </PretendardFont>
          </View>
          {number < 3 ? (
            <View
              className="mx-2 h-0.5 flex-1"
              style={{ backgroundColor: number < activeStep ? C.gatePrimary : C.border }}
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
      <Feather name={icon} size={16} color={C.gatePrimary} />
      <View className="flex-1">
        <PretendardFont style={{ fontSize: 11.5, color: C.sec }}>{label}</PretendardFont>
        <PretendardFont weight="semibold" style={{ marginTop: 2, fontSize: 13, color: C.text }}>
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
    <View className="flex-row gap-3 rounded-2xl p-4" style={{ backgroundColor: success ? "#E8F8F0" : C.infoBg }}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
        <Feather name={icon} size={18} color={success ? C.success : C.gatePrimary} />
      </View>
      <View className="flex-1">
        <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
          {title}
        </PretendardFont>
        <PretendardFont style={{ marginTop: 4, fontSize: 12.5, lineHeight: 19, color: C.textAlt }}>
          {description}
        </PretendardFont>
      </View>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <PretendardFont weight="bold" style={{ marginTop: 20, marginBottom: 8, fontSize: 13, color: C.text }}>
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
      style={{ backgroundColor: disabled ? C.border : C.gatePrimary, minHeight: 54 }}
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
        borderColor: disabled ? C.border : C.gatePrimary,
      }}
    >
      <PretendardFont weight="bold" style={{ fontSize: 15, color: disabled ? C.ter : C.gatePrimary }}>
        {label}
      </PretendardFont>
    </Pressable>
  );
}

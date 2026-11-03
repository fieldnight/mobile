/**
 * 벌통/개폐기 공용 Wi-Fi 온보딩 시트
 * - 기기별 차이(엔드포인트, 문구, MAC 확인 방식)는 DeviceWifiAdapter로 주입받고,
 *   흐름 자체("핫스팟 연결 확인" → "현장 Wi-Fi 입력")는 여기 한 곳에서만 관리합니다.
 * - 상시 노출되던 주의사항 박스를 없애고 실패했을 때만 에러를 보여줘 평소 화면을
 *   단순하게 유지합니다. 5GHz로 보이는 SSID는 입력을 막지 않고 입력창 아래에
 *   바로 경고만 띄우며, 사용자가 실제로는 2.4GHz라고 직접 확인하고 넘어갈 수 있습니다.
 * - MAC 확인을 별도 단계로 떼지 않고, 확보되는 즉시(개폐기는 상태 조회 응답, 벌통은
 *   핫스팟 이름에서 이미 파싱된 값) 그대로 완료 콜백에 실어 보내 단계를 하나 줄였습니다.
 */
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { DeviceWifiAdapter, DeviceWifiSetupMode } from "../model/deviceWifiAdapter";
import { openWifiSettings } from "../model/systemWifiSettings";
import { looksLikeFiveGhzSsid } from "../model/wifiBandDetection";

type Step = "connect" | "credentials";
const INPUT_BG = "#EEF2F6";

interface DeviceWifiSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  mode?: DeviceWifiSetupMode;
  initialDeviceId?: string;
  adapter: DeviceWifiAdapter;
  onProvisioned?: (deviceId: string) => void;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Wi-Fi 설정 중 문제가 생겼어요. 다시 시도해주세요.";
}

export function DeviceWifiSetupSheet({
  visible,
  onClose,
  mode = "register",
  initialDeviceId,
  adapter,
  onProvisioned,
}: DeviceWifiSetupSheetProps) {
  const session = useRef(0);
  const [step, setStep] = useState<Step>("connect");
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [checkingHotspot, setCheckingHotspot] = useState(false);
  const [deviceId, setDeviceId] = useState(() =>
    initialDeviceId ? adapter.normalizeDeviceId(initialDeviceId) : "",
  );
  const [routerSsid, setRouterSsid] = useState("");
  const [routerPassword, setRouterPassword] = useState("");
  const [fiveGhzAcknowledged, setFiveGhzAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { copy } = adapter;
  const ssidLooksFiveGhz = looksLikeFiveGhzSsid(routerSsid);
  const canSubmitCredentials =
    routerSsid.trim() !== "" && (!ssidLooksFiveGhz || fiveGhzAcknowledged);

  useEffect(() => {
    session.current++;
    if (!visible) return;
    setStep("connect");
    setSettingsOpened(false);
    setCheckingHotspot(false);
    setDeviceId(initialDeviceId ? adapter.normalizeDeviceId(initialDeviceId) : "");
    setRouterSsid("");
    setRouterPassword("");
    setFiveGhzAcknowledged(false);
    setSubmitting(false);
    setErrorMessage("");
    return () => {
      session.current++;
    };
    // adapter는 매 렌더 새 객체일 수 있어 의도적으로 의존성에서 제외합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeviceId, visible]);

  useEffect(() => {
    setFiveGhzAcknowledged(false);
  }, [routerSsid]);

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

  const handleConfirmHotspot = async () => {
    if (checkingHotspot) return;
    const currentSession = session.current;
    haptic();
    setErrorMessage("");
    setCheckingHotspot(true);
    try {
      const status = await adapter.getStatus();
      if (currentSession !== session.current) return;
      if (!status.connected) {
        throw new Error(`${copy.deviceLabel} 설정 Wi-Fi에 아직 연결되지 않았어요. Wi-Fi 목록을 다시 확인해주세요.`);
      }
      if (status.macAddress) setDeviceId(status.macAddress);
      setStep("credentials");
    } catch (error) {
      if (currentSession === session.current) setErrorMessage(getErrorMessage(error));
    } finally {
      if (currentSession === session.current) setCheckingHotspot(false);
    }
  };

  const handleSendCredentials = async () => {
    if (submitting || !canSubmitCredentials) return;
    const currentSession = session.current;
    haptic();
    setSubmitting(true);
    setErrorMessage("");

    try {
      await adapter.sendCredentials(routerSsid.trim(), routerPassword);
      if (currentSession !== session.current) return;
      if (!adapter.isValidDeviceId(deviceId)) {
        throw new Error(`${copy.deviceLabel} 정보를 저장했지만 기기 주소를 확인하지 못했어요. 처음부터 다시 시도해주세요.`);
      }
      setRouterPassword("");
      onProvisioned?.(deviceId);
      onClose();
    } catch (error) {
      if (currentSession === session.current) setErrorMessage(getErrorMessage(error));
    } finally {
      if (currentSession === session.current) setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={copy.sheetTitle}
      snapHeight={0.82}
      dragCloseEnabled={!submitting}
    >
      <StepIndicator step={step} />

      {step === "connect" ? (
        <>
          <InfoPanel
            icon="wifi"
            title={`${copy.deviceLabel} 설정 Wi-Fi에 연결해주세요`}
            description={`휴대폰 Wi-Fi 설정에서 아래 이름의 네트워크를 선택한 뒤 앱으로 돌아오세요. 2.4GHz 회선 안에서만 동작해요.`}
          />

          <View className="mt-4 gap-2">
            <SetupValue icon="radio" label="연결할 Wi-Fi" value={copy.setupSsid} />
            <SetupValue icon="key" label="기본 비밀번호" value={copy.setupPassword} />
          </View>

          <SecondaryButton
            label={settingsOpened ? "Wi-Fi 설정 다시 열기" : "휴대폰 Wi-Fi 설정 열기"}
            onPress={handleOpenSettings}
          />

          {settingsOpened ? (
            <PrimaryButton
              label={checkingHotspot ? "연결 확인 중..." : "연결 확인하고 계속"}
              disabled={checkingHotspot}
              loading={checkingHotspot}
              onPress={handleConfirmHotspot}
            />
          ) : null}
        </>
      ) : (
        <>
          <InfoPanel
            icon="edit-3"
            title="현장 공유기 Wi-Fi를 입력해주세요"
            description={`${copy.deviceLabel}가 계속 사용할 Wi-Fi 이름과 비밀번호예요. 2.4GHz Wi-Fi만 연결돼요.`}
          />

          <FieldLabel label="Wi-Fi 이름" />
          <TextInput
            value={routerSsid}
            onChangeText={setRouterSsid}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="집이나 농장 공유기 이름"
            placeholderTextColor={C.ter}
            editable={!submitting}
            className="rounded-2xl px-4 py-3 text-[14px]"
            style={{ minHeight: 50, backgroundColor: INPUT_BG, color: C.text, fontFamily: "Pretendard-Medium" }}
            testID="input-device-wifi-ssid"
          />

          {ssidLooksFiveGhz ? (
            <FiveGhzWarning
              acknowledged={fiveGhzAcknowledged}
              onAcknowledge={() => setFiveGhzAcknowledged(true)}
              onOpenSettings={handleOpenSettings}
            />
          ) : null}

          <FieldLabel label="Wi-Fi 비밀번호" />
          <TextInput
            value={routerPassword}
            onChangeText={setRouterPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="8자 이상 (비밀번호가 없으면 비워두세요)"
            placeholderTextColor={C.ter}
            editable={!submitting}
            className="rounded-2xl px-4 py-3 text-[14px]"
            style={{ minHeight: 50, backgroundColor: INPUT_BG, color: C.text, fontFamily: "Pretendard-Medium" }}
            testID="input-device-wifi-password"
          />

          <PretendardFont style={{ marginTop: 10, fontSize: 12, lineHeight: 18, color: C.sec }}>
            비밀번호는 {copy.deviceLabel}에만 전달되고 앱에는 저장되지 않아요.
          </PretendardFont>

          <PrimaryButton
            label={submitting ? `${copy.deviceLabel}로 전송 중...` : "이 Wi-Fi로 저장하기"}
            disabled={submitting || !canSubmitCredentials}
            loading={submitting}
            onPress={handleSendCredentials}
          />
        </>
      )}

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

function FiveGhzWarning({
  acknowledged,
  onAcknowledge,
  onOpenSettings,
}: {
  acknowledged: boolean;
  onAcknowledge: () => void;
  onOpenSettings: () => void;
}) {
  if (acknowledged) {
    return (
      <View className="mt-2 flex-row items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: "#F1F5F9" }}>
        <Feather name="check" size={14} color={C.sec} />
        <PretendardFont style={{ flex: 1, fontSize: 12, color: C.sec }}>
          2.4GHz도 지원하는 Wi-Fi로 확인하고 계속 진행해요.
        </PretendardFont>
      </View>
    );
  }

  return (
    <View className="mt-2 rounded-xl px-3.5 py-3" style={{ backgroundColor: "#FFF7ED" }}>
      <View className="flex-row items-start gap-2">
        <Feather name="alert-triangle" size={15} color="#B45309" style={{ marginTop: 1 }} />
        <PretendardFont style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: "#8A5A0A" }}>
          이름에 5G가 포함돼 있어요. 5GHz 전용 Wi-Fi라면 연결할 수 없어요.
        </PretendardFont>
      </View>
      <View className="mt-2.5 flex-row" style={{ gap: 8 }}>
        <Pressable onPress={onOpenSettings} className="rounded-lg px-3 py-2 active:opacity-70" style={{ backgroundColor: "#FFEED4" }}>
          <PretendardFont weight="semibold" style={{ fontSize: 11.5, color: "#8A5A0A" }}>
            Wi-Fi 이름 다시 확인
          </PretendardFont>
        </Pressable>
        <Pressable onPress={onAcknowledge} className="rounded-lg px-3 py-2 active:opacity-70" style={{ backgroundColor: "#FFEED4" }}>
          <PretendardFont weight="semibold" style={{ fontSize: 11.5, color: "#8A5A0A" }}>
            이름만 5G고 2.4GHz도 지원해요
          </PretendardFont>
        </Pressable>
      </View>
    </View>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const stepNumber = step === "connect" ? 1 : 2;
  return (
    <View className="mb-5 flex-row items-center justify-between">
      <PretendardFont weight="bold" style={{ fontSize: 12.5, color: C.sec }}>
        {stepNumber} / 2 단계
      </PretendardFont>
      <View className="flex-row" style={{ gap: 4 }}>
        {[1, 2].map((number) => (
          <View
            key={number}
            style={{
              width: number === stepNumber ? 18 : 7,
              height: 5,
              borderRadius: 3,
              backgroundColor: number <= stepNumber ? C.gatePrimary : C.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function SetupValue({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
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

function InfoPanel({ icon, title, description }: { icon: keyof typeof Feather.glyphMap; title: string; description: string }) {
  return (
    <View className="flex-row gap-3 rounded-2xl p-4" style={{ backgroundColor: C.infoBg }}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
        <Feather name={icon} size={18} color={C.gatePrimary} />
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

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-6 items-center justify-center rounded-2xl py-4 active:opacity-80"
      style={{ minHeight: 54, backgroundColor: C.white, borderWidth: 1, borderColor: C.gatePrimary }}
    >
      <PretendardFont weight="bold" style={{ fontSize: 15, color: C.gatePrimary }}>
        {label}
      </PretendardFont>
    </Pressable>
  );
}

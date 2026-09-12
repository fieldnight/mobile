import { useEffect, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import {
  isValidHiveDeviceId,
  normalizeHiveDeviceId,
  openWifiSettings,
} from "@/features/hive-wifi";

interface GateWifiSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  initialDeviceId?: string;
  onProvisioned?: (deviceId: string) => void;
}

const INPUT_BG = "#EEF2F6";

function safeInitialDeviceId(value?: string) {
  const normalized = normalizeHiveDeviceId(value ?? "");
  return isValidHiveDeviceId(normalized) ? normalized : "";
}

/**
 * 개폐기 핫스팟 연결 -> 웹 설정 페이지 -> MAC 확인 흐름입니다.
 * 벌통(HiveWifiSetupSheet)과 동일한 UX지만, 개폐기 웹 설정 페이지 주소가 아직
 * 정해지지 않아 "웹 설정 페이지 열기"는 준비 중 안내만 표시합니다. 주소가
 * 정해지면 hiveWifiProvisioning.ts를 참고해 개폐기용 요청 함수를 추가하고
 * 이 컴포넌트를 HiveWifiSetupSheet과 동일한 3단계 흐름으로 바꾸면 됩니다.
 */
export function GateWifiSetupSheet({
  visible,
  onClose,
  initialDeviceId,
  onProvisioned,
}: GateWifiSetupSheetProps) {
  const [deviceId, setDeviceId] = useState(() =>
    safeInitialDeviceId(initialDeviceId),
  );
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedDeviceId = normalizeHiveDeviceId(deviceId);
  const validDeviceId = isValidHiveDeviceId(normalizedDeviceId);

  useEffect(() => {
    if (!visible) return;
    setDeviceId(safeInitialDeviceId(initialDeviceId));
    setSettingsOpened(false);
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
    } catch {
      setErrorMessage("Wi-Fi 설정을 열지 못했어요. 다시 시도해주세요.");
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
      title="개폐기 Wi-Fi 연결"
      snapHeight={0.78}
    >
      <InfoPanel
        icon="wifi"
        title="개폐기 핫스팟에 연결해주세요"
        description="휴대폰 Wi-Fi 설정에서 개폐기 네트워크를 선택한 뒤 앱으로 돌아오세요."
      />

      <View
        className="mt-4 flex-row items-start gap-2 rounded-2xl p-4"
        style={{ backgroundColor: "#FFF7E6" }}
      >
        <Feather name="alert-triangle" size={17} color="#B45309" />
        <PretendardFont
          style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: "#8A5A0A" }}
        >
          개폐기 웹 설정 페이지 주소는 아직 준비 중이에요. 지금은 개폐기
          Wi-Fi 연결까지만 확인하고, MAC 주소는 아래에서 직접 입력해주세요.
        </PretendardFont>
      </View>

      <Pressable
        onPress={handleOpenSettings}
        className="mt-6 items-center justify-center rounded-2xl py-4 active:opacity-80"
        style={{
          minHeight: 54,
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.gatePrimary,
        }}
      >
        <PretendardFont weight="bold" style={{ fontSize: 15, color: C.gatePrimary }}>
          {settingsOpened ? "Wi-Fi 설정 다시 열기" : "휴대폰 Wi-Fi 설정 열기"}
        </PretendardFont>
      </Pressable>

      <FieldLabel label="개폐기 MAC 주소" />
      <TextInput
        value={deviceId}
        onChangeText={setDeviceId}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="AA:BB:CC:DD:EE:FF"
        placeholderTextColor={C.ter}
        className="rounded-2xl px-4 py-3 text-[14px]"
        style={{
          minHeight: 50,
          backgroundColor: INPUT_BG,
          color: C.text,
          fontFamily: "Pretendard-Medium",
        }}
      />
      {!validDeviceId && deviceId.trim() ? (
        <PretendardFont
          style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: C.error }}
        >
          MAC 주소를 AA:BB:CC:DD:EE:FF 형식으로 확인해주세요.
        </PretendardFont>
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

      <Pressable
        onPress={handleComplete}
        disabled={!validDeviceId}
        className="mt-6 items-center justify-center rounded-2xl py-4 active:opacity-80"
        style={{
          minHeight: 54,
          backgroundColor: validDeviceId ? C.gatePrimary : C.border,
        }}
      >
        <PretendardFont weight="bold" style={{ fontSize: 15, color: C.white }}>
          확인하고 개폐기 등록으로 돌아가기
        </PretendardFont>
      </Pressable>
    </BottomSheet>
  );
}

function InfoPanel({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row gap-3 rounded-2xl p-4" style={{ backgroundColor: C.infoBg }}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
        <Feather name={icon} size={18} color={C.gatePrimary} />
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

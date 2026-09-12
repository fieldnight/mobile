import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { isValidHiveDeviceId, normalizeHiveDeviceId } from "@/features/hive-wifi";
import { useGateStore } from "@/stores/useGateStore";
import { C } from "@/constants/hive-colors";
import type { GateData, GateFormInput } from "@/types/gate-control";
import { getGateDeviceErrorMessage } from "../api";
import { useRegisterGateDevice } from "../hooks";
import { GateWifiSetupSheet } from "./GateWifiSetupSheet";

interface AddGateSheetProps {
  visible: boolean;
  onClose: () => void;
  gate?: GateData | null;
}

const EMPTY_FORM: GateFormInput = {
  macAddress: "",
  name: "",
  location: "",
  memo: "",
};
const FORM_PANEL_BG = "#EEF2F6";

function normalizeGateMacAddress(value: string) {
  return normalizeHiveDeviceId(value).toLowerCase();
}

function normalizeGateName(value: string) {
  return value.trim();
}

/**
 * 저장 전에 로컬 개폐기 목록에서 중복을 먼저 확인합니다.
 * 서버 요청이 없는 로컬 전용 등록이라, 저장 직전에만 막아도 충분합니다.
 */
function getDuplicateGateMessage({
  gates,
  macAddress,
  name,
  currentGateId,
}: {
  gates: GateData[];
  macAddress: string;
  name: string;
  currentGateId?: string;
}) {
  const normalizedMac = normalizeGateMacAddress(macAddress);
  const normalizedName = normalizeGateName(name);
  const targetGates = gates.filter((item) => item.id !== currentGateId);

  if (targetGates.some((item) => normalizeGateMacAddress(item.macAddress) === normalizedMac)) {
    return "이미 등록된 개폐기 번호에요. 번호를 다시 확인해주세요! ";
  }

  if (targetGates.some((item) => normalizeGateName(item.name) === normalizedName)) {
    return "이미 등록된 이름의 개폐기에요. 이름을 바꿔주세요! ";
  }

  return null;
}

/**
 * 개폐기 등록/수정 공용 바텀시트
 * - 등록은 서버(POST /api/v1/gates)에 반영되고, 수정은 서버 PATCH가 아직 없어
 *   로컬(useGateStore)에만 반영됩니다.
 * - 벌통 등록 모달(HiveAddSheet)과 동일한 UX(Wi-Fi 연결 카드 포함)를 쓰되, MQTT
 *   연결 확인처럼 서버가 필요한 흐름은 없습니다.
 */
export function AddGateSheet({ visible, onClose, gate }: AddGateSheetProps) {
  const editing = !!gate;
  const gates = useGateStore((state) => state.gates);
  const addGate = useGateStore((state) => state.addGate);
  const updateGate = useGateStore((state) => state.updateGate);
  const { show: showToast } = useAppToast();
  const registerGateMutation = useRegisterGateDevice();
  const [form, setForm] = useState<GateFormInput>(EMPTY_FORM);
  const [wifiSetupVisible, setWifiSetupVisible] = useState(false);
  const [provisionedDeviceId, setProvisionedDeviceId] = useState("");

  useEffect(() => {
    if (!visible) return;
    setWifiSetupVisible(false);
    setProvisionedDeviceId("");
    // 수정 모드에서는 기존 개폐기 정보를 폼에 채워 사용자가 필요한 값만 바꾸게 합니다.
    setForm(
      gate
        ? {
            id: gate.id,
            macAddress: gate.macAddress,
            name: gate.name,
            location: gate.location,
            memo: gate.memo ?? "",
          }
        : EMPTY_FORM,
    );
  }, [gate, visible]);

  const normalizedFormMac = normalizeHiveDeviceId(form.macAddress);
  const validMacAddress = editing
    ? form.macAddress.trim() !== ""
    : isValidHiveDeviceId(normalizedFormMac);
  const canSubmit = validMacAddress && form.name.trim() !== "";

  const updateField = (key: keyof GateFormInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetAndClose = () => {
    setForm(EMPTY_FORM);
    setWifiSetupVisible(false);
    setProvisionedDeviceId("");
    onClose();
  };

  const handleWifiProvisioned = (deviceId: string) => {
    const normalizedDeviceId = normalizeGateMacAddress(deviceId);
    setProvisionedDeviceId(normalizedDeviceId);
    if (!editing) updateField("macAddress", normalizedDeviceId);
    showToast("개폐기 Wi-Fi 연결을 확인했어요", "success");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const payload = {
      macAddress: normalizeGateMacAddress(form.macAddress),
      name: form.name.trim(),
      location: form.location.trim(),
      memo: form.memo?.trim() || undefined,
    };
    const duplicateMessage = getDuplicateGateMessage({
      gates,
      macAddress: payload.macAddress,
      name: payload.name,
      currentGateId: gate?.id,
    });

    if (duplicateMessage) {
      showToast(duplicateMessage, "error");
      return;
    }

    if (editing && gate) {
      updateGate(gate.id, payload);
      showToast(`${payload.name} 정보를 수정했어요`, "success");
      resetAndClose();
      return;
    }

    registerGateMutation.mutate(
      {
        macAddress: payload.macAddress,
        name: payload.name,
        location: payload.location,
        memo: payload.memo,
      },
      {
        onSuccess: ({ gateId }) => {
          addGate({ ...payload, id: String(gateId), gateId });
          showToast(`${payload.name} 개폐기를 등록했어요`, "success");
          resetAndClose();
        },
        onError: (error) => {
          showToast(getGateDeviceErrorMessage(error, "개폐기 등록에 실패했어요"), "error");
        },
      },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={resetAndClose}
      title={editing ? "개폐기 수정" : "개폐기 등록"}
    >
      <View className="rounded-2xl p-4 mb-2" style={{ backgroundColor: C.infoBg }}>
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 13, color: C.gatePrimary, lineHeight: 20 }}
        >
          {editing
            ? "등록된 개폐기의 이름, 위치, 메모를 수정할 수 있어요."
            : "처음 설치라면 개폐기 Wi-Fi를 연결한 뒤 기본 정보를 입력해주세요."}
        </PretendardFont>
      </View>

      {!editing ? (
        <WifiSetupCard
          completedDeviceId={provisionedDeviceId}
          onPress={() => setWifiSetupVisible(true)}
        />
      ) : null}

      <FieldLabel label="개폐기 번호" required hint={editing ? "수정 불가" : undefined} />
      <FormInput
        value={form.macAddress}
        onChangeText={(value) => updateField("macAddress", value)}
        placeholder="AA:BB:CC:DD:EE:FF"
        editable={!editing}
      />
      {!editing && form.macAddress.trim() !== "" && !validMacAddress && (
        <PretendardFont
          style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: C.error }}
        >
          MAC 주소를 AA:BB:CC:DD:EE:FF 형식으로 입력해주세요.
        </PretendardFont>
      )}

      <FieldLabel label="개폐기 이름" required />
      <FormInput
        value={form.name}
        onChangeText={(value) => updateField("name", value)}
        placeholder="남쪽 과수원 개폐기"
      />

      <FieldLabel label="사용자 지정 위치" />
      <FormInput
        value={form.location}
        onChangeText={(value) => updateField("location", value)}
        placeholder="과수원 남쪽 입구"
      />

      <FieldLabel label="메모" />
      <FormInput
        value={form.memo ?? ""}
        onChangeText={(value) => updateField("memo", value)}
        placeholder="설치 위치나 특이사항을 적어주세요"
        multiline
      />

      <View className="mt-6 flex-row" style={{ gap: 10 }}>
        <Pressable
          onPress={resetAndClose}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-80"
          style={{ backgroundColor: FORM_PANEL_BG }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.textAlt }}>
            취소
          </PretendardFont>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || registerGateMutation.isPending}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-80"
          style={{
            backgroundColor:
              canSubmit && !registerGateMutation.isPending ? C.gatePrimary : C.border,
          }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
            {registerGateMutation.isPending
              ? "등록 중..."
              : editing
                ? "수정하기"
                : "등록하기"}
          </PretendardFont>
        </Pressable>
      </View>

      <GateWifiSetupSheet
        visible={wifiSetupVisible}
        onClose={() => setWifiSetupVisible(false)}
        initialDeviceId={form.macAddress}
        onProvisioned={handleWifiProvisioned}
      />
    </BottomSheet>
  );
}

function WifiSetupCard({
  completedDeviceId,
  onPress,
}: {
  completedDeviceId: string;
  onPress: () => void;
}) {
  const completed = completedDeviceId !== "";

  return (
    <Pressable
      onPress={onPress}
      className="mt-4 flex-row items-center gap-3 rounded-2xl p-4 active:opacity-80"
      style={{
        backgroundColor: completed ? "#E8F8F0" : C.bgAlt,
        borderWidth: 1,
        borderColor: completed ? "#B7E4CD" : C.border,
      }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
        <Feather
          name={completed ? "check" : "wifi"}
          size={19}
          color={completed ? C.success : C.gatePrimary}
        />
      </View>
      <View className="flex-1">
        <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
          {completed ? `${completedDeviceId} Wi-Fi 연결 확인 완료` : "개폐기 Wi-Fi 연결"}
        </PretendardFont>
        <PretendardFont
          style={{ marginTop: 3, fontSize: 12, lineHeight: 18, color: C.sec }}
        >
          {completed
            ? "확인 완료 · 아래 기본 정보를 입력해 등록을 마무리해주세요."
            : "처음 설치하는 개폐기라면 먼저 진행해주세요."}
        </PretendardFont>
      </View>
      <Feather name="chevron-right" size={18} color={C.sec} />
    </Pressable>
  );
}

/** Add 계열 모달에서 쓰는 border 없는 폼 라벨입니다. */
function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <View className="flex-row items-center gap-1 mt-5 mb-2">
      <PretendardFont weight="bold" style={{ fontSize: 13, color: C.text }}>
        {label}
      </PretendardFont>
      {required && (
        <PretendardFont weight="bold" style={{ fontSize: 13, color: C.error }}>
          *
        </PretendardFont>
      )}
      {hint && (
        <PretendardFont style={{ fontSize: 12, color: C.ter }}>
          ({hint})
        </PretendardFont>
      )}
    </View>
  );
}

/** Pretendard를 직접 지정한 Add 모달용 입력 필드입니다. */
function FormInput({
  value,
  onChangeText,
  placeholder,
  editable = true,
  multiline,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable?: boolean;
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor={C.ter}
      className="rounded-2xl px-4 py-3 text-[14px]"
      style={{
        minHeight: multiline ? 88 : 48,
        backgroundColor: FORM_PANEL_BG,
        color: editable ? C.text : C.sec,
        fontFamily: "Pretendard-Medium",
        textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

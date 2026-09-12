import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "@/components/BottomSheet";
import { NoticeBottomSheet } from "@/components/NoticeBottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { getHiveConnection, useCreateHive, useUpdateHive } from "@/features/hive";
import {
  HiveWifiSetupSheet,
  isValidHiveDeviceId,
  normalizeHiveDeviceId,
  type HiveWifiSetupMode,
} from "@/features/hive-wifi";
import { useHiveStore } from "@/stores/useHiveStore";
import { C } from "@/constants/hive-colors";
import type { HiveData, HiveFormInput } from "@/types/hive-control";

interface HiveAddSheetProps {
  visible: boolean;
  onClose: () => void;
  hive?: HiveData | null;
}

const EMPTY_FORM: HiveFormInput = {
  macAddress: "",
  name: "",
  region: "",
  location: "",
  memo: "",
};
const FORM_PANEL_BG = "#EEF2F6";
const CONNECTION_POLL_INTERVAL_MS = 3_000;
const CONNECTION_POLL_ATTEMPTS = 20;

interface ConnectionNotice {
  result: "connected" | "timeout";
  hiveName: string;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getApiErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? error?.message ?? fallback;
}

function isLocalFallbackHive(hive: HiveData) {
  return (
    (hive.id === "1" && hive.macAddress === "AA:BB:CC:DD:EE:FF") ||
    (hive.id === "2" && hive.macAddress === "11:22:33:44:55:66")
  );
}

function normalizeMacAddress(value: string) {
  return normalizeHiveDeviceId(value).toLowerCase();
}

function normalizeHiveName(value: string) {
  return value.trim();
}

/**
 * 저장 전에 로컬 벌통 목록에서 중복을 먼저 확인합니다.
 * 서버 요청 전에 막아야 모달은 유지되고, 사용자는 바로 어떤 값이 문제인지 알 수 있습니다.
 */
function getDuplicateHiveMessage({
  hives,
  macAddress,
  name,
  currentHiveId,
}: {
  hives: HiveData[];
  macAddress: string;
  name: string;
  currentHiveId?: string;
}) {
  const normalizedMac = normalizeMacAddress(macAddress);
  const normalizedName = normalizeHiveName(name);
  const targetHives = hives.filter((item) => item.id !== currentHiveId);

  if (targetHives.some((item) => normalizeMacAddress(item.macAddress) === normalizedMac)) {
    return "이미 등록된 벌통 번호에요. 번호를 다시 확인해주세요! ";
  }

  if (targetHives.some((item) => normalizeHiveName(item.name) === normalizedName)) {
    return "이미 등록된 이름의 벌통이에요. 이름을 바꿔주세요! ";
  }

  return null;
}

/**
 * 벌통 등록/수정 공용 바텀시트
 * - 등록: macAddress/name/region/location/memo를 서버에 POST합니다.
 * - 수정: 서버 수정 API 명세에 맞춰 name/region/location/memo만 전달합니다.
 */
export function HiveAddSheet({ visible, onClose, hive }: HiveAddSheetProps) {
  const editing = !!hive;
  const hives = useHiveStore((state) => state.hives);
  const addHive = useHiveStore((state) => state.addHive);
  const setHives = useHiveStore((state) => state.setHives);
  const updateHiveLocally = useHiveStore((state) => state.updateHive);
  const createHiveMutation = useCreateHive();
  const updateHiveMutation = useUpdateHive();
  const { show: showToast } = useAppToast();
  const [form, setForm] = useState<HiveFormInput>(EMPTY_FORM);
  const [wifiSetupVisible, setWifiSetupVisible] = useState(false);
  const [provisionedDeviceId, setProvisionedDeviceId] = useState("");
  const [connectionNotice, setConnectionNotice] =
    useState<ConnectionNotice | null>(null);
  const connectionCheckGeneration = useRef(0);

  useEffect(
    () => () => {
      connectionCheckGeneration.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!visible) return;
    setWifiSetupVisible(false);
    setProvisionedDeviceId("");
    // 수정 모드에서는 기존 벌통 정보를 폼에 채워 사용자가 필요한 값만 바꾸게 합니다.
    setForm(
      hive
        ? {
            id: hive.id,
            macAddress: hive.macAddress,
            name: hive.name,
            region: hive.region,
            location: hive.location ?? "",
            memo: hive.memo ?? "",
            replacedAt: hive.replacedAt,
          }
        : EMPTY_FORM,
    );
  }, [hive, visible]);

  const submitting =
    createHiveMutation.isPending || updateHiveMutation.isPending;
  const wifiSetupMode: HiveWifiSetupMode = editing ? "change" : "register";
  const normalizedFormMac = normalizeHiveDeviceId(form.macAddress);
  const validMacAddress = editing
    ? form.macAddress.trim() !== ""
    : isValidHiveDeviceId(normalizedFormMac);
  const canSubmit =
    validMacAddress &&
    form.name.trim() !== "" &&
    form.region.trim() !== "" &&
    form.location.trim() !== "" &&
    !submitting;

  const updateField = (key: keyof HiveFormInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetAndClose = () => {
    setForm(EMPTY_FORM);
    setWifiSetupVisible(false);
    setProvisionedDeviceId("");
    onClose();
  };

  const handleWifiProvisioned = (deviceId: string) => {
    const normalizedDeviceId = normalizeHiveDeviceId(deviceId);
    setProvisionedDeviceId(normalizedDeviceId);
    if (!editing) updateField("macAddress", normalizedDeviceId);
    showToast(
      editing
        ? "새 Wi-Fi 정보가 저장됐어요. 벌통이 다시 연결될 때까지 기다려주세요"
        : "벌통 Wi-Fi 웹 설정을 완료했어요",
      "success",
    );
  };

  const monitorFirstConnection = async (
    hiveId: string,
    hiveName: string,
    macAddress: string,
  ) => {
    const generation = connectionCheckGeneration.current + 1;
    connectionCheckGeneration.current = generation;
    const startedAt = Date.now();

    setConnectionNotice(null);
    console.info("[Hive MQTT] 연결 확인 시작", {
      hiveId,
      macAddress,
      maxAttempts: CONNECTION_POLL_ATTEMPTS,
      pollIntervalMs: CONNECTION_POLL_INTERVAL_MS,
    });

    for (let attempt = 0; attempt < CONNECTION_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) await wait(CONNECTION_POLL_INTERVAL_MS);
      if (connectionCheckGeneration.current !== generation) return;

      try {
        const connection = await getHiveConnection(hiveId);
        if (connectionCheckGeneration.current !== generation) return;
        if (!connection.isConnected) continue;

        const currentHives = useHiveStore.getState().hives;
        setHives(
          currentHives.map((item) =>
            item.id === hiveId
              ? { ...item, status: "online" as const, lastUpdate: "방금" }
              : item,
          ),
        );
        console.info("[Hive MQTT] 연결 확인 성공", {
          hiveId,
          macAddress,
          attempt: attempt + 1,
          elapsedMs: Date.now() - startedAt,
          lastConnectedAt: connection.lastConnectedAt,
        });
        setConnectionNotice({ result: "connected", hiveName });
        return;
      } catch (error) {
        if (connectionCheckGeneration.current !== generation) return;
        // MQTT 첫 메시지가 서버에 반영되는 동안에는 조회 실패도 재시도합니다.
        console.warn("[Hive MQTT] 연결 상태 조회 실패, 재시도", {
          hiveId,
          macAddress,
          attempt: attempt + 1,
          message: getApiErrorMessage(error, "연결 상태 조회 실패"),
        });
      }
    }

    if (connectionCheckGeneration.current === generation) {
      console.warn("[Hive MQTT] 연결 확인 시간 초과", {
        hiveId,
        macAddress,
        attempts: CONNECTION_POLL_ATTEMPTS,
        elapsedMs: Date.now() - startedAt,
      });
      setConnectionNotice({ result: "timeout", hiveName });
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const payload = {
      macAddress: normalizedFormMac,
      name: form.name.trim(),
      region: form.region.trim(),
      location: form.location.trim(),
      memo: form.memo?.trim() || undefined,
    };
    const duplicateMessage = getDuplicateHiveMessage({
      hives,
      macAddress: payload.macAddress,
      name: payload.name,
      currentHiveId: hive?.id,
    });

    if (duplicateMessage) {
      showToast(duplicateMessage, "error");
      return;
    }

    if (editing && hive) {
      if (isLocalFallbackHive(hive)) {
        // 서버에 등록되지 않은 fallback 벌통은 API 요청 없이 로컬 상태만 수정합니다.
        updateHiveLocally(hive.id, {
          name: payload.name,
          region: payload.region,
          location: payload.location,
          memo: payload.memo ?? "",
          replacedAt: form.replacedAt,
        });
        showToast(`${payload.name} 정보를 수정했어요`, "success");
        resetAndClose();
        return;
      }

      // 수정 API 명세에 맞춰 macAddress는 제외하고 변경 가능한 기본 정보만 보냅니다.
      updateHiveMutation.mutate(
        {
          hiveId: hive.id,
          body: {
            name: payload.name,
            region: payload.region,
            location: payload.location,
            memo: payload.memo,
          },
        },
        {
          onSuccess: () => {
            updateHiveLocally(hive.id, {
              name: payload.name,
              region: payload.region,
              location: payload.location,
              memo: payload.memo ?? "",
              replacedAt: form.replacedAt,
            });
            showToast(`${payload.name} 정보를 수정했어요`, "success");
            resetAndClose();
          },
          onError: (error) => {
            showToast(getApiErrorMessage(error, "벌통 수정에 실패했어요"), "error");
          },
        },
      );
      return;
    }

    createHiveMutation.mutate(payload, {
      onSuccess: ({ hiveId }) => {
        const registeredHiveId = String(hiveId);
        addHive({ ...payload, id: registeredHiveId, memo: payload.memo ?? "" });
        showToast(`${payload.name} 벌통을 등록했어요. 연결을 확인하고 있어요`, "success");
        resetAndClose();
        void monitorFirstConnection(
          registeredHiveId,
          payload.name,
          payload.macAddress,
        );
      },
      onError: (error) => {
        showToast(getApiErrorMessage(error, "벌통 등록에 실패했어요"), "error");
      },
    });
  };

  return (
    <>
    <BottomSheet
      visible={visible}
      onClose={resetAndClose}
      title={editing ? "벌통 수정" : "벌통 등록"}
    >
      <View className="rounded-2xl p-4 mb-2" style={{ backgroundColor: C.infoBg }}>
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 13, color: C.primary, lineHeight: 20 }}
        >
          {editing
            ? "벌통 정보와 현장에서 사용하는 공유기 Wi-Fi를 변경할 수 있어요."
            : "처음 설치라면 벌통 Wi-Fi를 연결한 뒤 기본 정보를 입력해주세요."}
        </PretendardFont>
      </View>

      <WifiSetupCard
        mode={wifiSetupMode}
        completedDeviceId={provisionedDeviceId}
        onPress={() => setWifiSetupVisible(true)}
      />

      <FieldLabel label="벌통 번호" required hint={editing ? "수정 불가" : undefined} />
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
          벌통 Wi-Fi 이름의 MAC 주소를 AA:BB:CC:DD:EE:FF 형식으로 입력해주세요.
        </PretendardFont>
      )}

      <FieldLabel label="벌통 이름" required />
      <FormInput
        value={form.name}
        onChangeText={(value) => updateField("name", value)}
        placeholder="딸기 벌통 3호"
      />

      <FieldLabel label="지역" required />
      <FormInput
        value={form.region}
        onChangeText={(value) => updateField("region", value)}
        placeholder="충청북도 청주시 오창읍"
      />

      <FieldLabel label="사용자 지정 위치" required />
      <FormInput
        value={form.location}
        onChangeText={(value) => updateField("location", value)}
        placeholder="과수원 남쪽"
      />

      <FieldLabel label="메모" />
      <FormInput
        value={form.memo ?? ""}
        onChangeText={(value) => updateField("memo", value)}
        placeholder="점검 내용이나 특이사항을 적어주세요"
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
          disabled={!canSubmit}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-80"
          style={{ backgroundColor: canSubmit ? C.primary : C.border }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
            {submitting ? "저장 중" : editing ? "수정하기" : "등록하기"}
          </PretendardFont>
        </Pressable>
      </View>

      <HiveWifiSetupSheet
        visible={wifiSetupVisible}
        onClose={() => setWifiSetupVisible(false)}
        mode={wifiSetupMode}
        initialDeviceId={form.macAddress}
        onProvisioned={handleWifiProvisioned}
      />
    </BottomSheet>
    <NoticeBottomSheet
      visible={connectionNotice !== null}
      onClose={() => setConnectionNotice(null)}
      title={
        connectionNotice?.result === "timeout"
          ? "벌통 연결이 확인되지 않았어요"
          : "벌통과 연결됐어요"
      }
      message={
        connectionNotice?.result === "timeout"
          ? `${connectionNotice.hiveName} 벌통 등록은 완료됐지만 첫 MQTT 통신이 아직 확인되지 않았습니다. 벌통 전원과 현장 Wi-Fi를 확인해주세요.`
          : `${connectionNotice?.hiveName ?? ""} 벌통의 첫 MQTT 통신이 확인되었습니다.`
      }
      icon={connectionNotice?.result === "timeout" ? "wifi-off" : "link"}
      actions={[
        {
          label: "확인",
          onPress: () => setConnectionNotice(null),
        },
      ]}
    />
    </>
  );
}

function WifiSetupCard({
  mode,
  completedDeviceId,
  onPress,
}: {
  mode: HiveWifiSetupMode;
  completedDeviceId: string;
  onPress: () => void;
}) {
  const completed = completedDeviceId !== "";
  const copy = getWifiSetupCardCopy(mode, completedDeviceId);

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
      <View
        className="h-10 w-10 items-center justify-center rounded-full bg-white"
      >
        <Feather
          name={completed ? "check" : "wifi"}
          size={19}
          color={completed ? C.success : C.primary}
        />
      </View>
      <View className="flex-1">
        <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
          {copy.title}
        </PretendardFont>
        <PretendardFont
          style={{ marginTop: 3, fontSize: 12, lineHeight: 18, color: C.sec }}
        >
          {copy.description}
        </PretendardFont>
      </View>
      <Feather name="chevron-right" size={18} color={C.sec} />
    </Pressable>
  );
}

function getWifiSetupCardCopy(
  mode: HiveWifiSetupMode,
  completedDeviceId: string,
) {
  if (mode === "change") {
    return completedDeviceId
      ? {
          title: "새 Wi-Fi 정보 저장 완료",
          description: "벌통이 재부팅된 뒤 새 공유기로 다시 연결됩니다.",
        }
      : {
          title: "연결 Wi-Fi 변경",
          description: "공유기 교체나 설치 장소 이동 시 여기에서 다시 설정해요.",
        };
  }

  return completedDeviceId
    ? {
        title: `${completedDeviceId} Wi-Fi 웹 설정 완료`,
        description: "웹 설정 완료 · 아래 기본 정보를 입력해 등록을 마무리해주세요.",
      }
    : {
        title: "벌통 Wi-Fi 연결",
        description: "처음 설치하는 스마트벌통이라면 먼저 진행해주세요.",
      };
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

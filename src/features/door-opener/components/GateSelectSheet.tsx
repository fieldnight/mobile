import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useGateModeStore } from "@/stores/useGateModeStore";
import { useAppToast } from "@/components/ToastContext";
import { cancelGateCommand, getCurrentGateCommand, getGateConnection, type GateCurrentCommand } from "../api/gateCommandsApi";
import { getGateDeviceErrorMessage } from "../api/gateDeviceApi";
import type { GateData } from "@/types/gate-control";
import type { NfcDoorCardConfig } from "./nfcDoorCards";

const FORM_PANEL_BG = "#EEF2F6";

/**
 * 온라인 모드에서 카드를 눌렀을 때 뜨는 "적용할 개폐기 선택" 바텀시트입니다.
 * - 선택한 개폐기마다 REST 명령을 보내고 결과를 폴링하는 부모 콜백을 실행합니다.
 */
export function GateSelectSheet({
  visible,
  card,
  gates,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  card: NfcDoorCardConfig | null;
  gates: GateData[];
  onClose: () => void;
  onConfirm: (selectedGateIds: string[]) => void;
}) {
  const lastSelectedGateIds = useGateModeStore((s) => s.lastSelectedGateIds);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentCommands, setCurrentCommands] = useState<Record<string, GateCurrentCommand | null>>({});
  const [connections, setConnections] = useState<Record<string, string>>({});
  const cancelPending = useRef(false);
  const viewEpoch = useRef(0);
  const [currentErrors, setCurrentErrors] = useState<Record<string, boolean>>({});
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [cancelingGateId, setCancelingGateId] = useState<string | null>(null);
  const { show: showToast } = useAppToast();

  useEffect(() => {
    if (!visible) return;
    // 마지막으로 골랐던 개폐기 중 지금도 등록되어 있는 것만 기본 선택값으로 채웁니다.
    const gateIds = new Set(gates.map((gate) => gate.id));
    setSelectedIds(lastSelectedGateIds.filter((id) => gateIds.has(id)));
  }, [visible, gates, lastSelectedGateIds]);

  // 시트가 열릴 때마다 각 개폐기에 현재 적용 중인 명령을 조회해 보여줍니다.
  useEffect(() => {
    viewEpoch.current++;
    if (!visible || gates.length === 0) {
      setLoadingCurrent(false);
      setCurrentErrors({});
      setConnections({});
      setCurrentCommands({});
      return;
    }
    let cancelled = false;
    setLoadingCurrent(true);
    setCurrentCommands({});
    setConnections({});
    setCurrentErrors({});
    Promise.all(
      gates.map(async (gate) => {
        const [current, connection] = await Promise.allSettled([
          getCurrentGateCommand(gate), getGateConnection(gate),
        ]);
        let label = "서버 연결 확인 실패";
        if (connection.status === "fulfilled") {
          label = connection.value.isConnected ? "서버 판정: 온라인" : "서버 판정: 오프라인";
        } else {
          const status = connection.reason?.response?.status;
          const code = connection.reason?.response?.data?.code;
          if ((status === 404 && code !== "GATE_NOT_FOUND") || status === 405) label = "서버 연결 확인 기능 미지원";
        }
        return [gate.id, current.status === "fulfilled" ? current.value : null, current.status === "rejected", label] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setConnections(Object.fromEntries(entries.map(([id, , , label]) => [id, label])));
      setCurrentCommands(Object.fromEntries(entries.map(([id, current]) => [id, current])));
      setCurrentErrors(Object.fromEntries(entries.map(([id, , failed]) => [id, failed])));
    }).finally(() => {
      if (!cancelled) setLoadingCurrent(false);
    });
    return () => {
      cancelled = true;
      viewEpoch.current++;
    };
  }, [visible, gates]);

  const cancelCurrentCommand = async (gate: GateData) => {
    const current = currentCommands[gate.id];
    if (!current || cancelPending.current) return;
    const startedEpoch = viewEpoch.current;
    cancelPending.current = true;
    setCancelingGateId(gate.id);
    try {
      await cancelGateCommand(gate, current.commandId);
      if (startedEpoch === viewEpoch.current) setCurrentCommands((prev) => ({ ...prev, [gate.id]: null }));
      showToast(`${gate.name}의 적용을 취소했어요.`, "success");
    } catch (error) {
      showToast(getGateDeviceErrorMessage(error, "적용 취소에 실패했어요."), "error");
    } finally {
      cancelPending.current = false;
      setCancelingGateId(null);
    }
  };

  const allSelected = gates.length > 0 && selectedIds.length === gates.length;

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : gates.map((gate) => gate.id));
  };

  const toggleGate = (gateId: string) => {
    setSelectedIds((prev) =>
      prev.includes(gateId) ? prev.filter((id) => id !== gateId) : [...prev, gateId],
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="적용할 개폐기 선택"
      snapHeight={0.6}
      fixedHeight
      contentScrollEnabled={false}
    >
      <View style={{ flex: 1 }}>
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 14.5, lineHeight: 21, color: C.textAlt }}
        >
          {card ? `${card.title} 카드를 적용할 개폐기를 선택하세요.` : ""}
        </PretendardFont>

        <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
          <SelectRow
            label="전체 선택"
            selected={allSelected}
            onPress={toggleAll}
            emphasized
          />

          {gates.map((gate) => {
            const current = currentCommands[gate.id];
            const sublabel = [
              gate.location,
              loadingCurrent ? "서버 상태 확인 중" : connections[gate.id],
              currentErrors[gate.id] ? "현재 적용 상태 확인 실패" : current ? `현재 적용: ${current.title}` : null,
            ].filter(Boolean).join(" · ");
            return (
              <SelectRow
                key={gate.id}
                label={gate.name}
                sublabel={sublabel}
                selected={selectedIds.includes(gate.id)}
                onPress={() => toggleGate(gate.id)}
                trailing={
                  current ? (
                    <Pressable
                      onPress={() => cancelCurrentCommand(gate)}
                      disabled={cancelingGateId !== null}
                      hitSlop={8}
                      className="ml-2 rounded-full px-2.5 py-1.5 active:opacity-70"
                      style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
                    >
                      {cancelingGateId === gate.id ? (
                        <ActivityIndicator size="small" color={C.textAlt} />
                      ) : (
                        <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.textAlt }}>
                          적용 취소
                        </PretendardFont>
                      )}
                    </Pressable>
                  ) : null
                }
              />
            );
          })}
        </ScrollView>

        <View className="pt-4 pb-5 flex-row gap-2.5">
          <Pressable
            onPress={onClose}
            className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
            style={{ backgroundColor: FORM_PANEL_BG }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.textAlt }}>
              취소
            </PretendardFont>
          </Pressable>
          <Pressable
            onPress={() => { if (!cancelPending.current) onConfirm(selectedIds); }}
            disabled={selectedIds.length === 0 || cancelingGateId !== null}
            className="flex-1 items-center rounded-2xl py-4 active:opacity-70"
            style={{
              backgroundColor: selectedIds.length > 0 ? C.gatePrimary : C.border,
            }}
          >
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
              적용
            </PretendardFont>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

function SelectRow({
  label,
  sublabel,
  selected,
  onPress,
  emphasized,
  trailing,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  emphasized?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-80"
      style={{
        backgroundColor: emphasized ? C.infoBg : FORM_PANEL_BG,
      }}
    >
      <View style={{ flex: 1 }}>
        <PretendardFont weight="bold" style={{ fontSize: 14.5, color: C.text }}>
          {label}
        </PretendardFont>
        {sublabel ? (
          <PretendardFont
            weight="medium"
            style={{ marginTop: 2, fontSize: 12.5, color: C.sec }}
          >
            {sublabel}
          </PretendardFont>
        ) : null}
      </View>

      {trailing}

      <View
        className="h-7 w-7 items-center justify-center rounded-full"
        style={{ backgroundColor: selected ? C.gatePrimary : C.white }}
      >
        <Feather
          name={selected ? "check" : "circle"}
          size={15}
          color={selected ? C.white : C.border}
        />
      </View>
    </Pressable>
  );
}

import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useGateModeStore } from "@/stores/useGateModeStore";
import type { GateData } from "@/types/gate-control";
import type { NfcDoorCardConfig } from "./nfcDoorCards";

const FORM_PANEL_BG = "#EEF2F6";

/**
 * 온라인 모드에서 카드를 눌렀을 때 뜨는 "적용할 개폐기 선택" 바텀시트입니다.
 * - NFC 태깅과 달리 온라인 명령은 대상을 사전에 지정해야 하므로, 확인을 누르면
 *   로컬(gateCardAssignments)에만 적용 기록을 남깁니다. 실제 개폐기 동작은
 *   바뀌지 않습니다(온라인 명령 채널이 아직 없음).
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

  useEffect(() => {
    if (!visible) return;
    // 마지막으로 골랐던 개폐기 중 지금도 등록되어 있는 것만 기본 선택값으로 채웁니다.
    const gateIds = new Set(gates.map((gate) => gate.id));
    setSelectedIds(lastSelectedGateIds.filter((id) => gateIds.has(id)));
  }, [visible, gates, lastSelectedGateIds]);

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

          {gates.map((gate) => (
            <SelectRow
              key={gate.id}
              label={gate.name}
              sublabel={gate.location}
              selected={selectedIds.includes(gate.id)}
              onPress={() => toggleGate(gate.id)}
            />
          ))}
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
            onPress={() => onConfirm(selectedIds)}
            disabled={selectedIds.length === 0}
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
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  emphasized?: boolean;
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

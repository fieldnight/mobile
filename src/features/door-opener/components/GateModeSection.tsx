import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ConfirmSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { C } from "@/constants/hive-colors";
import { useGateStore } from "@/stores/useGateStore";
import { useGateModeStore, type GateOperatingMode } from "@/stores/useGateModeStore";
import { getGateDeviceDetail, getGateDeviceErrorMessage } from "../api";
import { useDeleteGateDevice } from "../hooks";
import { AddGateSheet } from "./AddGateSheet";
import type { GateData } from "@/types/gate-control";

const MODE_OPTIONS: Array<{ value: GateOperatingMode; label: string }> = [
  { value: "offline", label: "오프라인(NFC)" },
  { value: "online", label: "온라인" },
];

/**
 * 개폐기 탭과 리포트 탭 상단, DoorOpenerTabs 바로 아래에 이어붙는 모드 토글 +
 * 개폐기 레지스트리 영역입니다. 두 탭이 같은 컴포넌트를 재사용하므로 어디서
 * 모드를 바꾸거나 개폐기를 등록해도 즉시 서로 반영됩니다.
 * 삼성 스마트싱스 상단바처럼 배경 박스를 전혀 두지 않고, 뒤 배경 이미지가 그대로
 * 비치는 완전 투명한 영역 위에 텍스트/아이콘만 놓습니다. 선택 상태는 배경색이 아니라
 * 어두운 글자 굵기·색으로만 구분합니다.
 * - 오프라인(NFC): 온라인 전환을 비활성화하고 재부팅 후 시간 동기화를 안내합니다.
 * - 온라인: 토글 옆에 "전체 개폐기" 드롭다운 트리거 + 등록(+) 버튼이 뜨고,
 *   드롭다운을 펼치면 등록된 개폐기 목록이 아코디언으로 펼쳐집니다. 목록에서
 *   개폐기를 고르면 수정 시트가 열리고, 각 행의 삭제 아이콘으로 서버(DELETE
 *   /api/v1/gates/{gateId})에서 바로 삭제할 수 있습니다. 실제로 어떤 카드를 어떤
 *   개폐기에 적용할지는 NfcDoorCardSection의 GateSelectSheet에서 별도로 고릅니다.
 */
export function GateModeSection() {
  const gates = useGateStore((state) => state.gates);
  const deleteGate = useGateStore((state) => state.deleteGate);
  const mode = useGateModeStore((state) => state.mode);
  const setMode = useGateModeStore((state) => state.setMode);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addGateVisible, setAddGateVisible] = useState(false);
  const [editingGate, setEditingGate] = useState<GateData | null>(null);
  const [deletingGate, setDeletingGate] = useState<GateData | null>(null);
  const { show: showToast } = useAppToast();
  const deleteGateMutation = useDeleteGateDevice();
  const editRequest = useRef(0);
  useEffect(() => () => { editRequest.current++; }, []);

  const openAddGate = () => {
    editRequest.current++;
    setEditingGate(null);
    setAddGateVisible(true);
  };

  const openEditGate = async (gate: GateData) => {
    const request = ++editRequest.current;
    try {
      const detail = await getGateDeviceDetail(gate.gateId);
      if (request !== editRequest.current) return;
      setDropdownOpen(false);
      setEditingGate({
        ...gate, ...detail, region: detail.region ?? undefined,
        location: detail.location ?? "", memo: detail.memo ?? "",
        registeredAt: detail.createdAt,
      });
      setAddGateVisible(true);
    } catch (error) {
      if (request === editRequest.current) showToast(getGateDeviceErrorMessage(error, "개폐기 정보를 불러오지 못했어요"), "error");
    }
  };

  const requestDeleteGate = (gate: GateData) => {
    setDeletingGate(gate);
  };

  const confirmDeleteGate = () => {
    if (!deletingGate || deleteGateMutation.isPending) return;
    const target = deletingGate;

    deleteGateMutation.mutate(target.gateId, {
      onSuccess: () => {
        deleteGate(target.id);
        setDeletingGate(null);
        showToast(`${target.name} 개폐기를 삭제했어요`, "success");
      },
      onError: (error) => {
        showToast(getGateDeviceErrorMessage(error, "개폐기 삭제에 실패했어요"), "error");
      },
    });
  };

  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingTop: 4,
        paddingBottom: 8,
        zIndex: dropdownOpen ? 50 : 0,
      }}
    >
      <View
        className="flex-row items-center"
        style={{ flexWrap: "wrap", columnGap: 12, rowGap: 6 }}
      >
        <View className="flex-row items-center" style={{ gap: 14, flexShrink: 0 }}>
          {MODE_OPTIONS.map((option) => {
            const selected = option.value === mode;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  setMode(option.value);
                  if (option.value === "offline") setDropdownOpen(false);
                }}
                className="active:opacity-70"
              >
                <PretendardFont
                  weight={selected ? "bold" : "semibold"}
                  style={{ fontSize: 14.5, color: selected ? C.text : C.textAlt }}
                >
                  {option.label}
                </PretendardFont>
              </Pressable>
            );
          })}
        </View>

        {mode === "online" ? (
          <>
            <Pressable
              onPress={() => setDropdownOpen((value) => !value)}
              className="flex-1 flex-row items-center active:opacity-70"
              style={{ gap: 4 }}
            >
              <PretendardFont
                weight="semibold"
                numberOfLines={1}
                style={{ fontSize: 13.5, color: C.textAlt, flexShrink: 1 }}
              >
                {gates.length === 0 ? "등록된 개폐기 없음" : `전체 개폐기 (${gates.length})`}
              </PretendardFont>
              <Feather
                name={dropdownOpen ? "chevron-up" : "chevron-down"}
                size={15}
                color={C.textAlt}
              />
            </Pressable>

            <Pressable
              onPress={openAddGate}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="개폐기 추가"
              className="active:opacity-70"
            >
              <Feather name="plus" size={18} color={C.textAlt} />
            </Pressable>
          </>
        ) : null}
      </View>

      {mode === "online" && dropdownOpen ? (
        // 절대위치 오버레이 — 목록이 펼쳐져도 아래(카드 그리드 등) 레이아웃이 밀리지
        // 않고, 이 블록 위에 떠서 겹쳐 보입니다. 바깥을 탭하면 닫히도록 백드롭을 둡니다.
        <>
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: -1000 }}
            onPress={() => setDropdownOpen(false)}
          />
          <View style={{ position: "absolute", top: "100%", left: 18, right: 18, zIndex: 50 }}>
            <GateDropdownList
              gates={gates}
              onGatePress={openEditGate}
              onAddPress={openAddGate}
              onDeletePress={requestDeleteGate}
              deletingGateId={deleteGateMutation.isPending ? deletingGate?.id : undefined}
            />
          </View>
        </>
      ) : null}

      <AddGateSheet
        visible={addGateVisible}
        onClose={() => setAddGateVisible(false)}
        gate={editingGate}
      />

      <ConfirmSheet
        visible={deletingGate != null}
        onClose={() => setDeletingGate(null)}
        title="개폐기 삭제"
        message={`${deletingGate?.name ?? "선택한 개폐기"}를 삭제할까요? 저장된 리포트 기록도 함께 삭제되며, 이 작업은 되돌릴 수 없어요.`}
        confirmLabel="삭제"
        destructive
        confirmDisabled={deleteGateMutation.isPending}
        onConfirm={confirmDeleteGate}
      />
    </View>
  );
}

function GateDropdownList({
  gates,
  onGatePress,
  onAddPress,
  onDeletePress,
  deletingGateId,
}: {
  gates: GateData[];
  onGatePress: (gate: GateData) => void;
  onAddPress: () => void;
  onDeletePress: (gate: GateData) => void;
  deletingGateId?: string;
}) {
  if (gates.length === 0) {
    return (
      <View
        className="mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3.5"
        style={{
          backgroundColor: C.white,
          shadowColor: C.shadow,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <View style={{ flex: 1 }}>
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
            개폐기를 먼저 등록하세요
          </PretendardFont>
          <PretendardFont
            weight="medium"
            style={{ marginTop: 2, fontSize: 12, lineHeight: 17, color: C.sec }}
          >
            온라인 모드에서는 카드를 적용할 개폐기가 필요해요.
          </PretendardFont>
        </View>
        <Pressable
          onPress={onAddPress}
          className="items-center justify-center rounded-xl active:opacity-80"
          style={{ height: 36, paddingHorizontal: 14, backgroundColor: C.gatePrimary }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 13, color: C.white }}>
            개폐기 등록하기
          </PretendardFont>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      className="mt-3 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: C.white,
        shadowColor: C.shadow,
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      {gates.map((gate, index) => (
        <Pressable
          key={gate.id}
          onPress={() => onGatePress(gate)}
          className="flex-row items-center justify-between px-4 py-3.5 active:opacity-70"
          style={{
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: C.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <PretendardFont weight="bold" numberOfLines={1} style={{ fontSize: 14, color: C.text }}>
              {gate.name}
            </PretendardFont>
            {gate.location ? (
              <PretendardFont
                weight="medium"
                numberOfLines={1}
                style={{ marginTop: 2, fontSize: 12, color: C.sec }}
              >
                {gate.location}
              </PretendardFont>
            ) : null}
          </View>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onDeletePress(gate);
            }}
            disabled={deletingGateId === gate.id}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${gate.name} 삭제`}
            className="ml-2 h-7 w-7 items-center justify-center rounded-full active:opacity-70"
          >
            {deletingGateId === gate.id ? (
              <ActivityIndicator size="small" color={C.error} />
            ) : (
              <Feather name="trash-2" size={15} color={C.error} />
            )}
          </Pressable>
          <Feather name="chevron-right" size={16} color={C.ter} style={{ marginLeft: 6 }} />
        </Pressable>
      ))}
    </View>
  );
}

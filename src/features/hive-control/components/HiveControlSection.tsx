import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { HiveDropdown } from "./HiveDropdown";
import { QcToggleButton } from "./QctoggleButton";
import { ControlItem } from "./controlItem";
import { BoxColor as C } from "@/types";
import type { HiveData, HiveControlState } from "@/types/hive-control";
import { getDisabledState } from "@/types/hive-control";
import { PretendardFont } from "@/components/PretendardFont";

interface HiveControlSectionProps {
  hives: HiveData[];
  current: HiveControlState;
  controlHive: string;
  onToggleControl: (id: string) => void;
  onToggleQuickControl: (
    key: "heaterOn" | "coolerOn" | "ventOn" | "circOn",
  ) => void;
  onSelectHive: (id: string) => void;
}

/**
 * HiveControlSection
 * - 내 농장 화면의 제어 설정 섹션입니다.
 * - 선택된 벌통의 수동 제어 버튼과 자동 제어 항목을 렌더링합니다.
 * - 드롭다운을 통해 벌통 선택을 변경할 수 있습니다.
 */
export function HiveControlSection({
  hives,
  current,
  controlHive,
  onToggleControl,
  onToggleQuickControl,
  onSelectHive,
}: HiveControlSectionProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedHive = hives.find((hive) => hive.id === controlHive);
  const disabled = getDisabledState(current.controls);

  return (
    <View className="mt-2 gap-3">
      <View
        className="bg-white rounded-[20px]"
        style={{
          padding: 18,
          shadowColor: C.shadow,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
          elevation: 2,
        }}
      >
        <View className="flex-row justify-between items-center mb-3.5">
          <PretendardFont
            weight="bold"
            className="text-[18px]"
            style={{ color: C.text }}
          >
            제어 설정
          </PretendardFont>
          <View className="relative">
            <Pressable
              onPress={() => setDropdownOpen((prev) => !prev)}
              className="flex-row items-center gap-1.5 px-3 py-2.5 bg-white rounded-[14px] border"
              style={{ borderColor: C.border }}
            >
              <PretendardFont className="text-[14px]" style={{ color: C.text }}>
                {controlHive === "all"
                  ? "전체"
                  : (selectedHive?.name ?? "벌통 선택")}
              </PretendardFont>
              <Feather name="chevron-down" size={16} color={C.sec} />
            </Pressable>
            {dropdownOpen && (
              <HiveDropdown
                hives={hives}
                selectedId={
                  controlHive === "all" ? (hives[0]?.id ?? "") : controlHive
                }
                onSelect={(id) => {
                  setDropdownOpen(false);
                  onSelectHive(id);
                }}
                onClose={() => setDropdownOpen(false)}
                testPrefix="control"
              />
            )}
          </View>
        </View>

        <PretendardFont
          weight="bold"
          className="text-[14px] mb-3"
          style={{ color: C.text }}
        >
          수동 제어
        </PretendardFont>

        <View className="flex-row justify-between gap-2.5 rounded-[18px] p-3">
          <QcToggleButton
            label="히터"
            icon="sun"
            isOn={current.heaterOn}
            disabled={disabled.heaterDisabled}
            onColor={C.primary}
            bgOn="#FEE2E2"
            onPress={() => onToggleQuickControl("heaterOn")}
            testId="button-qc-heater"
          />
          <QcToggleButton
            label="쿨러"
            icon="wind"
            isOn={current.coolerOn}
            disabled={disabled.coolerDisabled}
            onColor={C.primary}
            bgOn="#E0F2FE"
            onPress={() => onToggleQuickControl("coolerOn")}
            testId="button-qc-cooler"
          />
          <QcToggleButton
            label="환기"
            icon="refresh-cw"
            isOn={current.ventOn}
            disabled={disabled.ventDisabled}
            onColor={C.primary}
            bgOn="#D1FAE5"
            onPress={() => onToggleQuickControl("ventOn")}
            testId="button-qc-vent"
          />
          <QcToggleButton
            label="순환"
            icon="rotate-cw"
            isOn={current.circOn}
            disabled={disabled.circDisabled}
            onColor={C.primary}
            bgOn="#FEF3C7"
            onPress={() => onToggleQuickControl("circOn")}
            testId="button-qc-circ"
          />
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: C.border,
            marginVertical: 18,
          }}
        />

        <PretendardFont
          weight="bold"
          className="text-[14px] mb-3"
          style={{ color: C.text }}
        >
          자동 제어
        </PretendardFont>
        {current.controls.map((control) => (
          <ControlItem
            key={control.id}
            control={control}
            onToggle={onToggleControl}
          />
        ))}
      </View>
    </View>
  );
}

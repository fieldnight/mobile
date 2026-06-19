import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { HiveDropdown } from "./HiveDropdown";
import { QcToggleButton } from "./QctoggleButton";
import { ControlItem } from "./controlItem";
import { BoxColor as C } from "@/types";
import { Card } from "@/components/hive/hive-shared";
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
    <Card
      style={{
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.643) ",
        elevation: 0,
        marginHorizontal: -14,
      }}
    >
      <View className="flex-row justify-between items-center mb-2">
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
            className="flex-row items-center gap-1.5 px-3 py-2 bg-white rounded-[14px] border"
            style={{ borderColor: C.border }}
          >
            <PretendardFont className="text-[14px]" style={{ color: C.text }}>
              {selectedHive?.name ?? "벌통 선택"}
            </PretendardFont>
            <Feather name="chevron-down" size={16} color={C.sec} />
          </Pressable>
          {dropdownOpen && (
            <HiveDropdown
              hives={hives}
              selectedId={controlHive === "all" ? "" : controlHive}
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

      <View className="flex-row items-center justify-between mb-1.5">
        <PretendardFont weight="bold" className="text-[14px]" style={{ color: C.text }}>
          수동 제어
        </PretendardFont>
        <View
          className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full border"
          style={{ borderColor: C.sec }}
        >
          <Feather name="info" size={11} color={C.sec} />
          <PretendardFont weight="semibold" className="text-[12px]" style={{ color: C.sec }}>
            자동 제어 중엔 비활성화
          </PretendardFont>
        </View>
      </View>

      <View className="flex-row justify-between gap-2 rounded-[18px] p-1">
        <QcToggleButton
          label="히터"
          icon="sun"
          isOn={current.heaterOn}
          disabled={disabled.heaterDisabled}
          onPress={() => onToggleQuickControl("heaterOn")}
          testId="button-qc-heater"
        />
        <QcToggleButton
          label="쿨러"
          icon="wind"
          isOn={current.coolerOn}
          disabled={disabled.coolerDisabled}
          onPress={() => onToggleQuickControl("coolerOn")}
          testId="button-qc-cooler"
        />
        <QcToggleButton
          label="환기"
          icon="refresh-cw"
          isOn={current.ventOn}
          disabled={disabled.ventDisabled}
          onPress={() => onToggleQuickControl("ventOn")}
          testId="button-qc-vent"
        />
        <QcToggleButton
          label="순환"
          icon="rotate-cw"
          isOn={current.circOn}
          disabled={disabled.circDisabled}
          onPress={() => onToggleQuickControl("circOn")}
          testId="button-qc-circ"
        />
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: C.border,
          marginVertical: 10,
        }}
      />

      <PretendardFont
        weight="bold"
        className="text-[14px] mb-0.5"
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
    </Card>
  );
}

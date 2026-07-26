/**
 * 공용 필터 드롭다운 (바텀시트)
 * - 안심농약찾기 / 도매시장 시세 / 작물별 수정벌 가이드 등에서 공통 사용
 * - 트리거: 선택 시 C.primary 강조 (primarySoft 배경 + primary 보더)
 * - 옵션 시트: 하단에서 슬라이드 업, 선택 항목에 check 아이콘
 */
import { useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  Modal,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

export interface DropdownOption {
  /** 화면에 표시할 라벨 */
  label: string;
  /** 선택 값 (value) */
  value: string;
  /** 우측에 작게 표시할 보조 텍스트 (예: 시장 코드) */
  hint?: string;
}

function normalize(options: (string | DropdownOption)[]): DropdownOption[] {
  return options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o,
  );
}

export function FilterDropdown({
  label,
  placeholder,
  value,
  options,
  onSelect,
  disabled = false,
  allOption = false,
  allLabel = "전체",
  style,
  size = "default",
}: {
  /** 시트 헤더 타이틀 & (placeholder 미지정 시) 트리거 기본 텍스트 */
  label: string;
  /** 미선택 시 트리거에 표시할 안내 텍스트 */
  placeholder?: string;
  /** 현재 선택 값 */
  value: string;
  /** 옵션 목록 (string[] 또는 { label, value, hint }[]) */
  options: (string | DropdownOption)[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  /** 맨 위에 "전체"(value "") 항목 추가 여부 */
  allOption?: boolean;
  allLabel?: string;
  /** 트리거 컨테이너 추가 스타일 (예: flex:1) */
  style?: ViewStyle;
  size?: "default" | "large";
}) {
  const [open, setOpen] = useState(false);
  const opts = normalize(options);
  const selected = opts.find((o) => o.value === value);
  const hasValue = !!value && !disabled;
  const triggerText = selected ? selected.label : placeholder || label;
  const isLarge = size === "large";

  const listOptions: DropdownOption[] = allOption
    ? [{ label: allLabel, value: "" }, ...opts]
    : opts;

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="flex-row items-center justify-between active:opacity-70"
        style={{
          height: isLarge ? 52 : 44,
          paddingHorizontal: isLarge ? 14 : 12,
          backgroundColor: C.bg,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 12,
          opacity: disabled ? 0.45 : 1,
          ...style,
        }}
      >
        <PretendardFont
          weight={hasValue ? "semibold" : "regular"}
          numberOfLines={1}
          style={{
            fontSize: isLarge ? 16 : 13,
            color: hasValue ? C.text : C.ter,
            flex: 1,
          }}
        >
          {triggerText}
        </PretendardFont>
        <Feather name="chevron-down" size={isLarge ? 17 : 14} color={C.ter} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: C.white,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "60%",
              paddingBottom: 32,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <PretendardFont
                weight="bold"
                style={{ fontSize: isLarge ? 20 : 16, color: C.text }}
              >
                {label}
              </PretendardFont>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={12}
                className="active:opacity-60"
              >
                <Feather name="x" size={20} color={C.ter} />
              </Pressable>
            </View>
            <ScrollView>
              {listOptions.map((o) => {
                const isSelected = o.value === value;
                const isAll = o.value === "";
                return (
                  <Pressable
                    key={o.value || "__all__"}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 20,
                      paddingVertical: isLarge ? 17 : 14,
                      borderBottomWidth: 1,
                      borderBottomColor: C.bg,
                      backgroundColor: isSelected ? C.primarySoft : "transparent",
                    }}
                    onPress={() => {
                      onSelect(o.value);
                      setOpen(false);
                    }}
                  >
                    <PretendardFont
                      weight={isSelected ? "semibold" : "regular"}
                      style={{
                        fontSize: isLarge ? 17 : 14,
                        color: isAll
                          ? C.ter
                          : isSelected
                            ? C.primary
                            : C.text,
                        flex: 1,
                      }}
                    >
                      {o.label}
                    </PretendardFont>
                    {o.hint && !isSelected && (
                      <PretendardFont style={{ fontSize: isLarge ? 14 : 12, color: C.ter }}>
                        {o.hint}
                      </PretendardFont>
                    )}
                    {isSelected && (
                      <Feather name="check" size={isLarge ? 18 : 16} color={C.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

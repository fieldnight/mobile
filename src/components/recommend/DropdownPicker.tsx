import { useState } from "react";
import { View, Pressable, Modal, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";

interface DropdownPickerProps {
  label: string;
  placeholder: string;
  value: string | null;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DropdownPicker({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
}: DropdownPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      {/* 라벨 */}
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}
      >
        {label}
      </PretendardFont>

      {/* 트리거 버튼 */}
      <Pressable
        onPress={() => !disabled && setIsOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 18,
          paddingVertical: 16,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: disabled ? "#F3F4F6" : value ? "#3B82F6" : "#E5E7EB",
          backgroundColor: disabled
            ? "#F9FAFB"
            : pressed
              ? "#F8FAFF"
              : "#FFFFFF",
        })}
      >
        <PretendardFont
          weight={value ? "semibold" : "regular"}
          style={{
            fontSize: 16,
            color: disabled ? "#D1D5DB" : value ? "#111827" : "#9CA3AF",
            flex: 1,
          }}
        >
          {value || placeholder}
        </PretendardFont>
        <Feather
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={22}
          color={disabled ? "#D1D5DB" : value ? "#3B82F6" : "#9CA3AF"}
        />
      </Pressable>

      {/* 바텀시트 */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
          onPress={() => setIsOpen(false)}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 30,
              borderTopRightRadius: 24,
              maxHeight: 460,
              paddingBottom: 20,
            }}
          >
            {/* 핸들 바 */}
            <View
              style={{ alignItems: "center", paddingTop: 14, paddingBottom: 2 }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#D1D5DB",
                }}
              />
            </View>

            {/* 시트 헤더 */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <PretendardFont
                weight="bold"
                style={{ fontSize: 18, color: "#111827" }}
              >
                {label} 선택
              </PretendardFont>
              <Pressable
                onPress={() => setIsOpen(false)}
                hitSlop={{ top: 20, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={22} color="#6B7280" />
              </Pressable>
            </View>

            {/* 옵션 목록 */}
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              ItemSeparatorComponent={() => (
                <View style={{ height: 20, backgroundColor: "#FFFFFF" }} />
              )}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 24,
                    paddingVertical: 14,
                    marginHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor:
                      item === value
                        ? "#EFF6FF"
                        : pressed
                          ? "#F9FAFB"
                          : "#FFFFFF",
                    borderWidth: item === value ? 1.5 : 0,
                    borderColor: item === value ? "#3B82F6" : "transparent",
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <PretendardFont
                      weight={item === value ? "semibold" : "regular"}
                      style={{
                        fontSize: 20,
                        color: item === value ? "#2563EB" : "#1F2937",
                        flex: 1,
                      }}
                    >
                      {item}
                    </PretendardFont>
                    {item === value && (
                      <View
                        style={{
                          marginLeft: 12,
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: "#2563EB",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="check" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                </Pressable>
              )}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingVertical: 12,
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

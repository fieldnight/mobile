import { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { WHOLESALE_MARKETS } from "@/constants/fruit-price";
import { PretendardFont } from "@/components/PretendardFont";

// ── Dropdown ──────────────────────────────────────────────────────────────────
function Dropdown({
  label,
  value,
  options,
  onSelect,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { code: string; name: string }[];
  onSelect: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.code === value);

  return (
    <>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 44,
          paddingHorizontal: 12,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 10,
          opacity: disabled ? 0.4 : 1,
        }}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <PretendardFont
          weight="medium"
          style={{ fontSize: 13, color: "#334155", flex: 1 }}
          numberOfLines={1}
        >
          {selected ? selected.name : label}
        </PretendardFont>
        <PretendardFont
          style={{ color: "#94A3B8", fontSize: 12, marginLeft: 4 }}
        >
          ▾
        </PretendardFont>
      </TouchableOpacity>

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
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "65%",
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
                borderBottomColor: "#F1F5F9",
              }}
            >
              <PretendardFont
                weight="bold"
                style={{ fontSize: 16, color: "#1E293B" }}
              >
                {label}
              </PretendardFont>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <PretendardFont
                  style={{
                    color: "#94A3B8",
                    fontSize: 18,
                    paddingHorizontal: 8,
                  }}
                >
                  ✕
                </PretendardFont>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[{ code: "", name: "전체" }, ...options].map((o) => (
                <TouchableOpacity
                  key={o.code || "__all__"}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F8FAFC",
                    backgroundColor:
                      o.code === value ? "#EFF6FF" : "transparent",
                  }}
                  onPress={() => {
                    onSelect(o.code);
                    setOpen(false);
                  }}
                >
                  <PretendardFont
                    weight={o.code === value ? "semibold" : "regular"}
                    style={{
                      fontSize: 14,
                      color:
                        o.code === value
                          ? "#2563EB"
                          : o.code === ""
                            ? "#94A3B8"
                            : "#334155",
                    }}
                  >
                    {o.name}
                  </PretendardFont>
                  {o.code !== "" && (
                    <PretendardFont style={{ fontSize: 12, color: "#CBD5E1" }}>
                      {o.code}
                    </PretendardFont>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── FilterPanel ───────────────────────────────────────────────────────────────
interface FilterPanelProps {
  marketCode: string;
  onMarketChange: (code: string) => void;
}

export function FilterPanel({ marketCode, onMarketChange }: FilterPanelProps) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      <Dropdown
        label="도매시장 선택"
        value={marketCode}
        options={WHOLESALE_MARKETS.map((m) => ({ code: m.code, name: m.name }))}
        onSelect={onMarketChange}
      />
    </View>
  );
}

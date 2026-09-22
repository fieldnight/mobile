/**
 * 시세 테이블 정렬 바
 */

import { ScrollView, Pressable, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";

export type SortKey =
  | "default"
  | "price_desc"
  | "price_asc"
  | "qty_desc"
  | "qty_asc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "최신순" },
  { key: "price_desc", label: "최고가 ↓" },
  { key: "price_asc", label: "최저가 ↑" },
  { key: "qty_desc", label: "거래량 ↓" },
  { key: "qty_asc", label: "거래량 ↑" },
];

interface SortBarProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
}

export function SortBar({ value, onChange }: SortBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        gap: 8,
        paddingVertical: 8,
      }}
    >
      {SORT_OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: active ? "#2563EB" : "#010808",
              borderWidth: active ? 0 : 1,
              borderColor: "#375f94",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <PretendardFont
              weight={active ? "bold" : "medium"}
              style={{
                fontSize: 14,
                color: active ? "#000000" : "#64748B",
                marginVertical: 2,
                marginLeft: 10,
              }}
            >
              {opt.label}
            </PretendardFont>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

import type { Row } from "@/types";

export function sortRows(rows: Row[], key: SortKey): Row[] {
  if (key === "default") return rows;
  return [...rows].sort((a, b) => {
    switch (key) {
      case "price_desc":
        return Number(b.scsbd_prc) - Number(a.scsbd_prc);
      case "price_asc":
        return Number(a.scsbd_prc) - Number(b.scsbd_prc);
      case "qty_desc":
        return Number(b.qty) - Number(a.qty);
      case "qty_asc":
        return Number(a.qty) - Number(b.qty);
      default:
        return 0;
    }
  });
}
